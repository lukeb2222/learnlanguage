import type {
  Course,
  LessonResult,
  Quest,
  QuestMetric,
  Settings,
  SrsCard,
  Stats,
  UserState,
} from "./types";

// ---------- time helpers ----------

export function dayKey(date: Date, timeZone: string): string {
  try {
    return date.toLocaleDateString("en-CA", { timeZone });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86400000);
}

/** Leagues run Monday-Sunday (UTC). The week id is the date of its Monday. */
export function weekId(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export function weekEndsAt(now: Date): Date {
  const start = new Date(`${weekId(now)}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() + 7);
  return start;
}

// ---------- constants ----------

export const MAX_HEARTS = 5;
export const HEART_REGEN_MS = 3 * 60 * 60 * 1000;
export const MAX_FREEZES = 2;

export const LEAGUES = [
  { name: "Pebble", color: "#a8a29e", icon: "🪨" },
  { name: "Bronze", color: "#cd7f32", icon: "🥉" },
  { name: "Silver", color: "#9ca3af", icon: "🥈" },
  { name: "Gold", color: "#f5b301", icon: "🥇" },
  { name: "Jade", color: "#10b981", icon: "🟢" },
  { name: "Sapphire", color: "#2563eb", icon: "💠" },
  { name: "Ruby", color: "#e11d48", icon: "❤️‍🔥" },
  { name: "Amethyst", color: "#9333ea", icon: "🔮" },
  { name: "Obsidian", color: "#312e81", icon: "🌑" },
  { name: "Diamond", color: "#06b6d4", icon: "💎" },
];
export const PROMOTE_TOP = 7;
export const DEMOTE_BOTTOM = 5;

/** Leitner box -> days until the next review. */
export const SRS_INTERVALS = [0, 1, 2, 4, 8, 16, 32];

export const SHOP_ITEMS = [
  { id: "freeze", name: "Streak Freeze", icon: "🧊", price: 200, desc: "Keeps your streak alive for one missed day. Equip up to 2." },
  { id: "refill", name: "Heart Refill", icon: "❤️", price: 350, desc: "Refill your hearts instantly. (Or earn them free with Practice!)" },
  { id: "boost", name: "Double XP (15 min)", icon: "⚡", price: 100, desc: "Earn 2× XP for the next 15 minutes." },
  { id: "repair", name: "Streak Repair", icon: "🩹", price: 400, desc: "Restore a streak you lost in the last 2 days." },
];

export const OUTFITS = [
  { id: "none", name: "Classic", icon: "✨", price: 0 },
  { id: "crown", name: "Royal crown", icon: "👑", price: 300 },
  { id: "tophat", name: "Top hat", icon: "🎩", price: 250 },
  { id: "grad", name: "Graduation cap", icon: "🎓", price: 400 },
  { id: "party", name: "Party hat", icon: "🥳", price: 150 },
  { id: "cowboy", name: "Cowboy hat", icon: "🤠", price: 200 },
  { id: "glasses", name: "Cool shades", icon: "😎", price: 200 },
  { id: "halo", name: "Halo", icon: "😇", price: 500 },
];

const QUEST_POOL: Omit<Quest, "progress" | "claimed">[] = [
  { id: "xp30", label: "Earn 30 XP", icon: "⚡", metric: "xp", target: 30, reward: 10 },
  { id: "xp60", label: "Earn 60 XP", icon: "⚡", metric: "xp", target: 60, reward: 20 },
  { id: "lessons2", label: "Complete 2 lessons", icon: "📘", metric: "lessons", target: 2, reward: 10 },
  { id: "lessons4", label: "Complete 4 lessons", icon: "📘", metric: "lessons", target: 4, reward: 20 },
  { id: "perfect1", label: "Get a perfect lesson", icon: "🎯", metric: "perfect", target: 1, reward: 15 },
  { id: "acc90", label: "Score 90%+ in 2 lessons", icon: "🏹", metric: "accuracy90", target: 2, reward: 15 },
  { id: "combo10", label: "Get 10 in a row", icon: "🔥", metric: "combo", target: 10, reward: 15 },
  { id: "words15", label: "Review 15 words", icon: "🃏", metric: "words", target: 15, reward: 15 },
  { id: "chat6", label: "Send 6 messages to your AI partner", icon: "💬", metric: "chat", target: 6, reward: 15 },
  { id: "story1", label: "Finish a story", icon: "📚", metric: "story", target: 1, reward: 15 },
  { id: "listen5", label: "Answer 5 listening challenges", icon: "🎧", metric: "listening", target: 5, reward: 10 },
  { id: "min10", label: "Learn for 10 minutes", icon: "⏱️", metric: "minutes", target: 10, reward: 15 },
];

export const MONTHLY_QUEST_TARGET = 30;

// ---------- defaults ----------

export function defaultSettings(timezone: string): Settings {
  return {
    sound: true,
    listening: true,
    speaking: true,
    unlimitedHearts: false,
    romanization: true,
    dailyMinutes: 10,
    timezone,
  };
}

export function defaultStats(now: Date): Stats {
  return {
    xp: 0,
    gems: 500,
    hearts: MAX_HEARTS,
    heartsUpdatedAt: now.toISOString(),
    streak: 0,
    longestStreak: 0,
    lastActiveDay: null,
    streakFreezes: 1,
    frozenDays: [],
    activeDays: [],
    lostStreak: 0,
    lostStreakDay: null,
    daily: {},
    dailyGoalChestDay: null,
    lessonsCompleted: 0,
    perfectLessons: 0,
    storiesCompleted: 0,
    chatMessages: 0,
    legendaryCompleted: 0,
    minutes: 0,
    bestCombo: 0,
    xpBoostUntil: null,
    quests: { day: "", items: [] },
    monthly: { month: "", questsClaimed: 0, badges: [] },
    league: { tier: 0, weekId: weekId(now), weekXp: 0, history: {}, highestTier: 0, lastResult: null },
    achievementsSeen: {},
    speakingDisabledUntil: null,
  };
}

// ---------- quests ----------

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function questsForDay(day: string, userId: string): Quest[] {
  const pool = [...QUEST_POOL];
  const picked: Quest[] = [];
  let seed = hash(day + userId);
  const usedMetrics = new Set<QuestMetric>();
  while (picked.length < 3 && pool.length) {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    const [q] = pool.splice(seed % pool.length, 1);
    if (usedMetrics.has(q.metric)) continue;
    usedMetrics.add(q.metric);
    picked.push({ ...q, progress: 0, claimed: false });
  }
  return picked;
}

function bumpQuest(stats: Stats, metric: QuestMetric, amount: number, mode: "add" | "max" = "add") {
  for (const q of stats.quests.items) {
    if (q.metric !== metric) continue;
    q.progress = mode === "add" ? q.progress + amount : Math.max(q.progress, amount);
  }
}

// ---------- normalisation (lazy time-based updates) ----------

/**
 * Applies everything that happens with the passage of time: heart regeneration,
 * streak freezes / streak loss, daily quest rollover and monthly rollover.
 * League rollover needs other users and is handled on the server.
 */
export function normalize(user: UserState, now: Date): UserState {
  const s = user.stats;
  const tz = user.settings.timezone;
  const today = dayKey(now, tz);

  // hearts
  if (s.hearts < MAX_HEARTS) {
    const elapsed = now.getTime() - new Date(s.heartsUpdatedAt).getTime();
    const gained = Math.floor(elapsed / HEART_REGEN_MS);
    if (gained > 0) {
      s.hearts = Math.min(MAX_HEARTS, s.hearts + gained);
      s.heartsUpdatedAt = new Date(new Date(s.heartsUpdatedAt).getTime() + gained * HEART_REGEN_MS).toISOString();
    }
  } else {
    s.heartsUpdatedAt = now.toISOString();
  }

  // streak: consume freezes for missed days, otherwise lose the streak
  if (s.lastActiveDay && s.streak > 0) {
    const yesterday = addDays(today, -1);
    let cursor = s.lastActiveDay;
    while (cursor < yesterday) {
      const missed = addDays(cursor, 1);
      if (s.streakFreezes > 0) {
        s.streakFreezes -= 1;
        s.frozenDays.push(missed);
        s.lastActiveDay = missed;
        cursor = missed;
      } else {
        s.lostStreak = s.streak;
        s.lostStreakDay = today;
        s.streak = 0;
        break;
      }
    }
  }

  // daily quests
  if (s.quests.day !== today) {
    s.quests = { day: today, items: questsForDay(today, user.id) };
  }

  // monthly challenge
  const month = today.slice(0, 7);
  if (s.monthly.month !== month) {
    s.monthly = { month, questsClaimed: 0, badges: s.monthly.badges ?? [] };
  }

  return user;
}

export function nextHeartAt(stats: Stats): Date | null {
  if (stats.hearts >= MAX_HEARTS) return null;
  return new Date(new Date(stats.heartsUpdatedAt).getTime() + HEART_REGEN_MS);
}

function markActive(user: UserState, today: string) {
  const s = user.stats;
  if (s.lastActiveDay === today) return;
  if (s.lastActiveDay && s.lastActiveDay === addDays(today, -1)) {
    s.streak += 1;
  } else {
    s.streak = 1;
  }
  s.lastActiveDay = today;
  if (!s.activeDays.includes(today)) s.activeDays.push(today);
  if (s.activeDays.length > 400) s.activeDays = s.activeDays.slice(-400);
  s.longestStreak = Math.max(s.longestStreak, s.streak);
}

// ---------- spaced repetition ----------

export function upsertCard(cards: SrsCard[], item: { word: string; translation: string; romanization: string }, today: string) {
  const key = item.word.trim().toLowerCase();
  if (!key) return;
  const existing = cards.find((c) => c.word.trim().toLowerCase() === key);
  if (existing) return;
  cards.push({ ...item, box: 1, due: addDays(today, SRS_INTERVALS[1]), seen: 1, lapses: 0, addedAt: today });
}

export function reviewCard(card: SrsCard, correct: boolean, today: string) {
  card.seen += 1;
  if (correct) {
    card.box = Math.min(SRS_INTERVALS.length - 1, card.box + 1);
  } else {
    card.box = 0;
    card.lapses += 1;
  }
  card.due = addDays(today, SRS_INTERVALS[card.box]);
}

export const dueCards = (course: Course, today: string) => course.cards.filter((c) => c.due <= today);

export const cardStrength = (c: SrsCard) => Math.min(1, c.box / (SRS_INTERVALS.length - 1));

// ---------- XP ----------

export function xpForResult(r: LessonResult): number {
  if (!r.passed) return 0;
  const accuracy = r.total ? r.correct / r.total : 0;
  let base = 10;
  switch (r.mode) {
    case "legendary":
      base = 40;
      break;
    case "unit_review":
      base = 25;
      break;
    case "test_out":
      base = 30;
      break;
    case "story":
      base = 15;
      break;
    case "practice":
    case "mistakes":
    case "words":
    case "listening":
    case "speaking":
    case "letters":
      base = 10;
      break;
  }
  const perfect = accuracy === 1 ? 5 : 0;
  const combo = Math.min(5, Math.floor(r.maxCombo / 5));
  return base + perfect + combo;
}

export function boostActive(stats: Stats, now: Date) {
  return !!stats.xpBoostUntil && new Date(stats.xpBoostUntil) > now;
}

export function dailyXpGoal(minutes: number) {
  return minutes * 2;
}

/** Records a finished lesson / story / practice and returns what was earned. */
export function applyLessonResult(user: UserState, r: LessonResult, now: Date) {
  const s = user.stats;
  const today = dayKey(now, user.settings.timezone);
  const course = user.activeCourse ? user.courses[user.activeCourse] : null;
  const events: string[] = [];

  let xp = xpForResult(r);
  if (xp && boostActive(s, now)) xp *= 2;
  const accuracy = r.total ? r.correct / r.total : 0;

  if (course) {
    for (const v of r.newVocab) upsertCard(course.cards, v, today);
    for (const rev of r.reviewed) {
      const card = course.cards.find((c) => c.word.trim().toLowerCase() === rev.word.trim().toLowerCase());
      if (card) reviewCard(card, rev.correct, today);
    }
    // A passed mistakes review clears the (up to 12) mistakes it covered; new slips are re-added below.
    if (r.mode === "mistakes" && r.passed) course.mistakes = course.mistakes.slice(12);
    if (r.mistakes.length) {
      course.mistakes = [...r.mistakes, ...course.mistakes].slice(0, 60);
    }
    if (r.passed && r.unitId) {
      const unit = course.plan?.units.find((u) => u.id === r.unitId);
      if (r.mode === "lesson" && r.lessonId) {
        const key = `${r.unitId}/${r.lessonId}`;
        if (!course.completedLessons.includes(key)) course.completedLessons.push(key);
      }
      if (r.mode === "unit_review" && !course.completedReviews.includes(r.unitId)) course.completedReviews.push(r.unitId);
      if (r.mode === "story" && !course.storiesDone.includes(r.unitId)) course.storiesDone.push(r.unitId);
      if (r.mode === "legendary" && !course.legendary.includes(r.unitId)) {
        course.legendary.push(r.unitId);
        s.legendaryCompleted += 1;
      }
      if (r.mode === "test_out" && course.plan && unit) {
        // Jumping ahead completes every lesson up to and including this unit.
        for (const u of course.plan.units) {
          for (const l of u.lessons) {
            const key = `${u.id}/${l.id}`;
            if (!course.completedLessons.includes(key)) course.completedLessons.push(key);
          }
          if (u.id === unit.id) break;
        }
        events.push("jumped");
      }
    }
    course.xp += xp;
  }

  // practice earns a heart back for free
  if (r.passed && ["practice", "mistakes", "words", "listening", "speaking"].includes(r.mode) && s.hearts < MAX_HEARTS) {
    s.hearts += 1;
    events.push("heart");
  }

  if (r.passed) {
    s.lessonsCompleted += r.mode === "story" ? 0 : 1;
    if (r.mode === "story") s.storiesCompleted += 1;
    if (accuracy === 1 && r.total >= 5) s.perfectLessons += 1;
  }

  const minutes = Math.max(1, Math.round(r.durationSec / 60));
  s.minutes += minutes;
  s.bestCombo = Math.max(s.bestCombo, r.maxCombo);

  const goal = dailyXpGoal(user.settings.dailyMinutes);
  const before = s.daily[today] ?? 0;
  if (xp > 0) {
    s.xp += xp;
    s.daily[today] = before + xp;
    s.league.weekXp += xp;
    const hadStreakToday = s.lastActiveDay === today;
    markActive(user, today);
    if (!hadStreakToday) events.push("streak");
  }
  let chestGems = 0;
  if (before < goal && (s.daily[today] ?? 0) >= goal && s.dailyGoalChestDay !== today) {
    s.dailyGoalChestDay = today;
    chestGems = 20;
    s.gems += chestGems;
    events.push("dailyGoal");
  }

  // quests
  bumpQuest(s, "xp", xp);
  if (r.passed && r.mode !== "story") bumpQuest(s, "lessons", 1);
  if (r.passed && accuracy === 1 && r.total >= 5) bumpQuest(s, "perfect", 1);
  if (r.passed && accuracy >= 0.9) bumpQuest(s, "accuracy90", 1);
  bumpQuest(s, "combo", r.maxCombo, "max");
  bumpQuest(s, "words", r.reviewed.length);
  if (r.mode === "story" && r.passed) bumpQuest(s, "story", 1);
  if (r.mode === "listening") bumpQuest(s, "listening", r.correct);
  bumpQuest(s, "minutes", minutes);

  return { xp, accuracy, events, chestGems, boosted: boostActive(s, now) };
}

export function recordChat(user: UserState) {
  user.stats.chatMessages += 1;
  bumpQuest(user.stats, "chat", 1);
}

export function recordListening(user: UserState, n: number) {
  bumpQuest(user.stats, "listening", n);
}

export function claimQuest(user: UserState, questId: string): number {
  const q = user.stats.quests.items.find((x) => x.id === questId);
  if (!q || q.claimed || q.progress < q.target) return 0;
  q.claimed = true;
  user.stats.gems += q.reward;
  user.stats.monthly.questsClaimed += 1;
  const badge = `monthly-${user.stats.monthly.month}`;
  if (user.stats.monthly.questsClaimed >= MONTHLY_QUEST_TARGET && !user.stats.monthly.badges.includes(badge)) {
    user.stats.monthly.badges.push(badge);
    user.stats.gems += 100;
  }
  // claiming every daily quest grants a 15-minute XP boost
  if (user.stats.quests.items.every((x) => x.claimed)) {
    user.stats.xpBoostUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  }
  return q.reward;
}

// ---------- shop ----------

export function buyItem(user: UserState, itemId: string, now: Date): string | null {
  const s = user.stats;
  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  const outfit = OUTFITS.find((o) => o.id === itemId);
  const price = item?.price ?? outfit?.price;
  if (price === undefined) return "Unknown item";
  if (outfit && user.ownedItems.includes(outfit.id)) {
    user.avatar.outfit = outfit.id;
    return null;
  }
  if (s.gems < price) return "Not enough gems — complete quests and lessons to earn more!";
  const today = dayKey(now, user.settings.timezone);
  switch (itemId) {
    case "freeze":
      if (s.streakFreezes >= MAX_FREEZES) return `You can equip at most ${MAX_FREEZES} streak freezes.`;
      s.streakFreezes += 1;
      break;
    case "refill":
      if (s.hearts >= MAX_HEARTS) return "Your hearts are already full.";
      s.hearts = MAX_HEARTS;
      break;
    case "boost": {
      const from = boostActive(s, now) ? new Date(s.xpBoostUntil!) : now;
      s.xpBoostUntil = new Date(from.getTime() + 15 * 60 * 1000).toISOString();
      break;
    }
    case "repair": {
      if (!s.lostStreak || !s.lostStreakDay || daysBetween(s.lostStreakDay, today) > 2) return "There's no recent streak to repair.";
      const activeToday = s.lastActiveDay === today;
      s.streak = s.lostStreak + (activeToday ? s.streak : 0);
      if (!activeToday) s.lastActiveDay = addDays(today, -1);
      s.longestStreak = Math.max(s.longestStreak, s.streak);
      s.lostStreak = 0;
      s.lostStreakDay = null;
      break;
    }
    default:
      if (outfit) {
        user.ownedItems.push(outfit.id);
        user.avatar.outfit = outfit.id;
      }
  }
  s.gems -= price;
  return null;
}

// ---------- achievements ----------

export interface AchievementDef {
  id: string;
  name: string;
  icon: string;
  desc: (n: number) => string;
  tiers: number[];
  value: (u: UserState) => number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "wildfire", name: "Wildfire", icon: "🔥", desc: (n) => `Reach a ${n} day streak`, tiers: [3, 7, 14, 30, 60, 100, 365], value: (u) => u.stats.longestStreak },
  { id: "sage", name: "Sage", icon: "🦉", desc: (n) => `Earn ${n} XP`, tiers: [100, 250, 500, 1000, 2500, 5000, 10000, 25000], value: (u) => u.stats.xp },
  { id: "scholar", name: "Scholar", icon: "📚", desc: (n) => `Learn ${n} words`, tiers: [25, 50, 100, 250, 500, 1000, 2000], value: (u) => Object.values(u.courses).reduce((a, c) => a + c.cards.length, 0) },
  { id: "sharpshooter", name: "Sharpshooter", icon: "🎯", desc: (n) => `Complete ${n} perfect lessons`, tiers: [1, 5, 10, 25, 50, 100], value: (u) => u.stats.perfectLessons },
  { id: "conqueror", name: "Conqueror", icon: "🏰", desc: (n) => `Complete ${n} lessons`, tiers: [5, 25, 50, 100, 250, 500], value: (u) => u.stats.lessonsCompleted },
  { id: "storyteller", name: "Storyteller", icon: "📖", desc: (n) => `Finish ${n} stories`, tiers: [1, 5, 10, 25, 50], value: (u) => u.stats.storiesCompleted },
  { id: "chatterbox", name: "Chatterbox", icon: "💬", desc: (n) => `Send ${n} messages to your AI partner`, tiers: [10, 50, 100, 250, 500], value: (u) => u.stats.chatMessages },
  { id: "champion", name: "Champion", icon: "🏆", desc: (n) => `Reach the ${LEAGUES[n].name} league`, tiers: [2, 4, 6, 8, 9], value: (u) => u.stats.league.highestTier },
  { id: "legendary", name: "Legendary", icon: "🌟", desc: (n) => `Reach Legendary in ${n} units`, tiers: [1, 3, 5, 10, 20], value: (u) => u.stats.legendaryCompleted },
  { id: "polyglot", name: "Polyglot", icon: "🌍", desc: (n) => `Study ${n} languages`, tiers: [2, 3, 5, 8], value: (u) => Object.keys(u.courses).length },
  { id: "combo", name: "On a Roll", icon: "⚡", desc: (n) => `Get ${n} correct in a row`, tiers: [10, 20, 30, 50], value: (u) => u.stats.bestCombo },
  { id: "dedicated", name: "Dedicated", icon: "⏱️", desc: (n) => `Learn for ${n} minutes`, tiers: [30, 120, 300, 600, 1500, 3000], value: (u) => u.stats.minutes },
];

export function achievementLevel(def: AchievementDef, u: UserState) {
  const v = def.value(u);
  const level = def.tiers.filter((t) => v >= t).length;
  const next = def.tiers[level];
  return { level, value: v, next, max: def.tiers.length };
}

// ---------- unlocking / path ----------

export function lessonKey(unitId: string, lessonId: string) {
  return `${unitId}/${lessonId}`;
}

/** The next lesson the learner should do, or null when the plan is complete. */
export function currentLesson(course: Course): { unitIndex: number; lessonIndex: number } | null {
  if (!course.plan) return null;
  for (let ui = 0; ui < course.plan.units.length; ui++) {
    const u = course.plan.units[ui];
    for (let li = 0; li < u.lessons.length; li++) {
      if (!course.completedLessons.includes(lessonKey(u.id, u.lessons[li].id))) return { unitIndex: ui, lessonIndex: li };
    }
  }
  return null;
}

export function unitComplete(course: Course, unitId: string) {
  const u = course.plan?.units.find((x) => x.id === unitId);
  return !!u && u.lessons.every((l) => course.completedLessons.includes(lessonKey(u.id, l.id)));
}

/** A 0-160 proficiency estimate, in the spirit of an English-test-style score. */
export function proficiencyScore(course: Course): number {
  const base: Record<string, number> = { "pre-A1": 0, A1: 10, A2: 30, B1: 60, B2: 90, C1: 120 };
  const start = base[course.profile.level] ?? 0;
  const done = course.completedLessons.length;
  const words = course.cards.filter((c) => c.box >= 3).length;
  return Math.min(160, Math.round(start + done * 1.2 + words * 0.15 + course.completedReviews.length * 2));
}
