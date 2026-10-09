/**
 * In-browser backend for the hosted (artifact) build. Implements the same
 * routes as app/api/** on top of the same game engine, prompts and grading,
 * storing data in the browser instead of SQLite and calling Claude through
 * the artifact runtime instead of the API.
 */
import {
  applyLessonResult,
  buyItem,
  claimQuest,
  dayKey,
  defaultSettings,
  defaultStats,
  DEMOTE_BOTTOM,
  dueCards,
  HEART_MODES,
  LEAGUES,
  MAX_HEARTS,
  normalize,
  OUTFITS,
  PROMOTE_TOP,
  recordChat,
  weekEndsAt,
  weekId,
} from "@/lib/game";
import { LANGUAGES, getLanguage } from "@/lib/languages";
import {
  chatSchema,
  explainSchema,
  guidebookSchema,
  lessonPrompt,
  lessonSchema,
  lettersSchema,
  placementPrompt,
  placementSchema,
  planPrompt,
  planSchema,
  scenarioSchema,
  storySchema,
  systemPrompt,
} from "@/lib/server/ai";
import {
  CLIENT_GRADED,
  gradeExercise,
  lessonResultFromSession,
  redactExercise,
  redactStory,
  storyResultFromSession,
  type LessonSessionPayload,
  type StorySessionPayload,
  type Verdict,
} from "@/lib/server/grading";
import type { SessionRecord } from "@/lib/server/db";
import { AIError, generate } from "./claude-local";
import type { Course, LearnerProfile, LeaderboardEntry, LessonMode, LessonResult, PlanUnit, PublicProfile, UserState } from "@/lib/types";

// ---------------------------------------------------------------------------
// Storage

interface LocalUser extends UserState {
  passwordHash: string;
}

interface Store {
  users: Record<string, LocalUser>;
  sessions: Record<string, SessionRecord>;
  follows: [string, string][];
  history: Record<string, { tier: number; xp: number }>; // `${userId}|${weekId}`
  cache: Record<string, unknown>;
  currentUserId: string | null;
}

const KEY = "lingora:store:v1";
let memory: Store | null = null;

function load(): Store {
  if (memory) return memory;
  let stored: Store | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) stored = JSON.parse(raw) as Store;
  } catch {
    stored = null;
  }
  memory = stored ?? { users: {}, sessions: {}, follows: [], history: {}, cache: {}, currentUserId: null };
  return memory;
}

function save() {
  const s = load();
  // Keep storage small: drop finished or old lesson sessions.
  const cutoff = Date.now() - 2 * 86400000;
  for (const [id, sess] of Object.entries(s.sessions)) if (sess.completed || sess.createdAt < cutoff) delete s.sessions[id];
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: keep working in memory */
  }
}

export class LocalApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const fail = (message: string, status = 400): never => {
  throw new LocalApiError(message, status);
};

function toClient(u: LocalUser): UserState {
  const { passwordHash, ...rest } = u;
  void passwordHash;
  return { ...rest, following: followingOf(u.id) };
}

function followingOf(id: string) {
  return load()
    .follows.filter(([a]) => a === id)
    .map(([, b]) => b);
}

async function hash(password: string, salt: string) {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${password}`));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return `${salt}:${password}`;
  }
}

// ---------------------------------------------------------------------------
// Time-based upkeep (same rules as lib/server/userOps.ts)

const LEAGUE_GEMS = [50, 30, 20];

function rolloverLeague(user: LocalUser, now: Date) {
  const s = load();
  const current = weekId(now);
  const league = user.stats.league;
  if (league.weekId === current) return;
  const old = { weekId: league.weekId, tier: league.tier, xp: league.weekXp };
  const cohort = Object.values(s.users)
    .map((u) => {
      if (u.stats.league.weekId === old.weekId && u.stats.league.tier === old.tier) return { id: u.id, xp: u.stats.league.weekXp };
      const h = s.history[`${u.id}|${old.weekId}`];
      return h && h.tier === old.tier ? { id: u.id, xp: h.xp } : null;
    })
    .filter((c): c is { id: string; xp: number } => !!c && (c.xp > 0 || c.id === user.id))
    .sort((a, b) => b.xp - a.xp);
  const rank = cohort.findIndex((c) => c.id === user.id) + 1 || cohort.length + 1;
  let newTier = old.tier;
  if (old.xp > 0 && rank <= PROMOTE_TOP) newTier = Math.min(LEAGUES.length - 1, old.tier + 1);
  else if (old.tier > 0 && (old.xp === 0 || (cohort.length >= 15 && rank > cohort.length - DEMOTE_BOTTOM))) newTier = old.tier - 1;
  const gems = old.xp > 0 && rank <= 3 ? LEAGUE_GEMS[rank - 1] : 0;
  user.stats.gems += gems;
  s.history[`${user.id}|${old.weekId}`] = { tier: old.tier, xp: old.xp };
  league.history[old.weekId] = { tier: old.tier, xp: old.xp };
  if (old.xp > 0 || newTier !== old.tier) {
    league.lastResult = { weekId: old.weekId, rank, cohort: Math.max(cohort.length, 1), oldTier: old.tier, newTier, xp: old.xp, gems, seen: false };
  }
  league.tier = newTier;
  league.highestTier = Math.max(league.highestTier, newTier);
  league.weekId = current;
  league.weekXp = 0;
}

function currentUser(): LocalUser | null {
  const s = load();
  const u = s.currentUserId ? s.users[s.currentUserId] : null;
  if (!u) return null;
  const now = new Date();
  normalize(u, now);
  rolloverLeague(u, now);
  return u;
}

function requireUser(): LocalUser {
  return currentUser() ?? fail("Please sign in.", 401);
}

function requireCourse(): { user: LocalUser; course: Course } {
  const user = requireUser();
  const course = user.activeCourse ? user.courses[user.activeCourse] : undefined;
  if (!course) fail("Start a course first.");
  return { user, course: course! };
}

function publicProfile(u: LocalUser, viewerId?: string): PublicProfile {
  const s = load();
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    avatar: u.avatar,
    createdAt: u.createdAt,
    xp: u.stats.xp,
    streak: u.stats.streak,
    tier: u.stats.league.tier,
    highestTier: u.stats.league.highestTier,
    courses: Object.values(u.courses).map((c) => ({ languageId: c.languageId, xp: c.xp })),
    followers: s.follows.filter(([, b]) => b === u.id).length,
    following: s.follows.filter(([a]) => a === u.id).length,
    isFollowing: viewerId ? s.follows.some(([a, b]) => a === viewerId && b === u.id) : undefined,
  };
}

function newSession(userId: string, kind: string, payload: unknown): string {
  const id = crypto.randomUUID();
  load().sessions[id] = { id, userId, kind, payload, results: {}, completed: false, createdAt: Date.now() };
  save();
  return id;
}

// ---------------------------------------------------------------------------
// Routes

type Body = Record<string, unknown>;
const str = (v: unknown, max = 300) => String(v ?? "").slice(0, max);
const num = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
const list = (v: unknown, max = 20) => (Array.isArray(v) ? v.map(String).slice(0, max) : []);
const COLORS = ["#7c5cff", "#ff6b47", "#1fc47f", "#2fa8ff", "#ffb800", "#e11d48"];
const EMOJIS = ["🦊", "🐼", "🐯", "🐨", "🦁", "🐸", "🐙", "🦄"];
const LEVELS = ["pre-A1", "A1", "A2", "B1", "B2", "C1"];
const MODES: LessonMode[] = ["lesson", "legendary", "unit_review", "test_out", "practice", "mistakes", "words", "listening", "speaking", "letters"];

async function signup(b: Body) {
  const s = load();
  const email = str(b.email).trim().toLowerCase();
  const username = str(b.username).trim();
  const password = str(b.password);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Please enter a valid email.");
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) fail("Usernames are 3-20 letters, numbers or underscores.");
  if (password.length < 8) fail("Passwords need at least 8 characters.");
  const users = Object.values(s.users);
  if (users.some((u) => u.email === email)) fail("That email already has an account.", 409);
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) fail("That username is taken.", 409);
  const now = new Date();
  const id = crypto.randomUUID();
  const user: LocalUser = {
    id,
    email,
    username,
    displayName: (str(b.displayName).trim() || username).slice(0, 40),
    avatar: { emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)], color: COLORS[Math.floor(Math.random() * COLORS.length)], outfit: "none" },
    createdAt: now.toISOString(),
    settings: defaultSettings(str(b.timezone, 60) || "UTC"),
    stats: defaultStats(now),
    courses: {},
    activeCourse: null,
    following: [],
    ownedItems: ["none"],
    passwordHash: await hash(password, id),
  };
  s.users[id] = user;
  s.currentUserId = id;
  save();
  return { user: toClient(user) };
}

async function login(b: Body) {
  const s = load();
  const loginName = str(b.login).trim().toLowerCase();
  const user = Object.values(s.users).find((u) => u.email === loginName || u.username.toLowerCase() === loginName);
  if (!user || user.passwordHash !== (await hash(str(b.password), user.id))) fail("Wrong email/username or password.", 401);
  s.currentUserId = user!.id;
  save();
  return { user: toClient(user!) };
}

function createCourse(b: Body) {
  const user = requireUser();
  const ids = new Set(LANGUAGES.map((l) => l.id));
  const target = str(b.targetLanguage, 10);
  const native = str(b.nativeLanguage, 10);
  if (!ids.has(target) || !ids.has(native)) fail("Please choose a language.");
  if (target === native) fail("Pick a language different from your native language.");
  const profile: LearnerProfile = {
    name: user.displayName,
    ageGroup: str(b.ageGroup),
    nativeLanguage: native,
    otherLanguages: list(b.otherLanguages).filter((id) => ids.has(id)),
    targetLanguage: target,
    level: (LEVELS.includes(str(b.level)) ? str(b.level) : "pre-A1") as LearnerProfile["level"],
    goals: list(b.goals),
    interests: list(b.interests),
    learningStyles: list(b.learningStyles),
    challenges: list(b.challenges),
    correctionStyle: str(b.correctionStyle) || "balanced",
    motivation: str(b.motivation, 500),
  };
  user.courses[target] = {
    languageId: target,
    profile,
    plan: null,
    completedLessons: [],
    completedReviews: [],
    legendary: [],
    storiesDone: [],
    cards: [],
    mistakes: [],
    guides: {},
    xp: 0,
    startedAt: new Date().toISOString(),
  };
  user.activeCourse = target;
  if (typeof b.dailyMinutes === "number" && b.dailyMinutes > 0 && b.dailyMinutes <= 60) user.settings.dailyMinutes = Math.round(b.dailyMinutes);
  save();
  return { user: toClient(user) };
}

function action(b: Body) {
  const user = requireUser();
  const s = load();
  const now = new Date();
  let extra: Record<string, unknown> = {};
  switch (b.type) {
    case "lessonResult": {
      const session = s.sessions[str(b.sessionId, 60)];
      if (!session || session.userId !== user.id) fail("Unknown lesson session.");
      if (session!.completed) fail("This lesson was already submitted.", 409);
      session!.completed = true;
      const result: LessonResult =
        session!.kind === "story"
          ? storyResultFromSession(session as SessionRecord<StorySessionPayload>, { durationSec: Number(b.durationSec) }, now.getTime())
          : lessonResultFromSession(session as SessionRecord<LessonSessionPayload>, { maxCombo: Number(b.maxCombo), durationSec: Number(b.durationSec) }, now.getTime());
      extra = { ...applyLessonResult(user, result, now), result };
      break;
    }
    case "buy": {
      const error = buyItem(user, str(b.item, 30), now);
      if (error) fail(error);
      break;
    }
    case "equipOutfit":
      if (user.ownedItems.includes(str(b.item, 30)) && OUTFITS.some((o) => o.id === b.item)) user.avatar.outfit = str(b.item, 30);
      break;
    case "claimQuest":
      extra = { gems: claimQuest(user, str(b.questId, 30)) };
      break;
    case "settings": {
      const st = (b.settings ?? {}) as Record<string, unknown>;
      for (const key of ["sound", "listening", "speaking", "unlimitedHearts", "romanization"] as const) {
        if (typeof st[key] === "boolean") user.settings[key] = st[key] as boolean;
      }
      if (typeof st.dailyMinutes === "number") user.settings.dailyMinutes = num(st.dailyMinutes, 60) || 10;
      if (typeof st.timezone === "string") user.settings.timezone = str(st.timezone, 60);
      break;
    }
    case "profile":
      if (b.displayName) user.displayName = str(b.displayName, 40);
      if (b.emoji) user.avatar.emoji = str(b.emoji, 8);
      if (typeof b.color === "string" && /^#[0-9a-f]{6}$/i.test(b.color)) user.avatar.color = b.color;
      break;
    case "switchCourse":
      if (user.courses[str(b.courseId, 10)]) user.activeCourse = str(b.courseId, 10);
      break;
    case "deleteCourse": {
      const id = str(b.courseId, 10);
      if (user.courses[id] && Object.keys(user.courses).length > 1) {
        delete user.courses[id];
        if (user.activeCourse === id) user.activeCourse = Object.keys(user.courses)[0];
      }
      break;
    }
    case "seenLeagueResult":
      if (user.stats.league.lastResult) user.stats.league.lastResult.seen = true;
      break;
    case "seenAchievements":
      user.stats.achievementsSeen = { ...user.stats.achievementsSeen, ...((b.levels ?? {}) as Record<string, number>) };
      break;
    case "disableSpeaking":
      user.stats.speakingDisabledUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      break;
    case "follow": {
      const target = str(b.userId, 60);
      if (target !== user.id && s.users[target] && !s.follows.some(([a, c]) => a === user.id && c === target)) s.follows.push([user.id, target]);
      break;
    }
    case "unfollow":
      s.follows = s.follows.filter(([a, c]) => !(a === user.id && c === b.userId));
      break;
    default:
      fail("Unknown action");
  }
  save();
  return { user: toClient(user), ...extra };
}

function leaderboard(scope: string) {
  const me = requireUser();
  const s = load();
  const now = new Date();
  const week = weekId(now);
  const following = followingOf(me.id);
  const pool = Object.values(s.users).filter((u) =>
    scope === "friends" ? u.id === me.id || following.includes(u.id) : u.stats.league.tier === me.stats.league.tier,
  );
  const entries: LeaderboardEntry[] = pool
    .map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      avatar: u.avatar,
      xp: u.stats.league.weekId === week ? u.stats.league.weekXp : 0,
      isMe: u.id === me.id,
    }))
    .filter((e) => e.isMe || e.xp > 0 || scope === "friends")
    .sort((a, b) => b.xp - a.xp || a.displayName.localeCompare(b.displayName));
  save();
  return { entries, tier: me.stats.league.tier, endsAt: weekEndsAt(now).toISOString() };
}

async function lesson(b: Body) {
  const { user, course } = requireCourse();
  const mode = (MODES.includes(b.mode as LessonMode) ? b.mode : "lesson") as LessonMode;
  const unit = course.plan?.units.find((u) => u.id === b.unitId);
  const plannedLesson = unit?.lessons.find((l) => l.id === b.lessonId);
  if (["lesson", "legendary", "unit_review", "test_out"].includes(mode) && !unit) fail("Unknown unit");
  if (HEART_MODES.includes(mode) && !user.settings.unlimitedHearts && user.stats.hearts <= 0) {
    fail("You're out of hearts. Practice to earn more, or turn on unlimited hearts in Settings.", 403);
  }
  const audioOk = b.audio !== false && user.settings.listening;
  // Microphones are blocked inside hosted pages, so speaking exercises are left out here.
  const micOk = false;
  const today = dayKey(new Date(), user.settings.timezone);
  const due = dueCards(course, today)
    .sort((a, c) => a.box - c.box)
    .slice(0, mode === "words" ? 12 : 6);
  const mistakes = course.mistakes.slice(0, mode === "mistakes" ? 12 : 4).map((m) => `"${m.prompt}" → expected "${m.expected}", learner wrote "${m.given}"`);
  const result = await generate({
    userId: user.id,
    tier: "default",
    system: systemPrompt(course.profile),
    messages: [
      {
        role: "user",
        content: lessonPrompt({
          course,
          mode,
          unit,
          lesson: plannedLesson,
          dueWords: due.map((c) => `${c.word} (${c.translation})`),
          knownWords: course.cards.map((c) => c.word),
          mistakes,
          speaking: micOk,
          listening: audioOk,
          focus: typeof b.focus === "string" ? b.focus.slice(0, 200) : undefined,
        }),
      },
    ],
    schema: lessonSchema,
    effort: "low",
  });
  const exercises = result.exercises.filter((e) => (audioOk || !["listen_type", "listen_choice"].includes(e.type)) && e.type !== "speak");
  if (!exercises.length) fail("The lesson came back empty. Please try again.", 502);
  const reviewWords = due.map((c) => c.word);
  const payload: LessonSessionPayload = { mode, unitId: unit?.id, lessonId: plannedLesson?.id, exercises, reviewWords };
  const sessionId = newSession(user.id, "lesson", payload);
  return { sessionId, lesson: { ...result, exercises: exercises.map(redactExercise) }, reviewWords };
}

async function check(b: Body) {
  const me = requireUser();
  const s = load();
  const session = s.sessions[str(b.sessionId, 60)];
  if (!session || session.userId !== me.id || session.completed) fail("This lesson session has ended.");
  const index = Number(b.index);
  const answer = str(b.answer, 500);
  let verdict: Verdict;
  if (session!.kind === "story") {
    const seg = (session!.payload as StorySessionPayload).story.segments[index];
    if (!seg || seg.kind !== "question") fail("Unknown question");
    verdict = { correct: answer === seg!.answer, note: "", correctAnswer: seg!.answer, explanation: "" };
  } else {
    const ex = (session!.payload as LessonSessionPayload).exercises[index];
    if (!ex) fail("Unknown exercise");
    if (CLIENT_GRADED.includes(ex!.type)) verdict = { correct: !!b.selfReportCorrect, note: "", correctAnswer: ex!.correctAnswer, explanation: ex!.explanation };
    else if (ex!.type === "teach") verdict = { correct: true, note: "", correctAnswer: ex!.correctAnswer, explanation: ex!.explanation };
    else {
      const course = me.activeCourse ? me.courses[me.activeCourse] : null;
      if (!course) fail("Start a course first.");
      verdict = await gradeExercise(ex!, answer, course!.languageId, course!.profile, me.id);
    }
  }
  if (session!.results[index] === undefined) session!.results[index] = { correct: verdict.correct, given: answer || "(no answer)" };
  const mode = (session!.payload as LessonSessionPayload).mode;
  if (!verdict.correct && session!.kind === "lesson" && HEART_MODES.includes(mode) && !me.settings.unlimitedHearts && me.stats.hearts > 0) {
    if (me.stats.hearts === MAX_HEARTS) me.stats.heartsUpdatedAt = new Date().toISOString();
    me.stats.hearts -= 1;
  }
  save();
  return { ...verdict, user: toClient(me) };
}

async function plan(b: Body) {
  const { user, course } = requireCourse();
  if (course.plan && !b.extend) return { user: toClient(user) };
  const existing = b.extend ? course.plan?.units : undefined;
  const result = await generate({
    userId: user.id,
    tier: "default",
    system: systemPrompt(course.profile),
    messages: [{ role: "user", content: planPrompt(course.profile, existing) }],
    schema: planSchema,
    effort: "medium",
  });
  if (!result.units.length) fail("The course plan came back empty. Please try again.", 502);
  const offset = existing?.length ?? 0;
  const units: PlanUnit[] = result.units.map((u, i) => ({ ...u, id: `u${offset + i + 1}`, lessons: u.lessons.map((l, j) => ({ ...l, id: `l${j + 1}` })) }));
  course.plan = b.extend && course.plan ? { ...course.plan, units: [...course.plan.units, ...units] } : { summary: result.summary, approach: result.approach, units };
  save();
  return { user: toClient(user) };
}

async function story(b: Body) {
  const { user, course } = requireCourse();
  const unit = course.plan?.units.find((u) => u.id === b.unitId);
  const known = course.cards.map((c) => c.word).slice(-150);
  const result = await generate({
    userId: user.id,
    tier: "default",
    system: systemPrompt(course.profile),
    messages: [
      {
        role: "user",
        content: `Write a short, funny or heartwarming interactive story (14-20 dialogue lines between 2-3 named characters) for this learner.
${unit ? `It should practise the unit "${unit.title}" (${unit.cefr}): ${unit.description}` : "Use material from their current level."}
${b.theme ? `Theme requested by the learner: ${str(b.theme, 200)}` : "Connect it to their interests."}
Known words to reuse: ${known.join(", ") || "basic beginner words"}
Keep ~95% of the words known or very easy (comprehensible input), with a surprise or twist at the end.
Segments: "line" segments carry speaker/text/romanization/translation (question/options/answer empty). After every 3-4 lines insert a "question" segment testing comprehension or vocabulary: question in native language, 3 options, answer = one option (speaker/text/romanization/translation may be empty). Include 4-5 questions in total, the last one about the ending.`,
      },
    ],
    schema: storySchema,
    effort: "low",
  });
  const sessionId = newSession(user.id, "story", { unitId: unit?.id, story: result } satisfies StorySessionPayload);
  return { sessionId, story: redactStory(result) };
}

async function guidebook(b: Body) {
  const { user, course } = requireCourse();
  const unit = course.plan?.units.find((u) => u.id === b.unitId);
  if (!unit) fail("Unknown unit");
  if (course.guides[unit!.id]) return { guide: course.guides[unit!.id] };
  const guide = await generate({
    userId: user.id,
    tier: "default",
    system: systemPrompt(course.profile),
    messages: [
      {
        role: "user",
        content: `Write the guidebook for unit "${unit!.title}" (${unit!.cefr}). Description: ${unit!.description}. Lessons: ${unit!.lessons.map((l) => `${l.title} (${l.focus})`).join("; ")}.
overview: 2-3 sentences. keyPhrases: 8-10 of the most useful phrases from the unit with a short usage note each. tips: 2-4 short grammar or pronunciation tips with simple examples, suited to the learner's preferred styles.`,
      },
    ],
    schema: guidebookSchema,
    effort: "low",
  });
  course.guides[unit!.id] = guide;
  save();
  return { guide };
}

async function explain(b: Body) {
  const { user, course } = requireCourse();
  return generate({
    userId: user.id,
    tier: "quick",
    system: systemPrompt(course.profile),
    messages: [
      {
        role: "user",
        content: `The learner wants to understand this exercise. Explain clearly and briefly (max ~120 words) in their native language, focusing on WHY the correct answer is right${b.given ? " and what was wrong with theirs" : ""}. Give 2 extra example sentences and one memorable tip. Match their correction preference and level.
Exercise: ${str(b.instruction)}
Prompt: ${str(b.prompt, 500)}
Correct answer: ${str(b.expected, 500)}
Learner's answer: ${str(b.given ?? "(none)", 500)}
${b.question ? `Their follow-up question: ${str(b.question, 500)}` : ""}`,
      },
    ],
    schema: explainSchema,
    effort: "low",
  });
}

const CORRECTION: Record<string, string> = {
  gentle: "Only correct errors that block understanding, and do it by naturally recasting (repeating back the correct form) inside your reply. Keep corrections[] to at most one item.",
  balanced: "List the important errors in corrections[] with a short note; ignore tiny slips.",
  strict: "List every error in corrections[] with the rule explained briefly.",
};

async function chat(b: Body) {
  const { user, course } = requireCourse();
  const history = (Array.isArray(b.history) ? b.history : []).slice(-24) as { role: string; text: string }[];
  const scenario = (b.scenario ?? {}) as Record<string, unknown>;
  const target = getLanguage(course.profile.targetLanguage);
  const messages: { role: "user" | "assistant"; content: string }[] = history
    .filter((t) => String(t.text ?? "").trim())
    .map((t) => ({ role: t.role === "assistant" ? "assistant" : "user", content: String(t.text).slice(0, 2000) }));
  if (!messages.length || messages[0].role !== "user") {
    messages.unshift({ role: "user", content: "(The learner has opened the conversation. Greet them in character and start the scenario.)" });
  }
  if (messages[messages.length - 1].role !== "user") fail("Say something first!");
  const system = `${systemPrompt(course.profile)}

You are now a friendly conversation partner who speaks ${target.name}.
Scenario: ${str(scenario.title ?? "Free conversation", 200)}. Your role: ${str(scenario.role ?? "a friendly local")}. The learner's goal: ${str(scenario.goal ?? "chat naturally")}.
${b.voice ? "This is a spoken voice call: keep replies to 1-2 short sentences and natural spoken style." : "Keep replies short (1-3 sentences) so the learner does most of the talking."}
Stay in character, speak ${target.name} at the learner's level (${course.profile.level}, slightly above to stretch them), and end with a question or prompt that keeps the conversation going.
If the learner writes in their native language, help them say it in ${target.name}.
Corrections: ${CORRECTION[course.profile.correctionStyle] ?? CORRECTION.balanced} Leave corrections[] empty when there are no mistakes.`;
  // A single-turn call keeps instructions and conversation together for the quick model.
  const transcript = messages.map((m) => `${m.role === "user" ? "Learner" : "You"}: ${m.content}`).join("\n");
  const result = await generate({
    userId: user.id,
    tier: "quick",
    system,
    messages: [{ role: "user", content: `Conversation so far:\n${transcript}\n\nWrite your next reply.` }],
    schema: chatSchema,
    effort: "low",
  });
  if (history.some((t) => t.role === "user")) {
    recordChat(user);
    save();
  }
  return { ...result, user: toClient(user) };
}

async function scenarios() {
  const { user, course } = requireCourse();
  return generate({
    userId: user.id,
    tier: "quick",
    system: systemPrompt(course.profile),
    messages: [
      {
        role: "user",
        content:
          "Suggest 6 varied, realistic role-play scenarios for this learner's goals, interests and level. Titles and goals in the learner's native language; 'opening' is your first line in the target language. Roles describe who you (the AI) will play.",
      },
    ],
    schema: scenarioSchema,
    effort: "low",
  });
}

async function placement(b: Body) {
  const user = requireUser();
  const ids = new Set(LANGUAGES.map((l) => l.id));
  if (!ids.has(str(b.targetLanguage, 10)) || !ids.has(str(b.nativeLanguage, 10))) fail("Unknown language");
  return generate({
    userId: user.id,
    tier: "default",
    system: systemPrompt({
      name: user.displayName,
      ageGroup: str(b.ageGroup),
      nativeLanguage: str(b.nativeLanguage, 10),
      otherLanguages: [],
      targetLanguage: str(b.targetLanguage, 10),
      level: "A1",
      goals: [],
      interests: [],
      learningStyles: [],
      challenges: [],
      correctionStyle: "balanced",
      motivation: "",
    }),
    messages: [{ role: "user", content: placementPrompt() }],
    schema: placementSchema,
    effort: "low",
  });
}

async function letters() {
  const { user, course } = requireCourse();
  const s = load();
  const key = `letters:${course.profile.targetLanguage}:${course.profile.nativeLanguage}`;
  if (s.cache[key]) return s.cache[key];
  const target = getLanguage(course.profile.targetLanguage);
  const chart = await generate({
    userId: user.id,
    tier: "default",
    system: systemPrompt(course.profile),
    messages: [
      {
        role: "user",
        content: `Create a characters chart for learning the ${target.script} writing system of ${target.name}. intro: 2 sentences on how the script works. Group the characters sensibly (e.g. vowels/consonants, hiragana rows, or for Chinese/Japanese kanji the 40 most frequent beginner characters in groups of ~10). Up to 8 groups, max 15 characters per group. For each give romanization, a sound description, and a common example word with its meaning.`,
      },
    ],
    schema: lettersSchema,
    effort: "low",
  });
  s.cache[key] = chart;
  save();
  return chart;
}

/** Dispatches an `api()` call to the matching route. */
export async function handle(url: string, body: Body | undefined): Promise<unknown> {
  const [path, query = ""] = url.split("?");
  const params = new URLSearchParams(query);
  const b = body ?? {};
  try {
    switch (path) {
      case "/api/me": {
        const u = currentUser();
        if (u) save();
        return { user: u ? toClient(u) : null };
      }
      case "/api/auth/signup":
        return await signup(b);
      case "/api/auth/login":
        return await login(b);
      case "/api/auth/logout":
        load().currentUserId = null;
        save();
        return { ok: true };
      case "/api/course":
        return createCourse(b);
      case "/api/action":
        return action(b);
      case "/api/leaderboard":
        return leaderboard(params.get("scope") ?? "league");
      case "/api/users": {
        const me = requireUser();
        const q = (params.get("q") ?? "").trim().toLowerCase();
        const following = followingOf(me.id);
        const users = Object.values(load().users).filter((u) =>
          q ? u.id !== me.id && (u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q)) : following.includes(u.id),
        );
        return { users: users.slice(0, 20).map((u) => publicProfile(u, me.id)) };
      }
      case "/api/lesson/check":
        return await check(b);
      case "/api/ai/lesson":
        return await lesson(b);
      case "/api/ai/plan":
        return await plan(b);
      case "/api/ai/story":
        return await story(b);
      case "/api/ai/guidebook":
        return await guidebook(b);
      case "/api/ai/explain":
        return await explain(b);
      case "/api/ai/chat":
        return await chat(b);
      case "/api/ai/scenarios":
        return await scenarios();
      case "/api/ai/placement":
        return await placement(b);
      case "/api/ai/letters":
        return await letters();
    }
    if (path.startsWith("/api/users/")) {
      const me = requireUser();
      const name = decodeURIComponent(path.slice("/api/users/".length)).toLowerCase();
      const u = Object.values(load().users).find((x) => x.username.toLowerCase() === name);
      if (!u) fail("User not found", 404);
      return { user: publicProfile(u!, me.id) };
    }
    fail(`Unknown route ${path}`, 404);
  } catch (e) {
    if (e instanceof LocalApiError) throw e;
    if (e instanceof AIError) throw new LocalApiError(e.message, e.status);
    console.error(e);
    throw new LocalApiError("Something went wrong. Please try again.", 500);
  }
  return null;
}
