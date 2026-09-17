const pptxgen = require("pptxgenjs");
const path = require("path");

const A = path.join.bind(null, __dirname);

// ---- palette (the product's own design system) ----
const GROUND = "0E1419";
const SURFACE = "161E25";
const SURFACE2 = "1B242C";
const HAIRLINE = "243039";
const TEXT = "E8EDF0";
const SUBTEXT = "8FA0AC";
const AMBER = "D9A441";
const CENSORED = "3A4854";
const RISK_RED = "E0637A"; // matches the app's high-risk red, used sparingly

const F_HEAD = "Cambria";
const F_BODY = "Calibri";
const F_MONO = "Courier New";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in
const PW = 13.333, PH = 7.5;

function bg(slide, color = GROUND) {
  slide.background = { color };
}

// icon in a filled circle -- the one repeated motif across every slide
function iconBadge(slide, { x, y, d = 0.5, icon, circleColor = AMBER, iconVariant = "ground" }) {
  slide.addShape("ellipse", { x, y, w: d, h: d, fill: { color: circleColor }, line: { type: "none" } });
  const pad = d * 0.26;
  slide.addImage({ path: A("icons", `${icon}_${iconVariant}.png`), x: x + pad / 2, y: y + pad / 2, w: d - pad, h: d - pad });
}

function kicker(slide, text, { x = 0.7, y = 0.5, color = AMBER } = {}) {
  slide.addText(text.toUpperCase(), {
    x, y, w: 8, h: 0.35, isTextBox: true, margin: 0,
    fontFace: F_MONO, fontSize: 11, color, charSpacing: 2, bold: true,
  });
}

function pageNum(slide, n) {
  slide.addText(`0${n} / 10`, {
    x: PW - 1.3, y: PH - 0.5, w: 1.0, h: 0.3, isTextBox: true, margin: 0,
    fontFace: F_MONO, fontSize: 9, color: SUBTEXT, align: "right",
  });
  slide.addText("VANISHING DOSE", {
    x: 0.7, y: PH - 0.5, w: 3, h: 0.3, isTextBox: true, margin: 0,
    fontFace: F_MONO, fontSize: 9, color: SUBTEXT, charSpacing: 1,
  });
}

// browser-chrome frame around a product screenshot. Contain-fits the screenshot's
// real 1600x1000 (1.6:1) aspect ratio inside the box (maxW x maxH, maxH including the
// chrome bar), centered horizontally, so it is never stretched or squashed -- a
// mismatched box was the source of the soft/compressed look on earlier drafts.
const SHOT_ASPECT = 1600 / 1000;
function browserFrame(slide, { x, y, maxW, maxH, img, url = "vanishingdose.app" }) {
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
  slide.addText(url, {
    x: ox + 0.7, y: y + 0.03, w: 3, h: barH - 0.06, isTextBox: true, margin: 0,
    fontFace: F_MONO, fontSize: 9, color: SUBTEXT, valign: "middle",
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
    x: x + 0.22, y: y + 0.14, w: w - 0.44, h: h * 0.5, isTextBox: true, margin: 0,
    fontFace: F_MONO, fontSize: 25, bold: true, color: valueColor, align: "left",
  });
  slide.addText(label, {
    x: x + 0.22, y: y + h * 0.6, w: w - 0.44, h: 0.3, isTextBox: true, margin: 0,
    fontFace: F_BODY, fontSize: 12, bold: true, color: TEXT,
  });
  if (sub) {
    slide.addText(sub, {
      x: x + 0.22, y: y + h * 0.6 + 0.3, w: w - 0.44, h: h * 0.3, isTextBox: true, margin: 0,
      fontFace: F_BODY, fontSize: 9.5, color: SUBTEXT,
    });
  }
}

// faint scattered "data point" decoration -- not a stripe, a loose field of dots
function dotField(slide, seedPoints, color = AMBER, opacity = 88) {
  seedPoints.forEach(([x, y, r]) => {
    slide.addShape("ellipse", { x, y, w: r, h: r, fill: { color, transparency: opacity }, line: { type: "none" } });
  });
}

// =====================================================================
// SLIDE 1 -- Title
// =====================================================================
{
  const s = pres.addSlide();
  bg(s);
  dotField(s, [
    [10.6, 0.6, 0.12], [11.3, 1.4, 0.07], [10.9, 2.1, 0.16], [12.1, 0.9, 0.09],
    [11.7, 2.6, 0.06], [10.3, 1.7, 0.05], [12.4, 1.9, 0.11], [9.9, 0.4, 0.07],
  ], AMBER, 82);

  s.addShape("roundRect", {
    x: 0.7, y: 0.75, w: 4.35, h: 0.42, rectRadius: 0.21,
    fill: { color: SURFACE }, line: { color: HAIRLINE, width: 1 },
  });
  s.addText("MANIPAL HACKATHON 2026  ·  HEALTHCARE TRACK", {
    x: 0.7, y: 0.75, w: 4.35, h: 0.42, isTextBox: true, margin: 0,
    fontFace: F_MONO, fontSize: 10.5, color: AMBER, align: "center", valign: "middle", charSpacing: 1,
  });

  s.addText("Vanishing Dose", {
    x: 0.65, y: 2.55, w: 10.5, h: 1.5, isTextBox: true, margin: 0,
    fontFace: F_HEAD, fontSize: 60, bold: true, color: TEXT,
  });
  s.addText("A clinical evidence instrument for medication adherence", {
    x: 0.7, y: 3.85, w: 9.5, h: 0.55, isTextBox: true, margin: 0,
    fontFace: F_BODY, fontSize: 20, color: SUBTEXT,
  });

  s.addShape("line", { x: 0.7, y: 4.62, w: 0.55, h: 0, line: { color: AMBER, width: 2.5 } });
  s.addText([
    { text: "Separating ", options: { color: SUBTEXT } },
    { text: "“the drug isn’t working”", options: { color: TEXT, italic: true } },
    { text: " from ", options: { color: SUBTEXT } },
    { text: "“the drug isn’t being taken.”", options: { color: AMBER, italic: true, bold: true } },
  ], {
    x: 0.7, y: 4.78, w: 9.6, h: 0.7, isTextBox: true, margin: 0,
    fontFace: F_HEAD, fontSize: 19,
  });

  s.addText("Medicare claims, wearable vitals, and clinical records. Built on real CMS data, honest about its limits.", {
    x: 0.7, y: 6.55, w: 10.5, h: 0.4, isTextBox: true, margin: 0,
    fontFace: F_MONO, fontSize: 10.5, color: SUBTEXT,
  });
}

// =====================================================================
// SLIDE 2 -- The clinical problem
// =====================================================================
{
  const s = pres.addSlide();
  bg(s);
  const GREEN = "6FBF8B";
  iconBadge(s, { x: 0.7, y: 0.55, icon: "alert" });
  kicker(s, "The clinical problem", { x: 1.4, y: 0.68 });
  s.addText([
    { text: "When blood pressure stays high, the reflex\nis to ", options: {} },
    { text: "escalate the dose.", options: { color: AMBER } },
  ], {
    x: 0.7, y: 1.15, w: 11.8, h: 1.35, isTextBox: true, margin: 0,
    fontFace: F_HEAD, fontSize: 33, bold: true, color: TEXT, lineSpacing: 38,
  });

  s.addText(
    "If the real cause is missed doses, not treatment failure, escalation becomes dangerous the "
    + "moment the patient resumes taking the drug as prescribed. Standard adherence metrics average "
    + "this pattern away: a patient who refills faithfully only in the days before each visit looks "
    + "perfectly controlled on paper, every time.",
    {
      x: 0.7, y: 2.55, w: 5.7, h: 2.0, isTextBox: true, margin: 0,
      fontFace: F_BODY, fontSize: 14, color: SUBTEXT, lineSpacing: 22,
    }
  );

  s.addShape("roundRect", {
    x: 0.7, y: 4.75, w: 5.7, h: 1.85, rectRadius: 0.07,
    fill: { color: SURFACE }, line: { color: AMBER, width: 1 },
  });
  s.addText("WHITE-COAT ADHERENCE", {
    x: 0.95, y: 4.93, w: 5.2, h: 0.3, isTextBox: true, margin: 0,
    fontFace: F_MONO, fontSize: 11, color: AMBER, bold: true, charSpacing: 1,
  });
  s.addText(
    "The pattern where medication is taken faithfully in the two weeks before a scheduled "
    + "appointment, and inconsistently the rest of the time. Invisible to every visit-based check.",
    {
      x: 0.95, y: 5.25, w: 5.2, h: 1.25, isTextBox: true, margin: 0,
      fontFace: F_BODY, fontSize: 13, color: TEXT, lineSpacing: 19,
    }
  );

  // Native comparison card (no raster screenshot: sharper at any size, and matches
  // the vector-card treatment used everywhere else in the deck).
  const cardY = 2.5, cardH = 3.05, colW = 2.85, colGap = 0.2, cardX = 6.75;
  s.addText("THE CLINICAL DILEMMA, IN 30 SECONDS", {
    x: cardX, y: cardY, w: 5.9, h: 0.3, isTextBox: true, margin: 0,
    fontFace: F_MONO, fontSize: 10.5, color: AMBER, bold: true, charSpacing: 1,
  });

  function dilemmaCol({ x, tone, badge, heading, body, noteLabel, note }) {
    s.addShape("roundRect", {
      x, y: cardY + 0.4, w: colW, h: cardH, rectRadius: 0.06,
      fill: { color: SURFACE }, line: { color: tone, width: 1 },
    });
    s.addShape("roundRect", {
      x: x + colW - 1.15, y: cardY + 0.55, w: 1.0, h: 0.3, rectRadius: 0.15,
      fill: { type: "none" }, line: { color: tone, width: 1 },
    });
    s.addText(badge, {
      x: x + colW - 1.15, y: cardY + 0.55, w: 1.0, h: 0.3, isTextBox: true, margin: 0,
      fontFace: F_MONO, fontSize: 8, color: tone, align: "center", valign: "middle",
    });
    s.addText(heading, {
      x: x + 0.2, y: cardY + 0.55, w: colW - 0.4, h: 0.55, isTextBox: true, margin: 0,
      fontFace: F_BODY, fontSize: 11.5, bold: true, color: tone, lineSpacing: 13,
    });
    s.addText(body, {
      x: x + 0.2, y: cardY + 1.12, w: colW - 0.4, h: 1.05, isTextBox: true, margin: 0,
      fontFace: F_BODY, fontSize: 10, color: TEXT, lineSpacing: 13.5,
    });
    s.addText([
      { text: `${noteLabel}  `, options: { bold: true, color: tone } },
      { text: note, options: { color: SUBTEXT } },
    ], {
      x: x + 0.2, y: cardY + 2.15, w: colW - 0.4, h: 1.15, isTextBox: true, margin: 0,
      fontFace: F_BODY, fontSize: 9, lineSpacing: 12.5,
    });
  }

  dilemmaCol({
    x: cardX, tone: RISK_RED, badge: "High risk",
    heading: "Standard practice",
    body: "A patient visits the clinic with high blood pressure. The doctor assumes the current medication is too weak and doubles the prescription.",
    noteLabel: "The hazard.",
    note: "If the patient had missed doses for weeks, a double dose once they get home can trigger dangerous blood pressure drops, dizziness, or emergency room visits.",
  });
  dilemmaCol({
    x: cardX + colW + colGap, tone: GREEN, badge: "Compassionate",
    heading: "Vanishing Dose",
    body: "The system flags an unmedicated 22-day gap, confirmed by an elevated resting heart rate on the patient's own wearable, then a rush to refill right before the visit.",
    noteLabel: "The action.",
    note: "A clear do-not-escalate alert, plus supportive conversation questions that explore refill obstacles instead of assuming forgetfulness.",
  });

  pageNum(s, 2);
}

// =====================================================================
// SLIDE 3 -- Three principles
// =====================================================================
{
  const s = pres.addSlide();
  bg(s);
  iconBadge(s, { x: 0.7, y: 0.55, icon: "grid" });
  kicker(s, "How it works", { x: 1.4, y: 0.68 });
  s.addText("Three principles, not just an algorithm", {
    x: 0.7, y: 1.15, w: 11.8, h: 0.75, isTextBox: true, margin: 0,
    fontFace: F_HEAD, fontSize: 30, bold: true, color: TEXT,
  });
  s.addText(
    "Every design choice in Vanishing Dose answers to one of these, from the data pipeline up "
    + "through the words that appear on screen.",
    {
      x: 0.7, y: 1.85, w: 10.5, h: 0.5, isTextBox: true, margin: 0,
      fontFace: F_BODY, fontSize: 14, color: SUBTEXT,
    }
  );

  const cols = [
    { icon: "watch", title: "Multiple Daily Signals", body: "Pharmacy refill history, smartwatch resting heart rate, daily steps, and clinic vitals fold into one unified timeline, with no extra work for the patient." },
    { icon: "heart", title: "Compassionate by Design", body: "Before ever assuming a patient simply forgot, the system checks for hospital stays, prescription switches, and pharmacy cost barriers." },
    { icon: "shield", title: "Refuses to Guess", body: "Calibrated confidence intervals, not point estimates. When there isn’t enough refill history, the tool says so plainly, rather than fabricating certainty." },
  ];
  const colW = 3.75, gap = 0.35, startX = 0.7, colY = 2.75;
  cols.forEach((c, i) => {
    const x = startX + i * (colW + gap);
    s.addShape("roundRect", {
      x, y: colY, w: colW, h: 3.6, rectRadius: 0.07,
      fill: { color: SURFACE }, line: { color: HAIRLINE, width: 1 },
    });
    iconBadge(s, { x: x + 0.32, y: colY + 0.35, d: 0.62, icon: c.icon });
    s.addText(`0${i + 1}`, {
      x: x + colW - 0.9, y: colY + 0.3, w: 0.7, h: 0.5, isTextBox: true, margin: 0,
      fontFace: F_MONO, fontSize: 20, color: HAIRLINE, bold: true, align: "right",
    });
    s.addText(c.title, {
      x: x + 0.32, y: colY + 1.15, w: colW - 0.64, h: 0.7, isTextBox: true, margin: 0,
      fontFace: F_HEAD, fontSize: 17, bold: true, color: TEXT, lineSpacing: 20,
    });
    s.addText(c.body, {
      x: x + 0.32, y: colY + 1.85, w: colW - 0.64, h: 1.6, isTextBox: true, margin: 0,
      fontFace: F_BODY, fontSize: 12, color: SUBTEXT, lineSpacing: 17,
    });
  });

  pageNum(s, 3);
}

// =====================================================================
// SLIDE 4 -- Product tour: Home
// =====================================================================
{
  const s = pres.addSlide();
  bg(s);
  iconBadge(s, { x: 0.7, y: 0.5, icon: "package" });
  kicker(s, "Product tour · 01", { x: 1.4, y: 0.63 });
  s.addText("One instrument, three ways to look at the evidence", {
    x: 0.7, y: 1.05, w: 11.8, h: 0.65, isTextBox: true, margin: 0,
    fontFace: F_HEAD, fontSize: 25, bold: true, color: TEXT,
  });

  browserFrame(s, { x: 0.9, y: 1.85, maxW: 11.5, maxH: 4.99, img: A("shot_home.png") });
  pageNum(s, 4);
}

// =====================================================================
// SLIDE 5 -- Product tour: Live Simulator
// =====================================================================
{
  const s = pres.addSlide();
  bg(s);
  iconBadge(s, { x: 0.7, y: 0.5, icon: "activity" });
  kicker(s, "Product tour · 02", { x: 1.4, y: 0.63 });
  s.addText("Live diagnostic sandbox: the White-Coat Surge scenario", {
    x: 0.7, y: 1.05, w: 8.2, h: 0.9, isTextBox: true, margin: 0,
    fontFace: F_HEAD, fontSize: 22, bold: true, color: TEXT, lineSpacing: 25,
  });

  browserFrame(s, { x: 0.7, y: 2.05, maxW: 8.0, maxH: 4.74, img: A("shot_simulator.png") });

  const callouts = [
    { icon: "grid", title: "Five ready-made cases", body: "From safe abstention to prescription abandonment, loaded instantly." },
    { icon: "alert", title: "Live clinical alert", body: "94% confidence, “Do not escalate dose,” generated in real time from the sliders." },
    { icon: "check", title: "Point-of-care ready", body: "Framed as an EHR clinical-decision-support panel, not a research chart." },
  ];
  let cy = 2.15;
  callouts.forEach((c) => {
    iconBadge(s, { x: 9.05, y: cy, d: 0.46, icon: c.icon, circleColor: SURFACE2, iconVariant: "amber" });
    s.addText(c.title, {
      x: 9.65, y: cy - 0.03, w: 3.0, h: 0.35, isTextBox: true, margin: 0,
      fontFace: F_BODY, fontSize: 13, bold: true, color: TEXT,
    });
    s.addText(c.body, {
      x: 9.65, y: cy + 0.33, w: 3.0, h: 0.85, isTextBox: true, margin: 0,
      fontFace: F_BODY, fontSize: 10.5, color: SUBTEXT, lineSpacing: 14,
    });
    cy += 1.55;
  });

  pageNum(s, 5);
}

// =====================================================================
// SLIDE 6 -- Product tour: Patient evidence
// =====================================================================
{
  const s = pres.addSlide();
  bg(s);
  iconBadge(s, { x: 0.7, y: 0.5, icon: "clipboard" });
  kicker(s, "Product tour · 03", { x: 1.4, y: 0.63 });
  s.addText("Evidence at the bedside, never blame", {
    x: 0.7, y: 1.05, w: 8, h: 0.65, isTextBox: true, margin: 0,
    fontFace: F_HEAD, fontSize: 25, bold: true, color: TEXT,
  });

  browserFrame(s, { x: 0.7, y: 1.85, maxW: 7.7, maxH: 4.99, img: A("shot_patient.png") });

  statTile(s, { x: 8.65, y: 1.95, w: 3.95, h: 1.5, value: "+63.9%", label: "Pre-visit refill surge", sub: "vs. a 69.9% average gap the rest of the time", valueColor: RISK_RED });

  s.addShape("roundRect", {
    x: 8.65, y: 3.65, w: 3.95, h: 2.4, rectRadius: 0.07,
    fill: { color: SURFACE }, line: { color: HAIRLINE, width: 1 },
  });
  iconBadge(s, { x: 8.9, y: 3.87, d: 0.44, icon: "message" });
  s.addText("DOCTOR CONVERSATION TIP", {
    x: 9.5, y: 3.93, w: 3.0, h: 0.3, isTextBox: true, margin: 0,
    fontFace: F_MONO, fontSize: 9.5, color: AMBER, bold: true,
  });
  s.addText(
    "“Your clinic numbers look fine today, but taking this medicine every day is what protects "
    + "your heart long-term. Was there a stretch recently where it was difficult to take it daily?”",
    {
      x: 8.95, y: 4.5, w: 3.4, h: 1.35, isTextBox: true, margin: 0,
      fontFace: F_HEAD, fontSize: 12.5, italic: true, color: TEXT, lineSpacing: 17,
    }
  );
  s.addText("Generated automatically. Focuses on cost and access, never accusation.", {
    x: 8.95, y: 5.82, w: 3.4, h: 0.6, isTextBox: true, margin: 0,
    fontFace: F_BODY, fontSize: 10, color: SUBTEXT, lineSpacing: 13,
  });

  pageNum(s, 6);
}

// =====================================================================
// SLIDE 7 -- Cohort science: the honest result
// =====================================================================
{
  const s = pres.addSlide();
  bg(s);
  iconBadge(s, { x: 0.7, y: 0.5, icon: "pie" });
  kicker(s, "Population science", { x: 1.4, y: 0.63 });
  s.addText("We report the real number, even when it’s zero", {
    x: 0.7, y: 1.05, w: 11.8, h: 0.65, isTextBox: true, margin: 0,
    fontFace: F_HEAD, fontSize: 26, bold: true, color: TEXT,
  });

  browserFrame(s, { x: 0.7, y: 1.9, maxW: 6.55, maxH: 4.89, img: A("shot_cohort.png") });

  const stats = [
    ["+0.0 pp", "Measured lift, real CMS cohort", "Flat. Not a bug."],
    ["p < 0.001", "Significance vs. 2,000 shuffled calendars", "Verified against chance"],
    ["6,286", "Patient-ingredient pairs studied", "5,237 continuous Medicare patients"],
  ];
  let sy = 2.0;
  stats.forEach(([v, l, sub]) => {
    statTile(s, { x: 7.55, y: sy, w: 5.05, h: 1.15, value: v, label: l, sub });
    sy += 1.32;
  });

  s.addText(
    "CMS’s public DE-SynPUF file deliberately perturbs refill dates to protect patient privacy, "
    + "so a real pre-visit surge would be smoothed toward flat. Faking a positive result on public "
    + "data would be easy. Reporting the true calculated result instead is the point.",
    {
      x: 7.55, y: 5.95, w: 5.05, h: 1.35, isTextBox: true, margin: 0,
      fontFace: F_BODY, fontSize: 11.5, color: SUBTEXT, lineSpacing: 16,
    }
  );

  pageNum(s, 7);
}

// =====================================================================
// SLIDE 8 -- Validation
// =====================================================================
{
  const s = pres.addSlide();
  bg(s);
  iconBadge(s, { x: 0.7, y: 0.5, icon: "trend" });
  kicker(s, "Validation, on a separate code path", { x: 1.4, y: 0.63 });
  s.addText("Proving the instrument before trusting its verdict", {
    x: 0.7, y: 1.05, w: 11.8, h: 0.65, isTextBox: true, margin: 0,
    fontFace: F_HEAD, fontSize: 25, bold: true, color: TEXT,
  });

  browserFrame(s, { x: 0.7, y: 1.85, maxW: 7.7, maxH: 4.99, img: A("shot_instrument.png") });

  statTile(s, { x: 8.65, y: 1.95, w: 3.95, h: 1.55, value: "80% power", label: "at a true effect of 1.3 pp", sub: "40 replicate synthetic cohorts × 2 noise levels" });
  statTile(s, { x: 8.65, y: 3.65, w: 3.95, h: 1.55, value: "~diagonal", label: "predicted vs. realized coverage", sub: "checked on the real cohort’s held-out split" });

  s.addShape("roundRect", { x: 8.65, y: 5.35, w: 3.95, h: 1.4, rectRadius: 0.07, fill: { color: SURFACE2 }, line: { color: HAIRLINE, width: 1 } });
  s.addText("simulated ≠ real", {
    x: 8.9, y: 5.47, w: 3.5, h: 0.32, isTextBox: true, margin: 0,
    fontFace: F_MONO, fontSize: 11, color: AMBER, bold: true,
  });
  s.addText("The validation harness imports nothing from the real pipeline. Every chart here is tagged simulated or derived, never mixed with the real cohort.", {
    x: 8.9, y: 5.78, w: 3.5, h: 0.9, isTextBox: true, margin: 0,
    fontFace: F_BODY, fontSize: 10, color: SUBTEXT, lineSpacing: 13,
  });

  pageNum(s, 8);
}

// =====================================================================
// SLIDE 9 -- Engineering integrity
// =====================================================================
{
  const s = pres.addSlide();
  bg(s);
  iconBadge(s, { x: 0.7, y: 0.5, icon: "lock" });
  kicker(s, "Non-negotiables", { x: 1.4, y: 0.63 });
  s.addText("Built to survive hostile questioning", {
    x: 0.7, y: 1.05, w: 11.8, h: 0.65, isTextBox: true, margin: 0,
    fontFace: F_HEAD, fontSize: 27, bold: true, color: TEXT,
  });

  const items = [
    ["database", "Provenance on every number", "measured / derived / simulated, tagged on-screen everywhere"],
    ["shield", "Separate validation path", "the harness never touches the real cohort, and vice versa"],
    ["lock", "Fully offline at runtime", "one static export; zero API calls once the pipeline has run"],
    ["grid", "Deterministic, seeded", "identical inputs reproduce byte-identical outputs, every run"],
    ["message", "No diagnostic language", "ranked evidence and intervals, never “non-compliant”"],
    ["clipboard", "Real CMS data, disclosed limits", "DE-SynPUF’s synthetic-data caveats stated on-screen, not hidden"],
  ];
  const cols = 3, rows = 2, cw = 3.85, ch = 2.15, gx = 0.2, gy = 0.25, ox = 0.7, oy = 2.15;
  items.forEach(([icon, title, body], i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = ox + col * (cw + gx), y = oy + row * (ch + gy);
    s.addShape("roundRect", { x, y, w: cw, h: ch, rectRadius: 0.07, fill: { color: SURFACE }, line: { color: HAIRLINE, width: 1 } });
    iconBadge(s, { x: x + 0.28, y: y + 0.28, d: 0.5, icon, circleColor: SURFACE2, iconVariant: "amber" });
    s.addText(title, {
      x: x + 0.28, y: y + 0.92, w: cw - 0.56, h: 0.55, isTextBox: true, margin: 0,
      fontFace: F_BODY, fontSize: 13, bold: true, color: TEXT, lineSpacing: 15,
    });
    s.addText(body, {
      x: x + 0.28, y: y + 1.42, w: cw - 0.56, h: 0.65, isTextBox: true, margin: 0,
      fontFace: F_BODY, fontSize: 10.5, color: SUBTEXT, lineSpacing: 13,
    });
  });

  pageNum(s, 9);
}

// =====================================================================
// SLIDE 10 -- Close
// =====================================================================
{
  const s = pres.addSlide();
  bg(s);
  dotField(s, [
    [0.5, 5.6, 0.1], [1.1, 6.3, 0.06], [0.8, 6.9, 0.14], [1.7, 6.1, 0.08],
    [0.3, 6.5, 0.05], [2.0, 6.7, 0.1],
  ], AMBER, 85);

  iconBadge(s, { x: 0.7, y: 0.7, d: 0.6, icon: "heart" });
  s.addText("The stake", {
    x: 1.45, y: 0.78, w: 5, h: 0.45, isTextBox: true, margin: 0,
    fontFace: F_MONO, fontSize: 12, color: AMBER, charSpacing: 2, bold: true,
  });

  s.addText([
    { text: "Don’t escalate a dose\nthat was ", options: {} },
    { text: "never actually missing.", options: { color: AMBER } },
  ], {
    x: 0.7, y: 1.55, w: 11.5, h: 1.9, isTextBox: true, margin: 0,
    fontFace: F_HEAD, fontSize: 42, bold: true, color: TEXT, lineSpacing: 47,
  });

  s.addText(
    "Vanishing Dose turns three quiet data streams, pharmacy refills, wearable vitals, and clinic "
    + "visits, into one honest answer to the question every prescriber eventually asks: is this "
    + "medicine failing, or is it simply not being taken?",
    {
      x: 0.7, y: 3.6, w: 8.2, h: 1.1, isTextBox: true, margin: 0,
      fontFace: F_BODY, fontSize: 15, color: SUBTEXT, lineSpacing: 22,
    }
  );

  s.addShape("line", { x: 0.7, y: 5.1, w: 11.9, h: 0, line: { color: HAIRLINE, width: 1 } });

  const stack = [
    ["Pipeline", "Python · polars · scikit-learn · RxNorm"],
    ["Frontend", "React · TypeScript · Tailwind · visx"],
    ["Data", "CMS DE-SynPUF (Medicare) · simulated wearables"],
  ];
  stack.forEach(([k, v], i) => {
    const x = 0.7 + i * 4.0;
    s.addText(k.toUpperCase(), {
      x, y: 5.35, w: 3.8, h: 0.3, isTextBox: true, margin: 0,
      fontFace: F_MONO, fontSize: 10, color: AMBER, bold: true, charSpacing: 1,
    });
    s.addText(v, {
      x, y: 5.65, w: 3.8, h: 0.5, isTextBox: true, margin: 0,
      fontFace: F_BODY, fontSize: 11.5, color: TEXT,
    });
  });

  s.addText("Vanishing Dose  ·  Manipal Hackathon 2026, Healthcare Track", {
    x: 0.7, y: 6.85, w: 8, h: 0.35, isTextBox: true, margin: 0,
    fontFace: F_MONO, fontSize: 10.5, color: SUBTEXT,
  });
}

pres.writeFile({ fileName: A("Vanishing_Dose_Deck.pptx") }).then(() => {
  console.log("Wrote Vanishing_Dose_Deck.pptx");
});
