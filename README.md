# ✈️ Aviation Intelligence Platform

A state-of-the-art aviation intelligence dashboard providing real-time global insights into accidents, industry trades, and regulations.

## 🚀 Key Features

- **🔴 Accident & Incident Intelligence**: Real-time tracking of aviation mishaps with AI-enhanced classification and severity analysis.
- **📈 Industry Trades**: Monitor aircraft orders, fleet expansions, and major aviation business deals.
- **📜 Regulatory Tracking**: Stay updated with the latest directives from FAA, EASA, ICAO, and more.
- **🛰️ Radar Tracking**: Interactive flight radar and registration lookup.
- **🧩 Aircraft Encyclopedia**: Comprehensive data on airlines and specialized fleet information.
- **🤖 AI-Powered**: Automatic summarization and classification using Gemini/Groq.

## 🛠️ Technology Stack

- **Framework**: Next.js 15+ (App Router, Turbopack)
- **Styling**: Tailwind CSS 4
- **Database**: Prisma + SQLite
- **AI**: Google Gemini & Groq SDKs
- **Data**: RSS Feeds, GNews API, NewsAPI, and raw CSV fleet data.

## 🏁 Getting Started

### 1. Installation
```bash
npm install
```

### 2. Database Setup
```bash
npm run db:push
```

### 3. Environment Variables
Copy `.env.example` to `.env` and add your API keys. The app includes a rule-based fallback if AI keys are missing.

### 4. Development
```bash
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000)

## 🚢 Deployment

The platform is 100% deployment ready. See [DEPLOY.md](DEPLOY.md) for detailed instructions on hosting with Vercel or a VPS.

## 📄 License
Private project.
