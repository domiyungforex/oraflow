import { Request, Response, NextFunction } from "express";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100;

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const key = req.ip || req.headers["x-forwarded-for"] as string || "unknown";
  const now = Date.now();

  if (!store[key] || now > store[key].resetTime) {
    store[key] = {
      count: 1,
      resetTime: now + WINDOW_MS,
    };
  } else {
    store[key].count++;
  }

  if (store[key].count > MAX_REQUESTS) {
    return res.status(429).json({
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Please try again later.",
        retryAfter: Math.ceil((store[key].resetTime - now) / 1000),
      },
    });
  }

  // Set rate limit headers
  res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, MAX_REQUESTS - store[key].count));
  res.setHeader("X-RateLimit-Reset", Math.ceil(store[key].resetTime / 1000));

  next();
}
