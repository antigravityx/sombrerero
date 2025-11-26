# VerixRichon Libro Project

This repository contains the **Libro** static website, a reusable **payment micro‑service**, and documentation for the VerixRichon brand.

## Structure
```
/ (root)
├─ README.md                # Project overview
├─ public/                  # Front‑end static site (HTML, CSS, JS)
├─ services/
│   └─ payment/            # Payment gateway micro‑service
│       ├─ package.json
│       ├─ .env
│       └─ index.js
└─ docs/                    # Brand and technical documentation
    └─ ALMA_VERIX_RICHON.md
```

## Goals
- Reuse code across VerixRichon projects.
- Provide a single payment gateway (MercadoPago sandbox) with a public API.
- Keep the front‑end lightweight and modern.

## Getting Started
1. Install Node.js (v20+ recommended).
2. Run the payment service:
   ```bash
   cd services/payment
   npm install
   npm start
   ```
3. Open `public/index.html` in a browser.

---

**Desarrollado con ❤️ por VerixRichon Software Factory**  
*"Codea una vez, utiliza siempre"* | Noviembre 2025
"
