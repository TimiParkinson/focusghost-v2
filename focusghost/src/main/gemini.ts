// Gemini API integration. API key stays in main process only.
import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const TIMEOUT_MS = 25_000;

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_google_ai_studio_key_here') return null;
  if (!client) client = new GoogleGenerativeAI(key);
  return client;
}

interface PromptOpts {
  systemInstruction: string;
  history?: Array<{ role: 'user' | 'model'; text: string }>;
  user: string;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Gemini request timed out')), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** Capped to last 10 turns to manage token count. */
function capHistory(h: PromptOpts['history']): NonNullable<PromptOpts['history']> {
  if (!h) return [];
  return h.slice(Math.max(0, h.length - 10));
}

export async function promptGemini(opts: PromptOpts): Promise<string> {
  const c = getClient();
  if (!c) {
    return offlineFallback(opts.user);
  }
  try {
    const model = c.getGenerativeModel({
      model: MODEL,
      systemInstruction: opts.systemInstruction,
    });
    const history = capHistory(opts.history).map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));
    const chat = model.startChat({ history });
    const result = await withTimeout(chat.sendMessage(opts.user), TIMEOUT_MS);
    const text = result.response.text().trim();
    return text || offlineFallback(opts.user);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[gemini] request failed:', (err as Error).message);
    return offlineFallback(opts.user);
  }
}

/** Simple deterministic fallback so the app stays usable without an API key. */
function offlineFallback(user: string): string {
  const u = user.toLowerCase();
  if (u.includes('still there')) return 'Still here. Take a breath, then back in?';
  if (u.includes('stuck'))
    return 'REFRAME: What is the smallest piece of this you actually understand?\nNEXT STEPS:\n1. Write the function signature you wish existed\n2. Print the input and the desired output side by side\n3. Solve it for one example by hand';
  if (u.includes('nudge') || u.includes('switched'))
    return 'A few tab-hops noticed — want to drop back into the task?';
  if (u.includes('summariz') || u.includes('insight') || u.includes('punchy'))
    return 'Solid run — most of the time landed on the task, with a couple of healthy detours.';
  if (u.includes('pattern'))
    return 'Switching tends to cluster right after long focus stretches — almost like a built-in cooldown.';
  return 'Right here. Want me to nudge you in a few minutes?';
}

export function isGeminiConfigured(): boolean {
  return getClient() !== null;
}
