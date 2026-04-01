import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Categories ────────────────────────────────────────────────────────────────
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  kode: text("kode").notNull().unique(),
  deskripsi: text("deskripsi"),
  warna: text("warna").notNull().default("#6b7280"),
  icon: text("icon").notNull().default("FileText"),
});

// ─── Bidang ────────────────────────────────────────────────────────────────────
export const bidang = pgTable("bidang", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  kode: text("kode").notNull().unique(),
  deskripsi: text("deskripsi"),
});

// ─── Users (admin) ─────────────────────────────────────────────────────────────
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  role: text("role").notNull().default("staff"),
  bidangId: integer("bidang_id").references(() => bidang.id),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// ─── Reports ───────────────────────────────────────────────────────────────────
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  nomorLaporan: text("nomor_laporan").notNull().unique(),
  nama: text("nama").notNull(),
  nomorWa: text("nomor_wa").notNull(),
  kelurahan: text("kelurahan").notNull(),
  rw: text("rw").notNull(),
  isiLaporan: text("isi_laporan").notNull(),
  kategoriId: integer("kategori_id").references(() => categories.id),
  status: text("status").notNull().default("masuk"),
  // status: masuk | diproses | disposisi | selesai
  source: text("source").notNull().default("web"),
  // source: web | wa | offline
  waMessageId: text("wa_message_id"),
  aiCategorySuggestion: text("ai_category_suggestion"),
  aiConfidenceScore: text("ai_confidence_score"),
  aiAlasan: text("ai_alasan"),
  inputBy: text("input_by").references(() => user.id),
  // for offline input
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Disposisi ─────────────────────────────────────────────────────────────────
export const disposisi = pgTable("disposisi", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id")
    .notNull()
    .references(() => reports.id, { onDelete: "cascade" }),
  bidangId: integer("bidang_id")
    .notNull()
    .references(() => bidang.id),
  catatan: text("catatan"),
  disposedBy: text("disposed_by").references(() => user.id),
  disposedAt: timestamp("disposed_at").defaultNow(),
});

// ─── WA Logs ───────────────────────────────────────────────────────────────────
export const waLogs = pgTable("wa_logs", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").references(() => reports.id, {
    onDelete: "cascade",
  }),
  direction: text("direction").notNull(), // inbound | outbound
  content: text("content").notNull(),
  phoneNumber: text("phone_number").notNull(),
  status: text("status").notNull().default("sent"),
  // sent | delivered | read | failed | received
  sentBy: text("sent_by").default("admin"), // admin | ai | system
  timestamp: timestamp("timestamp").defaultNow(),
});

export const waSessions = pgTable("wa_sessions", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull().unique(),
  currentStep: text("current_step").notNull().default("ask_name"),
  nama: text("nama"),
  kelurahan: text("kelurahan"),
  rw: text("rw"),
  isiLaporan: text("isi_laporan"),
  status: text("status").notNull().default("collecting"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Zod Schemas ───────────────────────────────────────────────────────────────
export const insertReportSchema = createInsertSchema(reports, {
  nama: z.string().min(3, "Nama minimal 3 karakter"),
  nomorWa: z
    .string()
    .regex(/^(08|628)\d{8,12}$/, "Format nomor WA tidak valid (contoh: 08123456789)"),
  kelurahan: z.string().min(1, "Pilih kelurahan"),
  rw: z.string().min(1, "Pilih RW"),
  isiLaporan: z
    .string()
    .min(20, "Isi laporan minimal 20 karakter")
    .max(2000, "Isi laporan maksimal 2000 karakter"),
}).omit({
  id: true,
  nomorLaporan: true,
  kategoriId: true,
  status: true,
  waMessageId: true,
  aiCategorySuggestion: true,
  aiConfidenceScore: true,
  aiAlasan: true,
  inputBy: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDisposisiSchema = createInsertSchema(disposisi).omit({
  id: true,
  disposedAt: true,
});

export const selectReportSchema = createSelectSchema(reports);

// ─── SKM (Survey Kepuasan Masyarakat) ──────────────────────────────────────────
export const skm = pgTable("skm", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id")
    .notNull()
    .references(() => reports.id, { onDelete: "cascade" }),
  // 9 unsur SKM Permenpan RB No. 14/2017, nilai 1-4
  u1: integer("u1").notNull(), // Persyaratan
  u2: integer("u2").notNull(), // Prosedur
  u3: integer("u3").notNull(), // Waktu Penyelesaian
  u4: integer("u4").notNull(), // Biaya/Tarif
  u5: integer("u5").notNull(), // Produk Layanan
  u6: integer("u6").notNull(), // Kompetensi Pelaksana
  u7: integer("u7").notNull(), // Perilaku Pelaksana
  u8: integer("u8").notNull(), // Penanganan Pengaduan
  u9: integer("u9").notNull(), // Sarana & Prasarana
  saran: text("saran"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── TypeScript Types ──────────────────────────────────────────────────────────
export type Category = typeof categories.$inferSelect;
export type Bidang = typeof bidang.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Disposisi = typeof disposisi.$inferSelect;
export type WaLog = typeof waLogs.$inferSelect;
export type WaSession = typeof waSessions.$inferSelect;
export type User = typeof user.$inferSelect;

export type InsertReport = z.infer<typeof insertReportSchema>;
export type InsertDisposisi = z.infer<typeof insertDisposisiSchema>;
export type Skm = typeof skm.$inferSelect;
