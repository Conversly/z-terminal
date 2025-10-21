import dotenv from 'dotenv';
import path from 'path';
import * as yup from 'yup';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = yup.object().shape({
  NODE_ENV: yup.string().oneOf(['dev', 'production']).default('dev'),
  DATABASE_URL: yup.string().required('Database URL is required'),
  PORT: yup.string().default('3000'),
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
});

// Load and parse the environment variables
const parsedEnv = envSchema.validateSync(process.env, {
  abortEarly: false,
  stripUnknown: true,
});

const env = parsedEnv;

export default env;