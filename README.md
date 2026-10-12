# UrlShortenerAPI

A high-throughput, production-grade URL shortening and click analytics REST API built with Node.js, Express, MySQL, and Redis. Features Base62 deterministic encoding, sub-5ms caching, sliding-window rate limiting, and interactive OpenAPI (Swagger) documentation. Containerized with Docker and Docker Compose.

---

## Architecture & System Design

```
                     ┌──────────────────────────────────────────────┐
                     │              Docker Network                  │
                     │                                              │
  Client ───────────▶│   Express App (:3000)                        │
 (Browser / Postman) │    ├── POST /api/shorten                     │
                     │    │    └── RateLimiter ──▶ Base62 + MySQL   │
                     │    │                        └── Write Cache  │
                     │    ├── GET  /:shortCode                      │
                     │    │    ├── Cache-Aside Hit ──▶ <5ms Redirect│
                     │    │    └── Cache Miss ───────▶ MySQL Lookup │
                     │    │    └── Async Click Log ──▶ Clicks Table │
                     │    └── GET  /api/analytics/:code             │
                     │         └── Aggregated Click Metrics         │
                     │                                              │
                     │   ┌────────────────┐   ┌─────────────────┐   │
                     │   │  Redis (:6379) │   │  MySQL (:3306)  │   │
                     │   │  In-Memory     │   │  Relational DB  │   │
                     │   └────────────────┘   └─────────────────┘   │
                     └──────────────────────────────────────────────┘
```

### Clean Layered Architecture
```
src/
├── config/       # Environment loading, MySQL pool, Redis client, Swagger options
├── controllers/  # HTTP request/response validation and status code mapping
├── middleware/   # Redis sliding-window rate limiter and centralized error handler
├── models/       # Raw parameterized SQL queries preventing SQL injection
├── routes/       # Express router definitions with JSDoc OpenAPI annotations
├── services/     # Business logic, Base62 encoding, caching & async analytics
└── utils/        # Base62 encoder/decoder
```

---

## Core Engineering Decisions

### 1. Base62 Encoding vs. Hash Truncation
Instead of computing MD5/SHA-256 hashes and truncating them (which risks hash collisions as volume grows), this service uses **Base62 encoding (`[0-9a-zA-Z]`) on auto-incrementing integer IDs**:
- **Deterministic & collision-free**: Each unique database ID maps to a unique alphanumeric string.
- **Compact URL length**: An integer ID of `1,000,000` encodes to only 4 characters (`4c92`).
- **URL-safe**: Unlike Base64, Base62 omits special characters (`+`, `/`) that require URL percent-encoding.

### 2. HTTP 302 Found vs. 301 Moved Permanently
Redirects deliberately return **HTTP 302 Found** rather than HTTP 301:
- A `301` status signals a permanent redirect, prompting browsers and intermediate proxies to cache the redirect locally. Subsequent clicks bypass the API server entirely, resulting in lost click telemetry.
- A `302` status ensures that every click hits the application server first, allowing 100% of click events (timestamps, referrers, and user agents) to be logged before redirection.

### 3. Cache-Aside Pattern with Redis
- Short code resolutions (`GET /:shortCode`) query Redis first (`url:<shortCode>`).
- If found, redirects execute in **<5ms** without database access.
- On a cache miss, the service queries indexed MySQL records, updates Redis with a 24-hour TTL (`EX 86400`), and returns the response.
- If Redis is unavailable, the application gracefully degrades to direct database queries without downtime.

### 4. Sliding-Window Rate Limiting
To mitigate brute-force creation and DDoS vectors:
- Implemented sliding-window rate limiting using **Redis Sorted Sets**.
- Every request appends a millisecond timestamp member to `ratelimit:<clientIp>`.
- Older entries outside the sliding window (`Date.now() - 60000`) are evicted via `ZREMRANGEBYSCORE`.
- `ZCARD` verifies whether the request count within the active window exceeds the threshold (10 req/min default).
- Operations are batched via Redis pipelining into a single round-trip, returning standard `X-RateLimit-*` headers.

### 5. Asynchronous Fire-and-Forget Analytics
- Click logging (`INSERT INTO clicks ...`) runs asynchronously without awaiting database completion in the request lifecycle.
- Clients receive the `302 Found` response immediately, isolating redirect latency from write operations on the database.

---

## Tech Stack

| Component | Technology | Rationale |
|---|---|---|
| Runtime | Node.js (v20 LTS) | Asynchronous non-blocking event loop ideal for I/O-intensive workloads |
| Web Framework | Express | Lightweight routing, modular middleware architecture |
| Relational Storage | MySQL 8.0 | Structured schemas, unique constraints, foreign keys, compound indexes |
| Cache & Rate Limiting | Redis 7 | In-memory key-value lookups and sorted sets for low-latency rate limiting |
| Documentation | Swagger / OpenAPI 3.0 | Self-documenting API explorer served directly at `/api-docs` |
| Containerization | Docker & Docker Compose | Standardized, single-command development and production environments |

---

## API Reference

Interactive API documentation and schema exploration is available at `/api-docs` via Swagger UI.

### 1. Shorten URL
`POST /api/shorten`

**Request Body:**
```json
{
  "longUrl": "https://github.com/simarKumar/UrlShortenerAPI"
}
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "shortCode": "1",
    "shortUrl": "http://localhost:3000/1",
    "longUrl": "https://github.com/simarKumar/UrlShortenerAPI",
    "createdAt": "2026-10-12T18:30:00.000Z"
  }
}
```

### 2. Redirect
`GET /:shortCode`

**Response (`302 Found`):**
```http
HTTP/1.1 302 Found
Location: https://github.com/simarKumar/UrlShortenerAPI
```

### 3. Click Analytics
`GET /api/analytics/:shortCode`

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "shortCode": "1",
    "longUrl": "https://github.com/simarKumar/UrlShortenerAPI",
    "createdAt": "2026-10-12T18:30:00.000Z",
    "totalClicks": 142,
    "clicksByDay": [
      { "date": "2026-10-12T18:30:00.000Z", "clicks": 95 },
      { "date": "2026-10-11T18:30:00.000Z", "clicks": 47 }
    ],
    "topReferrers": [
      { "referrer": "https://linkedin.com", "clicks": 80 },
      { "referrer": "direct", "clicks": 62 }
    ]
  }
}
```

---

## Local Development & Setup

### 1. Clone Repository
```bash
git clone https://github.com/simarKumar/UrlShortenerAPI.git
cd UrlShortenerAPI
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and configure your credentials:
```bash
cp .env.example .env
```

### 3. Initialize Database
Execute schema migration script:
```bash
npm run init-db
```

### 4. Start Server
```bash
# Development mode with watch mode
npm run dev

# Production mode
npm start
```

### 5. Run Automated Integration Tests
```bash
npm test
```

---

## Docker Deployment

To spin up the entire multi-container stack (Node.js API, MySQL with auto-initialized schemas, and Redis):

```bash
docker-compose up --build -d
```

Check service health:
```bash
docker-compose ps
```

Stop stack and clean up:
```bash
docker-compose down -v
```

---

## License
MIT License. Created by [Simar Kumar](https://github.com/simarKumar).
