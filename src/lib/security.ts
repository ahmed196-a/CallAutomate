/**
 * Security helpers for rate limiting, client IP detection, Turnstile verification, and input sanitization.
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const memoryRateLimitMap = new Map<string, RateLimitRecord>();

// Periodic cleanup of expired in-memory rate limit records
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryRateLimitMap.entries()) {
      if (now > record.resetTime) {
        memoryRateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

/**
 * Extracts the trusted client IP from proxy headers.
 * Prioritizes Cloudflare (cf-connecting-ip) and standard reverse proxy headers (x-real-ip),
 * and parses x-forwarded-for securely.
 */
export function getClientIp(req: Request): string {
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    // When behind a proxy, client can prepend fake IPs;
    // the last non-empty IP entry is set by the most immediate trusted proxy.
    const parts = forwarded.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) {
      return parts[parts.length - 1];
    }
  }

  return "127.0.0.1";
}

/**
 * Rate limiter supporting optional Upstash Redis for distributed / serverless deployments
 * with an in-memory sliding window fallback.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      const windowSec = Math.ceil(windowMs / 1000);
      const res = await fetch(`${upstashUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", key],
          ["EXPIRE", key, windowSec, "NX"],
        ]),
        signal: AbortSignal.timeout(2000),
      });

      if (res.ok) {
        const data = await res.json();
        const count = Number(data?.[0]?.result ?? 1);
        return {
          allowed: count <= maxRequests,
          remaining: Math.max(0, maxRequests - count),
        };
      }
    } catch (err) {
      console.warn("[RateLimit] Upstash Redis request failed, falling back to memory:", err);
    }
  }

  // In-memory fallback
  const now = Date.now();
  const record = memoryRateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    memoryRateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: maxRequests - record.count };
}

/**
 * Verifies Cloudflare Turnstile token if TURNSTILE_SECRET_KEY is configured.
 * If not configured, gracefully allows requests (for local dev and staging without Turnstile keys).
 */
export async function verifyTurnstileToken(
  token: unknown,
  remoteIp?: string
): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    return { success: true };
  }

  if (!token || typeof token !== "string") {
    return { success: false, error: "CAPTCHA verification is required." };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (remoteIp && remoteIp !== "127.0.0.1") {
      formData.append("remoteip", remoteIp);
    }

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      return { success: false, error: "CAPTCHA verification service error." };
    }

    const outcome = await res.json();
    if (!outcome.success) {
      return { success: false, error: "CAPTCHA validation failed. Please try again." };
    }

    return { success: true };
  } catch (err) {
    console.error("[Turnstile] Verification failed:", err);
    return { success: false, error: "Could not verify CAPTCHA. Please try again later." };
  }
}

/**
 * Strips non-printable ASCII control characters and limits string length.
 */
export function sanitizeText(val: unknown, maxLength: number): string {
  if (typeof val !== "string") return "";
  return val
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates email or phone contact format.
 */
export function isValidContact(contact: string): boolean {
  if (!contact || contact.length < 3 || contact.length > 120) return false;
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim());
  const isPhone = /^[\d\s\+\-\(\)\.]{7,30}$/.test(contact.trim());
  return isEmail || isPhone;
}
