import type { Cefr } from "./types";

export const LEVELS: { id: Cefr; label: string; desc: string; icon: string }[] = [
  { id: "pre-A1", label: "Brand new", desc: "I'm starting from zero", icon: "🌱" },
  { id: "A1", label: "A few words", desc: "I know some basic words and greetings", icon: "🌿" },
  { id: "A2", label: "Simple chats", desc: "I can handle simple everyday conversations", icon: "🌳" },
  { id: "B1", label: "Getting around", desc: "I can talk about familiar topics and travel", icon: "🏞️" },
  { id: "B2", label: "Pretty confident", desc: "I can discuss many topics fairly fluently", icon: "⛰️" },
  { id: "C1", label: "Advanced", desc: "I want to polish nuance and idioms", icon: "🏔️" },
];

export const GOALS = [
  { id: "travel", label: "Travel", icon: "✈️" },
  { id: "career", label: "Career & work", icon: "💼" },
  { id: "school", label: "School / exams", icon: "🎓" },
  { id: "family", label: "Family & heritage", icon: "👨‍👩‍👧" },
  { id: "partner", label: "Partner / friends", icon: "💞" },
  { id: "culture", label: "Movies, music & books", icon: "🎬" },
  { id: "relocation", label: "Moving abroad", icon: "🏡" },
  { id: "brain", label: "Brain training", icon: "🧠" },
  { id: "religion", label: "Religious / sacred texts", icon: "📜" },
];

export const INTERESTS = [
  "Food & cooking", "Sports", "Technology", "Music", "Movies & TV", "Gaming", "Business",
  "Science", "History", "Art & design", "Nature", "Fashion", "Health & fitness", "Politics",
  "Literature", "Anime & comics", "Cars", "Pets", "Spirituality", "Travel stories",
];

export const LEARNING_STYLES = [
  { id: "visual", label: "Seeing it written", desc: "Reading, tables and patterns", icon: "👀" },
  { id: "audio", label: "Hearing it", desc: "Listening and pronunciation", icon: "🎧" },
  { id: "speaking", label: "Saying it", desc: "Speaking out loud from day one", icon: "🗣️" },
  { id: "grammar", label: "Understanding rules", desc: "Clear grammar explanations", icon: "📐" },
  { id: "immersion", label: "Diving in", desc: "Minimal explanations, lots of context", icon: "🌊" },
  { id: "games", label: "Playing", desc: "Fast-paced, game-like practice", icon: "🎮" },
];

export const CHALLENGES = [
  "Remembering vocabulary", "Grammar", "Pronunciation", "Listening to fast speech",
  "Speaking confidently", "Reading the script", "Spelling", "Staying motivated",
];

export const AGE_GROUPS = ["Under 13", "13–17", "18–24", "25–34", "35–49", "50–64", "65+"];

export const DAILY_GOALS = [
  { minutes: 5, label: "Casual", icon: "☕" },
  { minutes: 10, label: "Regular", icon: "🚶" },
  { minutes: 15, label: "Serious", icon: "🏃" },
  { minutes: 20, label: "Intense", icon: "🚀" },
  { minutes: 30, label: "Unstoppable", icon: "🔥" },
];

export const CORRECTION_STYLES = [
  { id: "gentle", label: "Gentle", desc: "Model the correct version naturally without stopping me" },
  { id: "balanced", label: "Balanced", desc: "Point out important mistakes with a short note" },
  { id: "strict", label: "Strict", desc: "Correct every mistake and explain the rule" },
];
