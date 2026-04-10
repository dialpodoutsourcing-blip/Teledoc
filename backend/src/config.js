const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

function parseAllowedOrigins(value = process.env.ALLOWED_ORIGINS) {
  const configuredOrigins = (value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_ALLOWED_ORIGINS;
}

module.exports = {
  parseAllowedOrigins,
};
