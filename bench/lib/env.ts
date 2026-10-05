import { readFileSync, existsSync } from "node:fs";

/** Loads .env.local into process.env without overriding anything already set. */
export function loadEnv(file = ".env.local") {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const i = line.indexOf("=");
    if (i < 1 || line.trimStart().startsWith("#")) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim().replace(/^"|"$/g, "");
    if (v && !process.env[k]) process.env[k] = v;
  }
}
