// Fixed-vocabulary options for the onboarding wizard's checkbox/select groups. Kept as
// plain constants (like NIGERIA_STATES) rather than an admin-editable taxonomy — these
// are Awe prompt inputs, not marketplace data that needs curation over time.

export const HIGHEST_EDUCATION_LEVELS = [
  "High school",
  "Diploma / OND",
  "HND",
  "Bachelor's degree",
  "Master's degree",
  "Doctorate",
  "Professional certification",
  "Other",
];

export const CAREER_GOAL_TAGS = [
  "Get promoted",
  "Change careers",
  "Develop leadership skills",
  "Increase earning potential",
  "Build technical expertise",
  "Improve soft skills",
  "Start a business",
  "Return to the workforce",
];

export const TARGET_CAREER_LEVELS = [
  "Entry-level",
  "Mid-level",
  "Senior / experienced",
  "Managerial",
  "Executive / leadership",
  "Business owner",
];

export const TARGET_TIMELINES = ["Within 6 months", "6-12 months", "1-2 years", "2+ years", "No fixed timeline"];

export const CHALLENGE_TAGS = [
  "Lack of time",
  "Limited budget",
  "Not sure what skills to prioritize",
  "Limited access to quality training",
  "Lack of mentorship",
  "Imposter syndrome",
  "Unclear career path",
  "Balancing work and learning",
];

export const LEARNING_FORMATS = [
  "In-person workshops",
  "Virtual / live sessions",
  "Self-paced online courses",
  "One-on-one coaching",
  "Peer learning groups",
  "Reading / self-study",
];

export const AVAILABLE_LEARNING_TIMES = [
  "Less than 2 hours a week",
  "2-5 hours a week",
  "5-10 hours a week",
  "10+ hours a week",
];

export const PREFERRED_SCHEDULES = ["Weekday mornings", "Weekday afternoons", "Weekday evenings", "Weekends"];

export const PREFERRED_DELIVERIES = ["In-person", "Virtual", "Hybrid", "No preference"];

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  FREELANCE: "Freelance",
  INTERNSHIP: "Internship",
  VOLUNTEER: "Volunteer",
  SELF_EMPLOYED: "Self-employed",
};

export const PROFESSIONAL_DEVELOPMENT_TYPE_LABELS: Record<string, string> = {
  COURSE: "Course",
  TRAINING: "Training",
  CERTIFICATION: "Certification",
  WORKSHOP: "Workshop",
  CONFERENCE: "Conference",
};
