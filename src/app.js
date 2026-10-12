const express = require('express');
const swaggerUi = require('swagger-ui-express');
const config = require('./config/env');
const redis = require('./config/redis');
const swaggerSpec = require('./config/swagger');
const urlRoutes = require('./routes/urlRoutes');
const urlController = require('./controllers/urlController');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1);
app.use(express.json());

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
app.use(urlRoutes);

/**
 * @swagger
 * /{shortCode}:
 *   get:
 *     summary: Redirect to the original URL
 *     description: Resolves a short code and redirects (HTTP 302) to the original long URL. Logs click analytics.
 *     tags: [URL Shortener]
 *     parameters:
 *       - in: path
 *         name: shortCode
 *         required: true
 *         schema:
 *           type: string
 *         description: The short code to resolve
 *         example: jU
 *     responses:
 *       302:
 *         description: Redirect to the original URL
 *       404:
 *         description: Short code not found
 */
app.get('/:shortCode', urlController.redirect);

// Global Error Handler
app.use(errorHandler);

async function start() {
  try {
    await redis.connect();
  } catch (err) {
    console.warn('Redis not available — running without cache:', err.message);
  }

  app.listen(config.port, () => {
    console.log(`URL Shortener API listening on port ${config.port}`);
    console.log(`Swagger documentation: http://localhost:${config.port}/api-docs`);
  });
}

start();

module.exports = app;
