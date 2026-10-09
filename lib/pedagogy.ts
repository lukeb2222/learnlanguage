/**
 * The evidence base the AI tutor is instructed to follow. Each principle is
 * shown to learners on the /research page and compiled into the system prompt
 * so that every generated lesson, review and conversation applies it.
 */
export interface Principle {
  id: string;
  title: string;
  icon: string;
  finding: string;
  howWeUseIt: string;
  sources: string[];
}

export const PRINCIPLES: Principle[] = [
  {
    id: "spacing",
    title: "Spaced repetition",
    icon: "⏳",
    finding:
      "Reviews spread out over increasing intervals produce far better long-term retention than massed practice (cramming). Optimal gaps grow as the item becomes better known.",
    howWeUseIt:
      "Every word you meet goes into a Leitner-style review deck (intervals of 1, 2, 4, 8, 16 and 32 days). The Practice tab serves the words that are due, and lessons quietly recycle due words.",
    sources: [
      "Ebbinghaus (1885), Memory: A Contribution to Experimental Psychology",
      "Cepeda et al. (2006), Psychological Bulletin 132(3) — meta-analysis of 254 studies on distributed practice",
      "Settles & Meeder (2016), A Trainable Spaced Repetition Model for Language Learning, ACL",
    ],
  },
  {
    id: "retrieval",
    title: "Retrieval practice (the testing effect)",
    icon: "🧠",
    finding:
      "Actively recalling information strengthens memory more than re-reading it. Effortful recall — producing the answer, not just recognising it — is especially powerful.",
    howWeUseIt:
      "Lessons move quickly from recognition (multiple choice) to production (building and typing sentences, speaking) so you retrieve, not just review.",
    sources: [
      "Roediger & Karpicke (2006), Psychological Science 17(3)",
      "Karpicke & Roediger (2008), Science 319(5865)",
    ],
  },
  {
    id: "input",
    title: "Comprehensible input (i + 1)",
    icon: "📖",
    finding:
      "Acquisition is driven by understanding messages slightly above your current level. Learners need to know roughly 95–98% of the words in a text to understand it comfortably.",
    howWeUseIt:
      "The AI keeps almost all of each sentence within the vocabulary you already know and introduces only a few new items at a time, always in meaningful context.",
    sources: [
      "Krashen (1982), Principles and Practice in Second Language Acquisition",
      "Hu & Nation (2000), Reading in a Foreign Language 13(1); Laufer & Ravenhorst-Kalovski (2010)",
    ],
  },
  {
    id: "output",
    title: "Pushed output & interaction",
    icon: "🗣️",
    finding:
      "Producing language forces learners to notice gaps in their knowledge, and negotiating meaning in conversation accelerates acquisition.",
    howWeUseIt:
      "The AI conversation partner role-plays real situations tailored to your goals and keeps you talking instead of lecturing.",
    sources: [
      "Swain (1985, 1995), the Output Hypothesis",
      "Long (1996), the Interaction Hypothesis",
      "Mackey & Goo (2007), meta-analysis of interaction research",
    ],
  },
  {
    id: "feedback",
    title: "Corrective feedback",
    icon: "✍️",
    finding:
      "Explicit, timely corrective feedback improves accuracy. Prompts that make the learner self-correct and brief metalinguistic explanations outperform no feedback; recasts work best when they are salient.",
    howWeUseIt:
      "Every answer gets instant feedback with a short 'why'. In conversation, corrections are shown in the style you chose at sign-up (gentle recasts or explicit corrections).",
    sources: [
      "Lyster & Ranta (1997), Studies in Second Language Acquisition 19(1)",
      "Li (2010), Language Learning 60(2) — meta-analysis of corrective feedback",
    ],
  },
  {
    id: "frequency",
    title: "High-frequency vocabulary first",
    icon: "📊",
    finding:
      "A small number of high-frequency words covers most of everyday speech — roughly the top 2,000–3,000 word families give 90%+ coverage of conversation.",
    howWeUseIt:
      "Beginner units prioritise the most frequent words and chunks, then branch into vocabulary for your personal goals and interests.",
    sources: [
      "Nation (2006), Canadian Modern Language Review 63(1)",
      "Nation (2013), Learning Vocabulary in Another Language",
    ],
  },
  {
    id: "chunks",
    title: "Formulaic chunks",
    icon: "🧩",
    finding:
      "Fluent speech relies heavily on prefabricated multi-word expressions. Learning chunks speeds up fluency and naturalness.",
    howWeUseIt:
      "New material is taught as useful phrases ('Could I have…', 'I'd like to…') before being broken down into grammar.",
    sources: [
      "Wray (2002), Formulaic Language and the Lexicon",
      "Boers & Lindstromberg (2012), Annual Review of Applied Linguistics 32",
    ],
  },
  {
    id: "interleaving",
    title: "Interleaving & desirable difficulty",
    icon: "🔀",
    finding:
      "Mixing different types of problems and keeping practice effortful (but achievable) improves long-term learning, even though it feels harder.",
    howWeUseIt:
      "Exercise types are shuffled within a lesson, and difficulty adapts so you get roughly 80–85% right — challenging but not discouraging.",
    sources: [
      "Bjork & Bjork (2011), Making things hard on yourself, but in a good way",
      "Rohrer & Taylor (2007), Instructional Science 35",
      "Wilson et al. (2019), The Eighty Five Percent Rule for optimal learning, Nature Communications 10",
    ],
  },
  {
    id: "dual",
    title: "Dual coding & multimodal practice",
    icon: "🎧",
    finding:
      "Combining verbal information with audio and visual cues creates more retrieval routes. Listening practice with matched text supports phonological learning.",
    howWeUseIt:
      "Every sentence can be heard aloud, listening exercises train your ear, and speaking exercises use speech recognition.",
    sources: ["Paivio (1986), Mental Representations: A Dual Coding Approach", "Mayer (2009), Multimedia Learning"],
  },
  {
    id: "motivation",
    title: "Motivation, autonomy & habit",
    icon: "🔥",
    finding:
      "Learners persist when they feel autonomy, competence and relatedness. Small daily goals and streaks build habits; personally relevant content boosts engagement.",
    howWeUseIt:
      "Your goals, interests and daily time shape the whole course. Streaks, XP, daily goals and achievements reward consistency — not just raw volume.",
    sources: [
      "Deci & Ryan (2000), Self-Determination Theory, American Psychologist 55(1)",
      "Dörnyei (2005), The Psychology of the Language Learner",
      "Lally et al. (2010), European Journal of Social Psychology 40 — habit formation",
    ],
  },
  {
    id: "cefr",
    title: "Can-do goals (CEFR)",
    icon: "🎯",
    finding:
      "The Common European Framework of Reference describes proficiency as concrete things you can do with the language, which gives learners clear, meaningful milestones.",
    howWeUseIt:
      "Each unit is mapped to a CEFR level and ends with a 'can-do' statement so you always know what real-world skill you're building.",
    sources: ["Council of Europe (2020), CEFR Companion Volume"],
  },
];

export const PEDAGOGY_PROMPT = `You are an expert applied linguist and language teacher. Design everything according to this evidence base:
${PRINCIPLES.map((p) => `- ${p.title}: ${p.finding} Application: ${p.howWeUseIt}`).join("\n")}

Additional rules:
- Target ~85% learner success: mostly known material plus a few new items (no more than 4-6 new words or chunks per lesson).
- Introduce new items with a "teach" step before testing them, then retrieve each new item at least twice in different exercise types.
- Progress from recognition to production within each lesson.
- Use natural, high-frequency, contemporary language a native speaker would actually say. Never invent words.
- Keep explanations short, friendly and in the learner's native language.
- Personalise examples to the learner's goals and interests.`;
