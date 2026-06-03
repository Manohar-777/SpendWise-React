# 🎙️ SpendWise — Voice Expense Tracker (React + AI)

**SpendWise** is a high-fidelity, interactive React website that enables hands-free personal expense tracking using voice commands. 

You *speak* an expense in **Telugu, English, or a mix of both** — e.g. *"నేను 500 రూపాయలు groceries కి ఖర్చు పెట్టాను"* or *"spent 250 on petrol today"* — and the app transcribes it, extracts the cost, category, date, and description using a client-side Google Gemini pipeline, stores it locally, and speaks back a confirmation or statistical summary.

---

## 🌟 Core Features

- **Multilingual Voice Recognition (STT)**: Utilizes the browser's native Web Speech API (`webkitSpeechRecognition`) to capture English and Telugu vocal streams in real-time.
- **AI-Powered Structured Entity Extraction**: Leverages Google Gemini 1.5/2.5 Flash to classify intent (`add_expense`, `get_summary`, `delete_expense`, `clear_all`) and parse raw text into clean JSON data.
- **Vocal Assistant Responses (TTS)**: Synthesizes responses using the browser's `speechSynthesis` API, dynamically translating responses into spoken Telugu when the user speaks in Telugu.
- **Interactive Voice Orb**: A premium visualizer showcasing assistant states (Idle, Listening, Thinking, Speaking) using custom animated SVG elements.
- **Responsive SVG Dashboards**: Beautiful, lightweight circular Donut charts and progress bars displaying category breakdowns.
- **Persistent Ledger Database**: All transactions and API key credentials are saved locally in the browser's `localStorage` (100% DPDP 2023 compliant, client-side data isolation).

---

## 🏗️ Architecture

```
🎤 User speaks
   │
   ▼
[Speech-to-Text] ────► Browser SpeechRecognition ────► Transcript (Telugu/English)
   │
   ▼
[Understand] ────────► Client-side Google Gemini ────► Structured JSON:
   │                   (via @google/generative-ai)      { intent, amount, category, date, note }
   ▼
[Action Handling] ───► Intent routing:
   │                   • add_expense ──► Save row to localStorage
   │                   • get_summary ──► Compute statistics
   ▼
[Text-to-Speech] ────► Browser SpeechSynthesis ──────► 🔊 Spoken Response (Telugu/English)
```

---

## 🚀 Running Locally

### 1. Pre-requisites
Make sure you have Node.js and npm installed on your system.

### 2. Install dependencies
Navigate to the project directory and install the packages:
```bash
cd spendwise-react
npm install
```

### 3. Start the dev server
Run the development command:
```bash
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

### 4. Setup API Key
1. Click the **Gear (⚙️) icon** in the top-right corner to open the Settings sidebar.
2. Paste your Google Gemini API Key from Google AI Studio and press Enter.

---

## 📦 Deployment Guide

Since SpendWise is a client-side single-page app (SPA), it is completely serverless and can be hosted for free on:

### Option A: Vercel (Recommended - Zero Configuration)
1. Push your repository to GitHub.
2. Go to [Vercel](https://vercel.com/) and click **Add New Project**.
3. Import your GitHub repository, choose **Vite** as the framework template, and click **Deploy**.
4. Vercel will automatically host your app and deploy updates whenever you push to your `main` branch.

### Option B: GitHub Pages
1. Install the `gh-pages` package:
   ```bash
   npm install gh-pages --save-dev
   ```
2. Update the `base` property in `vite.config.js` to match your repository name:
   ```javascript
   base: '/YOUR_REPOSITORY_NAME/',
   ```
3. Add deploy scripts to your `package.json`:
   ```json
   "predeploy": "npm run build",
   "deploy": "gh-pages -d dist"
   ```
4. Run `npm run deploy` to publish the website.
