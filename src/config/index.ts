import dotenv from 'dotenv';
import path from 'path';
import * as yup from 'yup';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = yup.object().shape({
  NODE_ENV: yup.string().oneOf(['dev', 'production']).default('dev'),
  DATABASE_URL: yup.string().required('Database URL is required'),
  PORT: yup.string().default('8020'),
  JWT_SECRET: yup.string().required(),
  JWT_REFRESH_SECRET: yup.string().required(),
  INTERNAL_API_KEY: yup.string().required(),
  ALLOWED_ORIGINS: yup.string(),
  LOG_LEVEL: yup
    .string()
    .oneOf(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'])
    .default('info'),
  API_VERSION: yup.string().default('v1'),
  MAX_API_REQUEST_RETRIES: yup.number().integer().default(3),
  GOOGLE_CLIENT_ID: yup.string().required(),
  GOOGLE_CLIENT_SECRET: yup.string().required(),
  GOOGLE_REDIRECT_URI: yup.string().required(),
  GEMINI_API_KEYS: yup.string().required(),
  GEMINI_API_KEY: yup.string().optional(), // Kept for backward compatibility
  INGESTION_API: yup.string().required(),
  RESPONSE_API_BASE_URL: yup.string().default('http://localhost:8030'),
  FACEBOOK_APP_SECRET: yup.string().optional(),
  WHATSAPP_WEBHOOK_URL: yup.string().default('https://webhook-wa-mcnp.onrender.com/webhook'),
  SMTP_USER: yup.string().required('shashanktyagiji12345@gmail.com'),
  SMTP_PASS: yup.string().required('kixt adrg lcki zcpg'),
  SMTP_VERIFY_URL: yup.string().default('https://dev.verlyai.xyz'),
  BLOB_READ_WRITE_TOKEN: yup.string().default(''),
  // LiveKit Voice Services
  LIVEKIT_URL: yup.string().optional(),
  LIVEKIT_API_KEY: yup.string().optional(),
  LIVEKIT_API_SECRET: yup.string().optional(),
  LIVEKIT_AGENT_NAME: yup.string().optional().default('voice-assistant'),
});

// Load and parse the environment variables
const parsedEnv = envSchema.validateSync(process.env, {
  abortEarly: false,
  stripUnknown: true,
});

const env = parsedEnv;

export default env;