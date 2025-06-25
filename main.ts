/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { load } from "$std/dotenv/mod.ts";

// Load environment variables if .env file exists, but don't fail if it doesn't
try {
  await load({ export: true, allowEmptyValues: true });
} catch {
  // Ignore errors in production deployment where .env files may not exist
}

import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";
import config from "./fresh.config.ts";

await start(manifest, config);
