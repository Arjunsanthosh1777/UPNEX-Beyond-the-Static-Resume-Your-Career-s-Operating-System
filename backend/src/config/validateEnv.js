// Startup configuration validation. Fails fast with a clear, actionable
// error instead of surfacing an opaque crash deep inside a request.

// Variables the API cannot serve requests without.
const REQUIRED_VARS = ["JWT_SECRET", "DATABASE_URL"];

// Variables features degrade gracefully without (Google sign-in just reports
// "not configured"), so their absence is only a warning.
const OPTIONAL_GROUPS = [
  {
    label: "Google sign-in",
    vars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"]
  },
  { label: "CORS / frontend origin", vars: ["CLIENT_URL"] }
];

function isMissing(name) {
  const value = process.env[name];
  return value === undefined || value === null || String(value).trim() === "";
}

// Placeholder values ("your-google-client-id", "change-me-...") count as
// unconfigured too — they pass a truthiness check but break at runtime.
const PLACEHOLDER_MARKERS = ["your-", "change-me", "changeme", "example", "xxx", "yourgoogle"];
function isPlaceholder(name) {
  const value = String(process.env[name] || "").trim().toLowerCase();
  return value === "" || PLACEHOLDER_MARKERS.some((marker) => value.includes(marker));
}

export function validateEnv({ exitOnError = true } = {}) {
  const missingRequired = REQUIRED_VARS.filter((name) => isMissing(name) || isPlaceholder(name));
  const warnings = OPTIONAL_GROUPS.filter((group) => group.vars.some((name) => isMissing(name) || isPlaceholder(name))).map(
    (group) => `${group.label} is disabled — missing or placeholder: ${group.vars.filter((name) => isMissing(name) || isPlaceholder(name)).join(", ")}`
  );

  if (missingRequired.length > 0) {
    const lines = [
      "UPNEX API cannot start: missing required environment variable(s):",
      ...missingRequired.map((name) => `  - ${name}`),
      "Set these in your backend .env file (see .env.example) and restart."
    ];
    const error = new Error(lines.join("\n"));
    if (exitOnError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }

  for (const warning of warnings) {
    console.warn(`[config] ${warning}`);
  }

  return { missingRequired, warnings };
}
