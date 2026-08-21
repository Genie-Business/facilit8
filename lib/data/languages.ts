/**
 * Suggestion source for the languages autocomplete — languagesSpoken stays a plain String[]
 * on AweCareerProfile (no taxonomy model, unlike Skill), since world languages are a bounded,
 * well-known list that doesn't need admin curation/growth. Free-typing is always allowed on
 * top of these suggestions.
 */
export const COMMON_LANGUAGES = [
  "English",
  "Yoruba",
  "Igbo",
  "Hausa",
  "Pidgin",
  "Fulfulde",
  "Kanuri",
  "Tiv",
  "Ibibio",
  "Edo",
  "French",
  "Arabic",
  "Portuguese",
  "Spanish",
  "Swahili",
  "German",
  "Chinese (Mandarin)",
];
