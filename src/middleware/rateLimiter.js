const redis = require('../config/redis');
const config = require('../config/env');

/**
 * Sliding-window rate limiter utilizing Redis Sorted Sets with pipelining.
 */
async function rateLimiter(req, res, next) {
  if (redis.status !== 'ready') {
    return next();
  }

  try {
    const clientIp = req.ip;
    const key = `ratelimit:${clientIp}`;
    const now = Date.now();
    const windowStart = now - config.rateLimit.windowSeconds * 1000;

    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    pipeline.zcard(key);
    pipeline.expire(key, config.rateLimit.windowSeconds);

    const results = await pipeline.exec();
    const requestCount = results[2][1];

    res.set({
      'X-RateLimit-Limit': config.rateLimit.maxRequests,
      'X-RateLimit-Remaining': Math.max(0, config.rateLimit.maxRequests - requestCount),
      'X-RateLimit-Reset': Math.ceil((now + config.rateLimit.windowSeconds * 1000) / 1000),
    });

    if (requestCount > config.rateLimit.maxRequests) {
      return res.status(429).json({
        success: false,
        error: `Rate limit exceeded. Try again in ${config.rateLimit.windowSeconds} seconds.`,
      });
    }

    next();
  } catch {
    next();
  }
}

module.exports = rateLimiter;
