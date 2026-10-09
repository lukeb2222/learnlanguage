export interface Language {
  id: string;
  name: string;
  native: string;
  flag: string;
  /** BCP-47 tag used for browser speech synthesis / recognition. */
  tts: string;
  rtl?: boolean;
  /** Writing system, shown to learners and passed to the AI. */
  script: string;
  /** True when learners benefit from romanization while the script is new. */
  romanize?: boolean;
  /**
   * US Foreign Service Institute difficulty category for native English speakers
   * (1 = ~24-30 weeks to professional proficiency, 4 = ~88 weeks). Approximate
   * for languages FSI does not publish; used to set realistic expectations.
   */
  fsi: 1 | 2 | 3 | 4;
  /** Rough total speakers in millions (L1 + L2), for display only. */
  speakers: number;
}

export const LANGUAGES: Language[] = [
  { id: "en", name: "English", native: "English", flag: "🇬🇧", tts: "en-US", script: "Latin", fsi: 1, speakers: 1500 },
  { id: "es", name: "Spanish", native: "Español", flag: "🇪🇸", tts: "es-ES", script: "Latin", fsi: 1, speakers: 560 },
  { id: "fr", name: "French", native: "Français", flag: "🇫🇷", tts: "fr-FR", script: "Latin", fsi: 1, speakers: 310 },
  { id: "de", name: "German", native: "Deutsch", flag: "🇩🇪", tts: "de-DE", script: "Latin", fsi: 2, speakers: 135 },
  { id: "it", name: "Italian", native: "Italiano", flag: "🇮🇹", tts: "it-IT", script: "Latin", fsi: 1, speakers: 68 },
  { id: "pt", name: "Portuguese", native: "Português", flag: "🇧🇷", tts: "pt-BR", script: "Latin", fsi: 1, speakers: 265 },
  { id: "he", name: "Hebrew", native: "עברית", flag: "🇮🇱", tts: "he-IL", rtl: true, script: "Hebrew", romanize: true, fsi: 3, speakers: 9 },
  { id: "zh", name: "Chinese (Mandarin)", native: "中文", flag: "🇨🇳", tts: "zh-CN", script: "Simplified Chinese (Hanzi) + Pinyin", romanize: true, fsi: 4, speakers: 1140 },
  { id: "yue", name: "Cantonese", native: "粵語", flag: "🇭🇰", tts: "zh-HK", script: "Traditional Chinese + Jyutping", romanize: true, fsi: 4, speakers: 85 },
  { id: "ja", name: "Japanese", native: "日本語", flag: "🇯🇵", tts: "ja-JP", script: "Hiragana, Katakana, Kanji", romanize: true, fsi: 4, speakers: 125 },
  { id: "ko", name: "Korean", native: "한국어", flag: "🇰🇷", tts: "ko-KR", script: "Hangul", romanize: true, fsi: 4, speakers: 82 },
  { id: "ar", name: "Arabic", native: "العربية", flag: "🇸🇦", tts: "ar-SA", rtl: true, script: "Arabic", romanize: true, fsi: 4, speakers: 375 },
  { id: "ru", name: "Russian", native: "Русский", flag: "🇷🇺", tts: "ru-RU", script: "Cyrillic", romanize: true, fsi: 3, speakers: 255 },
  { id: "hi", name: "Hindi", native: "हिन्दी", flag: "🇮🇳", tts: "hi-IN", script: "Devanagari", romanize: true, fsi: 3, speakers: 610 },
  { id: "tr", name: "Turkish", native: "Türkçe", flag: "🇹🇷", tts: "tr-TR", script: "Latin", fsi: 3, speakers: 90 },
  { id: "nl", name: "Dutch", native: "Nederlands", flag: "🇳🇱", tts: "nl-NL", script: "Latin", fsi: 1, speakers: 30 },
  { id: "sv", name: "Swedish", native: "Svenska", flag: "🇸🇪", tts: "sv-SE", script: "Latin", fsi: 1, speakers: 13 },
  { id: "no", name: "Norwegian", native: "Norsk", flag: "🇳🇴", tts: "nb-NO", script: "Latin", fsi: 1, speakers: 5 },
  { id: "da", name: "Danish", native: "Dansk", flag: "🇩🇰", tts: "da-DK", script: "Latin", fsi: 1, speakers: 6 },
  { id: "fi", name: "Finnish", native: "Suomi", flag: "🇫🇮", tts: "fi-FI", script: "Latin", fsi: 3, speakers: 5 },
  { id: "is", name: "Icelandic", native: "Íslenska", flag: "🇮🇸", tts: "is-IS", script: "Latin", fsi: 3, speakers: 0.4 },
  { id: "pl", name: "Polish", native: "Polski", flag: "🇵🇱", tts: "pl-PL", script: "Latin", fsi: 3, speakers: 45 },
  { id: "cs", name: "Czech", native: "Čeština", flag: "🇨🇿", tts: "cs-CZ", script: "Latin", fsi: 3, speakers: 11 },
  { id: "sk", name: "Slovak", native: "Slovenčina", flag: "🇸🇰", tts: "sk-SK", script: "Latin", fsi: 3, speakers: 5 },
  { id: "uk", name: "Ukrainian", native: "Українська", flag: "🇺🇦", tts: "uk-UA", script: "Cyrillic", romanize: true, fsi: 3, speakers: 40 },
  { id: "ro", name: "Romanian", native: "Română", flag: "🇷🇴", tts: "ro-RO", script: "Latin", fsi: 1, speakers: 26 },
  { id: "hu", name: "Hungarian", native: "Magyar", flag: "🇭🇺", tts: "hu-HU", script: "Latin", fsi: 3, speakers: 13 },
  { id: "el", name: "Greek", native: "Ελληνικά", flag: "🇬🇷", tts: "el-GR", script: "Greek", romanize: true, fsi: 3, speakers: 13 },
  { id: "bg", name: "Bulgarian", native: "Български", flag: "🇧🇬", tts: "bg-BG", script: "Cyrillic", romanize: true, fsi: 3, speakers: 8 },
  { id: "hr", name: "Croatian", native: "Hrvatski", flag: "🇭🇷", tts: "hr-HR", script: "Latin", fsi: 3, speakers: 6 },
  { id: "sr", name: "Serbian", native: "Српски", flag: "🇷🇸", tts: "sr-RS", script: "Cyrillic & Latin", romanize: true, fsi: 3, speakers: 9 },
  { id: "lt", name: "Lithuanian", native: "Lietuvių", flag: "🇱🇹", tts: "lt-LT", script: "Latin", fsi: 3, speakers: 3 },
  { id: "lv", name: "Latvian", native: "Latviešu", flag: "🇱🇻", tts: "lv-LV", script: "Latin", fsi: 3, speakers: 2 },
  { id: "et", name: "Estonian", native: "Eesti", flag: "🇪🇪", tts: "et-EE", script: "Latin", fsi: 3, speakers: 1.1 },
  { id: "ca", name: "Catalan", native: "Català", flag: "🏴", tts: "ca-ES", script: "Latin", fsi: 1, speakers: 10 },
  { id: "ga", name: "Irish", native: "Gaeilge", flag: "🇮🇪", tts: "ga-IE", script: "Latin", fsi: 3, speakers: 1.8 },
  { id: "cy", name: "Welsh", native: "Cymraeg", flag: "🏴", tts: "cy-GB", script: "Latin", fsi: 3, speakers: 0.9 },
  { id: "fa", name: "Persian (Farsi)", native: "فارسی", flag: "🇮🇷", tts: "fa-IR", rtl: true, script: "Perso-Arabic", romanize: true, fsi: 3, speakers: 110 },
  { id: "ur", name: "Urdu", native: "اردو", flag: "🇵🇰", tts: "ur-PK", rtl: true, script: "Perso-Arabic (Nastaliq)", romanize: true, fsi: 3, speakers: 230 },
  { id: "bn", name: "Bengali", native: "বাংলা", flag: "🇧🇩", tts: "bn-BD", script: "Bengali", romanize: true, fsi: 3, speakers: 270 },
  { id: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ", flag: "🇮🇳", tts: "pa-IN", script: "Gurmukhi", romanize: true, fsi: 3, speakers: 150 },
  { id: "gu", name: "Gujarati", native: "ગુજરાતી", flag: "🇮🇳", tts: "gu-IN", script: "Gujarati", romanize: true, fsi: 3, speakers: 60 },
  { id: "mr", name: "Marathi", native: "मराठी", flag: "🇮🇳", tts: "mr-IN", script: "Devanagari", romanize: true, fsi: 3, speakers: 99 },
  { id: "ta", name: "Tamil", native: "தமிழ்", flag: "🇮🇳", tts: "ta-IN", script: "Tamil", romanize: true, fsi: 3, speakers: 86 },
  { id: "te", name: "Telugu", native: "తెలుగు", flag: "🇮🇳", tts: "te-IN", script: "Telugu", romanize: true, fsi: 3, speakers: 96 },
  { id: "th", name: "Thai", native: "ไทย", flag: "🇹🇭", tts: "th-TH", script: "Thai", romanize: true, fsi: 3, speakers: 70 },
  { id: "vi", name: "Vietnamese", native: "Tiếng Việt", flag: "🇻🇳", tts: "vi-VN", script: "Latin (with tones)", fsi: 3, speakers: 86 },
  { id: "id", name: "Indonesian", native: "Bahasa Indonesia", flag: "🇮🇩", tts: "id-ID", script: "Latin", fsi: 2, speakers: 250 },
  { id: "ms", name: "Malay", native: "Bahasa Melayu", flag: "🇲🇾", tts: "ms-MY", script: "Latin", fsi: 2, speakers: 80 },
  { id: "tl", name: "Tagalog (Filipino)", native: "Tagalog", flag: "🇵🇭", tts: "fil-PH", script: "Latin", fsi: 3, speakers: 83 },
  { id: "sw", name: "Swahili", native: "Kiswahili", flag: "🇰🇪", tts: "sw-KE", script: "Latin", fsi: 2, speakers: 200 },
  { id: "am", name: "Amharic", native: "አማርኛ", flag: "🇪🇹", tts: "am-ET", script: "Ge'ez (Fidel)", romanize: true, fsi: 3, speakers: 57 },
  { id: "yo", name: "Yoruba", native: "Yorùbá", flag: "🇳🇬", tts: "yo-NG", script: "Latin (with tones)", fsi: 3, speakers: 45 },
  { id: "zu", name: "Zulu", native: "isiZulu", flag: "🇿🇦", tts: "zu-ZA", script: "Latin", fsi: 3, speakers: 28 },
  { id: "af", name: "Afrikaans", native: "Afrikaans", flag: "🇿🇦", tts: "af-ZA", script: "Latin", fsi: 1, speakers: 17 },
  { id: "ht", name: "Haitian Creole", native: "Kreyòl ayisyen", flag: "🇭🇹", tts: "ht-HT", script: "Latin", fsi: 1, speakers: 13 },
  { id: "hy", name: "Armenian", native: "Հայերեն", flag: "🇦🇲", tts: "hy-AM", script: "Armenian", romanize: true, fsi: 3, speakers: 7 },
  { id: "ka", name: "Georgian", native: "ქართული", flag: "🇬🇪", tts: "ka-GE", script: "Georgian (Mkhedruli)", romanize: true, fsi: 3, speakers: 4 },
  { id: "yi", name: "Yiddish", native: "ייִדיש", flag: "🕍", tts: "yi", rtl: true, script: "Hebrew", romanize: true, fsi: 2, speakers: 0.6 },
  { id: "la", name: "Latin", native: "Latina", flag: "🏛️", tts: "it-IT", script: "Latin", fsi: 3, speakers: 0 },
  { id: "eo", name: "Esperanto", native: "Esperanto", flag: "🌍", tts: "eo", script: "Latin", fsi: 1, speakers: 2 },
  { id: "haw", name: "Hawaiian", native: "ʻŌlelo Hawaiʻi", flag: "🌺", tts: "haw-US", script: "Latin", fsi: 2, speakers: 0.03 },
];

export const getLanguage = (id: string): Language =>
  LANGUAGES.find((l) => l.id === id) ?? LANGUAGES[0];

export const FSI_LABEL: Record<Language["fsi"], string> = {
  1: "Closely related to English · ~600–750 class hours",
  2: "Moderate · ~900 class hours",
  3: "Hard · ~1,100 class hours",
  4: "Super-hard · ~2,200 class hours",
};
