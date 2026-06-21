import 'dotenv/config';

const required = (key) => {
  const value = process.env[key];
  if (!value) {
    console.error(`[config] Variável de ambiente obrigatória não definida: ${key}`);
    process.exit(1);
  }
  return value;
};

const optional = (key, defaultValue) => process.env[key] ?? defaultValue;

const config = {
  server: {
    port: parseInt(optional('PORT', '3000'), 10),
    nodeEnv: optional('NODE_ENV', 'development'),
  },
  rdStation: {
    clientId:     required('RD_STATION_CLIENT_ID'),
    clientSecret: required('RD_STATION_CLIENT_SECRET'),
    redirectUri:  optional('RD_STATION_REDIRECT_URI', 'http://localhost:3000/api/auth/callback'),
    apiUrl:       optional('RD_STATION_API_URL', 'https://api.rd.services/platform'),
  },
  database: {
    host:     required('DB_HOST'),
    port:     parseInt(optional('DB_PORT', '5432'), 10),
    user:     required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: required('DB_NAME'),
  },
  logging: {
    level: optional('LOG_LEVEL', 'info'),
  },
  webhook: {
    secret: optional('WEBHOOK_SECRET', ''),
  },
  protheus: {
    apiKey: required('PROTHEUS_API_KEY'),
  },
  email: {
    smtpHost:   required('SMTP_HOST'),
    smtpPort:   parseInt(optional('SMTP_PORT', '587'), 10),
    smtpSecure: optional('SMTP_SECURE', 'false') === 'true',
    smtpUser:   required('SMTP_USER'),
    smtpPass:   required('SMTP_PASS'),
    from:       optional('EMAIL_FROM', process.env['SMTP_USER'] ?? ''),
    notifyTo:   required('NOTIFY_EMAIL_TO'),
  },
};

export default config;
