export function isPersistenceConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function isAuthSecretConfigured() {
  return Boolean(process.env.AUTH_SECRET);
}

export function isGoogleAuthConfigured() {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}

export function isAuthConfigured() {
  return (
    isPersistenceConfigured() &&
    isAuthSecretConfigured() &&
    isGoogleAuthConfigured()
  );
}

export function isLocalPreviewMode() {
  return process.env.NODE_ENV !== "production" && !isAuthConfigured();
}
