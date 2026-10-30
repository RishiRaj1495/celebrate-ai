import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPlan } from './planner.js';
import { validatePlanInput } from './validate.js';

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

/** Minimal in-memory fixed-window rate limiter (per IP). */
export function rateLimiter({ windowMs = 60_000, max = 20 } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      hits.set(key, { count: 1, reset: now + windowMs });
      if (hits.size > 10_000) for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ error: 'Too many requests, please retry shortly.' });
    }
    return next();
  };
}

function securityHeaders(_req, res, next) {
  res.set({
    'Content-Security-Policy': "default-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
  });
  next();
}

/**
 * @param {object} deps
 * @param {Function} [deps.ideaProvider] async (input, breakdown) => ideas; omit to run without GenAI
 * @param {() => Date} [deps.now]
 */
export function createApp({ ideaProvider = null, now = () => new Date(), rateLimit = { max: 20 } } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(securityHeaders);
  app.use(express.json({ limit: '10kb' }));
  app.use(express.static(publicDir));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', genai: Boolean(ideaProvider) }));

  app.post('/api/plan', rateLimiter(rateLimit), async (req, res) => {
    const result = validatePlanInput(req.body, now());
    if (!result.ok) return res.status(400).json({ errors: result.errors });

    const plan = buildPlan(result.value, now());
    let ideas = null;
    let aiPowered = false;
    if (ideaProvider) {
      try {
        ideas = await ideaProvider(result.value, plan.budget.breakdown);
        aiPowered = true;
      } catch (err) {
        console.error('GenAI ideas unavailable:', err.message);
      }
    }
    return res.json({ plan, ideas, aiPowered });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = err.status === 400 || err.type === 'entity.parse.failed' ? 400 : err.status === 413 ? 413 : 500;
    res.status(status).json({ error: status === 500 ? 'Internal server error' : 'Invalid request body' });
  });

  return app;
}
