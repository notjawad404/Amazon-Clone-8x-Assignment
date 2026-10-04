# ShopNest (Amazon Clone)

An Amazon-style store built with MongoDB, Express, React and Node.

- `client/`: React + Vite, React Router, Redux Toolkit (RTK Query), Tailwind CSS v4, Stripe.js
- `server/`: Express 5, Mongoose, Zod, JWT, Stripe, Cloudinary

## Prerequisites

- Node.js 22.17+ and npm
- A MongoDB Atlas cluster (the free M0 tier works)
- A Stripe account in test mode, plus the [Stripe CLI](https://docs.stripe.com/stripe-cli)
- A Cloudinary account (free tier)

## Setup

```bash
npm install            # root tooling (concurrently)
npm run install:all    # server and client dependencies
```

Fill in the two env files. Each `.env.example` explains where every value comes from.

| File | Values |
|---|---|
| `server/.env` | `MONGODB_URI`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CLOUDINARY_*` (`JWT_SECRET` is already generated) |
| `client/.env` | `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_CLOUDINARY_CLOUD_NAME` |

In Atlas, allow your IP under **Network Access**, or the connection will time out.

## Check the external services

```bash
npm run check:services
```

This connects to MongoDB (and confirms it is a replica set, which transactions need), calls the Stripe API with your test key, and pings Cloudinary. It also checks that the client keys are consistent with the server ones. To check one service:

```bash
npm run check:services -- mongodb
npm run check:services -- stripe
npm run check:services -- cloudinary
```

## Run locally

```bash
npm run dev
```

- Client: http://localhost:5173
- API: http://localhost:5000/api (also reachable through the client at `/api`)
- Health check: http://localhost:5173/api/health → `{ "status": "ok", "db": "connected" }`

For Stripe webhooks (needed from checkout onwards), run this in a second terminal:

```bash
npm run stripe:listen
```

## Scripts

| Root script | Does |
|---|---|
| `npm run dev` | Starts server and client together |
| `npm run check:services` | Tests the MongoDB, Stripe and Cloudinary credentials |
| `npm test` | Server tests (Vitest + supertest + in-memory MongoDB) |
| `npm run lint` | ESLint for server and client |
| `npm run seed` | Imports the catalog into an empty database |
| `npm run stripe:listen` | Forwards Stripe webhooks to the local API |
