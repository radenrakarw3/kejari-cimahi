import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function main() {
  console.log("🔄 Creating tables...");
  const sql = neon(process.env.DATABASE_URL!);

  // Rename express-session table if it exists (shared DB conflict)
  const expressSession = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'session' AND column_name = 'sid'
    LIMIT 1
  `;
  if (expressSession.length > 0) {
    console.log("⚠️  Renaming conflicting express-session table...");
    await sql`ALTER TABLE "session" RENAME TO "express_session"`;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS "categories" (
      "id" serial PRIMARY KEY NOT NULL,
      "nama" text NOT NULL,
      "kode" text NOT NULL UNIQUE,
      "deskripsi" text,
      "warna" text NOT NULL DEFAULT '#6b7280',
      "icon" text NOT NULL DEFAULT 'FileText'
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "bidang" (
      "id" serial PRIMARY KEY NOT NULL,
      "nama" text NOT NULL,
      "kode" text NOT NULL UNIQUE,
      "deskripsi" text
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "user" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "email" text NOT NULL UNIQUE,
      "phone_number" text,
      "email_verified" boolean NOT NULL DEFAULT false,
      "image" text,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now(),
      "role" text NOT NULL DEFAULT 'staff',
      "bidang_id" integer REFERENCES "bidang"("id")
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "session" (
      "id" text PRIMARY KEY NOT NULL,
      "expires_at" timestamp NOT NULL,
      "token" text NOT NULL UNIQUE,
      "created_at" timestamp NOT NULL,
      "updated_at" timestamp NOT NULL,
      "ip_address" text,
      "user_agent" text,
      "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "account" (
      "id" text PRIMARY KEY NOT NULL,
      "account_id" text NOT NULL,
      "provider_id" text NOT NULL,
      "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "access_token" text,
      "refresh_token" text,
      "id_token" text,
      "access_token_expires_at" timestamp,
      "refresh_token_expires_at" timestamp,
      "scope" text,
      "password" text,
      "created_at" timestamp NOT NULL,
      "updated_at" timestamp NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "verification" (
      "id" text PRIMARY KEY NOT NULL,
      "identifier" text NOT NULL,
      "value" text NOT NULL,
      "expires_at" timestamp NOT NULL,
      "created_at" timestamp,
      "updated_at" timestamp
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "reports" (
      "id" serial PRIMARY KEY NOT NULL,
      "nomor_laporan" text NOT NULL UNIQUE,
      "nama" text NOT NULL,
      "nomor_wa" text NOT NULL,
      "kelurahan" text NOT NULL,
      "rw" text NOT NULL,
      "isi_laporan" text NOT NULL,
      "kategori_id" integer REFERENCES "categories"("id"),
      "status" text NOT NULL DEFAULT 'masuk',
      "source" text NOT NULL DEFAULT 'web',
      "wa_message_id" text,
      "ai_category_suggestion" text,
      "ai_confidence_score" text,
      "ai_alasan" text,
      "priority_level" text NOT NULL DEFAULT 'normal',
      "priority_reason" text,
      "outcome_type" text,
      "outcome_summary" text,
      "outcome_follow_up" text,
      "additional_info_request" text,
      "additional_info_requested_at" timestamp,
      "input_by" text REFERENCES "user"("id"),
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "disposisi" (
      "id" serial PRIMARY KEY NOT NULL,
      "report_id" integer NOT NULL REFERENCES "reports"("id") ON DELETE CASCADE,
      "bidang_id" integer NOT NULL REFERENCES "bidang"("id"),
      "catatan" text,
      "disposed_by" text REFERENCES "user"("id"),
      "disposed_at" timestamp DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "wa_logs" (
      "id" serial PRIMARY KEY NOT NULL,
      "report_id" integer REFERENCES "reports"("id") ON DELETE CASCADE,
      "direction" text NOT NULL,
      "content" text NOT NULL,
      "phone_number" text NOT NULL,
      "status" text NOT NULL DEFAULT 'sent',
      "sent_by" text DEFAULT 'admin',
      "timestamp" timestamp DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "wa_sessions" (
      "id" serial PRIMARY KEY NOT NULL,
      "phone_number" text NOT NULL UNIQUE,
      "current_step" text NOT NULL DEFAULT 'ask_name',
      "last_detected_intent" text DEFAULT 'needs_guidance',
      "nama" text,
      "kelurahan" text,
      "rw" text,
      "isi_laporan" text,
      "clarification_count" integer NOT NULL DEFAULT 0,
      "status" text NOT NULL DEFAULT 'collecting',
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "report_attachments" (
      "id" serial PRIMARY KEY NOT NULL,
      "report_id" integer NOT NULL REFERENCES "reports"("id") ON DELETE CASCADE,
      "original_name" text NOT NULL,
      "stored_name" text NOT NULL,
      "file_path" text NOT NULL,
      "mime_type" text NOT NULL,
      "size_bytes" integer NOT NULL,
      "created_at" timestamp DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "report_audit_logs" (
      "id" serial PRIMARY KEY NOT NULL,
      "report_id" integer NOT NULL REFERENCES "reports"("id") ON DELETE CASCADE,
      "action" text NOT NULL,
      "actor_type" text NOT NULL DEFAULT 'system',
      "actor_id" text,
      "actor_name" text,
      "summary" text NOT NULL,
      "metadata" text,
      "created_at" timestamp DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "ptsp_visit_logs" (
      "id" serial PRIMARY KEY NOT NULL,
      "service_type" text NOT NULL,
      "report_id" integer REFERENCES "reports"("id") ON DELETE SET NULL,
      "report_number" text,
      "visitor_card_number" text,
      "visitor_name" text NOT NULL,
      "visitor_phone" text,
      "bidang_id" integer REFERENCES "bidang"("id") ON DELETE SET NULL,
      "target_name" text,
      "is_incognito" boolean NOT NULL DEFAULT false,
      "appointment_id" integer,
      "note" text,
      "ktp_file_path" text NOT NULL,
      "webcam_file_path" text NOT NULL,
      "created_at" timestamp DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "ptsp_appointments" (
      "id" serial PRIMARY KEY NOT NULL,
      "bidang_id" integer NOT NULL REFERENCES "bidang"("id") ON DELETE CASCADE,
      "host_name" text NOT NULL,
      "visitor_name" text NOT NULL,
      "visitor_phone" text,
      "agenda" text NOT NULL,
      "note" text,
      "scheduled_for" timestamp NOT NULL,
      "is_incognito" boolean NOT NULL DEFAULT false,
      "status" text NOT NULL DEFAULT 'scheduled',
      "confirmed_at" timestamp,
      "created_by" text REFERENCES "user"("id") ON DELETE SET NULL,
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "ai_knowledge_entries" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" text NOT NULL,
      "content" text NOT NULL,
      "tags" text,
      "is_active" boolean NOT NULL DEFAULT true,
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    )
  `;

  await sql`
    ALTER TABLE "user"
    ADD COLUMN IF NOT EXISTS "phone_number" text
  `;

  await sql`
    ALTER TABLE "wa_logs"
    ADD COLUMN IF NOT EXISTS "sent_by" text DEFAULT 'admin'
  `;

  await sql`
    ALTER TABLE "reports"
    ADD COLUMN IF NOT EXISTS "outcome_type" text
  `;

  await sql`
    ALTER TABLE "reports"
    ADD COLUMN IF NOT EXISTS "priority_level" text NOT NULL DEFAULT 'normal'
  `;

  await sql`
    ALTER TABLE "reports"
    ADD COLUMN IF NOT EXISTS "priority_reason" text
  `;

  await sql`
    ALTER TABLE "reports"
    ADD COLUMN IF NOT EXISTS "outcome_summary" text
  `;

  await sql`
    ALTER TABLE "reports"
    ADD COLUMN IF NOT EXISTS "outcome_follow_up" text
  `;

  await sql`
    ALTER TABLE "reports"
    ADD COLUMN IF NOT EXISTS "additional_info_request" text
  `;

  await sql`
    ALTER TABLE "reports"
    ADD COLUMN IF NOT EXISTS "additional_info_requested_at" timestamp
  `;

  await sql`
    ALTER TABLE "ptsp_visit_logs"
    ADD COLUMN IF NOT EXISTS "visitor_card_number" text
  `;

  await sql`
    ALTER TABLE "ptsp_visit_logs"
    ADD COLUMN IF NOT EXISTS "bidang_id" integer REFERENCES "bidang"("id") ON DELETE SET NULL
  `;

  await sql`
    ALTER TABLE "ptsp_visit_logs"
    ADD COLUMN IF NOT EXISTS "target_name" text
  `;

  await sql`
    ALTER TABLE "ptsp_visit_logs"
    ADD COLUMN IF NOT EXISTS "is_incognito" boolean NOT NULL DEFAULT false
  `;

  await sql`
    ALTER TABLE "ptsp_visit_logs"
    ADD COLUMN IF NOT EXISTS "appointment_id" integer
  `;

  await sql`
    ALTER TABLE "wa_sessions"
    ADD COLUMN IF NOT EXISTS "clarification_count" integer NOT NULL DEFAULT 0
  `;

  await sql`
    ALTER TABLE "wa_sessions"
    ADD COLUMN IF NOT EXISTS "last_detected_intent" text DEFAULT 'needs_guidance'
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "skm" (
      "id" serial PRIMARY KEY NOT NULL,
      "report_id" integer NOT NULL REFERENCES "reports"("id") ON DELETE CASCADE,
      "u1" integer NOT NULL,
      "u2" integer NOT NULL,
      "u3" integer NOT NULL,
      "u4" integer NOT NULL,
      "u5" integer NOT NULL,
      "u6" integer NOT NULL,
      "u7" integer NOT NULL,
      "u8" integer NOT NULL,
      "u9" integer NOT NULL,
      "saran" text,
      "created_at" timestamp DEFAULT now()
    )
  `;

  // Track migration
  await sql`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      "id" serial PRIMARY KEY,
      "hash" text NOT NULL,
      "created_at" bigint
    )
  `;

  console.log("✅ All tables created!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
});
