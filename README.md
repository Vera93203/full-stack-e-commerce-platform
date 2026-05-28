# Full-Stack E-Commerce Platform

[![Node](https://img.shields.io/badge/Node-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)

A modern full-stack e-commerce demo with a customer storefront and an admin console. Built with **React 19**, **Express**, **TypeScript**, and **Tailwind CSS v4**, it runs as a single Node process that serves the API and the SPA (Vite in development, static assets in production).

Perfect for portfolios, learning full-stack patterns, or extending into a production app with a real database and payment provider.

---

## Features

### Customer storefront

- Product catalog with **search**, **category filters**, **price range**, **minimum rating**, and **sorting** (price, rating)
- Product detail modal with image gallery, color/size variants, and specifications
- Shopping cart persisted in **localStorage**
- Checkout flow with address fields and **simulated Stripe** card payment
- Order history tab for completed purchases
- Optional **Google Maps Places** address autocomplete (when API key is set)

### Admin console

Switch from the shop via **Admin** in the header.

- **Dashboard** — revenue, order count, average order value, conversion rate
- **Products** — create, edit, delete; bulk delete and bulk restock (+20 units); CSV export
- **Orders** — update status (`processing` → `shipped` → `delivered`), refund with inventory restore
- **Analytics** — 7-day sales chart, category revenue breakdown, conversion funnel, top products
- **Image uploads** — base64 images saved to `uploads/` and served at `/uploads/...`

### Backend

- REST API on Express
- JSON file persistence (`database.json`) with seeded sample products and orders
- Stock checks on checkout; inventory deducted on order, restored on refund
- Simulated order confirmation emails (logged to server console)

---

## Tech stack

| Layer      | Technology                                      |
| ---------- | ----------------------------------------------- |
| Frontend   | React 19, TypeScript, Tailwind CSS 4, Motion    |
| Icons      | Lucide React                                    |
| Build      | Vite 6                                          |
| Backend    | Express 4, Node.js                              |
| Data       | JSON file store (`database.json`)               |
| Dev server | `tsx` — API + Vite middleware on one port       |

---

## Quick start

### Prerequisites

- **Node.js** 18+ (20+ recommended)
- **npm** (or pnpm/yarn)

### 1. Clone and install

```bash
git clone https://github.com/Vera93203/full-stack-e-commerce-platform.git
cd full-stack-e-commerce-platform
npm install
```

### 2. Environment variables (optional)

Copy the example file:

```bash
cp .env.example .env
```

| Variable                   | Required | Description |
| -------------------------- | -------- | ----------- |
| `GOOGLE_MAPS_PLATFORM_KEY` | No       | Enables address autocomplete at checkout ([Google Maps Platform](https://developers.google.com/maps/documentation/places/web-service)) |
| `NODE_ENV`                 | No       | Set to `production` for production static serving |
| `GEMINI_API_KEY`           | No       | Reserved for future AI features; **not used** by the app today |

### 3. Run locally

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**.

- **Shop** — browse and buy (default view)
- **Admin** — link in the header for the management console

On first run, `database.json` is created with sample products and orders. Uploaded product images are stored in `uploads/`.

---

## Scripts

| Command           | Description |
| ----------------- | ----------- |
| `npm run dev`     | Start dev server (Express + Vite HMR) on port **3000** |
| `npm run build`   | Build frontend to `dist/` and bundle server to `dist/server.cjs` |
| `npm start`       | Run production server (`NODE_ENV=production` recommended) |
| `npm run preview` | Preview Vite build only (API not included) |
| `npm run lint`    | TypeScript check (`tsc --noEmit`) |
| `npm run clean`   | Remove `dist/`, `database.json` (resets local data) |

### Production build

```bash
npm run build
NODE_ENV=production npm start
```

---

## API reference

Base URL: `http://localhost:3000` (dev)

| Method   | Endpoint                    | Description |
| -------- | --------------------------- | ----------- |
| `GET`    | `/api/health`               | Health check |
| `GET`    | `/api/products`             | List products (`search`, `category`, `priceMin`, `priceMax`, `rating`, `sort`) |
| `GET`    | `/api/products/:id`         | Single product |
| `POST`   | `/api/products`             | Create product |
| `PUT`    | `/api/products/:id`         | Update product |
| `DELETE` | `/api/products/:id`         | Delete product |
| `GET`    | `/api/orders`               | List orders (newest first) |
| `POST`   | `/api/orders`               | Place order (validates stock) |
| `POST`   | `/api/orders/:id/status`    | Update order status (`body: { status }`) |
| `POST`   | `/api/orders/:id/refund`    | Refund order and restock items |
| `GET`    | `/api/analytics`            | Admin analytics payload |

**Query parameters for `GET /api/products`**

- `search` — full-text match on title, description, category
- `category` — exact category (case-insensitive), omit or use `All` for no filter
- `priceMin`, `priceMax` — numeric bounds
- `rating` — minimum rating
- `sort` — `price-asc` | `price-desc` | `rating`

---

## Project structure

```text
├── server.ts              # Express app, API routes, Vite/static serving
├── server/
│   └── db.ts              # JSON database, seeds, analytics
├── src/
│   ├── App.tsx            # Storefront ↔ Admin routing, cart state
│   ├── types.ts           # Shared TypeScript interfaces
│   ├── components/
│   │   ├── Storefront.tsx # Shop, cart, checkout, orders
│   │   └── AdminPanel.tsx # Dashboard, CRUD, analytics
│   ├── main.tsx
│   └── index.css          # Tailwind entry
├── database.json          # Created at runtime (gitignored recommended)
├── uploads/               # Product images from admin uploads
├── vite.config.ts
├── package.json
└── .env.example
```

---

## Data & persistence

- **Products & orders** — stored in `database.json` at the project root
- **Cart** — `localStorage` key `sovereign_cart`
- **Images** — files in `uploads/` when admins upload via the product form

To reset demo data:

```bash
npm run clean
npm run dev
```

> **Note:** Add `database.json` and `uploads/` to `.gitignore` if you do not want local shop data committed to GitHub.

---

## Deployment notes

This app is designed as a **single web service**:

1. Run `npm run build`
2. Set `NODE_ENV=production`
3. Start with `npm start` (listens on `0.0.0.0:3000`)

For platforms like **Render**, **Railway**, or **Fly.io**, use the build command above and expose port **3000** (or map `PORT` if you add env support later).

**Limitations for production use (by design in this demo):**

- JSON file database is not suitable for concurrent writes at scale
- Stripe and email flows are **simulated** (console logs only)
- No authentication on the admin panel — add auth before public deployment

---

## Screenshots

_Add screenshots here after deploying or running locally, for example:_

- Storefront catalog
- Product detail / checkout
- Admin dashboard and analytics

```markdown
![Storefront](./docs/screenshots/storefront.png)
![Admin dashboard](./docs/screenshots/admin.png)
```

---

## Roadmap ideas

- [ ] PostgreSQL or MongoDB instead of `database.json`
- [ ] Real Stripe Checkout / Payment Intents
- [ ] Admin authentication (JWT, session, or OAuth)
- [ ] Customer accounts and order lookup by email
- [ ] Email provider (Resend, SendGrid) for receipts

---

## License

Source files are marked **Apache-2.0** (`SPDX-License-Identifier: Apache-2.0`).

---

## Author

**[Vera93203](https://github.com/Vera93203)** — portfolio full-stack e-commerce project.

**Live repository:** [github.com/Vera93203/full-stack-e-commerce-platform](https://github.com/Vera93203/full-stack-e-commerce-platform)
