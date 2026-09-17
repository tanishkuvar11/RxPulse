const pptxgen = require("pptxgenjs");
const path = require("path");
const fs = require("fs");

const A = path.join.bind(null, __dirname);
const ROOT = path.join(__dirname, "..");

// Palette (Matching product design system)
const GROUND = "0E1419";
const SURFACE = "161E25";
const SURFACE2 = "1B242C";
const HAIRLINE = "243039";
const TEXT = "E8EDF0";
const SUBTEXT = "8FA0AC";
const AMBER = "D9A441";
const CENSORED = "3A4854";
const RISK_RED = "E0637A";
const GREEN = "6FBF8B";

// Modern, sleek fonts (No Courier New / typewriter font anywhere)
const F_HEAD = "Segoe UI";
const F_BODY = "Calibri";
const F_MONO = "Segoe UI";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 inches
const PW = 13.333, PH = 7.5;

function bg(slide, color = GROUND) {
  slide.background = { color };
}

function iconBadge(slide, { x, y, d = 0.5, icon, circleColor = AMBER, iconVariant = "ground" }) {
  slide.addShape("ellipse", { x, y, w: d, h: d, fill: { color: circleColor }, line: { type: "none" } });
  const pad = d * 0.26;
  slide.addImage({ path: A("icons", `${icon}_${iconVariant}.png`), x: x + pad / 2, y: y + pad / 2, w: d - pad, h: d - pad });
}

function kicker(slide, text, { x = 0.7, y = 0.48, color = AMBER } = {}) {
  slide.addText(text.toUpperCase(), {
    x, y, w: 9, h: 0.35, isTextBox: true, margin: 0,
    fontFace: F_HEAD, fontSize: 11, color, charSpacing: 2, bold: true,
  });
}

function pageNum(slide, n) {
  slide.addText(`0${n} / 05`, {
    x: PW - 1.3, y: PH - 0.45, w: 1.0, h: 0.3, isTextBox: true, margin: 0,
    fontFace: F_HEAD, fontSize: 9, color: SUBTEXT, align: "right", bold: true,
  });
  slide.addText("RXPULSE", {
    x: 0.7, y: PH - 0.45, w: 3, h: 0.3, isTextBox: true, margin: 0,
    fontFace: F_HEAD, fontSize: 9, color: SUBTEXT, charSpacing: 1, bold: true,
  });
}

const SHOT_ASPECT = 1600 / 1000;
function browserFrame(slide, { x, y, maxW, maxH, img, url = "RXPULSE.APP" }) {
  const barH = 0.34;
  const availH = maxH - barH;
  let w = maxW, h = availH;
  if (w / h > SHOT_ASPECT) w = h * SHOT_ASPECT; else h = w / SHOT_ASPECT;
  const ox = x + (maxW - w) / 2;

  slide.addShape("roundRect", {
    x: ox, y, w, h: h + barH, rectRadius: 0.09,
    fill: { color: "0B0F13" }, line: { color: HAIRLINE, width: 1 },
    shadow: { type: "outer", color: "000000", opacity: 0.45, blur: 18, offset: 6, angle: 90 },
  });
  ["E0637A", "D9A441", "6FBF8B"].forEach((c, i) => {
    slide.addShape("ellipse", { x: ox + 0.16 + i * 0.2, y: y + barH / 2 - 0.045, w: 0.09, h: 0.09, fill: { color: c }, line: { type: "none" } });
  });
  slide.addText(url.toUpperCase(), {
    x: ox + 0.7, y: y + 0.03, w: 4, h: barH - 0.06, isTextBox: true, margin: 0,
    fontFace: F_HEAD, fontSize: 9, color: SUBTEXT, valign: "middle", bold: true,
  });
  slide.addImage({ path: img, x: ox + 0.02, y: y + barH, w: w - 0.04, h: h - 0.02 });
  return { x: ox, w, bottom: y + h + barH };
}

function statTile(slide, { x, y, w, h = 1.3, value, label, sub, valueColor = AMBER }) {
  slide.addShape("roundRect", {
    x, y, w, h, rectRadius: 0.06,
    fill: { color: SURFACE }, line: { color: HAIRLINE, width: 1 },
  });
  slide.addText(value, {
    x: x + 0.2, y: y + 0.12, w: w - 0.4, h: h * 0.45, isTextBox: true, margin: 0,
    fontFace: F_HEAD, fontSize: 24, bold: true, color: valueColor, align: "left",
  });
  slide.addText(label, {
    x: x + 0.2, y: y + h * 0.52, w: w - 0.4, h: 0.3, isTextBox: true, margin: 0,
    fontFace: F_BODY, fontSize: 11.5, bold: true, color: TEXT,
  });
  if (sub) {
    slide.addText(sub, {
      x: x + 0.2, y: y + h * 0.52 + 0.28, w: w - 0.4, h: h * 0.3, isTextBox: true, margin: 0,
      fontFace: F_BODY, fontSize: 9.5, color: SUBTEXT,
    });
  }
}

function dotField(slide, seedPoints, color = AMBER, opacity = 88) {
  seedPoints.forEach(([x, y, r]) => {
    slide.addShape("ellipse", { x, y, w: r, h: r, fill: { color, transparency: opacity }, line: { type: "none" } });
  });
}

// =====================================================================
// SLIDE 1: Hackathon Submission Details (GitHub repo updated to RxPulse)
// =====================================================================
{
  const s = pres.addSlide();
  bg(s);

  // Top Header Title
  s.addText("Manipal Hackathon 2026", {
    x: 0.8, y: 0.5, w: 9.0, h: 0.8, isTextBox: true, margin: 0,
    fontFace: F_HEAD, fontSize: 42, bold: true, color: TEXT,
  });

  // Logo in top right
  const logoPath = path.join(ROOT, "manipal_logo.jpg");
  if (fs.existsSync(logoPath)) {
    s.addImage({ path: logoPath, x: PW - 2.6, y: 0.45, w: 1.8, h: 0.8 });
  }

  // Clean horizontal accent line
  s.addShape("line", { x: 0.8, y: 1.45, w: 11.7, h: 0, line: { color: HAIRLINE, width: 1.5 } });

  // 7 Clean metadata rows in a sleek container
  s.addShape("roundRect", {
    x: 0.8, y: 1.7, w: 11.72, h: 5.1, rectRadius: 0.08,
    fill: { color: SURFACE }, line: { color: HAIRLINE, width: 1 },
  });

  const fields = [
    { label: "Team Name:", val: "RxPulse (Team Aman)", isLink: false },
    { label: "Track:", val: "Healthcare (SDG 3: Good Health and Well-being)", isLink: false },
    { label: "Problem Statement:", val: "P01: The Vanishing Dose: Detecting Medication Non-Adherence Without Asking", isLink: false, boldVal: true },
    { label: "Solution Title:", val: "RxPulse: Multi-Signal Clinical Decision Support & Adherence Telemetry Engine", isLink: false, boldVal: true },
    { label: "Team Members:", val: "Aman, Tanish Kuvar", isLink: false },
    { label: "Working Prototype:", val: "https://github.com/tanishkuvar11/RxPulse  (Live Demo: http://localhost:5173/simulator)", isLink: true },
    { label: "Evaluation Target:", val: "Round 1 Ideation + Section 8.6 Prototype Bonus Submission", isLink: false },
  ];

  let ry = 1.9;
  const labelW = 2.7, valW = 8.6;
  fields.forEach(f => {
    s.addText(f.label, {
      x: 1.1, y: ry, w: labelW, h: 0.4, isTextBox: true, margin: 0,
      fontFace: F_HEAD, fontSize: 13.5, bold: true, color: AMBER, valign: "top",
    });
    
    if (f.isLink) {
      s.addText([
        { text: "https://github.com/tanishkuvar11/RxPulse", options: { color: GREEN, bold: true } },
        { text: "  (Live Demo: ", options: { color: SUBTEXT } },
        { text: "http://localhost:5173/simulator", options: { color: GREEN, bold: true } },
        { text: ")", options: { color: SUBTEXT } },
      ], {
        x: 1.1 + labelW, y: ry, w: valW, h: 0.5, isTextBox: true, margin: 0,
        fontFace: F_BODY, fontSize: 13, valign: "top", lineSpacing: 15,
      });
    } else {
      s.addText(f.val, {
        x: 1.1 + labelW, y: ry, w: valW, h: 0.5, isTextBox: true, margin: 0,
        fontFace: F_BODY, fontSize: 13.5, bold: f.boldVal ?? false, color: TEXT, valign: "top", lineSpacing: 16,
      });
    }
    ry += 0.68;
  });

  pageNum(s, 1);
}

// =====================================================================
// SLIDE 2: Solution (RxPulse)
// =====================================================================
{
  const s = pres.addSlide();
  bg(s);
  iconBadge(s, { x: 0.7, y: 0.45, icon: "alert" });
  kicker(s, "Clinical Solution & Live Prototype", { x: 1.35, y: 0.55 });
  s.addText("Solution: Detecting White-Coat Adherence Before Hazardous Dose Escalation", {
    x: 0.7, y: 1.0, w: 11.9, h: 0.6, isTextBox: true, margin: 0,
    fontFace: F_HEAD, fontSize: 24, bold: true, color: TEXT,
  });

  // Left Column: The Problem & Solution Cards
  const leftX = 0.7, colW = 5.1;

  // Card 1: The Dilemma
  s.addShape("roundRect", {
    x: leftX, y: 1.75, w: colW, h: 2.5, rectRadius: 0.07,
    fill: { color: SURFACE }, line: { color: RISK_RED, width: 1 },
  });
  s.addText("THE CLINICAL HAZARD: DOSE ESCALATION", {
    x: leftX + 0.25, y: 1.9, w: colW - 0.5, h: 0.28, isTextBox: true, margin: 0,
    fontFace: F_HEAD, fontSize: 10, color: RISK_RED, bold: true, charSpacing: 1,
  });
  s.addText(
    "When hypertension persists, doctors reflexively double the prescription. If missed doses are the real cause, dosage escalation becomes dangerous the moment the patient resumes daily medication: risking acute hypotension, dizziness, or emergency room visits.",
    {
      x: leftX + 0.25, y: 2.25, w: colW - 0.5, h: 1.85, isTextBox: true, margin: 0,
      fontFace: F_BODY, fontSize: 11.5, color: TEXT, lineSpacing: 16,
    }
  );

  // Card 2: The Multi-Signal Solution (RxPulse)
  s.addShape("roundRect", {
    x: leftX, y: 4.4, w: colW, h: 2.45, rectRadius: 0.07,
    fill: { color: SURFACE }, line: { color: GREEN, width: 1 },
  });
  s.addText("RXPULSE CLINICAL EVIDENCE ENGINE", {
    x: leftX + 0.25, y: 4.55, w: colW - 0.5, h: 0.28, isTextBox: true, margin: 0,
    fontFace: F_HEAD, fontSize: 10, color: GREEN, bold: true, charSpacing: 1,
  });
  s.addText([
    { text: "1. Pharmacy Claims: ", options: { bold: true, color: AMBER } },
    { text: "Detects unmedicated refill gaps (e.g. 22-day gaps).\n", options: { color: TEXT } },
    { text: "2. Smartwatch Telemetry: ", options: { bold: true, color: AMBER } },
    { text: "Confirms autonomic heart rate rebounds (+14 bpm).\n", options: { color: TEXT } },
    { text: "3. Non-Accusatory CDS: ", options: { bold: true, color: AMBER } },
    { text: "Prompts: \"DO NOT ESCALATE DOSE: Pre-Visit Surge Detected\".", options: { color: TEXT } },
  ], {
    x: leftX + 0.25, y: 4.9, w: colW - 0.5, h: 1.8, isTextBox: true, margin: 0,
    fontFace: F_BODY, fontSize: 11, lineSpacing: 15,
  });

  // Right Column: UI Screenshot (Live Simulator Sandbox)
  browserFrame(s, {
    x: 6.05, y: 1.75, maxW: 6.6, maxH: 5.1,
    img: A("shot_simulator.png"),
    url: "RXPULSE.APP/SIMULATOR"
  });

  pageNum(s, 2);
}

// =====================================================================
// SLIDE 3: Technical Implementation
// =====================================================================
{
  const s = pres.addSlide();
  bg(s);
  iconBadge(s, { x: 0.7, y: 0.45, icon: "grid" });
  kicker(s, "Architecture & Algorithmic Engine", { x: 1.35, y: 0.55 });
  s.addText("Technical Implementation: Pipeline, Conformal ML & Modern EHR Interface", {
    x: 0.7, y: 1.0, w: 11.9, h: 0.6, isTextBox: true, margin: 0,
    fontFace: F_HEAD, fontSize: 23, bold: true, color: TEXT,
  });

  // 4 Top Cards (Pipeline Pillars)
  const pillars = [
    { num: "01", title: "Data Pipeline (Polars)", desc: "Ingests 116k+ CMS Medicare beneficiaries, maps RxNorm ingredients, computes daily PDC, censors inpatient stays." },
    { num: "02", title: "Archetypes (GMM)", desc: "Unsupervised Gaussian Mixture Models classify refill behavior into 6 profiles: weekend skippers, cost drop-offs, erratic fills." },
    { num: "03", title: "Safe AI Abstention", desc: "Split-Conformal Prediction calculates strict confidence intervals. Abstains when data is sparse, refusing false guesses." },
    { num: "04", title: "EHR React Engine", desc: "Interactive Visx charts, fully offline execution, and an EHR-style concept interface with a patient mobile companion preview (illustrative mockups, not a real EHR integration)." },
  ];

  const colW = 2.8, gap = 0.2, startX = 0.7, cardY = 1.7, cardH = 1.95;
  pillars.forEach((p, i) => {
    const x = startX + i * (colW + gap);
    s.addShape("roundRect", {
      x, y: cardY, w: colW, h: cardH, rectRadius: 0.07,
      fill: { color: SURFACE }, line: { color: HAIRLINE, width: 1 },
    });
    s.addText(p.num, {
      x: x + colW - 0.7, y: cardY + 0.15, w: 0.5, h: 0.3, isTextBox: true, margin: 0,
      fontFace: F_HEAD, fontSize: 14, color: AMBER, bold: true, align: "right",
    });
    s.addText(p.title, {
      x: x + 0.2, y: cardY + 0.18, w: colW - 0.8, h: 0.35, isTextBox: true, margin: 0,
      fontFace: F_HEAD, fontSize: 13, bold: true, color: TEXT,
    });
    s.addShape("line", { x: x + 0.2, y: cardY + 0.58, w: colW - 0.4, h: 0, line: { color: HAIRLINE, width: 1 } });
    s.addText(p.desc, {
      x: x + 0.2, y: cardY + 0.68, w: colW - 0.4, h: 1.15, isTextBox: true, margin: 0,
      fontFace: F_BODY, fontSize: 10, color: SUBTEXT, lineSpacing: 13.5,
    });
  });

  // Bottom Section: Full Multi-Signal Timeline UI Browser Frame
  browserFrame(s, {
    x: 0.7, y: 3.85, maxW: 11.9, maxH: 3.0,
    img: A("shot_home.png"),
    url: "RXPULSE.APP/CLINICAL-TIMELINE"
  });

  pageNum(s, 3);
}

// =====================================================================
// SLIDE 4: Feasibility
// =====================================================================
{
  const s = pres.addSlide();
  bg(s);
  iconBadge(s, { x: 0.7, y: 0.45, icon: "shield" });
  kicker(s, "Validation, Integration & Clinical Safety", { x: 1.35, y: 0.55 });
  s.addText("Feasibility: Empirical Validation, Data Provenance & Point-of-Care Safety", {
    x: 0.7, y: 1.0, w: 11.9, h: 0.6, isTextBox: true, margin: 0,
    fontFace: F_HEAD, fontSize: 23, bold: true, color: TEXT,
  });

  // 3 Key Feasibility Columns
  const cols = [
    {
      icon: "trend", title: "Statistical Power & Validation",
      body: "Independent validation harness running 40 replicate synthetic cohorts with 2 noise levels. Reaches 80% power at 1.3 percentage point effect size. Predicted coverage tightly tracks realized diagonal."
    },
    {
      icon: "database", title: "Data Provenance & CMS Analysis",
      body: "Evaluated on real CMS DE-SynPUF Medicare claims (5,237 continuous beneficiaries, 6,286 pairs). Explicit provenance tags (measured, derived, simulated) disclose CMS privacy perturbation (+0.0 pp measured lift)."
    },
    {
      icon: "lock", title: "EHR Safety & Offline Runtime",
      body: "100% offline runtime execution with zero external API calls at point of care. Deterministic, seeded pipeline guarantees byte-identical results. Non-accusatory doctor conversation tips integrated into EHR."
    },
  ];

  const colW = 3.75, gap = 0.32, startX = 0.7, cardY = 1.75, cardH = 3.4;
  cols.forEach((c, i) => {
    const x = startX + i * (colW + gap);
    s.addShape("roundRect", {
      x, y: cardY, w: colW, h: cardH, rectRadius: 0.07,
      fill: { color: SURFACE }, line: { color: HAIRLINE, width: 1 },
    });
    iconBadge(s, { x: x + 0.25, y: cardY + 0.25, d: 0.48, icon: c.icon });
    s.addText(c.title, {
      x: x + 0.85, y: cardY + 0.28, w: colW - 1.0, h: 0.45, isTextBox: true, margin: 0,
      fontFace: F_HEAD, fontSize: 13, bold: true, color: TEXT, lineSpacing: 15,
    });
    s.addShape("line", { x: x + 0.25, y: cardY + 0.85, w: colW - 0.5, h: 0, line: { color: HAIRLINE, width: 1 } });
    s.addText(c.body, {
      x: x + 0.25, y: cardY + 0.98, w: colW - 0.5, h: 2.2, isTextBox: true, margin: 0,
      fontFace: F_BODY, fontSize: 11, color: SUBTEXT, lineSpacing: 15.5,
    });
  });

  // Bottom Row: 3 Stat Tiles
  const stats = [
    { val: "80% Power", label: "Validated Effect Sensitivity", sub: "At 1.3 pp true pre-visit surge effect" },
    { val: "5,237", label: "Medicare Cohort Beneficiaries", sub: "CMS DE-SynPUF continuous Medicare study" },
    { val: "0 API Calls", label: "Offline EHR Clinical Safety", sub: "Zero network dependencies at point of care" },
  ];
  let sy = 5.35, sw = 3.75, sg = 0.32;
  stats.forEach((st, i) => {
    statTile(s, { x: startX + i * (sw + sg), y: sy, w: sw, h: 1.3, value: st.val, label: st.label, sub: st.sub, valueColor: AMBER });
  });

  pageNum(s, 4);
}

// =====================================================================
// SLIDE 5: Business Strategy
// =====================================================================
{
  const s = pres.addSlide();
  bg(s);
  iconBadge(s, { x: 0.7, y: 0.45, icon: "package" });
  kicker(s, "Value-Based Care, ROI & Scaling Roadmap", { x: 1.35, y: 0.55 });
  s.addText("Business Strategy: Unlocking Value-Based Care Savings & EHR Integration", {
    x: 0.7, y: 1.0, w: 11.9, h: 0.6, isTextBox: true, margin: 0,
    fontFace: F_HEAD, fontSize: 23, bold: true, color: TEXT,
  });

  // 3 Business Pillars using native paragraph bullets
  const bPillars = [
    {
      icon: "pie", title: "Value-Based Care & Hospital ROI",
      bullets: [
        "Prevents costly acute ER admissions caused by post-surge hypotension.",
        "Avoids CMS Hospital Readmissions Reduction Program (HRRP) penalties.",
        "Boosts HEDIS medication adherence quality scores for Medicare Advantage plans."
      ]
    },
    {
      icon: "clipboard", title: "Point-of-Care EHR Integration",
      bullets: [
        "SMART on FHIR plugin architecture for Epic, Cerner, and Athenahealth.",
        "1-click doctor clinical action suite: Maintain dose, ship smart pill caps, or issue co-pay cards.",
        "Automated non-accusatory progress note insertion directly into EHR records."
      ]
    },
    {
      icon: "activity", title: "Commercial Scaling Roadmap",
      bullets: [
        "Phase 1: Hospital EHR plugin + CarePulse patient mobile app launch.",
        "Phase 2: Health system enterprise licensing & PBM risk-sharing partnerships.",
        "Phase 3: Native wearable telemetry API (Apple HealthKit & Google Health Connect)."
      ]
    },
  ];

  const colW = 3.75, gap = 0.32, startX = 0.7, cardY = 1.75, cardH = 3.25;
  bPillars.forEach((c, i) => {
    const x = startX + i * (colW + gap);
    s.addShape("roundRect", {
      x, y: cardY, w: colW, h: cardH, rectRadius: 0.07,
      fill: { color: SURFACE }, line: { color: HAIRLINE, width: 1 },
    });
    iconBadge(s, { x: x + 0.25, y: cardY + 0.25, d: 0.48, icon: c.icon });
    s.addText(c.title, {
      x: x + 0.85, y: cardY + 0.28, w: colW - 1.0, h: 0.45, isTextBox: true, margin: 0,
      fontFace: F_HEAD, fontSize: 13, bold: true, color: TEXT, lineSpacing: 15,
    });
    s.addShape("line", { x: x + 0.25, y: cardY + 0.85, w: colW - 0.5, h: 0, line: { color: HAIRLINE, width: 1 } });
    
    // Add text runs with bullet formatting
    const textRuns = c.bullets.map((b, idx) => ({
      text: b + (idx < c.bullets.length - 1 ? "\n\n" : ""),
      options: { fontFace: F_BODY, fontSize: 10.5, color: SUBTEXT, lineSpacing: 14.5, bullet: { type: "number", code: 8226 } }
    }));

    s.addText(textRuns, {
      x: x + 0.25, y: cardY + 0.98, w: colW - 0.5, h: 2.1, isTextBox: true, margin: 0,
    });
  });

  // Bottom row: the business case stated honestly as a hypothesis, not a costed
  // projection. No dollar/ROI figures here were computed by the pipeline, so none
  // are shown as if they were -- the earlier chart asset (slide5_hospital_roi_savings.png)
  // presented invented figures ($330k, $377,000, 7.4x ROI, etc.) with no such basis
  // and is intentionally not used.
  s.addShape("roundRect", { x: 0.7, y: 5.15, w: 11.9, h: 1.75, rectRadius: 0.07, fill: { color: SURFACE2 }, line: { color: HAIRLINE, width: 1 } });
  s.addText("Business case: a hypothesis, not a costed projection", {
    x: 0.95, y: 5.32, w: 11.4, h: 0.32, isTextBox: true, margin: 0,
    fontFace: F_HEAD, fontSize: 11.5, color: AMBER, bold: true,
  });
  s.addText(
    "If dose escalations driven by white-coat adherence are avoided, some fraction of preventable ICU admissions "
    + "and ER readmissions should follow. We have not costed this: no dollar savings or ROI figure in this deck is "
    + "computed from our pipeline or from real hospital data. Validated so far: on the real CMS cohort the measured "
    + "lift is +0.0 pp; on injected synthetic data the detector reaches 80% power at a 1.3 pp effect size. Turning "
    + "that into a hospital P&L case is future work, not a claim made here.",
    {
      x: 0.95, y: 5.68, w: 11.4, h: 1.15, isTextBox: true, margin: 0,
      fontFace: F_BODY, fontSize: 11, color: TEXT, lineSpacing: 15.5,
    }
  );

  pageNum(s, 5);
}

// Generate files in deck_assets, root, and copy to target files
const outPath1 = A("Vanishing_Dose_Deck.pptx");
const outPath2 = path.join(ROOT, "Vanishing_Dose_Deck.pptx");
const outPath3 = path.join(ROOT, "TeamID_TeamName_P01.pptx");
const outPath4 = path.join(ROOT, "Vanishing_Dose_Round1_Final.pptx");

pres.writeFile({ fileName: outPath1 }).then(() => {
  console.log("Successfully wrote: " + outPath1);
  [outPath2, outPath3, outPath4].forEach(target => {
    try {
      fs.copyFileSync(outPath1, target);
      console.log("Copied to: " + target);
    } catch (e) {
      console.warn("Could not overwrite " + path.basename(target) + " (file may be open in PowerPoint): " + e.message);
    }
  });
}).catch(err => {
  console.error("Error writing PPTX:", err);
});
