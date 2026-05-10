import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let _db: NeonHttpDatabase<typeof schema> | undefined;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set. Add it in Railway service variables (or .env.local for local dev)."
      );
    }
    _db = drizzle(neon(url), { schema });
  }
  return _db;
}

// Lazy init: avoids calling neon() during `next build` when DATABASE_URL is unset (e.g. Railway).
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
}) as NeonHttpDatabase<typeof schema>;

export type DB = NeonHttpDatabase<typeof schema>;
