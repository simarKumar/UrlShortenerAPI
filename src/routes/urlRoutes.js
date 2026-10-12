const express = require('express');
const router = express.Router();
const urlController = require('../controllers/urlController');
const rateLimiter = require('../middleware/rateLimiter');

/**
 * @swagger
 * /api/shorten:
 *   post:
 *     summary: Shorten a long URL
 *     description: Accepts a long URL and returns a shortened version using Base62 encoding.
 *     tags: [URL Shortener]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - longUrl
 *             properties:
 *               longUrl:
 *                 type: string
 *                 example: https://www.amazon.in/dp/B09V3KXJPB?ref=cm_sw_r_cp_ud_dp
 *     responses:
 *       201:
 *         description: URL shortened successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     shortCode:
 *                       type: string
 *                       example: jU
 *                     shortUrl:
 *                       type: string
 *                       example: http://localhost:3000/jU
 *                     longUrl:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *       400:
 *         description: Invalid or missing URL
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/api/shorten', rateLimiter, urlController.shorten);

/**
 * @swagger
 * /api/analytics/{shortCode}:
 *   get:
 *     summary: Get click analytics for a short URL
 *     description: Returns total clicks, clicks by day (last 30 days), and top referrers.
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: shortCode
 *         required: true
 *         schema:
 *           type: string
 *         description: The short code to get analytics for
 *         example: jU
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     shortCode:
 *                       type: string
 *                     longUrl:
 *                       type: string
 *                     totalClicks:
 *                       type: integer
 *                     clicksByDay:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                           clicks:
 *                             type: integer
 *                     topReferrers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           referrer:
 *                             type: string
 *                           clicks:
 *                             type: integer
 *       404:
 *         description: Short URL not found
 */
router.get('/api/analytics/:shortCode', urlController.getAnalytics);

module.exports = router;
