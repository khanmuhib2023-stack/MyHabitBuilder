/**
 * Optional: create tables from your machine (uses direct DB connection).
 *
 *   set SUPABASE_DB_URL=postgresql://postgres.[ref]:[password]@...
 *   npm run db:setup
 *
 * Get the URI from Supabase → Project Settings → Database → Connection string.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const url = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!url) {
  console.log("Skip db:setup — SUPABASE_DB_URL or DATABASE_URL not set.");
  process.exit(0);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(join(root, "supabase", "schema.sql"), "utf8");

const { default: pg } = await import("pg");
const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log("Supabase schema applied successfully.");
} catch (e) {
  console.error("db:setup failed:", e);
  process.exit(1);
} finally {
  await client.end();
}
