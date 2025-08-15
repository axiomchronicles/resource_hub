# College Resource Finder — Full Stack

> A polished, multi-page, animated, responsive, and intelligent **React + Vite + Tailwind CSS** frontend with **Framer Motion**, connected to a production-grade backend built with **Aquilify Electrus** — a MongoDB-style NoSQL engine with ACID transactions, indexing, and advanced query features.

---

## Table of contents

* [About](#about)
* [Architecture Overview](#architecture-overview)
* [Key Features](#key-features)
* [Frontend Details](#frontend-details)
* [Backend Details (Aquilify Electrus)](#backend-details-aquilify-electrus)
* [Pages & UX Flow](#pages--ux-flow)
* [Tech Stack](#tech-stack)
* [Getting Started (Developer)](#getting-started-developer)
* [Project Structure](#project-structure)
* [Performance & PWA](#performance--pwa)
* [Deployment](#deployment)
* [Contributing](#contributing)
* [License](#license)

---

## About

College Resource Finder is a full-stack application that enables students to find, preview, and manage academic resources. The backend is powered by **Aquilify Electrus**, a modular, ACID-compliant NoSQL engine with JSON persistence, indexing, transactions, and Mongo-style querying. The frontend is a high-performance SPA with delightful animations, responsive design, and PWA capabilities.

---

## Architecture Overview

**Frontend**

* React + Vite + Tailwind CSS + Framer Motion.
* PWA ready with offline mode.
* Integrated with Electrus backend via REST API.

**Backend**

* Built on **Aquilify Electrus**.
* ACID transactions, Mongo-style queries, indexing.
* File-based JSON persistence with pluggable storage backend.
* Resource storage, search, and filtering APIs.

---

## Key Features

* Smart Search with instant results.
* Infinite scroll & quick preview drawers.
* Bookmarks/My Library syncing with backend.
* Bulk upload/download with progress tracking.
* ACID transactions for consistent data.
* Indexing for fast queries.
* Offline caching for recently viewed files.

---

## Frontend Details

* Multi-page SPA (Home, Notes, PPTs, Past Papers, Tutorials, Upload, Resource Details, Dashboard, My Library).
* Smooth page transitions, staggered list reveals, skeleton loaders.
* Fully responsive with mobile/desktop breakpoints.
* Dark/light theme toggle.

---

## Backend Details (Aquilify Electrus)

* **Data Storage:** JSON persistence with atomic writes.
* **Transactions:** Full ACID compliance.
* **Indexes:** Hash, B+ Tree for fast lookups.
* **Query Engine:** Mongo-style operators.
* **File Handling:** Async-safe, integrity checks, recovery.
* **Middleware Hooks:** Pre/post insert/update/delete.

---

## Pages & UX Flow

* **Home:** Search-as-you-type, trending resources, animated hero.
* **Notes:** Filter panel, infinite scroll, preview.
* **PPTs:** Thumbnail grid, bulk download.
* **Past Papers:** Year tabs, exam mode.
* **Tutorials:** Mixed content, tag filtering.
* **Upload:** Drag-and-drop, progress bars, auto-tagging.
* **Resource Details:** Preview, comments, analytics.
* **Dashboard:** Stats, inline editing, history timeline.
* **My Library:** Bookmarked resources.

---

## Tech Stack

**Frontend:**

* React, Vite, Tailwind CSS, Framer Motion, Radix UI, Zustand/Redux

**Backend:**

* Aquilify Electrus (custom NoSQL engine)
* REST API (Express/Fastify or Starlette equivalent)
* JSON storage backend, ACID transactions

---

## Getting Started (Developer)

### Backend

```bash
git clone <repo-url>
cd backend
pip install -r requirements.txt
python main.py
```

### Frontend

```bash
git clone <repo-url>
cd frontend
pnpm install
pnpm dev
```

---

## Project Structure

```
frontend/
  src/pages
  src/components
  src/hooks
backend/
  electrus/
  api/
  main.py
```

---

## Performance & PWA

* Lazy load heavy components.
* IndexedDB caching for offline mode.
* Backend indexes for fast search.
* Code splitting and image optimization.

---

## Deployment

* **Frontend:** Deploy to Vercel, Netlify, or Cloudflare Pages.
* **Backend:** Deploy on Fly.io, Render, Railway, or traditional VPS.
* Ensure API URL is configured in `.env`.

---

## Contributing

1. Fork and clone.
2. Create a feature branch.
3. Add tests.
4. Open PR.

---

## License

MIT © Axiomchronicles
