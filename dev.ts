#!/usr/bin/env -S deno run -A --watch=static/,routes/

import dev from "$fresh/dev.ts";
import config from "./fresh.config.ts";

import { load } from "$std/dotenv/mod.ts";

// Load environment variables if .env file exists, but don't fail if it doesn't
try {
  await load({ export: true, allowEmptyValues: true });
} catch {
  // Ignore errors in development if .env files don't exist
}

await dev(import.meta.url, "./main.ts", config);
