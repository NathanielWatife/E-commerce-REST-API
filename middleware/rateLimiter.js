const buckets = new Map();

const MAX = Number(process.env.CHATBOT_RATE_LIMIT_MAX || 20); // requests
const WINDOW_MS = Number(process.env.CHATBOT_RATE_LIMIT_WINDOW_MS || 60_000); // 1 minute

export function rateLimitChatbot(req, res, next) {
  try {
    const key = req.user?._id?.toString() || req.ip;
    const now = Date.now();
    const bucket = buckets.get(key) || { count: 0, start: now };

    // Reset the window
    if (now - bucket.start >= WINDOW_MS) {
      bucket.count = 0;
      bucket.start = now;
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > MAX) {
      const retryAfter = Math.ceil((bucket.start + WINDOW_MS - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        message: 'Too many requests to chat. Please wait a moment and try again.',
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}
