# InvoiceSnap

A fully client-side invoice tracking web app with in-browser OCR. No server, no API key, no account required — everything runs in your browser.

**Live app:** https://tiajulian.github.io/invoicesnap/

## Features

- **Photo capture & upload** — take a photo with your device camera or upload a JPG/PNG
- **In-browser OCR** — Tesseract.js scans the image and pre-fills vendor, invoice number, amount, and due date; no data leaves your device
- **Paid / Unpaid toggle** — tap the status chip on any invoice to toggle it instantly
- **Running totals dashboard** — live count, total, paid, and unpaid amounts update as you work
- **Filter & sort** — filter by status; sort by date, due date, or amount
- **Local persistence** — all data saved in `localStorage`; survives page refresh without any login
- **JSON export** — one-click backup of all invoice data

## Stack

| Layer | Library |
|---|---|
| UI | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| OCR | Tesseract.js v5 (WebAssembly, runs in browser) |
| Persistence | `localStorage` |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions |

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:5173/invoicesnap/

## Deploy

Push to `main` — the GitHub Actions workflow builds and deploys automatically to the `gh-pages` branch.

After the first deploy, enable GitHub Pages in **Settings → Pages → Source: Deploy from branch → gh-pages / root**.
