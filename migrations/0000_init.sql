CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bidang" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"kode" text NOT NULL,
	"deskripsi" text,
	CONSTRAINT "bidang_kode_unique" UNIQUE("kode")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"kode" text NOT NULL,
	"deskripsi" text,
	"warna" text DEFAULT '#6b7280' NOT NULL,
	"icon" text DEFAULT 'FileText' NOT NULL,
	CONSTRAINT "categories_kode_unique" UNIQUE("kode")
);
--> statement-breakpoint
CREATE TABLE "disposisi" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer NOT NULL,
	"bidang_id" integer NOT NULL,
	"catatan" text,
	"disposed_by" text,
	"disposed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"nomor_laporan" text NOT NULL,
	"nama" text NOT NULL,
	"nomor_wa" text NOT NULL,
	"kelurahan" text NOT NULL,
	"rw" text NOT NULL,
	"isi_laporan" text NOT NULL,
	"kategori_id" integer,
	"status" text DEFAULT 'masuk' NOT NULL,
	"source" text DEFAULT 'web' NOT NULL,
	"wa_message_id" text,
	"ai_category_suggestion" text,
	"ai_confidence_score" text,
	"ai_alasan" text,
	"input_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "reports_nomor_laporan_unique" UNIQUE("nomor_laporan")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'staff' NOT NULL,
	"bidang_id" integer,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "wa_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer,
	"direction" text NOT NULL,
	"content" text NOT NULL,
	"phone_number" text NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disposisi" ADD CONSTRAINT "disposisi_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disposisi" ADD CONSTRAINT "disposisi_bidang_id_bidang_id_fk" FOREIGN KEY ("bidang_id") REFERENCES "public"."bidang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disposisi" ADD CONSTRAINT "disposisi_disposed_by_user_id_fk" FOREIGN KEY ("disposed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_kategori_id_categories_id_fk" FOREIGN KEY ("kategori_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_input_by_user_id_fk" FOREIGN KEY ("input_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_bidang_id_bidang_id_fk" FOREIGN KEY ("bidang_id") REFERENCES "public"."bidang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wa_logs" ADD CONSTRAINT "wa_logs_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;