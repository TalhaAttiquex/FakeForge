# FakeForge

FakeForge is a Vercel-ready AI fictional test-data generator. It creates clearly labeled demo profiles for development, QA, prototypes, and design work. It must not be used for identity verification, fraud, impersonation, or real-world deception.

## Setup

1. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Copy `.env.example` to `.env` in the project root.
3. Put the key after `GEMINI_API_KEY=` in `.env`.
4. Keep `.env` private. It is ignored by Git and the key is only read by `api/generate.js`, never by browser JavaScript.

## Run locally

The API route needs a serverless runtime. Install the Vercel CLI, then run:

```bash
npm run dev
```

Open the local URL printed by Vercel. Do not open `index.html` directly because a static file server cannot execute `/api/generate`.

Do not use VS Code Live Server for this project. Live Server can serve the HTML and CSS, but it cannot execute the `api/generate.js` serverless function, so `/api/generate` will commonly return 404 or 405. `npm run dev` uses Vercel's local serverless runtime instead.

## Deploy to Vercel

1. Push this project to a Git repository, or run `vercel` from the project folder.
2. In the Vercel project dashboard, open **Settings > Environment Variables**.
3. Add a variable named `GEMINI_API_KEY` and paste the Gemini key as its value. Select the environments where it should be available.
4. Deploy or redeploy the project.

The key must remain a Vercel Environment Variable. Never put it in `index.html`, `style.css`, `script.js`, localStorage, or a committed file. The API route validates requests, limits profile count and instructions, requests JSON-only output, and rejects profiles that do not use reserved email domains and placeholder phones.

For local development, the key must be in the project-root `.env` file as `GEMINI_API_KEY=your_key_here`. The current configured key was rejected by Gemini as invalid, so create a new key in Google AI Studio and replace only the value after `GEMINI_API_KEY=`. Restart `vercel dev` after changing it.

## Safety

Generated values are fictional placeholders only. FakeForge intentionally avoids real personal information, working contact details, government identifiers, financial data, exact private addresses, live location data, and identity documents.
