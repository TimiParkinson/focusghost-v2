// Centralized prompt templates for Gemini. Inject session context placeholders.
import type { GhostPersonality, SessionStatsSnapshot } from '../shared/types';

const PERSONALITY_VOICE: Record<GhostPersonality, string> = {
  encouraging:
    'You are FocusGhost — a warm, encouraging companion. Brief, kind, never preachy. Celebrate small wins.',
  neutral: 'You are FocusGhost — a calm, observant companion. Plain-spoken. No fluff. No cheerleading.',
  playful:
    'You are FocusGhost — a witty, playful ghost mascot. One light pun max. Keep it short and warm.',
};

export function systemPrompt(personality: GhostPersonality, stats: SessionStatsSnapshot | null): string {
  const base = PERSONALITY_VOICE[personality];
  const ctx = stats
    ? `\n\nSESSION CONTEXT:\n- Task: "${stats.taskName}"\n- State: ${stats.state}\n- Elapsed: ${Math.round(stats.elapsedMs / 60000)}m of ${stats.durationMin}m\n- Focus time: ${Math.round(stats.focusMs / 60000)}m | Drift: ${Math.round(stats.driftMs / 60000)}m\n- App switches: ${stats.switchCount}\n- Current app: ${stats.currentApp ?? 'unknown'} (${stats.currentAppCategory})\n- Drift risk: ${stats.driftRisk}`
    : '';
  return `${base}\n\nFormat: 1-2 sentences max unless asked. Never apologize. Never lecture.${ctx}`;
}

export function switchDriftNudge(opts: {
  taskName: string;
  switchCount: number;
  currentApp: string;
  focusMin: number;
}): string {
  return `The user is working on "${opts.taskName}". They've switched apps ${opts.switchCount} times and are now on ${opts.currentApp}. They've focused for ${opts.focusMin} minutes. Write a single sentence nudge that gently brings them back. No emoji.`;
}

export function inactivityNudge(opts: { taskName: string; sinceSec: number }): string {
  return `The user has been idle for ${opts.sinceSec}s while working on "${opts.taskName}". Write one short, warm "still there?" line. No emoji.`;
}

export function checkInNudge(opts: { taskName: string; focusMin: number }): string {
  return `The user has been focused on "${opts.taskName}" for ${opts.focusMin} minutes straight. Write one short positive reinforcement. No emoji, no exclamation marks.`;
}

export function sprintOfferNudge(opts: { taskName: string }): string {
  return `Offer the user a 12-minute focus sprint to push through on "${opts.taskName}". One sentence, casual. No emoji.`;
}

export function patternNoticePrompt(stats: SessionStatsSnapshot): string {
  const apps = Object.entries(stats.appTimeMap)
    .sort((a, b) => b[1].totalMs - a[1].totalMs)
    .slice(0, 6)
    .map(([app, e]) => `- ${app}: ${Math.round(e.totalMs / 60000)}m, ${e.switches} switches, ${e.category}`)
    .join('\n');
  return `Analyze this session timeline and surface ONE non-obvious behavioral pattern (not just "you switched a lot"). Be specific.\n\nTask: "${stats.taskName}"\nApp timeline:\n${apps}\n\nFormat: one sentence starting with a verb. No preamble.`;
}

export function ghostInsightPrompt(stats: SessionStatsSnapshot): string {
  const top = Object.entries(stats.appTimeMap)
    .sort((a, b) => b[1].totalMs - a[1].totalMs)
    .slice(0, 3)
    .map(([app, e]) => `${app} (${Math.round(e.totalMs / 60000)}m)`)
    .join(', ');
  return `Write ONE punchy, specific, human-sounding sentence summarizing this focus session. Reference real numbers — sound like a friend, not a coach.\n\nTask: "${stats.taskName}"\nFocus time: ${Math.round(stats.focusMs / 60000)}m | Drift: ${Math.round(stats.driftMs / 60000)}m\nSwitches: ${stats.switchCount} | Nudges sent: ${stats.nudgeCount}\nTop apps: ${top}\n\nNo emoji. Max 22 words.`;
}

export function stuckPrompt(opts: {
  taskName: string;
  stuckDescription: string;
  currentApp: string;
  recentApps: string[];
}): string {
  return `The user is stuck. Help them.

Task: "${opts.taskName}"
What they're stuck on: "${opts.stuckDescription}"
Currently in: ${opts.currentApp}
Recently cycling between: ${opts.recentApps.join(', ')}

Respond in this EXACT structure:
REFRAME: <one sentence reframing the actual question they should be asking>
NEXT STEPS:
1. <concrete step>
2. <concrete step>
3. <concrete step optional>

Be specific to their problem. No fluff.`;
}
