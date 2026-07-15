// Mock data & local demo store for the Dr Hair investor demo module.
// Frontend-only; no backend. Uses localStorage where persistence helps the flow.

export type HairStage = "Norwood I" | "Norwood II" | "Norwood III" | "Ludwig I" | "Ludwig II";

export interface AssessmentAnswers {
  // personal
  fullName: string;
  age: string;
  gender: string;
  city: string;
  // hair condition
  hairType: string;
  hairFallMonths: string;
  hairFallSeverity: string;
  scalpType: string;
  dandruff: string;
  thinningArea: string[];
  // lifestyle
  sleepHours: string;
  stressLevel: string;
  smoking: string;
  waterIntake: string;
  exercise: string;
  // nutrition
  diet: string;
  proteinIntake: string;
  supplements: string;
  junkFood: string;
  // medical
  thyroid: string;
  pcos: string;
  medications: string;
  familyHistory: string;
  // goals
  primaryGoal: string;
  budget: string;
  timeCommitment: string;
  // photos (data urls / filenames)
  photos: Partial<Record<PhotoSlot, string>>;
}

export type PhotoSlot = "front" | "top" | "crown" | "left" | "right" | "back";

export const PHOTO_SLOTS: { key: PhotoSlot; label: string; hint: string }[] = [
  { key: "front", label: "Front Hairline", hint: "Face the camera, hair pulled back" },
  { key: "top", label: "Top View", hint: "Camera angled down from above" },
  { key: "crown", label: "Crown", hint: "Back-of-head crown area" },
  { key: "left", label: "Left Side", hint: "Show left temple" },
  { key: "right", label: "Right Side", hint: "Show right temple" },
  { key: "back", label: "Back View", hint: "Back of head full view" },
];

export const DEFAULT_ANSWERS: AssessmentAnswers = {
  fullName: "",
  age: "",
  gender: "",
  city: "",
  hairType: "",
  hairFallMonths: "",
  hairFallSeverity: "",
  scalpType: "",
  dandruff: "",
  thinningArea: [],
  sleepHours: "",
  stressLevel: "",
  smoking: "",
  waterIntake: "",
  exercise: "",
  diet: "",
  proteinIntake: "",
  supplements: "",
  junkFood: "",
  thyroid: "",
  pcos: "",
  medications: "",
  familyHistory: "",
  primaryGoal: "",
  budget: "",
  timeCommitment: "",
  photos: {},
};

const KEY = "drhair.assessment.v1";
const SUB_KEY = "drhair.subscription.v1";

export function loadAnswers(): AssessmentAnswers {
  if (typeof window === "undefined") return DEFAULT_ANSWERS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_ANSWERS;
    return { ...DEFAULT_ANSWERS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_ANSWERS;
  }
}

export function saveAnswers(a: AssessmentAnswers) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(a));
}

export function clearAnswers() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function saveSubscription(plan: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SUB_KEY, plan);
}

export function loadSubscription(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SUB_KEY);
}

// ---------- Landing / marketing content ----------

export const STATS = [
  { label: "Patients Assessed", value: "48,200+" },
  { label: "Success Rate", value: "92%" },
  { label: "Hair Coaches", value: "34" },
  { label: "Dermatologists", value: "18" },
];

export const TRUST_BADGES = [
  "Dermatologist Approved",
  "AI Analysis",
  "Personalized Treatment",
  "Home Delivery",
];

export const CAUSES = [
  { title: "Genetics", desc: "Androgenetic pattern hair loss" },
  { title: "Stress", desc: "Cortisol-driven telogen effluvium" },
  { title: "Nutrition", desc: "Iron, protein & biotin deficiency" },
  { title: "Hormonal", desc: "DHT sensitivity & imbalance" },
  { title: "PCOS", desc: "Androgen-driven thinning" },
  { title: "Thyroid", desc: "Hypo/hyperthyroid shedding" },
  { title: "Scalp Infection", desc: "Seborrheic dermatitis, fungal" },
  { title: "Poor Sleep", desc: "Disrupted follicle regeneration" },
];

export const DOCTORS = [
  { name: "Dr. Aditi Sharma", title: "MD Dermatology, AIIMS", experience: "14 yrs", tag: "Trichology Lead" },
  { name: "Dr. Rohan Mehta", title: "MBBS, DDVL", experience: "11 yrs", tag: "Hair Transplant" },
  { name: "Dr. Priya Nair", title: "MD Skin & VD", experience: "9 yrs", tag: "PCOS Hair Loss" },
  { name: "Dr. Karan Verma", title: "MD Dermatology", experience: "12 yrs", tag: "Male Pattern" },
];

export const COACHES = [
  { name: "Nisha R.", tag: "Nutrition & Hair Coach", experience: "6 yrs" },
  { name: "Aman S.", tag: "Lifestyle Coach", experience: "5 yrs" },
  { name: "Divya P.", tag: "PCOS Specialist Coach", experience: "7 yrs" },
];

export const TESTIMONIALS = [
  { name: "Rahul, 29", city: "Bengaluru", quote: "6 months in and my hairline is visibly denser. The coach kept me consistent.", months: 6 },
  { name: "Sneha, 32", city: "Mumbai", quote: "PCOS thinning finally under control. Loved the monthly reviews.", months: 5 },
  { name: "Arjun, 26", city: "Delhi", quote: "The AI analysis explained things my previous doctor never did.", months: 4 },
  { name: "Kavya, 34", city: "Hyderabad", quote: "Home delivery + reminders made this effortless.", months: 8 },
];

export const FAQS = [
  { q: "Is Dr Hair safe?", a: "All treatments are prescribed by licensed dermatologists after AI-assisted review." },
  { q: "How soon will I see results?", a: "Most patients notice reduced hair fall in 6–8 weeks and visible density change in 3–4 months." },
  { q: "Do I need a doctor consultation?", a: "Yes — every plan includes a video consultation with a certified dermatologist." },
  { q: "What if I want to cancel?", a: "You can pause or cancel your subscription anytime from your dashboard." },
  { q: "Are the products FDA/CDSCO approved?", a: "All actives used follow CDSCO and international dermatology guidelines." },
];

// ---------- Plans ----------

export const PLANS = [
  {
    id: "1m",
    name: "1 Month",
    price: 2999,
    original: 3999,
    perMonth: 2999,
    features: ["Doctor Consultation", "AI Analysis", "Hair Coach", "Home Delivery", "Photo Tracking"],
    popular: false,
  },
  {
    id: "3m",
    name: "3 Months",
    price: 7999,
    original: 8997,
    perMonth: 2666,
    features: [
      "Doctor Consultation",
      "AI Analysis",
      "Monthly Review",
      "Hair Coach",
      "Home Delivery",
      "Photo Tracking",
      "Priority Support",
    ],
    popular: true,
    savings: "Save 11%",
  },
  {
    id: "6m",
    name: "6 Months",
    price: 14999,
    original: 17994,
    perMonth: 2499,
    features: [
      "Doctor Consultation",
      "AI Analysis",
      "Monthly Review",
      "Hair Coach",
      "Home Delivery",
      "Photo Tracking",
      "Priority Support",
      "Dedicated Dermatologist",
    ],
    popular: false,
    savings: "Save 17%",
  },
];

// ---------- AI report ----------

export function generateAiReport(a: AssessmentAnswers) {
  // Deterministic-ish scoring based on user inputs for realism.
  const stress = num(a.stressLevel);
  const sleep = num(a.sleepHours);
  const sev = num(a.hairFallSeverity);
  const genetics = a.familyHistory === "yes" ? 78 : 35;
  const stressScore = Math.min(95, 30 + stress * 12);
  const nutrition = a.diet === "vegan" ? 68 : a.diet === "vegetarian" ? 52 : 42;
  const hormonal = a.pcos === "yes" || a.thyroid === "yes" ? 74 : 30;
  const lifestyle = Math.max(20, 80 - sleep * 6 + (a.smoking === "yes" ? 20 : 0));
  const sleepScore = Math.max(15, 90 - sleep * 8);
  const scalp = a.dandruff === "yes" ? 65 : 30;

  const overall = clamp(
    100 - Math.round((stressScore + nutrition + hormonal + lifestyle + sleepScore + scalp) / 12) - sev * 5,
    28,
    92,
  );

  const density = clamp(overall + 4, 30, 95);
  const scalpHealth = clamp(100 - scalp, 25, 95);

  const stage: HairStage =
    sev >= 4 ? "Norwood III" : sev >= 3 ? "Norwood II" : a.gender === "female" ? "Ludwig I" : "Norwood I";

  return {
    overall,
    density,
    scalpHealth,
    stage,
    risks: [
      { label: "Genetics", value: genetics },
      { label: "Stress", value: stressScore },
      { label: "Nutrition", value: nutrition },
      { label: "Hormonal", value: hormonal },
      { label: "Lifestyle", value: lifestyle },
      { label: "Sleep", value: sleepScore },
      { label: "Scalp Condition", value: scalp },
    ],
    timeline: [
      { month: "Month 0", score: overall },
      { month: "Month 1", score: clamp(overall + 3, 0, 100) },
      { month: "Month 3", score: clamp(overall + 12, 0, 100) },
      { month: "Month 6", score: clamp(overall + 22, 0, 100) },
      { month: "Month 9", score: clamp(overall + 28, 0, 100) },
      { month: "Month 12", score: clamp(overall + 34, 0, 100) },
    ],
    recommendations: {
      diet: [
        "High-protein meals (1.2g/kg body weight)",
        "Iron-rich greens 5×/week",
        "Omega-3 rich foods 3×/week",
        "Reduce refined sugar",
      ],
      medicines: ["Finasteride 1mg (Rx)", "Minoxidil 5% topical"],
      serum: "Dr Hair Peptide Growth Serum",
      supplements: ["Biotin 10,000mcg", "Vitamin D3", "Zinc + Iron complex"],
      consultation: "Dermatologist video consult within 24 hours",
      coach: "Weekly nutrition & adherence check-in",
    },
  };
}

function num(v: string, def = 3) {
  const n = parseInt(v || "", 10);
  return Number.isFinite(n) ? n : def;
}
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// ---------- Treatment plan ----------

export const TREATMENT_KIT = [
  { name: "Hair Growth Tablets", desc: "Clinically dosed biotin + peptides", price: 899 },
  { name: "Biotin Complex", desc: "10,000mcg daily support", price: 499 },
  { name: "Hair Growth Serum", desc: "Peptide + caffeine leave-on", price: 1299 },
  { name: "Anti Hair Fall Shampoo", desc: "Ketoconazole 1% blend", price: 699 },
  { name: "Nutrition Plan", desc: "Custom 4-week protein/iron plan", price: 0 },
  { name: "Doctor Consultation", desc: "Certified dermatologist video call", price: 0 },
  { name: "Hair Coach", desc: "Weekly personal coaching", price: 0 },
];

export const ROUTINE = {
  morning: [
    "Take Hair Growth Tablet with breakfast",
    "Apply Peptide Growth Serum on damp scalp",
    "5-min gentle scalp massage",
  ],
  afternoon: ["High-protein meal", "Hydrate — 500ml water", "5-min mindfulness break"],
  night: [
    "Wash 3×/week with Anti Hair Fall Shampoo",
    "Apply Minoxidil 5% (dry scalp)",
    "Biotin capsule with dinner",
    "Sleep 7–8 hours",
  ],
};

// ---------- Dashboard ----------

export const REMINDERS = [
  { time: "08:00", label: "Morning Serum + Tablet", status: "done" as const },
  { time: "14:00", label: "Protein snack", status: "done" as const },
  { time: "21:30", label: "Minoxidil + Biotin", status: "pending" as const },
];

export const MESSAGES = [
  { from: "Nisha (Coach)", ts: "2h ago", body: "How was your protein intake yesterday?" },
  { from: "Dr. Aditi", ts: "1d ago", body: "Your progress photos look great. Continue current plan." },
];

export const ACHIEVEMENTS = [
  { title: "30-Day Streak", desc: "Adherence 30 days in a row" },
  { title: "First Coach Chat", desc: "You messaged your coach" },
  { title: "Progress Uploaded", desc: "Month 2 photos submitted" },
];

// ---------- Progress ----------

export const PROGRESS_TIMELINE = [
  { month: "Month 0", density: 42, note: "Baseline captured" },
  { month: "Month 1", density: 46, note: "Reduced shedding" },
  { month: "Month 2", density: 52, note: "New vellus hair on hairline" },
  { month: "Month 3", density: 58, note: "Visible density lift" },
  { month: "Month 4", density: 63, note: "Coach: excellent adherence" },
  { month: "Month 5", density: 68, note: "Dermatologist review passed" },
  { month: "Month 6", density: 74, note: "Milestone reached" },
];

// ---------- Coach chat seed ----------

export interface ChatMsg {
  id: string;
  from: "coach" | "me";
  text: string;
  ts: string;
  kind?: "text" | "photo" | "voice" | "reminder" | "review";
}

export const CHAT_SEED: ChatMsg[] = [
  { id: "1", from: "coach", text: "Hi Rahul 👋 Ready for your week 6 check-in?", ts: "09:12", kind: "text" },
  { id: "2", from: "me", text: "Yes! Feeling less hair fall this week.", ts: "09:14", kind: "text" },
  { id: "3", from: "coach", text: "Amazing. Please share this week's top-view photo.", ts: "09:14", kind: "text" },
  { id: "4", from: "coach", text: "Reminder: Minoxidil tonight at 9:30 PM", ts: "09:15", kind: "reminder" },
  { id: "5", from: "coach", text: "Dermatologist review scheduled — Fri 6 PM.", ts: "09:16", kind: "review" },
];

// ---------- Admin ----------

export const ADMIN_KPIS = [
  { label: "Total Patients", value: "48,214", delta: "+7.4%" },
  { label: "Assessments (30d)", value: "9,882", delta: "+12.1%" },
  { label: "Subscriptions", value: "6,411", delta: "+9.3%" },
  { label: "Revenue (MTD)", value: "₹1.92 Cr", delta: "+14.6%" },
  { label: "MRR", value: "₹1.61 Cr", delta: "+8.2%" },
  { label: "Conversion", value: "18.7%", delta: "+1.9pp" },
  { label: "Retention (6m)", value: "71%", delta: "+3.1pp" },
  { label: "Consultations", value: "12,308", delta: "+11.4%" },
];

export const REVENUE_SERIES = [
  { m: "Jan", rev: 82, subs: 3200 },
  { m: "Feb", rev: 96, subs: 3620 },
  { m: "Mar", rev: 108, subs: 4010 },
  { m: "Apr", rev: 124, subs: 4488 },
  { m: "May", rev: 141, subs: 4920 },
  { m: "Jun", rev: 156, subs: 5310 },
  { m: "Jul", rev: 171, subs: 5720 },
  { m: "Aug", rev: 182, subs: 6011 },
  { m: "Sep", rev: 192, subs: 6411 },
];

export const FUNNEL = [
  { stage: "Landing Visits", value: 214000 },
  { stage: "Started Assessment", value: 48200 },
  { stage: "Completed Assessment", value: 32180 },
  { stage: "Viewed Treatment", value: 24810 },
  { stage: "Subscribed", value: 6411 },
];

export const PLAN_PERF = [
  { plan: "1 Month", subs: 1204, share: 19 },
  { plan: "3 Months", subs: 3211, share: 50 },
  { plan: "6 Months", subs: 1996, share: 31 },
];
