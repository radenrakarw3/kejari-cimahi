import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function ensureImage(file: File, label: string) {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(`${label} harus berupa gambar JPG, PNG, atau WEBP`);
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`${label} melebihi ukuran maksimum 5 MB`);
  }
}

function extFromType(type: string) {
  switch (type) {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    default:
      return ".jpg";
  }
}

export async function persistPtspVerificationFiles(params: {
  ktpPhoto: File;
  webcamPhoto: File;
}) {
  ensureImage(params.ktpPhoto, "Foto KTP");
  ensureImage(params.webcamPhoto, "Foto webcam");

  const folderId = randomUUID();
  const uploadDir = path.join(process.cwd(), "public", "uploads", "ptsp", folderId);
  await mkdir(uploadDir, { recursive: true });

  const ktpFileName = `ktp${extFromType(params.ktpPhoto.type)}`;
  const webcamFileName = `webcam${extFromType(params.webcamPhoto.type)}`;

  await writeFile(path.join(uploadDir, ktpFileName), Buffer.from(await params.ktpPhoto.arrayBuffer()));
  await writeFile(path.join(uploadDir, webcamFileName), Buffer.from(await params.webcamPhoto.arrayBuffer()));

  return {
    ktpFilePath: `/uploads/ptsp/${folderId}/${ktpFileName}`,
    webcamFilePath: `/uploads/ptsp/${folderId}/${webcamFileName}`,
  };
}
