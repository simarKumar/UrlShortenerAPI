const urlModel = require('../models/urlModel');
const clickModel = require('../models/clickModel');
const redis = require('../config/redis');
const base62 = require('../utils/base62');
const config = require('../config/env');

const CACHE_TTL = 60 * 60 * 24; // 24 hours

/**
 * Creates a shortened URL from a long URL.
 * Checks for existing mappings before inserting a new record.
 */
async function createShortUrl(longUrl) {
  const existing = await urlModel.findByLongUrl(longUrl);
  if (existing) {
    return {
      shortCode: existing.short_code,
      shortUrl: `${config.baseUrl}/${existing.short_code}`,
      longUrl: existing.long_url,
      createdAt: existing.created_at,
    };
  }

  const insertId = await urlModel.create(longUrl);
  const shortCode = base62.encode(insertId);
  await urlModel.updateShortCode(insertId, shortCode);

  if (redis.status === 'ready') {
    try {
      await redis.set(`url:${shortCode}`, longUrl, 'EX', CACHE_TTL);
    } catch {
      // Non-blocking cache failure fallback
    }
  }

  return {
    shortCode,
    shortUrl: `${config.baseUrl}/${shortCode}`,
    longUrl,
    createdAt: new Date(),
  };
}

/**
 * Resolves a short code using Cache-Aside strategy (Redis first, then MySQL).
 */
async function resolveShortCode(shortCode) {
  if (redis.status === 'ready') {
    try {
      const cached = await redis.get(`url:${shortCode}`);
      if (cached) {
        return { longUrl: cached, fromCache: true };
      }
    } catch {
      // Fallback to database on cache error
    }
  }

  const urlRecord = await urlModel.findByShortCode(shortCode);
  if (!urlRecord) return null;

  if (redis.status === 'ready') {
    try {
      await redis.set(`url:${shortCode}`, urlRecord.long_url, 'EX', CACHE_TTL);
    } catch {
      // Continue execution if cache write fails
    }
  }

  return {
    id: urlRecord.id,
    longUrl: urlRecord.long_url,
    fromCache: false,
  };
}

/**
 * Asynchronously records click analytics without delaying the redirect response.
 */
function recordClick(shortCode, ip, userAgent, referrer) {
  urlModel.findByShortCode(shortCode)
    .then((urlRecord) => {
      if (urlRecord) {
        return clickModel.recordClick(urlRecord.id, ip, userAgent, referrer);
      }
    })
    .catch((err) => {
      console.error('Failed to log click analytics:', err.message);
    });
}

/**
 * Retrieves aggregated analytics for a given short code.
 */
async function getAnalytics(shortCode) {
  const urlRecord = await urlModel.findByShortCode(shortCode);
  if (!urlRecord) return null;

  const [totalClicks, clicksByDay, topReferrers] = await Promise.all([
    clickModel.getTotalClicks(urlRecord.id),
    clickModel.getClicksByDay(urlRecord.id),
    clickModel.getTopReferrers(urlRecord.id),
  ]);

  return {
    shortCode: urlRecord.short_code,
    longUrl: urlRecord.long_url,
    createdAt: urlRecord.created_at,
    totalClicks,
    clicksByDay,
    topReferrers,
  };
}

module.exports = { createShortUrl, resolveShortCode, recordClick, getAnalytics };
