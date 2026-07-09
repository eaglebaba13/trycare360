/**
 * Deterministic scoring + fallback recommendations for the AI Digital
 * Consultation Platform. Keeps the platform useful even when the AI gateway
 * is unavailable, and provides guardrails the AI response is merged into.
 */
export type Severity = "low" | "moderate" | "high" | "severe";
export type Urgency = "routine" | "soon" | "urgent";

export type ResponseMap = Record<string, unknown>;

export type ScoredResult = {
  severity: Severity;
  confidence: number;
  urgency: Urgency;
  scale_scores: Record<string, number | string>;
  probable_causes: string[];
  key_findings: string[];
  summary: string;
};

export type Recommendation = {
  kind: "doctor" | "treatment" | "product" | "test" | "membership" | "subscription" | "branch";
  title: string;
  description?: string;
  reason?: string;
  priority: number;
  ref_slug?: string;
};

function num(v: unknown, d = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : d;
}

function pickSeverity(score: number): { severity: Severity; urgency: Urgency } {
  if (score >= 75) return { severity: "severe", urgency: "urgent" };
  if (score >= 50) return { severity: "high", urgency: "soon" };
  if (score >= 25) return { severity: "moderate", urgency: "soon" };
  return { severity: "low", urgency: "routine" };
}

// -----------------------------------------------------------------------
// Hair
// -----------------------------------------------------------------------
export function scoreHair(r: ResponseMap): ScoredResult {
  let score = 0;
  const causes: string[] = [];
  const findings: string[] = [];
  const scales: Record<string, number | string> = {};

  const norwood = String(r.norwood ?? "");
  const ludwig = String(r.ludwig ?? "");
  if (norwood && norwood !== "not_sure") {
    scales.norwood = norwood;
    const map: Record<string, number> = { "I": 5, "II": 15, "III": 35, "III-vertex": 45, "IV": 55, "V": 65, "VI": 75, "VII": 85 };
    score += map[norwood] ?? 0;
    findings.push(`Norwood ${norwood} pattern observed`);
  }
  if (ludwig && ludwig !== "not_sure") {
    scales.ludwig = ludwig;
    const map: Record<string, number> = { "I": 25, "II": 55, "III": 80 };
    score += map[ludwig] ?? 0;
    findings.push(`Ludwig ${ludwig} pattern observed`);
  }

  const density = String(r.density ?? "");
  const densityMap: Record<string, number> = { thick: 0, normal: 5, thinning: 20, sparse: 35 };
  score += densityMap[density] ?? 0;
  if (density) scales.density = density;

  const fall = String(r.fall_count ?? "");
  const fallMap: Record<string, number> = { "<50": 0, "50-100": 5, "100-200": 15, ">200": 30 };
  score += fallMap[fall] ?? 0;
  if (fall) scales.fall_per_day = fall;

  const scalp = Array.isArray(r.scalp) ? (r.scalp as string[]) : [];
  if (scalp.includes("dandruff")) { causes.push("Dandruff / seborrheic dermatitis"); score += 5; }
  if (scalp.includes("oily")) { causes.push("Excess sebum production"); score += 3; }
  if (scalp.includes("itchy")) { causes.push("Scalp inflammation"); score += 3; }

  const stress = num(r.stress);
  if (stress >= 7) { causes.push("Chronic stress"); score += 10; }
  const sleep = num(r.sleep);
  if (sleep > 0 && sleep < 6) { causes.push("Sleep deprivation"); score += 5; }
  if (r.family_history) { causes.push("Androgenetic (genetic) predisposition"); score += 10; }

  const medical = Array.isArray(r.medical) ? (r.medical as string[]) : [];
  if (medical.includes("thyroid")) { causes.push("Thyroid imbalance"); score += 10; }
  if (medical.includes("pcos")) { causes.push("PCOS-related hormonal imbalance"); score += 15; }
  if (medical.includes("anemia")) { causes.push("Iron deficiency"); score += 8; }
  if (medical.includes("autoimmune")) { causes.push("Autoimmune activity"); score += 12; }

  const { severity, urgency } = pickSeverity(score);
  const summary = `Your responses indicate ${severity} hair concerns. ${
    causes.length ? "Likely contributors include " + causes.slice(0, 3).join(", ") + "." : "No dominant risk factors detected."
  }`;

  return {
    severity,
    urgency,
    confidence: 72,
    scale_scores: { ...scales, composite: Math.min(100, Math.round(score)) },
    probable_causes: causes,
    key_findings: findings.length ? findings : ["Diffuse thinning pattern"],
    summary,
  };
}

// -----------------------------------------------------------------------
// Skin
// -----------------------------------------------------------------------
export function scoreSkin(r: ResponseMap): ScoredResult {
  let score = 0;
  const causes: string[] = [];
  const findings: string[] = [];
  const scales: Record<string, number | string> = {};

  const acne = String(r.acne ?? "none");
  const acneMap: Record<string, number> = { none: 0, mild: 15, moderate: 35, severe: 60, cystic: 80 };
  score = Math.max(score, acneMap[acne] ?? 0);
  scales.acne = acne;
  if (acne !== "none") findings.push(`Acne severity: ${acne}`);

  const pig = String(r.pigmentation ?? "none");
  const pigMap: Record<string, number> = { none: 0, mild: 20, moderate: 40, severe: 65 };
  score = Math.max(score, pigMap[pig] ?? 0);
  scales.pigmentation = pig;
  if (pig !== "none") { findings.push(`Pigmentation: ${pig}`); causes.push("UV exposure / post-inflammatory hyperpigmentation"); }
  if (r.melasma) { findings.push("Melasma present"); causes.push("Hormonal melasma"); score += 15; }

  const wr = String(r.wrinkles ?? "none");
  const wrMap: Record<string, number> = { none: 0, fine: 15, moderate: 35, deep: 60 };
  score = Math.max(score, wrMap[wr] ?? 0);
  scales.wrinkles = wr;
  if (wr !== "none") { findings.push(`Wrinkles: ${wr}`); causes.push("Photoaging / collagen loss"); }

  if (String(r.oiliness) === "high") { causes.push("Sebaceous overactivity"); score += 5; }
  if (String(r.hydration) === "dehydrated") { causes.push("Trans-epidermal water loss"); score += 5; }
  if (String(r.sun_damage) === "high" || !r.sunscreen) { causes.push("Inadequate UV protection"); score += 8; }
  if (r.smoking) { causes.push("Smoking-related skin damage"); score += 8; }

  const { severity, urgency } = pickSeverity(score);
  const summary = `Skin analysis indicates ${severity} concerns. ${
    causes.length ? "Contributing factors: " + causes.slice(0, 3).join(", ") + "." : "Overall skin health appears stable."
  }`;

  return {
    severity,
    urgency,
    confidence: 70,
    scale_scores: { ...scales, composite: Math.min(100, Math.round(score)) },
    probable_causes: causes,
    key_findings: findings.length ? findings : ["General skin health"],
    summary,
  };
}

// -----------------------------------------------------------------------
// Nail
// -----------------------------------------------------------------------
export function scoreNail(r: ResponseMap): ScoredResult {
  let score = 0;
  const causes: string[] = [];
  const findings: string[] = [];
  const scales: Record<string, number | string> = {};

  const strength = String(r.strength ?? "");
  if (strength === "brittle") { score += 40; findings.push("Brittle nails"); }
  else if (strength === "weak") { score += 25; findings.push("Weak nails"); }
  scales.strength = strength;

  const color = String(r.color ?? "");
  if (color === "pale") { causes.push("Possible iron deficiency / anemia"); score += 20; }
  if (color === "yellowish") { causes.push("Possible fungal involvement or smoking"); score += 15; }
  if (color === "bluish") { causes.push("Possible circulatory issue"); score += 25; }
  if (color === "white_spots") { causes.push("Zinc deficiency"); score += 10; }
  scales.color = color;

  const nutrition = Array.isArray(r.nutrition_signs) ? (r.nutrition_signs as string[]) : [];
  if (nutrition.length && !nutrition.includes("none")) {
    causes.push("Micronutrient deficiency indicators");
    score += 10;
  }

  const { severity, urgency } = pickSeverity(score);
  return {
    severity,
    urgency,
    confidence: 65,
    scale_scores: { ...scales, composite: Math.min(100, Math.round(score)) },
    probable_causes: causes,
    key_findings: findings.length ? findings : ["No major nail abnormalities"],
    summary: `Nail assessment indicates ${severity} concerns. ${
      causes.length ? "Likely factors: " + causes.slice(0, 3).join(", ") + "." : "Nail health appears normal."
    }`,
  };
}

// -----------------------------------------------------------------------
// Nutrition
// -----------------------------------------------------------------------
export function scoreNutrition(r: ResponseMap): ScoredResult {
  let score = 0;
  const causes: string[] = [];
  const findings: string[] = [];
  const scales: Record<string, number | string> = {};

  const h = num(r.height_cm);
  const w = num(r.weight_kg);
  if (h > 0 && w > 0) {
    const bmi = w / Math.pow(h / 100, 2);
    scales.bmi = Number(bmi.toFixed(1));
    if (bmi < 18.5) { findings.push("Underweight (BMI " + bmi.toFixed(1) + ")"); causes.push("Caloric / protein deficit"); score += 30; }
    else if (bmi < 25) { findings.push("Healthy BMI (" + bmi.toFixed(1) + ")"); }
    else if (bmi < 30) { findings.push("Overweight (BMI " + bmi.toFixed(1) + ")"); causes.push("Positive energy balance"); score += 30; }
    else { findings.push("Obesity (BMI " + bmi.toFixed(1) + ")"); causes.push("Metabolic imbalance"); score += 55; }
  }

  const junk = String(r.junk_food ?? "");
  if (junk === "daily") { causes.push("High processed food intake"); score += 15; }
  const water = num(r.water);
  if (water > 0 && water < 2) { causes.push("Low hydration"); score += 5; }
  const exercise = String(r.exercise ?? "");
  if (exercise === "never" || exercise === "1-2/week") { causes.push("Sedentary lifestyle"); score += 10; }
  const stress = num(r.stress);
  if (stress >= 7) { causes.push("Chronic stress"); score += 5; }
  const sleep = num(r.sleep);
  if (sleep > 0 && sleep < 6) { causes.push("Sleep deprivation"); score += 5; }

  const medical = Array.isArray(r.medical) ? (r.medical as string[]) : [];
  for (const m of medical) if (m !== "none") { causes.push("Existing: " + m); score += 8; }

  const { severity, urgency } = pickSeverity(score);
  return {
    severity,
    urgency,
    confidence: 78,
    scale_scores: scales,
    probable_causes: causes,
    key_findings: findings.length ? findings : ["Baseline nutrition profile"],
    summary: `Nutrition profile indicates ${severity} concerns. ${
      causes.length ? "Key factors: " + causes.slice(0, 3).join(", ") + "." : "Overall lifestyle looks balanced."
    }`,
  };
}

export function scoreByCategory(category: string, r: ResponseMap): ScoredResult {
  switch (category) {
    case "hair": return scoreHair(r);
    case "skin": return scoreSkin(r);
    case "nail": return scoreNail(r);
    case "nutrition": return scoreNutrition(r);
    default: return scoreHair(r);
  }
}

// -----------------------------------------------------------------------
// Recommendations
// -----------------------------------------------------------------------
export function recommendationsFor(category: string, result: ScoredResult, r: ResponseMap): Recommendation[] {
  const sev = result.severity;
  const recs: Recommendation[] = [];

  const doctorMap: Record<string, string> = {
    hair: "Trichologist / Hair Restoration Specialist",
    skin: "Dermatologist / Cosmetologist",
    nail: "Dermatologist (Nail Specialist)",
    nutrition: "Clinical Nutritionist",
  };
  recs.push({
    kind: "doctor", priority: 1,
    title: doctorMap[category] ?? "Specialist Consultation",
    description: `Recommended based on ${category} assessment.`,
    reason: `Severity: ${sev}. ${result.summary}`,
  });

  if (category === "hair") {
    if (sev === "low" || sev === "moderate") {
      recs.push({ kind: "treatment", priority: 2, title: "PRP Therapy Package", description: "Platelet-rich plasma to stimulate follicle activity.", reason: "Effective for early-to-moderate patterns." });
      recs.push({ kind: "treatment", priority: 3, title: "Mesotherapy Course", description: "Nutrient micro-injections to strengthen roots." });
    } else {
      recs.push({ kind: "treatment", priority: 2, title: "Advanced Hair Restoration (GFC / FUE)", description: "Regenerative or transplant-based restoration.", reason: "Recommended for advanced patterns." });
    }
    recs.push({ kind: "product", priority: 4, title: "Anti-Hair-Fall Serum", description: "Daily topical for follicle nourishment." });
    recs.push({ kind: "product", priority: 5, title: "Biotin + Multivitamin Supplement" });
    recs.push({ kind: "test", priority: 6, title: "Thyroid Profile + Ferritin + Vit D", reason: "Rule out systemic causes." });
  } else if (category === "skin") {
    if (String(r.acne) === "moderate" || String(r.acne) === "severe" || String(r.acne) === "cystic") {
      recs.push({ kind: "treatment", priority: 2, title: "Medical Acne Program", description: "Chemical peels, comedone extraction and medical grade care." });
    }
    if (r.melasma || String(r.pigmentation) === "moderate" || String(r.pigmentation) === "severe") {
      recs.push({ kind: "treatment", priority: 2, title: "Pigmentation Correction Program", description: "Laser toning + medical-grade brightening." });
    }
    if (String(r.wrinkles) === "moderate" || String(r.wrinkles) === "deep") {
      recs.push({ kind: "treatment", priority: 3, title: "Skin Rejuvenation Package", description: "HIFU / RF micro-needling + collagen boosters." });
    }
    recs.push({ kind: "product", priority: 4, title: "Medical-grade Sunscreen SPF 50" });
    recs.push({ kind: "product", priority: 5, title: "Barrier Repair Moisturizer" });
  } else if (category === "nail") {
    recs.push({ kind: "treatment", priority: 2, title: "Nail Health Restoration", description: "Topical therapies + strengtheners." });
    recs.push({ kind: "test", priority: 3, title: "CBC + Ferritin + Zinc", reason: "Screen for nutritional deficits." });
    recs.push({ kind: "product", priority: 4, title: "Biotin + Zinc Supplement" });
  } else if (category === "nutrition") {
    recs.push({ kind: "treatment", priority: 2, title: "Personalized Nutrition Plan", description: "12-week diet + lifestyle protocol." });
    recs.push({ kind: "test", priority: 3, title: "Lipid Profile + HbA1c + Vit D + B12" });
    recs.push({ kind: "product", priority: 4, title: "Whey / Plant Protein" });
  }

  if (sev === "high" || sev === "severe") {
    recs.push({
      kind: "membership", priority: 7,
      title: "Care360 Premium Membership",
      description: "Unlimited follow-ups, discounted treatments, priority booking.",
      reason: "Advanced concerns benefit from ongoing supervised care.",
    });
  } else {
    recs.push({
      kind: "subscription", priority: 7,
      title: "Monthly Care Kit Subscription",
      description: "Curated topical + supplement pack delivered monthly.",
    });
  }

  recs.push({
    kind: "branch", priority: 8,
    title: "Nearest TryCare360 Branch",
    description: "Book an in-person consultation at your nearest branch.",
  });

  return recs;
}
