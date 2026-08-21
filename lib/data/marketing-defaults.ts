import type { AboutContent, CareersContent, HomeContent, ServicesContent } from "@/lib/validation/content";

// Exact copy of what was hardcoded in each page before it became DB-editable — used both as
// the public-page fallback when no MarketingPageContent row exists yet, and as the admin
// form's starting point for a page that's never been edited.

export const DEFAULT_ABOUT_CONTENT: AboutContent = {
  hero: {
    eyebrow: "About Facilit8",
    title: "We built the ecosystem we wished existed.",
    description: "Facilit8 exists because growing a career, or a team, shouldn't take longer than the training itself.",
  },
  missionHeading: "Our mission",
  missionLead: "We're building the infrastructure for how Nigeria's professionals actually grow.",
  missionBody:
    "Nigeria's workforce is being asked to level up faster than ever, and there was nowhere built for all three people who make that happen: Event Managers sourcing real training, Facilitators proving real expertise, and Professionals building a real career. Facilit8 is that place. A vetted marketplace so training gets funded in days, not weeks, and Awé, an AI partner so every person on the platform always knows their next step. We're not a bidding tool. We're the ecosystem Nigeria's workforce needs to grow.",
  values: [
    {
      icon: "Users",
      title: "Vetted, not anonymous",
      body: "Every facilitator on Facilit8 builds a real profile: specialization, experience, and reviews from past engagements.",
    },
    {
      icon: "ShieldCheck",
      title: "Funds held, not promised",
      body: "Training budgets sit in a secure wallet until an engagement is confirmed complete, so payment is never just a handshake.",
    },
    {
      icon: "Handshake",
      title: "Built for teams, not one-off gigs",
      body: "Merged training lets multiple companies pool budget for sessions no single team could justify alone.",
    },
  ],
};

export const DEFAULT_SERVICES_CONTENT: ServicesContent = {
  hero: {
    eyebrow: "How it works",
    title: "Three roles, one platform built around each of them.",
    description: "Whether you're staffing a training, facilitating one, or figuring out your next career move, Facilit8 handles it end to end.",
  },
  eventManagerSteps: [
    { title: "Post your training need", body: "Set the dates, delegate count, budget, and category: public or invite-only." },
    { title: "Review facilitator bids", body: "Compare proposals, course breakdowns, and per-delegate pricing side by side." },
    { title: "Fund it securely", body: "Move budget into escrow from your Facilit8 wallet before the facilitator is confirmed." },
    { title: "Pay on completion", body: "Mark the training complete and release payment, minus the platform fee, in one step." },
  ],
  facilitatorSteps: [
    { title: "Build your profile", body: "Specialization, qualifications, and experience: the things Event Managers actually screen for." },
    { title: "Browse open events", body: "Find training needs that match your expertise and submit a bid with your rate." },
    { title: "Get selected", body: "Event Managers review bids and confirm a facilitator once budget is funded." },
    { title: "Get paid on completion", body: "Funds move to your wallet automatically once the training is marked complete." },
    { title: "Or propose your own session", body: "Skip bidding entirely: invite organisations to fund it and fellow facilitators to co-deliver it." },
  ],
  professionalSteps: [
    { title: "Build your profile", body: "Sign up independent, or affiliate with a verified organization. Either way, Awé starts learning your goals." },
    { title: "Browse the ecosystem", body: "See the open training events and the facilitator directory shaping your industry." },
    { title: "Grow with Awé", body: "Get a career partner grounded in real Facilit8 data, not generic advice, that turns your profile into a concrete next step." },
    { title: "Or start your own merged session", body: "Invite other professionals in your field to pool funds and bring in a facilitator together." },
  ],
  platformFeatures: [
    {
      icon: "Wallet",
      title: "Escrow wallet",
      body: "Every training budget sits in a secure wallet until the engagement is confirmed complete. Funds move on completion, not a handshake.",
    },
    {
      icon: "ShieldCheck",
      title: "Identity verification",
      body: "Wallets are backed by verified identity through our payment provider, so every transaction on Facilit8 is tied to a real, confirmed person.",
    },
    {
      icon: "MessageCircle",
      title: "Direct messaging",
      body: "Unlock a direct line to a facilitator to align on scope, dates, and delivery before you commit budget or accept a bid.",
    },
    {
      icon: "Users",
      title: "Facilitator directory",
      body: "Browse real profiles: specialization, experience, and track record from past engagements, not cold outreach.",
    },
  ],
  mergedTrainingCallout: {
    title: "Merged training",
    body: "Some training programs are too expensive to justify alone. Event Managers can pool budget across organisations, split by delegate count, then vote on which facilitator runs it. Professionals can do the same with peers in their field. Facilitators can propose their own session, inviting organisations to fund it and fellow facilitators to co-deliver it.",
  },
  aweCallout: {
    title: "Ask Awé. Whoever you are.",
    body: "Awé isn't just for Professionals. Facilitators use it to grow their specialization between engagements, and Event Managers use it for their own career progression too. Everyone on Facilit8 has a next step, and Awé helps find it.",
  },
};

export const DEFAULT_CAREERS_CONTENT: CareersContent = {
  hero: {
    eyebrow: "Careers",
    title: "We're not actively hiring right now.",
    description: "But we're always glad to hear from people who care about the problem we're solving.",
  },
  body: "Facilit8 is a small, early-stage team. We don't have open roles listed at the moment, but if you're interested in what we're building, send us a note. We keep good conversations on file for when that changes.",
};

export const DEFAULT_HOME_CONTENT: HomeContent = {
  hero: {
    badge: "The Professional Development Ecosystem",
    headlineBefore: "Grow Your Career. Staff Your Team. ",
    headlineHighlight: "Meet Awé.",
    subhead:
      "Facilit8 is where professionals grow their careers, organizations staff vetted training, and facilitators get discovered and paid, all guided by Awé, your AI partner for what's next.",
  },
  audiencesEyebrow: "One ecosystem, every kind of growth",
  audiencesTitle: "Built for whoever's staffing, facilitating, or growing their career.",
  audiences: [
    {
      icon: "Building2",
      eyebrow: "For Organisations",
      title: "Staff training that actually moves your team forward",
      body: "Post a need, compare vetted bids, and fund it securely from your wallet, or pool budget with other teams through merged training when one company can't justify it alone.",
    },
    {
      icon: "GraduationCap",
      eyebrow: "For Facilitators",
      title: "Get discovered, get paid, get better",
      body: "Build a profile that shows your real track record, bid on training that matches your specialization, or propose your own merged session and invite organisations to fund it and fellow facilitators to co-deliver it.",
    },
    {
      icon: "TrendingUp",
      eyebrow: "For Professionals",
      title: "Close the gap between where you are and where the market's headed",
      body: "Browse the facilitators and training shaping your industry, pool funds with peers in your field to bring in a facilitator together, and get an AI career partner grounded in real Facilit8 data.",
    },
  ],
  servicesEyebrow: "Everything you need",
  servicesTitle: "The whole engagement, in one place.",
  services: [
    { icon: "Gavel", title: "Bidding & matching", body: "Post or browse training needs, compare proposals, and select with real data, not cold outreach." },
    { icon: "Wallet", title: "Secure escrow wallet", body: "Budget sits in escrow until training is confirmed complete. Funds never move on a handshake." },
    { icon: "MessageCircle", title: "In-app chat", body: "Align on scope, dates, and delivery before anyone commits budget or accepts a bid." },
    {
      icon: "Handshake",
      title: "Merged training",
      body: "Organisations, Professionals, and Facilitators can all propose a session and invite others to co-fund or co-deliver it, not just one company's budget.",
    },
    {
      icon: "Sparkles",
      title: "Awé, AI growth partner",
      body: "Ask Awé about your career: a growth partner for Professionals, Facilitators, and Event Managers, grounded in real Facilit8 data.",
    },
  ],
  missionEyebrow: "Our mission",
  missionTitle: "Built to raise the standard of Africa's working class.",
  missionBody:
    "This isn't just about posting a training need and getting a bid back. Across the continent, businesses are raising the bar on what “qualified” looks like, and the professionals, facilitators, and organisations who close that gap first are the ones who benefit most. Facilit8 exists to make that development possible: real training, delivered by vetted facilitators, backed by an AI partner that helps every professional turn skill-building into career progress, and over time, into the pay and opportunities that progress should come with.",
  awe: {
    badge: "Meet Awé",
    title: "Awé understands your professional journey.",
    body: "Ask Awé where you stand, where you're headed, and what closes the gap between them, grounded in real Facilit8 data, not generic advice.",
    bullets: [
      "Grounded in real Facilit8 data: training events, facilitators, and merged trainings, never invented answers.",
      "Builds a career profile over time, so every conversation picks up where the last one left off.",
      "Closing a skills gap is how pay and opportunity catch up. Awé helps you find the shortest real path there.",
      "For Professionals, Facilitators, and Event Managers, whichever side of the marketplace you're on.",
    ],
  },
};
