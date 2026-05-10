import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;

function sanitizeBaseName(fileName: string) {
  return fileName
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "lampiran";
}

function extFromName(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  return ext.slice(0, 10);
}

export function validateAttachments(files: File[]) {
  if (files.length > MAX_ATTACHMENTS) {
    throw new Error(`Maksimal ${MAX_ATTACHMENTS} lampiran`);
  }

  for (const file of files) {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      throw new Error(`Tipe file tidak didukung: ${file.name}`);
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`Ukuran file terlalu besar: ${file.name}`);
    }
  }
}

export async function persistReportAttachments(reportId: number, files: File[]) {
  validateAttachments(files);

  const uploadDir = path.join(process.cwd(), "public", "uploads", "reports", String(reportId));
  await mkdir(uploadDir, { recursive: true });

  const savedFiles = [];

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const storedName = `${sanitizeBaseName(file.name)}-${randomUUID()}${extFromName(file.name)}`;
    const fullPath = path.join(uploadDir, storedName);
    const publicPath = `/uploads/reports/${reportId}/${storedName}`;

    await writeFile(fullPath, buffer);

    savedFiles.push({
      reportId,
      originalName: file.name,
      storedName,
      filePath: publicPath,
      mimeType: file.type,
      sizeBytes: file.size,
    });
  }

  return savedFiles;
}

export function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
