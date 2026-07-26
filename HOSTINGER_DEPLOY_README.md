# Gold Buyers Melbourne — Hostinger Deployment Guide

## Requirements
- Hostinger **Business** or **Cloud** hosting plan (Node.js support required)
- Node.js 18+ enabled in your Hostinger control panel

---

## Steps to Deploy

### 1. Upload files
Upload the entire contents of this ZIP to your Hostinger public_html (or a subdirectory).

### 2. Set Environment Variables
In your Hostinger control panel → **Node.js** → **Environment Variables**, add:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` (or leave for Hostinger to assign) |
| `JWT_SECRET` | Any random 32+ character string |
| `SMTP_USER` | Your Gmail address (e.g. yourname@gmail.com) |
| `SMTP_PASS` | Your Gmail App Password (16-char, from Google Account → Security → App Passwords) |
| `DATABASE_URL` | Your MySQL connection string (Hostinger provides one in hPanel → Databases) |

All other variables (VITE_APP_ID, OAUTH_SERVER_URL, etc.) are Manus platform variables and are **not needed** on Hostinger — leave them blank or omit them.

### 3. Install dependencies
In Hostinger's Node.js terminal or SSH:
```
npm install --production
```

### 4. Start the server
Set the **Entry point** in Hostinger's Node.js manager to:
```
dist/index.js
```

Or start manually via SSH:
```
node dist/index.js
```

### 5. Test
Visit your domain — the site should load with live gold/silver prices.

---

## Notes
- Live gold/silver prices are fetched from Yahoo Finance every 60 seconds — no API key needed.
- The contact form sends emails via Gmail SMTP once SMTP_USER and SMTP_PASS are set.
- The Google Maps embed works without any API key.
