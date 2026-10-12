const urlService = require('../services/urlService');

/**
 * Handles URL shortening requests.
 */
async function shorten(req, res, next) {
  try {
    const { longUrl } = req.body;

    if (!longUrl) {
      return res.status(400).json({
        success: false,
        error: 'longUrl is required in the request body.',
      });
    }

    try {
      const parsed = new URL(longUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return res.status(400).json({
          success: false,
          error: 'Only HTTP and HTTPS URLs are supported.',
        });
      }
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format.',
      });
    }

    const result = await urlService.createShortUrl(longUrl);

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles short URL redirection (HTTP 302) and triggers async analytics logging.
 */
async function redirect(req, res, next) {
  try {
    const { shortCode } = req.params;

    const result = await urlService.resolveShortCode(shortCode);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: `Short URL '${shortCode}' not found.`,
      });
    }

    // Fire-and-forget click analytics
    urlService.recordClick(
      shortCode,
      req.ip,
      req.get('user-agent'),
      req.get('referer')
    );

    return res.redirect(302, result.longUrl);
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieves aggregate click metrics for a shortened URL.
 */
async function getAnalytics(req, res, next) {
  try {
    const { shortCode } = req.params;

    const analytics = await urlService.getAnalytics(shortCode);

    if (!analytics) {
      return res.status(404).json({
        success: false,
        error: `Short URL '${shortCode}' not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { shorten, redirect, getAnalytics };
