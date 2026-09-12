# 🛡️ SafeRoute AI — Women's Safety Path Advisor

SafeRoute AI is an AI-powered safety companion and path analyzer for women. It uses Google Gemini LLM models to classify hazards, generate context-aware safety advisories, and provide real-time chat guidance. 

---

## 🌟 Unique Features

1. **AI Route Advisory:** Generates context-aware, empathetic route briefings (taking into account time, weather, hazard density, and proximity to safe havens).
2. **Interactive Canvas Map:** Click to set Start (A), Destination (B), or Hazard reports directly on an interactive city map. Displays safe zones around police stations/hospitals.
3. **Journey Monitored Dead-man's Switch:** Start a journey with an ETA. If you don't check in before the timer expires, an automatic SOS warning is logged.
4. **Safety Chat Assistant:** Converse directly with the Gemini Safety Agent for local travel tips, emergency help, or safety queries.
5. **Emergency Contacts Manager:** Save trusted phone numbers and relation details, which are automatically included in the SOS alert payloads.
6. **One-Tap SOS Button:** Instantly broadcast your coordinates, live location map link, and an urgency summary to emergency contacts.
7. **Offline DB Fallback:** The backend automatically spins up an in-memory database fallback if Supabase credentials are not configured, allowing you to run and review the full app instantly.

---

## 🚀 Quick Start Guide

### Step 1: Set Up Backend Environment
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Set your **Gemini API Key** in `backend/.env` to enable live AI analysis:
   ```env
   GEMINI_API_KEY=AIzaSy...
   ```
   *(Note: If you have a Supabase project, you can optionally fill out the `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` vars. If left empty, the server automatically defaults to an in-memory mock database).*

### Step 2: Start the Backend Server
Install dependencies and run the server:
```bash
npm install
npm run dev
```
The server will boot up at `http://localhost:5000`.

### Step 3: Start the Frontend Application
1. In a new terminal window, navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Run the hot-reloading development server:
   ```bash
   npm run dev
   ```
3. Open the URL printed in the terminal (usually `http://localhost:5173`) in your browser.

---

## 📐 Project Architecture

```
INTELLIAI/
├── backend/
│   ├── config/
│   │   ├── gemini.js         # Google Generative AI config
│   │   └── supabase.js       # Supabase client with in-memory DB fallback
│   ├── controllers/          # Chat, Emergency, Incident, Journey, Route controllers
│   ├── routes/               # API route definitions
│   ├── services/             # Core business and Gemini AI logic
│   └── server.js             # Express app server entry point
└── frontend/
    ├── src/
    │   ├── App.jsx           # Main interactive dashboard UI
    │   ├── index.css         # Styling system & dark-mode configurations
    │   └── main.jsx          # App entrypoint mounting
    └── index.html            # Core document with SEO meta headers
```
