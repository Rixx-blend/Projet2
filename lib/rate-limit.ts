/**
 * Limitation de débit en mémoire (par processus).
 *
 * Suffisante pour une application de bureau mono-utilisateur : elle protège la
 * route d'ingestion contre les envois en rafale d'un bot mal configuré.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0, remaining: limit - 1 };
  }

  current.count += 1;
  if (current.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      remaining: 0,
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
    remaining: limit - current.count,
  };
}

/** Nettoyage périodique des compteurs expirés. */
if (typeof setInterval === "function") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, 60_000);
  // Ne pas empêcher le processus de s'arrêter.
  if (typeof timer === "object" && "unref" in timer) timer.unref();
}
