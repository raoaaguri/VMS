import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Determine environment
const nodeEnv = process.env.NODE_ENV || "development";

// Load environment-specific .env file
let envFile;
if (nodeEnv === "production") {
  envFile = path.join(__dirname, "../../.env.production");
} else if (nodeEnv === "staging") {
  envFile = path.join(__dirname, "../../.env.staging");
} else {
  envFile = path.join(__dirname, "../../.env");
}

// Load the appropriate .env file
dotenv.config({ path: envFile });

/**
 * Application Configuration
 * Loads environment variables with sensible defaults for development
 * Production should always provide explicit environment variables
 */
export const config = {
  nodeEnv,
  port: process.env.PORT || 3001,
  isDevelopment: nodeEnv === "development",
  isProduction: nodeEnv === "production",
  isStaging: nodeEnv === "staging",

  supabase: {
    url: process.env.VITE_SUPABASE_URL,
    anonKey: process.env.VITE_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  jwt: {
    secret:
      process.env.JWT_SECRET ||
      validateEnv(
        "JWT_SECRET",
        "vendor-management-secret-key-change-in-production"
      ),
    expiresIn: "7d",
  },

  erp: {
    apiKey:
      process.env.ERP_API_KEY ||
      validateEnv("ERP_API_KEY", "erp-api-key-change-in-production"),
  },

  postgres: {
    host: process.env.PGHOST || validateEnv("PGHOST", "localhost"),
    port: parseInt(process.env.PGPORT || "5432"),
    database: process.env.PGDATABASE || validateEnv("PGDATABASE", "vms"),
    user: process.env.PGUSER || validateEnv("PGUSER", "postgres"),
    password: String(
      process.env.PGPASSWORD || validateEnv("PGPASSWORD", "postgres")
    ),
    ssl: process.env.PGSSLMODE === "require",
  },
};

/**
 * Validates that required environment variables are present
 * Warns in development, throws error in production
 */
function validateEnv(varName, defaultValue) {
  if (config.isProduction) {
    throw new Error(
      `Missing required environment variable: ${varName}\n` +
        `Please set ${varName} in your production environment.`
    );
  }
  return defaultValue;
}

// Log current configuration (sanitized for security)
if (config.isDevelopment) {
  console.log("📋 Configuration loaded:");
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(
    `  Database: ${config.postgres.user}@${config.postgres.host}:${config.postgres.port}/${config.postgres.database}`
  );
  console.log(`  Port: ${config.port}`);
}
