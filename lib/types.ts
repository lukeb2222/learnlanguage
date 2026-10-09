export type Cefr = "pre-A1" | "A1" | "A2" | "B1" | "B2" | "C1";

/** Course-specific answers from sign-up: how the AI should teach this learner. */
export interface LearnerProfile {
  name: string;
  ageGroup: string;
  nativeLanguage: string; // language id
  otherLanguages: string[]; // language ids
  targetLanguage: string; // language id
  level: Cefr;
  goals: string[];
  interests: string[];
  learningStyles: string[];
  challenges: string[];
  correctionStyle: string;
  motivation: string;
}

export interface PlanLesson {
  id: string;
  title: string;
  focus: string;
  objectives: string[];
}

export interface PlanUnit {
  id: string;
  title: string;
  emoji: string;
  cefr: string;
  description: string;
  canDo: string;
  lessons: PlanLesson[];
}

export interface CoursePlan {
  summary: string;
  approach: string[];
  units: PlanUnit[];
}

export type ExerciseType =
  | "teach"
  | "multiple_choice"
  | "translate_build"
  | "translate_type"
  | "listen_type"
  | "listen_choice"
  | "match_pairs"
  | "fill_blank"
  | "speak";

export interface VocabItem {
  word: string;
  translation: string;
  romanization: string;
}

export interface Exercise {
  type: ExerciseType;
  instruction: string;
  prompt: string;
  promptRomanization: string;
  /** Language the learner should answer in. */
  answerLanguage: "target" | "native";
  options: string[];
  correctAnswer: string;
  acceptedAnswers: string[];
  wordBank: string[];
  pairs: { left: string; right: string }[];
  audioText: string;
  hint: string;
  explanation: string;
  newVocab: VocabItem[];
}

export interface Lesson {
  title: string;
  intro: string;
  culturalNote: string;
  exercises: Exercise[];
}

export type LessonMode =
  | "lesson"
  | "legendary"
  | "unit_review"
  | "test_out"
  | "practice"
  | "mistakes"
  | "words"
  | "listening"
  | "speaking"
  | "letters";

export interface Guidebook {
  overview: string;
  keyPhrases: { phrase: string; translation: string; romanization: string; note: string }[];
  tips: { title: string; body: string }[];
}

export interface StorySegment {
  kind: "line" | "question";
  speaker: string;
  text: string;
  romanization: string;
  translation: string;
  question: string;
  options: string[];
  answer: string;
}

export interface Story {
  title: string;
  emoji: string;
  setting: string;
  segments: StorySegment[];
}

export interface SrsCard {
  word: string;
  translation: string;
  romanization: string;
  /** Leitner box 0-6; higher = known better, reviewed less often. */
  box: number;
  due: string; // YYYY-MM-DD
  seen: number;
  lapses: number;
  addedAt: string;
}

export interface Mistake {
  prompt: string;
  expected: string;
  given: string;
  at: string;
}

export interface Course {
  languageId: string;
  profile: LearnerProfile;
  plan: CoursePlan | null;
  completedLessons: string[]; // "unitId/lessonId"
  completedReviews: string[]; // unitIds whose unit review is done
  legendary: string[]; // unitIds completed at legendary level
  storiesDone: string[]; // unitIds whose story is done
  cards: SrsCard[];
  mistakes: Mistake[];
  guides: Record<string, Guidebook>;
  xp: number;
  startedAt: string;
}

export interface Quest {
  id: string;
  label: string;
  icon: string;
  metric: QuestMetric;
  target: number;
  progress: number;
  reward: number;
  claimed: boolean;
}

export type QuestMetric =
  | "xp"
  | "lessons"
  | "perfect"
  | "accuracy90"
  | "combo"
  | "words"
  | "chat"
  | "story"
  | "listening"
  | "minutes";

export interface LeagueResult {
  weekId: string;
  rank: number;
  cohort: number;
  oldTier: number;
  newTier: number;
  xp: number;
  gems: number;
  seen: boolean;
}

export interface Stats {
  xp: number;
  gems: number;
  hearts: number;
  heartsUpdatedAt: string;
  streak: number;
  longestStreak: number;
  lastActiveDay: string | null;
  streakFreezes: number;
  frozenDays: string[];
  activeDays: string[];
  lostStreak: number;
  lostStreakDay: string | null;
  daily: Record<string, number>;
  dailyGoalChestDay: string | null;
  lessonsCompleted: number;
  perfectLessons: number;
  storiesCompleted: number;
  chatMessages: number;
  legendaryCompleted: number;
  minutes: number;
  bestCombo: number;
  xpBoostUntil: string | null;
  quests: { day: string; items: Quest[] };
  monthly: { month: string; questsClaimed: number; badges: string[] };
  league: {
    tier: number;
    weekId: string;
    weekXp: number;
    history: Record<string, { tier: number; xp: number }>;
    highestTier: number;
    lastResult: LeagueResult | null;
  };
  achievementsSeen: Record<string, number>;
  speakingDisabledUntil: string | null;
}

export interface Settings {
  sound: boolean;
  listening: boolean;
  speaking: boolean;
  unlimitedHearts: boolean;
  romanization: boolean;
  dailyMinutes: number;
  timezone: string;
}

export interface Avatar {
  emoji: string;
  color: string;
  outfit: string;
}

export interface UserState {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar: Avatar;
  createdAt: string;
  settings: Settings;
  stats: Stats;
  courses: Record<string, Course>;
  activeCourse: string | null;
  following: string[];
  ownedItems: string[];
}

export interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: Avatar;
  createdAt: string;
  xp: number;
  streak: number;
  tier: number;
  highestTier: number;
  courses: { languageId: string; xp: number }[];
  followers: number;
  following: number;
  isFollowing?: boolean;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  displayName: string;
  avatar: Avatar;
  xp: number;
  isMe: boolean;
}

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
  romanization?: string;
  translation?: string;
  corrections?: { original: string; corrected: string; note: string }[];
  suggestions?: string[];
}

/** Payload sent when any lesson-like activity finishes. */
export interface LessonResult {
  mode: LessonMode | "story";
  unitId?: string;
  lessonId?: string;
  correct: number;
  total: number;
  maxCombo: number;
  durationSec: number;
  newVocab: VocabItem[];
  reviewed: { word: string; correct: boolean }[];
  mistakes: Mistake[];
  passed: boolean;
}
