# NovaMart frontend

Next.js 16 (App Router) storefront with React 19.

## Run locally
1. Start the backend (`../backend`, port 4000) and run `npm run seed`.
2. `cp .env.example .env.local`
3. `npm install`
4. `npm run dev`  ->  http://localhost:3000

## How it works
- The browser only talks to `http://localhost:3000`. The Next.js proxy
  (`app/api/[...path]/route.js`) forwards `/api/*` requests to the backend. The backend
  address comes from the `API_URL` environment variable at **runtime**, so one Docker
  image can run in every environment.
- Server pages (home, products, product details) fetch data from the backend directly.
- Cart, checkout, orders and login run in the browser (the login token is kept in
  `localStorage`).
- `GET /healthz` is the frontend's own health check (for Kubernetes probes).

## Pages
`/` home, `/products`, `/products/[slug]`, `/cart`, `/checkout`, `/orders`, `/orders/[id]`,
`/login`, `/register`
