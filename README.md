# NovaMart

A small 3-tier e-commerce app, built as a DevOps portfolio project.

## Structure
```
novamart/
├── backend/    Node.js + Express REST API (PostgreSQL, Redis)
├── frontend/   Next.js 16 storefront (port 3000)
└── README.md
```

## Requirements
- Node.js 20.9 or newer
- Docker (for local PostgreSQL and Redis)

## Run everything with Docker Compose
The quickest way to run the whole stack (PostgreSQL, Redis, API and storefront):

```
cp .env.example .env
```
Edit `.env` and set real values for `POSTGRES_PASSWORD` and `JWT_SECRET`, then:
```
docker compose up -d --build
docker compose run --rm backend node src/db/seed.js
```
Open http://localhost:3000. Check the services with `docker compose ps`.

Stop everything with `docker compose down` (your data is kept in a Docker volume).
Add `-v` to also delete the database data.

## Backend: run locally
1. Start PostgreSQL and Redis (local development only):
   ```
   docker run -d --name novamart-pg -e POSTGRES_USER=novamart \
     -e POSTGRES_PASSWORD=novamart_pass -e POSTGRES_DB=novamart \
     -p 5432:5432 postgres:16-alpine
   docker run -d --name novamart-redis -p 6379:6379 redis:7-alpine
   ```
2. `cd backend && cp .env.example .env`
   Replace `JWT_SECRET` with your own long random value. If you want an admin user,
   uncomment `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
3. `npm install`
4. `npm run migrate`, then `npm run seed`
5. `npm run dev` (the API listens on http://localhost:4000)
6. In a second terminal: `npm run smoke` (automatic end-to-end test of the whole API)

Unit tests: `npm test`

## Frontend: run locally
With the backend running and seeded:
```
cd frontend
cp .env.example .env.local
npm install
npm run dev      # http://localhost:3000
```
More details are in `frontend/README.md`.

## API
All requests and responses are JSON. Money is in cents (for example, 8999 = $89.99).
Send the token as `Authorization: Bearer <token>`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /api/health, /live, /ready | - | Health checks |
| POST | /api/auth/register | - | Create an account, returns a token |
| POST | /api/auth/login | - | Log in, returns a token |
| GET | /api/auth/me | user | Current user |
| GET | /api/products | - | List (category, search, sort, page, limit) |
| GET | /api/products/categories | - | Categories |
| GET | /api/products/:slug | - | Product details |
| POST / PATCH | /api/products, /api/products/:id | admin | Create / update a product |
| GET | /api/cart | user | Get the cart |
| POST | /api/cart/items | user | Add to cart `{productId, quantity}` |
| PATCH / DELETE | /api/cart/items/:productId | user | Change quantity / remove |
| DELETE | /api/cart | user | Empty the cart |
| POST | /api/orders | user | Turn the cart into an order `{shippingName, shippingAddress}` |
| GET | /api/orders, /api/orders/:id | user | My orders |

## Health endpoints
- `GET /api/health/live`: the process is alive (Kubernetes liveness probe)
- `GET /api/health/ready`: the database is reachable (Kubernetes readiness probe).
  Redis is only a cache, so the app stays ready when Redis is down.

## Security notes
**Already in the app**
- Passwords are hashed with bcrypt (cost 12). Login takes the same time for an unknown
  email and for a wrong password.
- JWTs accept HS256 only, and the user is re-checked in the database on every request.
- All input is validated with zod. SQL uses parameterized queries only (`%` and `_` in
  search text are escaped).
- Stock cannot be oversold (transaction plus row lock). The price is copied into the order.
- Login and register are rate limited; only failed attempts are counted.
- helmet on the backend and security headers on the frontend. Product image URLs must be
  http or https.
- Secrets live only in environment variables. `.env` files are never committed.
  The app refuses to start if `JWT_SECRET` is shorter than 32 characters.
- In production, error stack traces are never sent to the client.
- The frontend proxy forwards only a short list of request headers to the backend.

**Known trade-offs (left on purpose, good to explain in an interview)**
- The login token is stored in `localStorage`. An httpOnly cookie is safer in production
  because an XSS bug cannot steal it. This is the next improvement.
- Rate limiting is per client IP. That works when an ingress in front of Next.js overwrites
  `X-Forwarded-For` (as in Kubernetes). Do not expose the backend directly to the internet.
- No strict Content-Security-Policy yet (Next.js needs a nonce setup for that).
- No payment, email verification, password reset or token revocation yet.

**To do in the DevOps phase**
- TLS/HTTPS (ingress + cert-manager) and HSTS
- General rate limiting at the ingress
- Kubernetes Secrets, non-root containers, read-only filesystem
- Image scanning (Trivy) and `npm audit` in CI
- Database backups
