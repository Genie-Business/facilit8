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

// --- Facilitator-specific step ---

export const FACILITATOR_TRAINING_FORMATS = [
  "In-person workshops",
  "Virtual / live sessions",
  "Hybrid",
  "Self-paced content design",
  "One-on-one coaching",
];

export const AUDIENCE_SIZES = ["1-10", "11-30", "31-100", "100+"];

export const AUDIENCE_SENIORITIES = ["Entry-level", "Mid-level", "Senior", "Executive / C-suite", "Mixed levels"];

export const FACILITATION_SKILL_LABELS: Record<string, string> = {
  PUBLIC_SPEAKING: "Public speaking",
  FACILITATION: "Facilitation",
  ADULT_LEARNING: "Adult learning principles",
  INSTRUCTIONAL_DESIGN: "Instructional design",
  WORKSHOP_DESIGN: "Workshop design",
  STORYTELLING: "Storytelling",
  EXECUTIVE_FACILITATION: "Executive facilitation",
  VIRTUAL_FACILITATION: "Virtual facilitation",
  TRAINING_EVALUATION: "Training evaluation",
  PRESENTATION: "Presentation",
  COACHING: "Coaching",
  CONSULTING: "Consulting",
};

export const PROFICIENCY_LABELS: Record<string, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
};

// --- Event Manager / Organization-specific step ---

export const ORGANIZATION_TYPES = [
  "Private company",
  "Public company",
  "NGO / Non-profit",
  "Government agency",
  "Educational institution",
  "Startup",
];

export const EMPLOYEE_COUNT_BANDS = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

export const WORKFORCE_LEVELS = ["Entry-level", "Mid-level", "Senior", "Management", "Executive"];

export const TRAINING_NEED_TAGS = [
  "Leadership development",
  "Technical / functional skills",
  "Compliance training",
  "Onboarding new hires",
  "Soft skills / communication",
  "Sales training",
  "Customer service",
  "Digital / tech skills",
];

export const WORKFORCE_CHALLENGE_TAGS = [
  "Skills gaps",
  "High turnover",
  "Low engagement",
  "Succession planning",
  "Remote/hybrid team cohesion",
  "Keeping pace with industry change",
];

export const TRAINING_FREQUENCIES = ["Monthly", "Quarterly", "Bi-annually", "Annually", "As needed"];

export const TRAINING_DURATIONS = ["Half-day", "Full-day", "2-3 days", "1 week+", "Ongoing/multi-session"];

export const TRAINING_CLASS_SIZES = ["1-10", "11-25", "26-50", "50+"];

export const PARTICIPATION_BARRIER_TAGS = [
  "Limited budget",
  "Time away from work",
  "Lack of management buy-in",
  "Difficulty measuring ROI",
  "Low employee interest",
  "Logistics / scheduling",
];
