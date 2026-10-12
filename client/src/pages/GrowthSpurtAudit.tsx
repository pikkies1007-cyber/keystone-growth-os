import { useState } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Keystone Business Group — Growth Spurt Bottleneck Audit
 *
 * Public, no-login lead-qualification funnel at /os/growth-spurt-audit.
 * Rendered standalone (outside AppLayout/the OS sidebar) because it is its
 * own distinct brand moment — navy/gold/teal, Cormorant Garamond + DM Sans —
 * not part of the Growth OS app chrome.
 *
 * This is a React port of the standalone `keystone_bottleneck_audit_CRM.html`
 * file: same 9 panes, same 14 questions, same severity/category scoring
 * logic. The only real change is the data layer — instead of firing to
 * Formspree, a Slack webhook, and a separate Supabase project, every stage
 * (started / completed / contact) now saves through the main app's own
 * database via a single tRPC mutation, with an email notification to the
 * owner on completion and on contact requests.
 */

type Answers = Record<string, string>;

type Lead = {
  name: string;
  phone: string;
  email: string;
  business: string;
  website: string;
};

type ReportData = {
  category: string;
  title: string;
  summary: string;
  direction: string;
  symptoms: string[];
  severityLabel: string;
  severityScore: number;
  severityWidth: string;
  severityClass: "pill-h" | "pill-m" | "pill-l";
  severityGradient: string;
};

const CATEGORY_COPY: Record<string, { title: string; summary: string; direction: string }> = {
  "Decision Dependency": {
    title: "Decision Dependency on the Owner",
    summary:
      "Your business is constrained by owner-centric decision flow. Every approval, escalation, and exception routes back to you — creating operational drag across delivery, team performance, and growth capacity.",
    direction:
      "The next move is to redesign decision ownership, not hire more people. Building decision rules, documenting authority levels, and creating clear escalation criteria will remove you from the daily approval loop and allow the business to execute at a higher level without you as the constant point of contact.",
  },
  "Delegation Failure": {
    title: "Delegation Failure",
    summary:
      "Your business has team capacity to execute more independently, but delegation is not happening effectively. Tasks are returning to you because there are no clear handover structures, process documents, or trust frameworks in place.",
    direction:
      "The priority is structured delegation — not just handing over tasks, but building the systems that make delegation safe. This means documenting processes, defining quality standards, and creating accountability structures so you can step back with confidence.",
  },
  "System & Process Absence": {
    title: "System & Process Absence",
    summary:
      "Your business runs on institutional knowledge stored in your head. Without documented systems, every task depends on your involvement or judgement — making consistency, delegation, and scale structurally impossible.",
    direction:
      "The immediate priority is process capture — starting with the 5 highest-frequency tasks in the business. Once these are documented, delegation becomes possible, quality becomes consistent, and your time is freed for higher-value work.",
  },
  "Scaling Ceiling": {
    title: "Scaling Ceiling — Owner Capacity",
    summary:
      "Your business has functional systems but growth is capped by the number of hours you can personally work. Revenue, delivery capacity, and team performance are all limited by your bandwidth as the owner.",
    direction:
      "The next move is to decouple business output from owner input — identifying which decisions and delivery functions can be owned by the team, and building the systems that make this transition safe and scalable.",
  },
  "Operational Overload": {
    title: "Operational Overload",
    summary:
      "You are operating at capacity across delivery, administration, decision-making, and strategy simultaneously. The business is not structured to absorb growth because the owner is the primary execution resource.",
    direction:
      "The priority is load redistribution — identifying which parts of your role can be systematised, delegated, or automated, and sequencing those changes in order of time-return. This is a structural problem, not a hiring problem.",
  },
};

function generateSessionId(): string {
  if (typeof window !== "undefined" && window.crypto && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }
  return "kb-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function scoreReport(answers: Answers): ReportData {
  let sevScore = 5;
  let category = "Decision Dependency";
  const symptoms: string[] = [];

  if (answers.q4 === "More than 6 hours") {
    sevScore += 2;
    symptoms.push("You spend the majority of your day on tasks only you can execute");
  } else if (answers.q4 === "4 – 6 hours") {
    sevScore += 1;
    symptoms.push("A large portion of your day is consumed by owner-only tasks");
  }

  if (answers.q5 === "It completely stops") {
    sevScore += 3;
    category = "Decision Dependency";
    symptoms.push("The business cannot operate without your direct presence");
  } else if (answers.q5 === "It nearly stops") {
    sevScore += 2;
    category = "Decision Dependency";
    symptoms.push("Operations slow to near-halt when you step away");
  } else if (answers.q5 === "It slows down but keeps going") {
    sevScore -= 1;
    category = "Delegation Failure";
  } else if (answers.q5 === "It runs smoothly without me") {
    sevScore -= 2;
    category = "Scaling Ceiling";
  }

  if (answers.q6 === "30+") {
    sevScore += 2;
    symptoms.push("You are making 30+ operational decisions every single day");
  } else if (answers.q6 && answers.q6.includes("15")) {
    sevScore += 1;
    symptoms.push("Decisions consistently route back to you — 15 to 30 per day");
  }

  if (answers.q7 && answers.q7.includes("Always just problems")) {
    sevScore += 2;
    symptoms.push("Your team presents problems — not solutions — expecting you to resolve everything");
  } else if (answers.q7 && answers.q7.includes("Sometimes")) {
    sevScore += 1;
  }

  if (answers.q8 && answers.q8.includes("in my head")) {
    sevScore += 1;
    category = "System & Process Absence";
    symptoms.push("No written systems exist — all processes live in your head");
  } else if (answers.q8 && answers.q8.includes("never finished")) {
    symptoms.push("Processes have been started but never documented to completion");
  }

  const q9v = parseInt(answers.q9 || "3", 10);
  if (q9v <= 2) {
    sevScore += 1;
    symptoms.push("Low confidence that the team delivers consistent quality without you checking");
  }

  if (answers.q10 === "Almost daily") {
    sevScore += 2;
    symptoms.push("Client deliverables fall through or require rework almost every day");
  } else if (answers.q10 === "Once or twice a week") {
    sevScore += 1;
    symptoms.push("Rework and missed deliverables occur weekly");
  }

  if (answers.q12 === "More than 10 hours") {
    sevScore += 1;
    symptoms.push("More than 10 hours per week lost to manual admin and repetitive tasks");
  }
  if (answers.q13 === "More than 60 hours") {
    sevScore += 1;
    symptoms.push("You are working more than 60 hours per week — unsustainable and limiting scale");
  }

  sevScore = Math.min(10, Math.max(1, sevScore));

  let severityLabel: string;
  let severityWidth: string;
  let severityClass: "pill-h" | "pill-m" | "pill-l";
  let severityGradient: string;
  if (sevScore >= 8) {
    severityLabel = "Critical";
    severityWidth = "95%";
    severityClass = "pill-h";
    severityGradient = "linear-gradient(90deg,#287B84,#22B586)";
  } else if (sevScore >= 6) {
    severityLabel = "High";
    severityWidth = "75%";
    severityClass = "pill-h";
    severityGradient = "linear-gradient(90deg,#287B84,#22B586)";
  } else if (sevScore >= 4) {
    severityLabel = "Moderate";
    severityWidth = "50%";
    severityClass = "pill-m";
    severityGradient = "#287B84";
  } else {
    severityLabel = "Low";
    severityWidth = "25%";
    severityClass = "pill-l";
    severityGradient = "#287B84";
  }

  const copy = CATEGORY_COPY[category] ?? CATEGORY_COPY["Decision Dependency"];
  const toShow =
    symptoms.length > 0
      ? symptoms.slice(0, 5)
      : [
          "Owner is the primary decision-maker across all operational levels",
          "Team cannot move forward independently on key tasks",
          "Business performance is directly tied to owner availability",
        ];

  return {
    category,
    title: copy.title,
    summary: copy.summary,
    direction: copy.direction,
    symptoms: toShow,
    severityLabel,
    severityScore: sevScore,
    severityWidth,
    severityClass,
    severityGradient,
  };
}

const ANSWER_KEY_LABELS: Record<string, string> = {
  q1: "q1_years_in_business",
  q2: "q2_team_size",
  q3: "q3_monthly_revenue",
  q4: "q4_owner_only_hours",
  q5: "q5_business_without_owner",
  q6: "q6_decisions_per_day",
  q7: "q7_team_brings_solutions",
  q8: "q8_sops",
  q9: "q9_team_quality_confidence",
  q10: "q10_deliverables_falling_through",
  q11: "q11_tech_comfort",
  q12: "q12_manual_hours_lost",
  q13: "q13_hours_worked_per_week",
  q14: "q14_when_to_start",
};

function labelledAnswers(answers: Answers): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, label] of Object.entries(ANSWER_KEY_LABELS)) {
    out[label] = answers[key] ?? "";
  }
  return out;
}

const OPTIONS = {
  q1: ["Less than 1 year", "1 – 3 years", "3 – 5 years", "5 – 10 years", "10+ years"],
  q2: ["Just me (solo)", "2 – 5 people", "6 – 15 people", "16 – 30 people", "30+ people"],
  q3: [
    "Under R25,000",
    "R25,000 – R75,000",
    "R75,000 – R200,000",
    "R200,000 – R500,000",
    "R500,000+",
    "Prefer not to say",
  ],
  q4: ["Less than 2 hours", "2 – 4 hours", "4 – 6 hours", "More than 6 hours"],
  q5: ["It runs smoothly without me", "It slows down but keeps going", "It nearly stops", "It completely stops"],
  q6: ["1 – 5", "5 – 15", "15 – 30", "30+"],
  q7: [
    "Always just problems — I solve everything",
    "Sometimes solutions, mostly problems",
    "Usually solutions with the problem",
    "Always solutions — they rarely need me",
  ],
  q8: [
    "Yes — documented and used regularly",
    "Partially — some things are written down",
    "No — everything is in my head",
    "I’ve started but never finished",
  ],
  q10: ["Rarely or never", "Once or twice a month", "Once or twice a week", "Almost daily"],
  q12: ["Less than 2 hours", "2 – 5 hours", "5 – 10 hours", "More than 10 hours"],
  q13: ["Less than 30 hours", "30 – 45 hours", "45 – 60 hours", "More than 60 hours"],
  q14: ["ASAP", "Within 30 days", "1 – 3 months"],
};

const WHATSAPP_NUMBER = "27829026145";

export default function GrowthSpurtAudit() {
  const [pane, setPane] = useState(0);
  const [sessionId] = useState(generateSessionId);
  const [lead, setLead] = useState<Lead>({ name: "", phone: "", email: "", business: "", website: "" });
  const [answers, setAnswers] = useState<Answers>({});
  const [report, setReport] = useState<ReportData | null>(null);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [contact, setContact] = useState({ name: "", business: "", phone: "", email: "", method: "WhatsApp" });
  const [confirmShown, setConfirmShown] = useState(false);

  const submit = trpc.growthSpurt.submit.useMutation();

  function go(n: number) {
    setPane(n);
    window.scrollTo(0, 0);
  }

  function selectAnswer(qid: string, value: string) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  function startAudit() {
    if (!lead.name.trim() || !lead.phone.trim() || !lead.email.trim() || !lead.business.trim()) {
      setLeadError("Please fill in your name, mobile number, email and business name to continue.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email.trim())) {
      setLeadError("Please check your email address.");
      return;
    }
    setLeadError(null);
    setContact({ name: lead.name, business: lead.business, phone: lead.phone, email: lead.email, method: "WhatsApp" });

    submit.mutate({
      sessionId,
      stage: "started",
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      businessName: lead.business,
      website: lead.website,
    });

    go(1);
  }

  function generateReport() {
    const result = scoreReport(answers);
    setReport(result);

    submit.mutate({
      sessionId,
      stage: "completed",
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      businessName: lead.business,
      website: lead.website,
      category: result.category,
      severity: result.severityLabel,
      severityScore: result.severityScore,
      symptoms: result.symptoms,
      answers: labelledAnswers(answers),
    });

    go(7);
  }

  function submitContact() {
    submit.mutate({
      sessionId,
      stage: "contact",
      name: contact.name || lead.name,
      phone: contact.phone || lead.phone,
      email: contact.email || lead.email,
      businessName: contact.business || lead.business,
      preferredContact: contact.method,
    });
    setConfirmShown(true);
  }

  const todayLabel = new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });

  const whatsappMessage = encodeURIComponent(
    `Hi Riana, I just completed the Keystone Bottleneck Audit (${report?.severityLabel ?? ""} severity — ${
      report?.category ?? ""
    }) and I'd like to apply for the Growth Spurt. My name is ${lead.name || "—"} from ${lead.business || "—"}.`
  );

  return (
    <div className="gsa-root">
      <style>{GSA_STYLES}</style>
      <div className="gsa-app">
        {/* ========== PANE 0: LEAD CAPTURE ========== */}
        <Pane active={pane === 0}>
          <Header title="Keystone Bottleneck Audit" sub="Keystone Business Group" />
          <div className="gsa-screen-content">
            <div className="gsa-lead-hero">
              <div className="gsa-lead-icon">
                <KeystoneMark size={28} />
              </div>
              <div className="gsa-hero-lbl">Keystone Business Group</div>
              <div className="gsa-hero-t">
                <em>Bottleneck</em>
                <br />
                Audit
              </div>
              <div className="gsa-hero-d">Before we begin — let us know where to send your personalised report.</div>
            </div>
            <div className="gsa-lead-promise">
              <strong>8 minutes. 14 questions. One clear diagnosis.</strong>
              <br />
              Complete the audit and receive a free one-page report identifying the primary constraint holding your
              business back.
            </div>
            <Field label="Your Full Name *">
              <input
                type="text"
                placeholder="e.g. Thabo Dlamini"
                value={lead.name}
                onChange={(e) => setLead((l) => ({ ...l, name: e.target.value }))}
              />
            </Field>
            <Field label="Mobile Number *">
              <input
                type="tel"
                placeholder="+27 ..."
                value={lead.phone}
                onChange={(e) => setLead((l) => ({ ...l, phone: e.target.value }))}
              />
            </Field>
            <Field label="Email Address *">
              <input
                type="email"
                placeholder="your@email.com"
                value={lead.email}
                onChange={(e) => setLead((l) => ({ ...l, email: e.target.value }))}
              />
            </Field>
            <Field label="Business Name *">
              <input
                type="text"
                placeholder="e.g. Apex Solutions (Pty) Ltd"
                value={lead.business}
                onChange={(e) => setLead((l) => ({ ...l, business: e.target.value }))}
              />
            </Field>
            {/* Honeypot — real visitors never see or fill this in */}
            <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }} aria-hidden="true">
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={lead.website}
                onChange={(e) => setLead((l) => ({ ...l, website: e.target.value }))}
              />
            </div>
            {leadError && (
              <div style={{ padding: "0 20px 12px", fontSize: 12, color: "#E55A4E" }}>{leadError}</div>
            )}
            <div className="gsa-privacy-note">
              <span>🔒</span> Your details are used only to send your report and follow up. We do not share your
              information with third parties.
            </div>
          </div>
          <BottomBar>
            <button className="gsa-btn-p" onClick={startAudit}>
              Start My Audit →
            </button>
          </BottomBar>
        </Pane>

        {/* ========== PANE 1: WELCOME ========== */}
        <Pane active={pane === 1}>
          <Header title="Keystone Bottleneck Audit" sub="Keystone Business Group" />
          <div className="gsa-screen-content">
            <div className="gsa-hero">
              <div className="gsa-hero-icon">
                <KeystoneMark size={30} />
              </div>
              <div className="gsa-hero-lbl">Keystone Business Group</div>
              <div className="gsa-hero-t">
                <em>Bottleneck</em>
                <br />
                Audit
              </div>
              <div className="gsa-hero-d">
                Find the constraint holding your business back. Receive a personalised diagnostic report — free.
              </div>
            </div>
            <div className="gsa-stats-row">
              <div className="gsa-stat-box">
                <div className="gsa-stat-n">8</div>
                <div className="gsa-stat-l">Minutes</div>
              </div>
              <div className="gsa-stat-box">
                <div className="gsa-stat-n">14</div>
                <div className="gsa-stat-l">Questions</div>
              </div>
              <div className="gsa-stat-box">
                <div className="gsa-stat-n">Free</div>
                <div className="gsa-stat-l">Always</div>
              </div>
            </div>
            <div className="gsa-step-rows">
              <div className="gsa-step-r">
                <div className="gsa-step-d">1</div>
                <div className="gsa-step-t">
                  Complete the audit <span>— 3 pillars, 14 questions</span>
                </div>
              </div>
              <div className="gsa-step-r">
                <div className="gsa-step-d">2</div>
                <div className="gsa-step-t">
                  Receive your personalised one-page diagnosis <span>— instantly</span>
                </div>
              </div>
              <div className="gsa-step-r">
                <div className="gsa-step-d">3</div>
                <div className="gsa-step-t">Apply for the Growth Spurt or request immediate contact</div>
              </div>
            </div>
          </div>
          <BottomBar>
            <button className="gsa-btn-p" onClick={() => go(2)}>
              Start Audit →
            </button>
          </BottomBar>
        </Pane>

        {/* ========== PANE 2: BASICS ========== */}
        <Pane active={pane === 2}>
          <Header title="Keystone Bottleneck Audit" sub="Your Business" />
          <div className="gsa-screen-content">
            <Progress widthPct={7} label="Question 1 of 14" />
            <SecLabel>About You</SecLabel>
            <SecTitle>
              Let’s start with
              <br />
              the <em>basics</em>
            </SecTitle>
            <Question text="How long have you been in business?">
              <OptionGroup qid="q1" options={OPTIONS.q1} value={answers.q1} onSelect={selectAnswer} />
            </Question>
            <Question text="How many people are currently on your team?" spaced>
              <OptionGroup qid="q2" options={OPTIONS.q2} value={answers.q2} onSelect={selectAnswer} />
            </Question>
            <Question text="What is your current approximate monthly revenue?" spaced>
              <OptionGroup qid="q3" options={OPTIONS.q3} value={answers.q3} onSelect={selectAnswer} />
            </Question>
          </div>
          <BottomBar>
            <button className="gsa-btn-b" onClick={() => go(0)}>
              ←
            </button>
            <button className="gsa-btn-p" onClick={() => go(3)}>
              Next →
            </button>
          </BottomBar>
        </Pane>

        {/* ========== PANE 3: PILLAR 1 ========== */}
        <Pane active={pane === 3}>
          <Header title="Keystone Bottleneck Audit" sub="Pillar 1 — Bottleneck Audit" />
          <div className="gsa-screen-content">
            <Progress widthPct={28} label="Questions 4 – 7 of 14" />
            <SecLabel>Pillar 1</SecLabel>
            <SecTitle>
              <em>Bottleneck</em>
              <br />
              Audit
            </SecTitle>
            <Question text="On a typical workday, how many hours do you spend on tasks that only you can do?">
              <OptionGroup qid="q4" options={OPTIONS.q4} value={answers.q4} onSelect={selectAnswer} />
            </Question>
            <Question text="If you are unavailable for 3 days, what happens to the business?" spaced>
              <OptionGroup qid="q5" options={OPTIONS.q5} value={answers.q5} onSelect={selectAnswer} />
            </Question>
            <Question text="How many decisions do you personally make per day?" spaced>
              <OptionGroup qid="q6" options={OPTIONS.q6} value={answers.q6} onSelect={selectAnswer} />
            </Question>
            <Question text="Does your team currently present you with solutions, or just problems?" spaced>
              <OptionGroup qid="q7" options={OPTIONS.q7} value={answers.q7} onSelect={selectAnswer} />
            </Question>
          </div>
          <BottomBar>
            <button className="gsa-btn-b" onClick={() => go(2)}>
              ←
            </button>
            <button className="gsa-btn-p" onClick={() => go(4)}>
              Next →
            </button>
          </BottomBar>
        </Pane>

        {/* ========== PANE 4: PILLAR 2 ========== */}
        <Pane active={pane === 4}>
          <Header title="Keystone Bottleneck Audit" sub="Pillar 2 — Visibility & Accountability" />
          <div className="gsa-screen-content">
            <Progress widthPct={57} label="Questions 8 – 10 of 14" />
            <SecLabel>Pillar 2</SecLabel>
            <SecTitle>
              Visibility &amp;
              <br />
              <em>Accountability</em>
            </SecTitle>
            <Question text="Do you have written SOPs (Standard Operating Procedures) for your key tasks?">
              <OptionGroup qid="q8" options={OPTIONS.q8} value={answers.q8} onSelect={selectAnswer} />
            </Question>
            <Question
              text="How confident are you that your team delivers consistent, quality work without you checking?"
              spaced
            >
              <ScaleGroup qid="q9" value={answers.q9} onSelect={selectAnswer} />
              <div className="gsa-scale-labels">
                <span>Not at all confident</span>
                <span>Extremely confident</span>
              </div>
            </Question>
            <Question text="How often do client deliverables fall through the cracks or need to be redone?" spaced>
              <OptionGroup qid="q10" options={OPTIONS.q10} value={answers.q10} onSelect={selectAnswer} />
            </Question>
          </div>
          <BottomBar>
            <button className="gsa-btn-b" onClick={() => go(3)}>
              ←
            </button>
            <button className="gsa-btn-p" onClick={() => go(5)}>
              Next →
            </button>
          </BottomBar>
        </Pane>

        {/* ========== PANE 5: PILLAR 3 ========== */}
        <Pane active={pane === 5}>
          <Header title="Keystone Bottleneck Audit" sub="Pillar 3 — AI & Automation" />
          <div className="gsa-screen-content">
            <Progress widthPct={78} label="Questions 11 – 12 of 14" />
            <SecLabel>Pillar 3</SecLabel>
            <SecTitle>
              AI &amp; Automation
              <br />
              <em>Readiness</em>
            </SecTitle>
            <Question text="How comfortable are you with using technology and digital tools in your business?">
              <ScaleGroup qid="q11" value={answers.q11} onSelect={selectAnswer} />
              <div className="gsa-scale-labels">
                <span>Not comfortable</span>
                <span>Very comfortable</span>
              </div>
            </Question>
            <Question text="How many hours per week are lost to manual admin or repetitive tasks?" spaced>
              <OptionGroup qid="q12" options={OPTIONS.q12} value={answers.q12} onSelect={selectAnswer} />
            </Question>
          </div>
          <BottomBar>
            <button className="gsa-btn-b" onClick={() => go(4)}>
              ←
            </button>
            <button className="gsa-btn-p" onClick={() => go(6)}>
              Next →
            </button>
          </BottomBar>
        </Pane>

        {/* ========== PANE 6: GOALS ========== */}
        <Pane active={pane === 6}>
          <Header title="Keystone Bottleneck Audit" sub="Owner Energy & Goals" />
          <div className="gsa-screen-content">
            <Progress widthPct={90} label="Questions 13 – 14 of 14" />
            <SecLabel>Owner Energy &amp; Goals</SecLabel>
            <SecTitle>
              Almost
              <br />
              <em>done</em>
            </SecTitle>
            <Question text="How many hours per week do you currently work?">
              <OptionGroup qid="q13" options={OPTIONS.q13} value={answers.q13} onSelect={selectAnswer} />
            </Question>
            <Question text="When do you want to start making changes?" spaced>
              <OptionGroup qid="q14" options={OPTIONS.q14} value={answers.q14} onSelect={selectAnswer} />
            </Question>
          </div>
          <BottomBar>
            <button className="gsa-btn-b" onClick={() => go(5)}>
              ←
            </button>
            <button className="gsa-btn-p" onClick={generateReport}>
              Generate My Report →
            </button>
          </BottomBar>
        </Pane>

        {/* ========== PANE 7: REPORT ========== */}
        <Pane active={pane === 7}>
          <Header title="Your Bottleneck Report" sub={report ? todayLabel : "Keystone Assessment"} />
          <div className="gsa-screen-content">
            <div className="gsa-rep-badge">
              <div className="gsa-bdot" />
              <div className="gsa-btxt">
                {lead.name ? `Personalised diagnostic — ${lead.name}` : "AI-generated diagnostic — personalised to your answers"}
              </div>
            </div>
            <div className="gsa-sev-card">
              <div className="gsa-sev-top">
                <div className="gsa-sev-lbl">Constraint Severity</div>
                <div className={`gsa-sev-pill gsa-${report?.severityClass ?? "pill-m"}`}>
                  {report?.severityLabel ?? "—"}
                </div>
              </div>
              <div className="gsa-sev-track">
                <div
                  className="gsa-sev-fill"
                  style={{ width: report?.severityWidth ?? "0%", background: report?.severityGradient }}
                />
              </div>
            </div>
            <div className="gsa-rep-sec">
              <div className="gsa-rs-lbl">Primary Bottleneck Identified</div>
              <div className="gsa-rs-title">{report?.title ?? "—"}</div>
              <div className="gsa-rs-body">{report?.summary ?? "—"}</div>
            </div>
            <div className="gsa-rep-sec">
              <div className="gsa-rs-lbl">Observable Symptoms</div>
              <div className="gsa-sym-list">
                {report?.symptoms.map((s, i) => (
                  <div className="gsa-sym-i" key={i}>
                    <div className="gsa-sdot" />
                    {s}
                  </div>
                ))}
              </div>
            </div>
            <div className="gsa-rep-sec">
              <div className="gsa-rs-lbl">Recommended Strategic Direction</div>
              <div className="gsa-rs-body">{report?.direction ?? "—"}</div>
            </div>
            <div className="gsa-lock-card">
              <div className="gsa-rs-lbl">Full Implementation Roadmap</div>
              {[
                "Identify owner-only decisions by category",
                "Build decision rules & delegation authority matrix",
                "Document 5 core repeatable workflows",
                "Introduce lightweight visibility & accountability systems",
                "Remove manual approval bottlenecks from daily operations",
              ].map((t, i) => (
                <div className="gsa-lock-step" key={i}>
                  <div className="gsa-ls-n">{String(i + 1).padStart(2, "0")}</div>
                  <div className="gsa-ls-t">{t}</div>
                </div>
              ))}
              <div className="gsa-lock-ov">
                <div className="gsa-lock-ico">🔒</div>
                <div className="gsa-lock-note">
                  Full roadmap available to Growth Spurt clients.
                  <br />
                  Apply below to unlock.
                </div>
              </div>
            </div>
            <button className="gsa-print-btn gsa-no-print" onClick={() => window.print()}>
              ↓ Download / print my report
            </button>
            <div className="gsa-cta-block">
              <div className="gsa-cta-c gsa-gold">
                <div className="gsa-cta-lbl">Ready to implement?</div>
                <div className="gsa-cta-body">
                  Apply for the Keystone Business Group Growth Spurt to access the complete step-by-step
                  implementation roadmap.
                </div>
                <button
                  className="gsa-cta-btn"
                  onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`, "_blank")}
                >
                  Apply for the Growth Spurt
                </button>
              </div>
              <div className="gsa-cta-c">
                <div className="gsa-cta-lbl">Need to start now?</div>
                <div className="gsa-cta-body">Request immediate contact with a Keystone Business Group advisor.</div>
                <button className="gsa-cta-btn gsa-ghost" onClick={() => go(8)}>
                  Request Contact Now
                </button>
              </div>
            </div>
          </div>
        </Pane>

        {/* ========== PANE 8: CONTACT ========== */}
        <Pane active={pane === 8}>
          <Header title="Request Contact" sub="Immediate Assistance" />
          <div className="gsa-screen-content">
            <SecLabel style={{ paddingTop: 20 }}>Let’s Talk</SecLabel>
            <SecTitle>
              Request
              <br />
              <em>Contact</em>
            </SecTitle>
            <div className="gsa-sec-sub">A Keystone advisor will contact you within one business day.</div>
            <Field label="Full Name">
              <input
                type="text"
                placeholder="e.g. Thabo Dlamini"
                value={contact.name}
                onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
              />
            </Field>
            <Field label="Business Name">
              <input
                type="text"
                placeholder="e.g. Apex Solutions (Pty) Ltd"
                value={contact.business}
                onChange={(e) => setContact((c) => ({ ...c, business: e.target.value }))}
              />
            </Field>
            <Field label="Mobile Number">
              <input
                type="tel"
                placeholder="+27 ..."
                value={contact.phone}
                onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
              />
            </Field>
            <Field label="Email Address">
              <input
                type="email"
                placeholder="your@email.com"
                value={contact.email}
                onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
              />
            </Field>
            <Field label="Preferred Contact Method">
              <select value={contact.method} onChange={(e) => setContact((c) => ({ ...c, method: e.target.value }))}>
                <option>WhatsApp</option>
                <option>Phone Call</option>
                <option>Email</option>
                <option>Video Call</option>
              </select>
            </Field>
          </div>
          <BottomBar>
            <button className="gsa-btn-b" onClick={() => go(7)}>
              ←
            </button>
            <button className="gsa-btn-p" onClick={submitContact}>
              Submit Request →
            </button>
          </BottomBar>
        </Pane>
      </div>

      {confirmShown && (
        <div className="gsa-confirm-ov gsa-show">
          <div className="gsa-confirm-icon">✓</div>
          <div className="gsa-confirm-title">Request Received</div>
          <div className="gsa-confirm-body">
            Thank you. A Keystone Business Group team member will contact you within one business day.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Small presentational helpers ──────────────────────────────────────────

function KeystoneMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M14 2L26 8V20L14 26L2 20V8L14 2Z" stroke="#988758" strokeWidth="1.3" fill="none" />
      <path d="M14 9V14L18 18" stroke="#988758" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="14" cy="14" r="2.5" fill="#988758" />
    </svg>
  );
}

function Header({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="gsa-ph">
      <div className="gsa-plogo">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 1L19 6V14L10 19L1 14V6L10 1Z" stroke="#988758" strokeWidth="1.2" fill="none" />
          <circle cx="10" cy="10" r="2.5" fill="#988758" />
        </svg>
      </div>
      <div>
        <div className="gsa-pname">{title}</div>
        <div className="gsa-psub">{sub}</div>
      </div>
    </div>
  );
}

function Pane({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <div className={`gsa-pane${active ? " gsa-active" : ""}`}>{children}</div>;
}

function BottomBar({ children }: { children: React.ReactNode }) {
  return <div className="gsa-bot">{children}</div>;
}

function Progress({ widthPct, label }: { widthPct: number; label: string }) {
  return (
    <div className="gsa-prog-wrap">
      <div className="gsa-prog-track">
        <div className="gsa-prog-fill" style={{ width: `${widthPct}%` }} />
      </div>
      <div className="gsa-prog-label">{label}</div>
    </div>
  );
}

function SecLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="gsa-sec-label" style={style}>{children}</div>;
}

function SecTitle({ children }: { children: React.ReactNode }) {
  return <div className="gsa-sec-title">{children}</div>;
}

function Question({ text, spaced, children }: { text: string; spaced?: boolean; children: React.ReactNode }) {
  return (
    <>
      <div className={`gsa-q-text${spaced ? " gsa-q-spacer" : ""}`}>{text}</div>
      {children}
    </>
  );
}

function OptionGroup({
  qid,
  options,
  value,
  onSelect,
}: {
  qid: string;
  options: string[];
  value: string | undefined;
  onSelect: (qid: string, value: string) => void;
}) {
  return (
    <div className="gsa-opts">
      {options.map((opt) => (
        <button
          key={opt}
          className={`gsa-opt${value === opt ? " gsa-sel" : ""}`}
          onClick={() => onSelect(qid, opt)}
          type="button"
        >
          <div className="gsa-opt-radio">
            <div className="gsa-opt-radio-dot" />
          </div>
          {opt}
        </button>
      ))}
    </div>
  );
}

function ScaleGroup({
  qid,
  value,
  onSelect,
}: {
  qid: string;
  value: string | undefined;
  onSelect: (qid: string, value: string) => void;
}) {
  return (
    <div className="gsa-scale-row">
      {["1", "2", "3", "4", "5"].map((n) => (
        <button
          key={n}
          className={`gsa-scale-btn${value === n ? " gsa-sel" : ""}`}
          onClick={() => onSelect(qid, n)}
          type="button"
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="gsa-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

// ─── Scoped styles (ported 1:1 from the standalone HTML, prefixed `gsa-`) ──

const GSA_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

.gsa-root {
  --g: #988758; --gl: rgba(152,135,88,0.18); --gd: rgba(152,135,88,0.08);
  --dk: #031D32; --ch: #052d4e; --md: #073d60; --bd: rgba(40,123,132,0.25);
  --bg: rgba(152,135,88,0.25); --tx: #F0EDE8; --mt: #7BAAB0; --sc: #22B586; --rd: #E55A4E;
  background: #020f1a;
  font-family: 'DM Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
  display: flex; align-items: flex-start; justify-content: center;
}
.gsa-root * { box-sizing: border-box; }
.gsa-app { width: 100%; max-width: 430px; min-height: 100vh; background: var(--dk); display: flex; flex-direction: column; position: relative; }
.gsa-ph { padding: 52px 20px 12px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--bd); flex-shrink: 0; background: var(--dk); position: sticky; top: 0; z-index: 10; }
.gsa-plogo { width: 34px; height: 34px; border: 1.5px solid var(--g); border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.gsa-pname { font-size: 10px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--g); }
.gsa-psub { font-size: 9px; color: var(--mt); margin-top: 2px; }
.gsa-prog-wrap { padding: 16px 20px 0; }
.gsa-prog-track { height: 2px; background: var(--md); border-radius: 99px; overflow: hidden; }
.gsa-prog-fill { height: 100%; background: var(--g); border-radius: 99px; transition: width 0.4s ease; }
.gsa-prog-label { font-size: 10px; color: var(--mt); margin-top: 6px; letter-spacing: 0.04em; }
.gsa-screen-content { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding-bottom: 100px; }
.gsa-sec-label { font-size: 9px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: var(--g); padding: 20px 20px 6px; }
.gsa-sec-title { font-family: 'Cormorant Garamond', serif; font-size: 30px; font-weight: 300; color: var(--tx); padding: 0 20px 6px; line-height: 1.2; }
.gsa-sec-title em { font-style: italic; color: var(--g); }
.gsa-sec-sub { font-size: 12px; color: var(--mt); padding: 0 20px 20px; line-height: 1.7; }
.gsa-q-text { font-size: 15px; font-weight: 500; color: var(--tx); padding: 20px 20px 12px; line-height: 1.55; }
.gsa-q-spacer { padding-top: 8px; }
.gsa-opts { display: flex; flex-direction: column; gap: 8px; padding: 0 20px; }
.gsa-opt { background: var(--ch); border: 1.5px solid var(--bd); border-radius: 12px; padding: 14px 16px; font-size: 14px; color: var(--mt); cursor: pointer; text-align: left; display: flex; align-items: center; gap: 12px; transition: all 0.15s; width: 100%; font-family: 'DM Sans', sans-serif; -webkit-tap-highlight-color: transparent; }
.gsa-opt:active { transform: scale(0.98); }
.gsa-opt.gsa-sel { border-color: var(--g); background: var(--gd); color: var(--tx); }
.gsa-opt-radio { width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid var(--mt); flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
.gsa-opt.gsa-sel .gsa-opt-radio { border-color: var(--g); background: var(--g); }
.gsa-opt-radio-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--dk); display: none; }
.gsa-opt.gsa-sel .gsa-opt-radio-dot { display: block; }
.gsa-scale-row { display: flex; gap: 8px; padding: 0 20px; }
.gsa-scale-btn { flex: 1; background: var(--ch); border: 1.5px solid var(--bd); border-radius: 10px; padding: 14px 4px; font-size: 16px; font-weight: 500; color: var(--mt); cursor: pointer; text-align: center; transition: all 0.15s; font-family: 'DM Sans', sans-serif; -webkit-tap-highlight-color: transparent; }
.gsa-scale-btn.gsa-sel { border-color: var(--g); background: var(--gd); color: var(--g); }
.gsa-scale-labels { display: flex; justify-content: space-between; padding: 6px 20px 0; font-size: 10px; color: var(--mt); }
.gsa-bot { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 430px; padding: 12px 20px 32px; background: linear-gradient(transparent, var(--dk) 35%); display: flex; gap: 10px; z-index: 20; }
.gsa-btn-p { flex: 1; background: #287B84; color: #031D32; border: none; border-radius: 14px; font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 600; padding: 16px; cursor: pointer; -webkit-tap-highlight-color: transparent; transition: opacity 0.15s; }
.gsa-btn-p:active { opacity: 0.85; }
.gsa-btn-b { background: transparent; color: #988758; border: 1.5px solid var(--bd); border-radius: 14px; font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 500; padding: 16px 20px; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.gsa-hero { padding: 32px 20px 20px; text-align: center; }
.gsa-hero-icon { width: 60px; height: 60px; margin: 0 auto 18px; border: 1.5px solid var(--g); border-radius: 16px; display: flex; align-items: center; justify-content: center; }
.gsa-hero-lbl { font-size: 9px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: var(--g); margin-bottom: 10px; text-align: center; }
.gsa-hero-t { font-family: 'Cormorant Garamond', serif; font-size: 38px; font-weight: 300; color: var(--tx); line-height: 1.15; margin-bottom: 14px; text-align: center; }
.gsa-hero-t em { font-style: italic; color: var(--g); }
.gsa-hero-d { font-size: 13px; color: var(--mt); line-height: 1.7; max-width: 280px; margin: 0 auto; text-align: center; }
.gsa-stats-row { display: flex; gap: 10px; padding: 20px 20px 0; }
.gsa-stat-box { flex: 1; background: var(--ch); border: 1px solid var(--bd); border-radius: 14px; padding: 14px 8px; text-align: center; }
.gsa-stat-n { font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 300; color: var(--g); }
.gsa-stat-l { font-size: 10px; color: var(--mt); margin-top: 3px; }
.gsa-step-rows { display: flex; flex-direction: column; gap: 8px; padding: 16px 20px 0; }
.gsa-step-r { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: var(--ch); border: 1px solid var(--bd); border-radius: 14px; }
.gsa-step-d { width: 30px; height: 30px; border-radius: 50%; border: 1.5px solid var(--g); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: var(--g); flex-shrink: 0; }
.gsa-step-t { font-size: 13px; color: var(--tx); line-height: 1.45; }
.gsa-step-t span { color: var(--mt); }
.gsa-rep-badge { margin: 16px 20px 0; padding: 10px 14px; background: rgba(34,181,134,0.1); border: 1px solid rgba(34,181,134,0.3); border-radius: 10px; display: flex; align-items: center; gap: 10px; }
.gsa-bdot { width: 8px; height: 8px; border-radius: 50%; background: var(--sc); flex-shrink: 0; animation: gsa-pulse 2s infinite; }
@keyframes gsa-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
.gsa-btxt { font-size: 11px; color: var(--sc); }
.gsa-sev-card { margin: 12px 20px 0; background: var(--ch); border: 1px solid var(--bd); border-radius: 14px; padding: 16px; }
.gsa-sev-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.gsa-sev-lbl { font-size: 9px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--mt); }
.gsa-sev-pill { font-size: 10px; font-weight: 600; padding: 4px 12px; border-radius: 20px; letter-spacing: 0.06em; text-transform: uppercase; }
.gsa-pill-h { background: rgba(229,90,78,0.14); color: var(--rd); }
.gsa-pill-m { background: rgba(201,168,76,0.15); color: #9A7A28; }
.gsa-pill-l { background: rgba(78,158,122,0.12); color: var(--sc); }
.gsa-sev-track { height: 3px; background: var(--md); border-radius: 99px; overflow: hidden; }
.gsa-sev-fill { height: 100%; border-radius: 99px; transition: width 0.8s ease; }
.gsa-rep-sec { margin: 12px 20px 0; background: var(--ch); border: 1px solid var(--bd); border-radius: 14px; padding: 16px; }
.gsa-rs-lbl { font-size: 9px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--g); margin-bottom: 8px; }
.gsa-rs-title { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 400; color: var(--tx); margin-bottom: 8px; line-height: 1.3; }
.gsa-rs-body { font-size: 12px; color: var(--mt); line-height: 1.75; }
.gsa-sym-list { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; }
.gsa-sym-i { display: flex; align-items: flex-start; gap: 10px; font-size: 12px; color: var(--mt); line-height: 1.55; }
.gsa-sdot { width: 5px; height: 5px; border-radius: 50%; background: var(--g); margin-top: 6px; flex-shrink: 0; }
.gsa-lock-card { margin: 12px 20px 0; background: var(--ch); border: 1px solid var(--bd); border-radius: 14px; padding: 16px; position: relative; overflow: hidden; }
.gsa-lock-step { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--bd); }
.gsa-lock-step:last-child { border-bottom: none; }
.gsa-ls-n { font-size: 10px; font-weight: 600; color: var(--g); min-width: 20px; }
.gsa-ls-t { font-size: 12px; color: var(--mt); }
.gsa-lock-ov { position: absolute; inset: 0; background: linear-gradient(transparent 10%, var(--ch) 60%); display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding: 16px; }
.gsa-lock-ico { width: 32px; height: 32px; border: 1.5px solid var(--g); border-radius: 9px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; font-size: 14px; }
.gsa-lock-note { font-size: 10px; color: var(--mt); text-align: center; line-height: 1.6; }
.gsa-cta-block { display: flex; flex-direction: column; gap: 10px; padding: 12px 20px 0; }
.gsa-cta-c { background: var(--ch); border: 1px solid var(--bd); border-radius: 14px; padding: 16px; }
.gsa-cta-c.gsa-gold { background: rgba(40,123,132,0.1); border-color: rgba(40,123,132,0.3); }
.gsa-cta-lbl { font-size: 9px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: var(--g); margin-bottom: 4px; }
.gsa-cta-body { font-size: 11px; color: var(--mt); line-height: 1.6; margin-bottom: 10px; }
.gsa-cta-btn { width: 100%; background: #22B586; color: #031D32; border: none; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; padding: 13px; cursor: pointer; }
.gsa-cta-btn.gsa-ghost { background: transparent; color: #22B586; border: 1.5px solid rgba(34,181,134,0.4); }
.gsa-field { margin: 0 20px 14px; }
.gsa-field label { display: block; font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--mt); margin-bottom: 6px; }
.gsa-field input, .gsa-field select { width: 100%; background: var(--ch); border: 1.5px solid var(--bd); border-radius: 12px; padding: 14px 16px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: var(--tx); outline: none; transition: border-color 0.15s; appearance: none; }
.gsa-field input::placeholder { color: rgba(138,136,128,0.45); }
.gsa-field input:focus, .gsa-field select:focus { border-color: var(--g); }
.gsa-pane { display: none; flex-direction: column; }
.gsa-pane.gsa-active { display: flex; }
.gsa-lead-hero { padding: 40px 20px 24px; text-align: center; }
.gsa-lead-icon { width: 56px; height: 56px; margin: 0 auto 16px; border: 1.5px solid var(--g); border-radius: 16px; display: flex; align-items: center; justify-content: center; }
.gsa-lead-promise { margin: 0 20px 20px; padding: 14px 16px; background: rgba(40,123,132,0.08); border: 1px solid rgba(40,123,132,0.3); border-radius: 12px; font-size: 12px; color: var(--mt); line-height: 1.7; text-align: center; }
.gsa-lead-promise strong { color: var(--tx); font-weight: 500; }
.gsa-privacy-note { padding: 0 20px; font-size: 10px; color: var(--mt); line-height: 1.6; text-align: center; }
.gsa-privacy-note span { color: #22B586; }
.gsa-confirm-ov { display: flex; position: fixed; inset: 0; z-index: 100; background: #031D32; flex-direction: column; align-items: center; justify-content: center; padding: 40px 32px; text-align: center; }
.gsa-confirm-icon { width: 56px; height: 56px; border: 1.5px solid var(--sc); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; font-size: 22px; color: var(--sc); }
.gsa-confirm-title { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 300; color: var(--tx); margin-bottom: 12px; }
.gsa-confirm-body { font-size: 13px; color: var(--mt); line-height: 1.7; }
.gsa-print-btn { width: calc(100% - 40px); margin: 12px 20px 0; background: transparent; color: #988758; border: 1.5px solid var(--bg); border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; padding: 12px; cursor: pointer; }
@media print {
  .gsa-root { background: #fff !important; }
  .gsa-app { max-width: none; background: #fff; }
  .gsa-pane { display: none !important; }
  .gsa-bot, .gsa-cta-block, .gsa-lock-card, .gsa-no-print, .gsa-confirm-ov { display: none !important; }
  .gsa-ph { position: static; background: #fff; }
  .gsa-sev-card, .gsa-rep-sec { background: #fff; border-color: #ccc; break-inside: avoid; }
  .gsa-rs-title, .gsa-pname { color: #031D32 !important; }
  .gsa-rs-body, .gsa-sym-i, .gsa-sev-lbl, .gsa-psub { color: #333 !important; }
  .gsa-sev-track { background: #eee; }
}
`;
