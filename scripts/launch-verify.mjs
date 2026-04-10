import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const envFiles = [".env.production", ".env.local", ".env"];
const placeholderPattern =
  /^(your[-_].+|changeme|replace[-_].+|example|placeholder|xxx|todo)$/i;

const requiredChecks = [
  {
    key: "DATABASE_URL",
    required: true,
    description: "Primary database connection string",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    required: true,
    description: "Supabase project URL for client auth",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    required: true,
    description: "Supabase public anon key",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    required: true,
    description: "Supabase service role key for privileged server flows",
  },
  {
    key: "OWNER_ACCESS_CODE",
    required: true,
    description: "Owner console access code",
  },
  {
    key: "NEXT_PUBLIC_CHAT_WS_URL",
    required: false,
    description: "Realtime chat WebSocket endpoint",
  },
  {
    key: "REDIS_HOST",
    required: false,
    description: "Redis host for cache and shared state",
  },
  {
    key: "REDIS_PORT",
    required: false,
    description: "Redis port",
  },
  {
    key: "REDIS_PASSWORD",
    required: false,
    description: "Redis password",
  },
  {
    key: "SENTRY_DSN",
    required: false,
    description: "Server-side Sentry DSN",
  },
  {
    key: "NEXT_PUBLIC_SENTRY_DSN",
    required: false,
    description: "Client-side Sentry DSN",
  },
];

function parseEnvFile(content) {
  const values = new Map();

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values.set(key, value);
  }

  return values;
}

function loadEnvState() {
  const merged = new Map();
  const sources = new Map();

  for (const file of envFiles) {
    const filePath = path.join(rootDir, file);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const parsed = parseEnvFile(fs.readFileSync(filePath, "utf8"));
    for (const [key, value] of parsed.entries()) {
      if (!merged.has(key)) {
        merged.set(key, value);
        sources.set(key, file);
      }
    }
  }

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string" && value.length > 0) {
      merged.set(key, value);
      sources.set(key, "process.env");
    }
  }

  return { values: merged, sources };
}

function summarizeDatabase(databaseUrl) {
  if (!databaseUrl) {
    return {
      ok: false,
      message: "DATABASE_URL is missing.",
    };
  }

  if (
    databaseUrl.startsWith("file:") ||
    databaseUrl.endsWith(".db") ||
    databaseUrl.includes("sqlite")
  ) {
    return {
      ok: false,
      message:
        "DATABASE_URL points to SQLite. Use managed Postgres for production launch.",
    };
  }

  if (databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://")) {
    return {
      ok: true,
      message: "DATABASE_URL looks like a Postgres connection string.",
    };
  }

  return {
    ok: false,
    message: "DATABASE_URL is present but does not look like a supported production database URL.",
  };
}

function detectPlaceholder(value) {
  if (!value) {
    return false;
  }

  const normalized = value.trim().replace(/^['"]|['"]$/g, "");
  if (!normalized) {
    return true;
  }

  if (placeholderPattern.test(normalized)) {
    return true;
  }

  return (
    normalized.includes("your-project") ||
    normalized.includes("your-domain") ||
    normalized.includes("your-anon-key") ||
    normalized.includes("your-service-role-key") ||
    normalized.includes("your-sentry-dsn") ||
    normalized.includes("your-public-sentry-dsn")
  );
}

function printHeader(title) {
  console.log(`\n${title}`);
}

function main() {
  const { values, sources } = loadEnvState();
  const failures = [];
  const warnings = [];

  console.log("Saree Pro launch readiness check");
  console.log(`Scanned env precedence: ${envFiles.join(" -> ")} -> process.env`);

  printHeader("Environment checks");

  for (const check of requiredChecks) {
    const value = values.get(check.key);
    const source = sources.get(check.key) || "missing";
    const hasValue = typeof value === "string" && value.length > 0;
    const isPlaceholder = hasValue && detectPlaceholder(value);

    if (!hasValue && check.required) {
      failures.push(`${check.key}: missing (${check.description})`);
      console.log(`FAIL  ${check.key}  missing`);
      continue;
    }

    if (!hasValue && !check.required) {
      warnings.push(`${check.key}: not configured (${check.description})`);
      console.log(`WARN  ${check.key}  not configured`);
      continue;
    }

    if (isPlaceholder) {
      const message = `${check.key}: placeholder value from ${source}`;
      if (check.required) {
        failures.push(message);
        console.log(`FAIL  ${check.key}  placeholder value in ${source}`);
      } else {
        warnings.push(message);
        console.log(`WARN  ${check.key}  placeholder value in ${source}`);
      }
      continue;
    }

    console.log(`PASS  ${check.key}  from ${source}`);
  }

  printHeader("Production heuristics");

  const databaseSummary = summarizeDatabase(values.get("DATABASE_URL"));
  console.log(`${databaseSummary.ok ? "PASS" : "FAIL"}  database  ${databaseSummary.message}`);
  if (!databaseSummary.ok) {
    failures.push(`database: ${databaseSummary.message}`);
  }

  const ownerCode = values.get("OWNER_ACCESS_CODE");
  if (ownerCode === "7721") {
    failures.push("OWNER_ACCESS_CODE still uses the dev fallback value 7721.");
    console.log("FAIL  owner access  still using dev fallback value 7721");
  }

  if (!values.has("REDIS_HOST")) {
    console.log("WARN  redis  app can boot without Redis, but shared cache features are not production-ready.");
  }

  if (!values.has("NEXT_PUBLIC_CHAT_WS_URL")) {
    console.log("WARN  chat  realtime chat will fall back to ws://localhost:8080.");
  }

  if (!values.has("SENTRY_DSN") || !values.has("NEXT_PUBLIC_SENTRY_DSN")) {
    console.log("WARN  sentry  monitoring is partially or fully disabled.");
  }

  printHeader("Summary");

  if (failures.length === 0) {
    console.log("PASS  Required launch checks are satisfied.");
  } else {
    console.log(`FAIL  ${failures.length} blocking issue(s) found.`);
    for (const failure of failures) {
      console.log(`- ${failure}`);
    }
  }

  if (warnings.length > 0) {
    console.log(`WARN  ${warnings.length} recommendation(s):`);
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  process.exitCode = failures.length === 0 ? 0 : 1;
}

main();
