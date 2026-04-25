// Default app categorization patterns. Renderer can override per app via settings.
import { AppCategory } from '../shared/types';

interface CategoryRule {
  pattern: RegExp;
  category: AppCategory;
}

const DEFAULT_RULES: CategoryRule[] = [
  // FOCUS: editors, terminals, IDEs
  { pattern: /vs ?code|visual studio code|code\.exe/i, category: AppCategory.FOCUS },
  { pattern: /xcode|intellij|webstorm|pycharm|android studio|sublime|neovim|vim|emacs/i, category: AppCategory.FOCUS },
  { pattern: /terminal|iterm|warp|hyper|kitty|alacritty|powershell|cmd\.exe|wezterm/i, category: AppCategory.FOCUS },
  { pattern: /figma|sketch|photoshop|illustrator|blender/i, category: AppCategory.FOCUS },
  { pattern: /notion|obsidian|bear|logseq|typora/i, category: AppCategory.FOCUS },

  // RESEARCH: browsers, docs, communication for work
  { pattern: /chrome|safari|firefox|edge|brave|arc|vivaldi/i, category: AppCategory.RESEARCH },
  { pattern: /preview|adobe acrobat|reader/i, category: AppCategory.RESEARCH },

  // DISTRACTION: social, video, games
  { pattern: /twitter|x\.com|facebook|instagram|reddit|tiktok|threads/i, category: AppCategory.DISTRACTION },
  { pattern: /youtube|netflix|hulu|twitch|disney/i, category: AppCategory.DISTRACTION },
  { pattern: /discord|slack|whatsapp|telegram|messages|imessage/i, category: AppCategory.DISTRACTION },
  { pattern: /steam|epic games|battle\.net|league of legends/i, category: AppCategory.DISTRACTION },
];

export function categorizeApp(appName: string, overrides: Record<string, AppCategory> = {}): AppCategory {
  if (!appName) return AppCategory.UNKNOWN;
  const key = appName.toLowerCase();
  if (overrides[appName]) return overrides[appName];
  if (overrides[key]) return overrides[key];
  for (const rule of DEFAULT_RULES) {
    if (rule.pattern.test(appName)) return rule.category;
  }
  return AppCategory.UNKNOWN;
}
