import { createApp } from './app.js';
import { createGeminiProvider } from './gemini.js';

const apiKey = process.env.GEMINI_API_KEY;
const ideaProvider = apiKey ? createGeminiProvider({ apiKey, model: process.env.GEMINI_MODEL || undefined }) : null;
if (!ideaProvider) console.warn('GEMINI_API_KEY not set: running with the deterministic planner only.');

const port = Number(process.env.PORT) || 8080;
createApp({ ideaProvider }).listen(port, () => console.log(`Celebrate AI listening on :${port}`));
