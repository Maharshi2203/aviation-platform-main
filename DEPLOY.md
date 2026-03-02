# 🚀 Deployment Guide: Aviation Intelligence Platform

This guide will help you move your platform from development to production.

## 1. Prerequisites

- **Node.js 18.x or 20.x**
- **Git** (for version control and CI/CD)
- **API Keys** (optional but recommended for high-quality data):
  - `GEMINI_API_KEY`: For higher quality AI article classification.
  - `GNEWS_API_KEY` or `NEWS_API_KEY`: For real-time news sources.
  - `CRON_SECRET`: Generate a random string to secure your cron endpoints.

## 2. Environment Variables

Create your `.env` file on the production server (or add them via your hosting provider's dashboard).

```bash
# Database (Assuming SQLite for now)
DATABASE_URL="file:./dev.db"

# AI Classification
GEMINI_API_KEY="your-gemini-key"

# News (Optional)
NEWS_API_KEY="your-news-api-key"
GNEWS_API_KEY="your-gnews-api-key"

# Security
CRON_SECRET="your-generated-secret"
NODE_ENV="production"
```

## 3. Deployment Options

### Option A: Vercel (Recommended for Frontend/Speed)
1. **Choose a Managed Database**: Vercel does not support persistent SQLite files. If you use SQLite, your database will reset with every deploy.
   - **Recommendation**: Switch to [Turso](https://turso.tech/) (managed SQLite) or a [Postgres](https://vercel.com/storage/postgres) instance.
   - Update your `schema.prisma` datasource provider accordingly (`provider = "postgresql"` or `provider = "sqlite"`).
2. **Push to GitHub**: Connect your repo to Vercel.
3. **Set Build Commands**:
   - Build Command: `npm run build`
   - Install Command: `npm install`
4. **Environment Variables**: Paste your `.env` keys into the Vercel dashboard.

### Option B: Self-Hosted (DigitalOcean / VPS)
This is the easiest way to keep using the current local SQLite setup.
1. **Clone the repo**: `git clone <your-repo>`
2. **Install deps**: `npm install`
3. **Push schema**: `npm run db:push`
4. **Build**: `npm run build`
5. **Start Process Manager**: Use [PM2](https://pm2.keymetrics.io/) to keep it running.
   ```bash
   pm2 start npm --name "aviation-platform" -- start
   ```

## 4. Setting up Automation (Crons)

Since the app is now "Deployment Ready", it no longer uses a shaky internal scheduler but relies on external triggers for durability.

1. **Vercel Cron**: If using Vercel, add a `vercel.json`:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron?action=run",
         "schedule": "0 */1 * * *"
       }
     ]
   }
   ```
2. **Manual / GitHub Actions**: You can trigger a refresh by sending a POST to:
   `https://your-app.com/api/cron?action=run`
   (Requires `Authorization: Bearer <your-CRON_SECRET>` in headers).

## 5. Security Checklist
- [ ] Set `NODE_ENV=production`.
- [ ] Add `CRON_SECRET` to prevent malicious actors from spamming your API.
- [ ] Use HTTPS (provided automatically by Vercel/Cloudflare).
- [ ] (Advanced) Set up rate limiting on the `/api/ingest` endpoint if public access is enabled.
