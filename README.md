# Celebrate AI: Celebration & Event Planner

GenAI-powered planning assistant for weddings, birthdays and community events. Enter event type, budget, guests, date, city and preferences; get a budget breakdown, dated timeline, vendor checklist and personalised ideas (themes, menu, activities, tips).

## Run locally

```bash
npm install
cp .env.example .env   # add GEMINI_API_KEY (https://aistudio.google.com)
export $(cat .env | xargs) && npm start   # http://localhost:8080
npm test
```

Without `GEMINI_API_KEY` the app still works (deterministic plan, no ideas section).

## Deploy to Google Cloud Run

```bash
gcloud run deploy celebrate-ai --source . --region asia-south1 \
  --allow-unauthenticated --set-env-vars GEMINI_API_KEY=YOUR_KEY
```

## Structure

| File | Responsibility |
|---|---|
| `src/planner.js` | Budget allocation (exact sums), timeline, vendor checklists |
| `src/validate.js` | Input validation and sanitisation |
| `src/gemini.js` | Gemini call with JSON schema, output validation |
| `src/app.js` | Express app, security headers, rate limiting, routes |
| `public/` | Accessible UI (labels, aria-live, keyboard, dark mode, print) |
| `test/` | 20 tests using `node:test` (no external test deps) |

## Security notes
Key kept server-side and sent via header; 10 KB body limit; strict validation; per-IP rate limit; CSP and other headers; user text fenced as untrusted data in the prompt; model output schema-constrained and re-validated; UI renders with `textContent` only.
