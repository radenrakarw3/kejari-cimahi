import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reports, waLogs, waSessions } from "@/lib/schema";
import { normalizePhone, sendWhatsApp, buildConfirmationMessage } from "@/lib/whatsapp";
import { broadcastSseEvent } from "@/lib/sse";
import { generateNomorLaporan } from "@/lib/nomor-laporan";
import {
  assessReportIntake,
  assessNameInput,
  generateClarifyingQuestion,
  generateIntakeStepReply,
  generateWebhookReply,
} from "@/lib/ai";
import { KELURAHAN_CIMAHI, RW_OPTIONS } from "@/lib/kelurahan";
import { eq, and, inArray } from "drizzle-orm";

const CANCEL_KEYWORDS = ["batal", "cancel", "ulang", "reset", "mulai lagi"];
const NEW_REPORT_KEYWORDS = [
  "laporan baru",
  "pengaduan baru",
  "aduan baru",
  "buat laporan",
  "buat pengaduan",
  "mau lapor",
  "ingin lapor",
  "lapor baru",
];
const FOLLOW_UP_KEYWORDS = [
  "lanjutkan",
  "lanjut",
  "tambahan",
  "tambahan laporan",
  "laporan lama",
  "untuk laporan itu",
  "ya",
  "iya",
];

function isCancelMessage(message: string) {
  const normalized = message.trim().toLowerCase();
  return CANCEL_KEYWORDS.includes(normalized);
}

function wantsNewReport(message: string) {
  const normalized = message.trim().toLowerCase();
  return NEW_REPORT_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function wantsFollowUp(message: string) {
  const normalized = message.trim().toLowerCase();
  return FOLLOW_UP_KEYWORDS.some((keyword) => normalized === keyword || normalized.includes(keyword));
}

function normalizeKelurahanInput(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  return (
    KELURAHAN_CIMAHI.find((kelurahan) => kelurahan.toLowerCase() === normalized) ?? null
  );
}

function normalizeRwInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  const normalized = String(Number(digits)).padStart(2, "0");
  return RW_OPTIONS.includes(normalized) ? normalized : null;
}

function buildResetMessage() {
  return `Baik, proses pengaduan WhatsApp telah kami reset.

Mari kita mulai lagi dengan tenang. Silakan kirim nama lengkap Anda.`;
}

function getWebhookSecret(req: NextRequest, body?: unknown) {
  if (req.headers.get("x-webhook-secret")) {
    return req.headers.get("x-webhook-secret");
  }

  const querySecret = req.nextUrl.searchParams.get("secret");
  if (querySecret) {
    return querySecret;
  }

  if (body && typeof body === "object" && "secret" in body) {
    const bodySecret = (body as { secret?: unknown }).secret;
    return typeof bodySecret === "string" ? bodySecret : null;
  }

  return null;
}

function getPayloadValue(body: unknown, keys: string[]) {
  if (!body || typeof body !== "object") {
    return "";
  }

  const payload = body as Record<string, unknown>;
  const data =
    payload.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : null;

  for (const key of keys) {
    const directValue = payload[key];
    if (typeof directValue === "string" && directValue.trim()) {
      return directValue;
    }

    const nestedValue = data?.[key];
    if (typeof nestedValue === "string" && nestedValue.trim()) {
      return nestedValue;
    }
  }

  return "";
}

export async function GET(req: NextRequest) {
  const providedSecret = getWebhookSecret(req);
  const configuredSecret = process.env.WEBHOOK_SECRET;

  if (configuredSecret && providedSecret !== configuredSecret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    service: "whatsapp-webhook",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const configuredSecret = process.env.WEBHOOK_SECRET;
  const providedSecret = getWebhookSecret(req, body);

  if (configuredSecret && providedSecret !== configuredSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // StarSender webhook payload shape:
    // { event: "message", data: { from, body, messageId, timestamp } }
    const event = getPayloadValue(body, ["event", "type"]);
    const from = getPayloadValue(body, ["from", "sender", "phone", "number"]);
    const messageText = getPayloadValue(body, ["body", "message", "text"]);
    const messageId = getPayloadValue(body, ["messageId", "id"]);

    if (event && !["message", "messages.upsert", "incoming_message"].includes(event)) {
      return NextResponse.json({ ok: true, ignored: true, event });
    }

    if (!from || !messageText) {
      return NextResponse.json({ ok: true }); // ignore empty
    }

    const phoneNormalized = normalizePhone(from);
    const cleanedMessage = messageText.trim();

    const activeSessions = await db
      .select()
      .from(waSessions)
      .where(
        and(
          eq(waSessions.phoneNumber, phoneNormalized),
          eq(waSessions.status, "collecting")
        )
      )
      .limit(1);

    const activeSession = activeSessions[0];

    if (isCancelMessage(cleanedMessage)) {
      if (activeSession) {
        await db
          .update(waSessions)
          .set({
            status: "cancelled",
            updatedAt: new Date(),
          })
          .where(eq(waSessions.id, activeSession.id));
      }

      const resetMessage = buildResetMessage();
      await sendWhatsApp(from, resetMessage);

      await db.insert(waSessions).values({
        phoneNumber: phoneNormalized,
        currentStep: "ask_name",
        status: "collecting",
      }).onConflictDoUpdate({
        target: waSessions.phoneNumber,
        set: {
          currentStep: "ask_name",
          nama: null,
          kelurahan: null,
          rw: null,
          isiLaporan: null,
          clarificationCount: 0,
          status: "collecting",
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({ ok: true, mode: "reset" });
    }

    if (activeSession) {
      if (activeSession.currentStep === "confirm_report_intent") {
        const existingReports = await db
          .select()
          .from(reports)
          .where(
            and(
              eq(reports.nomorWa, phoneNormalized),
              inArray(reports.status, ["masuk", "diproses"])
            )
          )
          .limit(1);

        const existingReport = existingReports[0];

        if (wantsNewReport(cleanedMessage)) {
          const reply = await generateIntakeStepReply({
            stage: "new_report_start",
            userMessage: cleanedMessage,
          });

          await db
            .update(waSessions)
            .set({
              currentStep: "ask_name",
              nama: null,
              kelurahan: null,
              rw: null,
              isiLaporan: null,
              clarificationCount: 0,
              updatedAt: new Date(),
            })
            .where(eq(waSessions.id, activeSession.id));

          const sendResult = await sendWhatsApp(from, reply);
          await db.insert(waLogs).values({
            direction: "outbound",
            content: reply,
            phoneNumber: phoneNormalized,
            status: sendResult.success ? "sent" : "failed",
            sentBy: "system",
          });

          return NextResponse.json({ ok: true, mode: "new-report" });
        }

        if (existingReport) {
          const pendingMessage = activeSession.isiLaporan?.trim();
          const followUpContent = wantsFollowUp(cleanedMessage)
            ? pendingMessage || cleanedMessage
            : [pendingMessage, cleanedMessage].filter(Boolean).join("\n");

          await db.insert(waLogs).values({
            reportId: existingReport.id,
            direction: "inbound",
            content: followUpContent,
            phoneNumber: phoneNormalized,
            status: "received",
            sentBy: "system",
          });

          const aiReply = await generateWebhookReply({
            message: followUpContent,
            nomorLaporan: existingReport.nomorLaporan,
            isExistingReport: true,
          });

          const sendResult = await sendWhatsApp(from, aiReply);
          await db.insert(waLogs).values({
            reportId: existingReport.id,
            direction: "outbound",
            content: aiReply,
            phoneNumber: phoneNormalized,
            status: sendResult.success ? "sent" : "failed",
            sentBy: "ai",
          });

          await db
            .update(waSessions)
            .set({
              status: "completed",
              updatedAt: new Date(),
            })
            .where(eq(waSessions.id, activeSession.id));

          broadcastSseEvent({
            type: "new_wa_message",
            reportId: existingReport.id,
            message: followUpContent,
          });

          return NextResponse.json({ ok: true, mode: "follow-up" });
        }

        await db
          .update(waSessions)
          .set({
            currentStep: "ask_name",
            nama: null,
            kelurahan: null,
            rw: null,
            isiLaporan: null,
            clarificationCount: 0,
            updatedAt: new Date(),
          })
          .where(eq(waSessions.id, activeSession.id));

        const reply = await generateIntakeStepReply({
          stage: "new_report_start",
          userMessage: cleanedMessage,
        });
        const sendResult = await sendWhatsApp(from, reply);
        await db.insert(waLogs).values({
          direction: "outbound",
          content: reply,
          phoneNumber: phoneNormalized,
          status: sendResult.success ? "sent" : "failed",
          sentBy: "system",
        });

        return NextResponse.json({ ok: true, mode: "restart-intake" });
      }

      await db.insert(waLogs).values({
        direction: "inbound",
        content: cleanedMessage,
        phoneNumber: phoneNormalized,
        status: "received",
        sentBy: "system",
      });

      if (activeSession.currentStep === "ask_name") {
        const nameAssessment = await assessNameInput(cleanedMessage);

        if (!nameAssessment.isLikelyName || nameAssessment.confidence < 0.7) {
          const reply = await generateIntakeStepReply({
            stage: "ask_name",
            userMessage: cleanedMessage,
          });

          const sendResult = await sendWhatsApp(from, reply);
          await db.insert(waLogs).values({
            direction: "outbound",
            content: reply,
            phoneNumber: phoneNormalized,
            status: sendResult.success ? "sent" : "failed",
            sentBy: "ai",
          });

          return NextResponse.json({ ok: true, mode: "ask-name-again" });
        }

        const nama = (nameAssessment.extractedName || cleanedMessage).slice(0, 120);
        const reply = await generateIntakeStepReply({
          stage: "ask_kelurahan",
          userMessage: cleanedMessage,
          nama,
        });

        await db
          .update(waSessions)
          .set({
            nama,
            currentStep: "ask_kelurahan",
            updatedAt: new Date(),
          })
          .where(eq(waSessions.id, activeSession.id));

        const sendResult = await sendWhatsApp(from, reply);
        await db.insert(waLogs).values({
          direction: "outbound",
          content: reply,
          phoneNumber: phoneNormalized,
          status: sendResult.success ? "sent" : "failed",
          sentBy: "system",
        });

        return NextResponse.json({ ok: true, mode: "intake" });
      }

      if (activeSession.currentStep === "ask_kelurahan") {
        const kelurahan = normalizeKelurahanInput(cleanedMessage);

        if (!kelurahan) {
          const reply = await generateIntakeStepReply({
            stage: "invalid_kelurahan",
            userMessage: cleanedMessage,
            nama: activeSession.nama ?? undefined,
            optionsText: KELURAHAN_CIMAHI.join(", "),
          });

          const sendResult = await sendWhatsApp(from, reply);
          await db.insert(waLogs).values({
            direction: "outbound",
            content: reply,
            phoneNumber: phoneNormalized,
            status: sendResult.success ? "sent" : "failed",
            sentBy: "system",
          });

          return NextResponse.json({ ok: true, mode: "intake" });
        }

        const reply = await generateIntakeStepReply({
          stage: "ask_rw",
          userMessage: cleanedMessage,
          nama: activeSession.nama ?? undefined,
          kelurahan,
        });

        await db
          .update(waSessions)
          .set({
            kelurahan,
            currentStep: "ask_rw",
            updatedAt: new Date(),
          })
          .where(eq(waSessions.id, activeSession.id));

        const sendResult = await sendWhatsApp(from, reply);
        await db.insert(waLogs).values({
          direction: "outbound",
          content: reply,
          phoneNumber: phoneNormalized,
          status: sendResult.success ? "sent" : "failed",
          sentBy: "system",
        });

        return NextResponse.json({ ok: true, mode: "intake" });
      }

      if (activeSession.currentStep === "ask_rw") {
        const rw = normalizeRwInput(cleanedMessage);

        if (!rw) {
          const reply = await generateIntakeStepReply({
            stage: "invalid_rw",
            userMessage: cleanedMessage,
            nama: activeSession.nama ?? undefined,
            kelurahan: activeSession.kelurahan ?? undefined,
          });
          const sendResult = await sendWhatsApp(from, reply);
          await db.insert(waLogs).values({
            direction: "outbound",
            content: reply,
            phoneNumber: phoneNormalized,
            status: sendResult.success ? "sent" : "failed",
            sentBy: "system",
          });

          return NextResponse.json({ ok: true, mode: "intake" });
        }

        const reply = await generateIntakeStepReply({
          stage: "ask_issue",
          userMessage: cleanedMessage,
          nama: activeSession.nama ?? undefined,
          kelurahan: activeSession.kelurahan ?? undefined,
          rw,
        });

        await db
          .update(waSessions)
          .set({
            rw,
            currentStep: "ask_isi_laporan",
            updatedAt: new Date(),
          })
          .where(eq(waSessions.id, activeSession.id));

        const sendResult = await sendWhatsApp(from, reply);
        await db.insert(waLogs).values({
          direction: "outbound",
          content: reply,
          phoneNumber: phoneNormalized,
          status: sendResult.success ? "sent" : "failed",
          sentBy: "system",
        });

        return NextResponse.json({ ok: true, mode: "intake" });
      }

      if (activeSession.currentStep === "ask_isi_laporan") {
        const mergedDraft = activeSession.isiLaporan
          ? `${activeSession.isiLaporan}\n${cleanedMessage}`.trim()
          : cleanedMessage;
        const assessment = await assessReportIntake(mergedDraft);
        const shouldClarify =
          activeSession.clarificationCount < 1 &&
          (assessment.needsClarification ||
            assessment.confidence < 0.72 ||
            mergedDraft.length < 45);

        if (shouldClarify) {
          const reply = await generateClarifyingQuestion({
            nama: activeSession.nama ?? undefined,
            kelurahan: activeSession.kelurahan ?? undefined,
            rw: activeSession.rw ?? undefined,
            draftMessage: mergedDraft,
            previousReason: assessment.reason,
          });

          await db
            .update(waSessions)
            .set({
              isiLaporan: mergedDraft,
              clarificationCount: activeSession.clarificationCount + 1,
              updatedAt: new Date(),
            })
            .where(eq(waSessions.id, activeSession.id));

          const sendResult = await sendWhatsApp(from, reply);
          await db.insert(waLogs).values({
            direction: "outbound",
            content: reply,
            phoneNumber: phoneNormalized,
            status: sendResult.success ? "sent" : "failed",
            sentBy: "ai",
          });

          return NextResponse.json({ ok: true, mode: "clarify" });
        }

        const nomorLaporan = await generateNomorLaporan();
        const [newReport] = await db
          .insert(reports)
          .values({
            nomorLaporan,
            nama: activeSession.nama ?? "Pelapor via WhatsApp",
            nomorWa: phoneNormalized,
            kelurahan: activeSession.kelurahan ?? "Belum Diisi",
            rw: activeSession.rw ?? "00",
            isiLaporan: mergedDraft,
            source: "wa",
            waMessageId: messageId,
            status: "masuk",
          })
          .returning();

        await db.insert(waLogs).values({
          reportId: newReport.id,
          direction: "inbound",
          content: mergedDraft,
          phoneNumber: phoneNormalized,
          status: "received",
          sentBy: "system",
        });

        const aiReply = await generateWebhookReply({
          message: mergedDraft,
          nomorLaporan: newReport.nomorLaporan,
          isExistingReport: false,
        });

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const surveyUrl = `${appUrl}/survey/${newReport.id}`;
        const confirmationMessage = `${buildConfirmationMessage(
          activeSession.nama ?? "Anda",
          newReport.nomorLaporan,
          surveyUrl
        )}\n\n${aiReply}`;
        const sendResult = await sendWhatsApp(from, confirmationMessage);

        await db.insert(waLogs).values({
          reportId: newReport.id,
          direction: "outbound",
          content: confirmationMessage,
          phoneNumber: phoneNormalized,
          status: sendResult.success ? "sent" : "failed",
          sentBy: "ai",
        });

        await db
          .update(waSessions)
          .set({
            isiLaporan: mergedDraft,
            status: "completed",
            updatedAt: new Date(),
          })
          .where(eq(waSessions.id, activeSession.id));

        fetch(`${appUrl}/api/ai/categorize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportId: newReport.id,
            isiLaporan: newReport.isiLaporan,
          }),
        }).catch(() => {});

        broadcastSseEvent({ type: "new_report", report: newReport });

        return NextResponse.json({ ok: true, mode: "created" });
      }
    }

    // Check if this phone has an existing open report
    const existingReports = await db
      .select()
      .from(reports)
      .where(
        and(
          eq(reports.nomorWa, phoneNormalized),
          inArray(reports.status, ["masuk", "diproses"])
        )
      )
      .limit(1);

    if (existingReports.length > 0) {
      const existingReport = existingReports[0];

      if (wantsNewReport(cleanedMessage)) {
        await db.insert(waSessions).values({
          phoneNumber: phoneNormalized,
          currentStep: "ask_name",
          status: "collecting",
        }).onConflictDoUpdate({
          target: waSessions.phoneNumber,
          set: {
            currentStep: "ask_name",
            nama: null,
            kelurahan: null,
            rw: null,
            isiLaporan: null,
            clarificationCount: 0,
            status: "collecting",
            updatedAt: new Date(),
          },
        });

        const reply = await generateIntakeStepReply({
          stage: "new_report_start",
          userMessage: cleanedMessage,
        });
        const sendResult = await sendWhatsApp(from, reply);
        await db.insert(waLogs).values({
          direction: "outbound",
          content: reply,
          phoneNumber: phoneNormalized,
          status: sendResult.success ? "sent" : "failed",
          sentBy: "system",
        });

        return NextResponse.json({ ok: true, mode: "new-report" });
      }

      if (!wantsFollowUp(cleanedMessage) && !cleanedMessage.includes(existingReport.nomorLaporan)) {
        const reply = await generateIntakeStepReply({
          stage: "confirm_report_intent",
          userMessage: cleanedMessage,
          nomorLaporanAktif: existingReport.nomorLaporan,
        });

        await db.insert(waSessions).values({
          phoneNumber: phoneNormalized,
          currentStep: "confirm_report_intent",
          isiLaporan: cleanedMessage,
          status: "collecting",
        }).onConflictDoUpdate({
          target: waSessions.phoneNumber,
          set: {
            currentStep: "confirm_report_intent",
            isiLaporan: cleanedMessage,
            clarificationCount: 0,
            status: "collecting",
            updatedAt: new Date(),
          },
        });

        const sendResult = await sendWhatsApp(from, reply);
        await db.insert(waLogs).values({
          direction: "outbound",
          content: reply,
          phoneNumber: phoneNormalized,
          status: sendResult.success ? "sent" : "failed",
          sentBy: "system",
        });

        return NextResponse.json({ ok: true, mode: "confirm-intent" });
      }

      // Log as incoming message on existing report
      await db.insert(waLogs).values({
        reportId: existingReport.id,
        direction: "inbound",
        content: cleanedMessage,
        phoneNumber: phoneNormalized,
        status: "received",
        sentBy: "system",
      });

      const aiReply = await generateWebhookReply({
        message: cleanedMessage,
        nomorLaporan: existingReport.nomorLaporan,
        isExistingReport: true,
      });

      const sendResult = await sendWhatsApp(from, aiReply);

      await db.insert(waLogs).values({
        reportId: existingReport.id,
        direction: "outbound",
        content: aiReply,
        phoneNumber: phoneNormalized,
        status: sendResult.success ? "sent" : "failed",
        sentBy: "ai",
      });

      broadcastSseEvent({
        type: "new_wa_message",
        reportId: existingReport.id,
        message: cleanedMessage,
      });
    } else {
      await db.insert(waLogs).values({
        direction: "inbound",
        content: cleanedMessage,
        phoneNumber: phoneNormalized,
        status: "received",
        sentBy: "system",
      });

      await db.insert(waSessions).values({
        phoneNumber: phoneNormalized,
        currentStep: "ask_name",
        status: "collecting",
      }).onConflictDoUpdate({
        target: waSessions.phoneNumber,
        set: {
          currentStep: "ask_name",
          nama: null,
          kelurahan: null,
          rw: null,
          isiLaporan: null,
          clarificationCount: 0,
          status: "collecting",
          updatedAt: new Date(),
        },
      });

      const greetingMessage = await generateIntakeStepReply({
        stage: "ask_name",
        userMessage: cleanedMessage,
      });
      const sendResult = await sendWhatsApp(from, greetingMessage);

      await db.insert(waLogs).values({
        direction: "outbound",
        content: greetingMessage,
        phoneNumber: phoneNormalized,
        status: sendResult.success ? "sent" : "failed",
        sentBy: "system",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("WA webhook error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
