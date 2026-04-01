import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reports, waLogs, waSessions } from "@/lib/schema";
import { normalizePhone, sendWhatsApp, buildConfirmationMessage } from "@/lib/whatsapp";
import { broadcastSseEvent } from "@/lib/sse";
import { generateNomorLaporan } from "@/lib/nomor-laporan";
import { processConversation } from "@/lib/ai";
import { KELURAHAN_CIMAHI, RW_OPTIONS } from "@/lib/kelurahan";
import { eq, and, desc } from "drizzle-orm";

function normalizeKelurahanInput(value: string): string | null {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  const found = (KELURAHAN_CIMAHI as ReadonlyArray<string | undefined>).find(
    (k) => k !== undefined && k.toLowerCase() === normalized
  );
  return found ?? null;
}

function normalizeRwInput(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  const normalized = String(Number(digits)).padStart(2, "0");
  return RW_OPTIONS.includes(normalized) ? normalized : null;
}

function getWebhookSecret(req: NextRequest, body?: unknown): string | null {
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

function getPayloadValue(body: unknown, keys: string[]): string {
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
    const event = getPayloadValue(body, ["event", "type"]);
    const from = getPayloadValue(body, ["from", "sender", "phone", "number"]);
    const messageText = getPayloadValue(body, ["body", "message", "text"]);
    const messageId = getPayloadValue(body, ["messageId", "id"]);

    if (event && !["message", "messages.upsert", "incoming_message"].includes(event)) {
      return NextResponse.json({ ok: true, ignored: true, event });
    }

    if (!from || !messageText) {
      return NextResponse.json({ ok: true });
    }

    const phoneNormalized = normalizePhone(from);
    const cleanedMessage = messageText.trim();

    // 1. Fetch conversation history (last 12 messages), oldest first
    const historyLogs = await db
      .select()
      .from(waLogs)
      .where(eq(waLogs.phoneNumber, phoneNormalized))
      .orderBy(desc(waLogs.timestamp))
      .limit(12);

    const history = historyLogs
      .reverse()
      .map((log) => ({
        role: (log.direction === "inbound" ? "user" : "admin") as "user" | "admin",
        content: log.content,
      }));

    // 2. Fetch active session
    const activeSessions = await db
      .select()
      .from(waSessions)
      .where(
        and(
          eq(waSessions.phoneNumber, phoneNormalized),
          eq(waSessions.status, "collecting")
        )
      )
      .orderBy(desc(waSessions.updatedAt))
      .limit(1);

    const activeSession = activeSessions[0] ?? null;

    // Expire sessions older than 24 hours — treat as no session
    const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
    const sessionExpired =
      activeSession &&
      activeSession.updatedAt &&
      Date.now() - new Date(activeSession.updatedAt).getTime() > SESSION_TTL_MS;

    if (sessionExpired && activeSession) {
      await db
        .update(waSessions)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(waSessions.id, activeSession.id));
    }

    const validSession = sessionExpired ? null : activeSession;

    // 3. Fetch user's existing reports (non-selesai, latest 3)
    const userReportRows = await db
      .select({
        nomorLaporan: reports.nomorLaporan,
        status: reports.status,
        isiLaporan: reports.isiLaporan,
        createdAt: reports.createdAt,
      })
      .from(reports)
      .where(eq(reports.nomorWa, phoneNormalized))
      .orderBy(desc(reports.createdAt))
      .limit(3);

    const userReports = userReportRows;

    // 4. Build collectedFields from valid (non-expired) session
    const collectedFields = {
      nama: validSession?.nama ?? null,
      kelurahan: validSession?.kelurahan ?? null,
      rw: validSession?.rw ?? null,
      isiLaporan: validSession?.isiLaporan ?? null,
    };

    // 5. Log inbound message
    await db.insert(waLogs).values({
      direction: "inbound",
      content: cleanedMessage,
      phoneNumber: phoneNormalized,
      status: "received",
      sentBy: "system",
    });

    // 6. Call processConversation
    const result = await processConversation({
      message: cleanedMessage,
      history,
      collectedFields,
      userReports,
      validKelurahan: (KELURAHAN_CIMAHI as ReadonlyArray<string | undefined>).filter(
        (k): k is string => k !== undefined
      ),
      validRw: RW_OPTIONS,
    });

    // Helper: send and log outbound message (with human-like typing delay)
    const sendAndLog = async (content: string, reportId?: number) => {
      const words = content.trim().split(/\s+/).length;
      const delayMs = Math.min(800 + words * 55, 4500);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      const sendResult = await sendWhatsApp(from, content);
      await db.insert(waLogs).values({
        reportId,
        direction: "outbound",
        content,
        phoneNumber: phoneNormalized,
        status: sendResult.success ? "sent" : "failed",
        sentBy: "ai",
      });
      return sendResult;
    };

    // Helper: upsert session with merged fields
    const upsertSession = async (mergedFields: {
      nama: string | null;
      kelurahan: string | null;
      rw: string | null;
      isiLaporan: string | null;
    }) => {
      await db
        .insert(waSessions)
        .values({
          phoneNumber: phoneNormalized,
          currentStep: "gathering",
          lastDetectedIntent: "new_report",
          nama: mergedFields.nama,
          kelurahan: mergedFields.kelurahan,
          rw: mergedFields.rw,
          isiLaporan: mergedFields.isiLaporan,
          status: "collecting",
        })
        .onConflictDoUpdate({
          target: waSessions.phoneNumber,
          set: {
            currentStep: "gathering",
            nama: mergedFields.nama,
            kelurahan: mergedFields.kelurahan,
            rw: mergedFields.rw,
            isiLaporan: mergedFields.isiLaporan,
            status: "collecting",
            updatedAt: new Date(),
          },
        });
    };

    // 7. Handle action

    if (result.action === "reset") {
      // Cancel active session if exists
      if (validSession) {
        await db
          .update(waSessions)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(waSessions.id, validSession.id));
      }

      await sendAndLog(result.reply);
      return NextResponse.json({ ok: true, mode: "reset" });
    }

    if (result.action === "create_report") {
      // Merge new fields from result.fields into collectedFields
      const merged = {
        nama: result.fields.nama ?? collectedFields.nama,
        kelurahan: result.fields.kelurahan ?? collectedFields.kelurahan,
        rw: result.fields.rw ?? collectedFields.rw,
        isiLaporan: result.fields.isiLaporan ?? collectedFields.isiLaporan,
      };

      // Normalize and validate
      const normalizedKelurahan = merged.kelurahan
        ? normalizeKelurahanInput(merged.kelurahan)
        : null;
      const normalizedRw = merged.rw ? normalizeRwInput(merged.rw) : null;

      const allValid =
        merged.nama &&
        normalizedKelurahan &&
        normalizedRw &&
        merged.isiLaporan;

      if (allValid) {
        // Create report
        const nomorLaporan = await generateNomorLaporan();
        const [newReport] = await db
          .insert(reports)
          .values({
            nomorLaporan,
            nama: merged.nama!,
            nomorWa: phoneNormalized,
            kelurahan: normalizedKelurahan,
            rw: normalizedRw,
            isiLaporan: merged.isiLaporan!,
            source: "wa",
            waMessageId: messageId || undefined,
            status: "masuk",
          })
          .returning();

        // Mark session completed
        if (validSession) {
          await db
            .update(waSessions)
            .set({ status: "completed", updatedAt: new Date() })
            .where(eq(waSessions.id, validSession.id));
        } else {
          await db
            .insert(waSessions)
            .values({
              phoneNumber: phoneNormalized,
              currentStep: "gathering",
              lastDetectedIntent: "new_report",
              nama: merged.nama,
              kelurahan: normalizedKelurahan,
              rw: normalizedRw,
              isiLaporan: merged.isiLaporan,
              status: "completed",
            })
            .onConflictDoUpdate({
              target: waSessions.phoneNumber,
              set: { status: "completed", updatedAt: new Date() },
            });
        }

        // Send ONLY confirmation message (not combined with AI reply)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const surveyUrl = `${appUrl}/survey/${newReport.id}`;
        const confirmationMessage = buildConfirmationMessage(
          merged.nama!,
          newReport.nomorLaporan,
          surveyUrl
        );

        await sendAndLog(confirmationMessage, newReport.id);

        // Async categorize (fire-and-forget)
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

      // NOT all valid — treat as update_fields instead
      const mergedForSession = {
        nama: merged.nama ?? null,
        kelurahan: normalizedKelurahan ?? merged.kelurahan ?? null,
        rw: normalizedRw ?? merged.rw ?? null,
        isiLaporan: merged.isiLaporan ?? null,
      };

      await upsertSession(mergedForSession);
      await sendAndLog(result.reply);
      return NextResponse.json({ ok: true, mode: "update-fields-incomplete" });
    }

    // action === "update_fields" or "none"
    const hasNewFields =
      result.fields.nama != null ||
      result.fields.kelurahan != null ||
      result.fields.rw != null ||
      result.fields.isiLaporan != null;

    if (result.action === "update_fields" || hasNewFields) {
      const mergedFields = {
        nama:
          result.fields.nama !== undefined
            ? result.fields.nama
            : collectedFields.nama,
        kelurahan:
          result.fields.kelurahan !== undefined
            ? result.fields.kelurahan
            : collectedFields.kelurahan,
        rw:
          result.fields.rw !== undefined
            ? result.fields.rw
            : collectedFields.rw,
        isiLaporan:
          result.fields.isiLaporan !== undefined
            ? result.fields.isiLaporan
            : collectedFields.isiLaporan,
      };

      await upsertSession(mergedFields);
    }

    await sendAndLog(result.reply);
    return NextResponse.json({ ok: true, mode: result.action });
  } catch (err) {
    console.error("WA webhook error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
