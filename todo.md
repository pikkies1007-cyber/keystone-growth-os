# Keystone Growth OS — Project TODO

## Phase 1: Foundation & Branding
- [x] Upload Keystone white logo to static assets and configure logo URL
- [x] Define brand colour palette (teal/navy/gold from logo) in index.css CSS variables
- [x] Set up Google Fonts (Inter + Sora heading font)
- [x] Configure client branding config layer (shared/brandConfig.ts)
- [x] Build AppLayout with Keystone branding, responsive sidebar, mobile nav

## Phase 2: Dashboard Shell
- [x] Home/Dashboard landing page with module cards and progress overview
- [x] Responsive sidebar navigation (desktop) + hamburger drawer (mobile/tablet)
- [x] Module status indicators (not started / in progress / complete)
- [x] Journey step cards with time estimates
- [x] Stats bar (10+ frameworks, 8 min audit time, 50+ SMEs, 3 growth pillars)

## Phase 3: Business Bottleneck Audit
- [x] Five-dimension scoring: Sales, Cash, Staff, Systems, Owner Behaviour
- [x] Interactive question flow with progress indicator
- [x] Score calculation and bottleneck ranking logic
- [x] Money-friction signal detection (flags Cash + Owner Behaviour scores)
- [x] Results page with personalised bottleneck summary
- [x] Trigger Money Identity Checkpoint when money-friction signals detected

## Phase 4: Freedom Design Blueprint
- [x] Guided multi-step module: Owner Behaviour, Pressure Points, Goals, Growth Vision
- [x] Money-friction signal detection within responses
- [x] Results summary page
- [x] Trigger Money Identity Checkpoint when money-friction detected

## Phase 5: Goal Dashboard
- [x] 90-day action focus generation from Audit + Blueprint outputs
- [x] Priority ranking of action items (High / Medium / Low)
- [x] Progress tracking (mark complete, in progress, pending)
- [x] Visual progress indicators per goal

## Phase 6: Money Identity Checkpoint
- [x] Four-archetype diagnostic: Hustler, Giver, Protector, Enjoyer
- [x] 16-question scoring (4 questions × 4 archetypes, 1–5 scale)
- [x] Early money memory + belief completion questions
- [x] Lead capture: name, email, WhatsApp
- [x] Archetype result page with description and next step
- [x] Contextual trigger only — no standalone navigation entry

## Phase 7: Wealth Reset Journey Invitation
- [x] Bridge page after Money Identity result
- [x] Voss tactical empathy copy (label emotions, mirror, calibrated questions)
- [x] Carnegie relationship-building language (genuine interest, affirmation, invitation)
- [x] Financial Wellness Programme presentation (R1,800 / 12-month roadmap)
- [x] CTA: "Explore My Money Identity" → LMS enrolment link
- [x] Link to: https://gentlewindcoaching.co.za/product/financial-wellness-programme-2-2-2/

## Phase 8: Secure Backend Lead Capture
- [x] Server-side lead capture tRPC procedure (leads.capture)
- [x] Owner notification on new lead submission (server-side notifyOwner)
- [x] Database table: leads (name, email, whatsapp, archetype, source, clientId, createdAt)
- [x] No sensitive credentials exposed in browser

## Phase 9: Client Branding Configuration Layer
- [x] shared/brandConfig.ts with BrandConfig interface
- [x] Keystone default config
- [x] Universal Paints config stub (ready but not active)
- [x] Config-driven logo, colours, app name, tagline, module wording

## Phase 10: Database Schema & Backend
- [x] Schema: users, leads, auditResults, goalItems tables
- [x] Migration applied via webdev_execute_sql
- [x] tRPC procedures: leads.capture, audit.save, goals.list, goals.create, goals.updateStatus
- [x] Vitest tests: 13 tests passing (auth, leads, audit, goals)

## Pending / Future

- [x] Wire frontend MoneyIdentityCheckpoint form to trpc.leads.capture mutation
- [x] Wire BottleneckAudit results save to trpc.audit.save mutation
- [x] Wire GoalDashboard to trpc.goals.list / create / updateStatus (create + toggle sync fully wired; dbId returned from backend and stored on goal objects)
- [ ] Universal Paints client branding configuration (theme + copy swap)
- [x] Admin leads view (protected route for owner to see captured leads)
- [ ] Server-side email delivery (Resend or SendGrid)
- [ ] WhatsApp follow-up automation (server-side webhook)
- [ ] 12-month financial roadmap module
- [ ] Progress persistence across sessions (link session to user account)

## Phase 11: Academy LMS Webhook Integration
- [x] Build POST /api/lms-enrolment webhook receiver endpoint in Express
- [x] Parse Academy LMS New Enroll payload (student name, email, course)
- [x] Owner notification with full user context (name, email, WhatsApp, archetype, bottleneck) — email forwarding via owner notification
- [x] Store enrolment record in database (lmsEnrolments table)

## Phase 12: Archetype + Bottleneck Persistence
- [x] useOSSession hook centralises all session state (archetype, bottleneck, blueprint)
- [x] Show archetype badge on Dashboard once checkpoint is complete
- [x] MoneyIdentityCheckpoint no-repeat check (shows existing result, offers retake)
- [x] Personalise Goal Dashboard suggested goals by archetype (archetypeGoalPriority)
- [x] GoalDashboard archetype personalisation banner

## Phase 13: Voss-Style Language Layer
- [x] Bottleneck Audit results: calibrated question copy (no labelling phrases)
- [x] WealthResetJourney: calibrated question copy across all three copy blocks
- [x] brandConfig triggerMessage updated with calibrated question language
- [x] brandConfig CTA labels updated (no 'it sounds like' or 'it seems like')

## Phase 14: Bottleneck Audit Monthly Cadence
- [x] completedAt timestamp stored on audit result
- [x] Last audit date shown in results header
- [x] 30-day re-audit nudge with calibrated question copy and Re-audit button
- [x] daysSinceAudit and reAuditDue computed in useOSSession

## Phase 15: Natural Money Identity Entry Points
- [x] Goal Dashboard: quiet "money identity" card at bottom (only shown if archetype not yet completed)
- [x] Freedom Blueprint results: single reflective line linking to Money Identity (only shown if archetype not yet completed)

## Phase 16: 10-80-10 Delegation Toolkit
- [x] DelegationToolkit.tsx — 5-step interactive framework (Assess, Learn, Build Brief, Handover Checklist, Commit)
- [x] Delegation assessment: 4 questions to identify delegation readiness and gaps
- [x] 10-80-10 zone cards (visual framework explanation)
- [x] Handover brief builder (task name, context, success criteria, deadline, check-in)
- [x] Handover checklist (7 items, interactive tick-off)
- [x] Commitment box with first delegation project
- [x] Sidebar navigation entry (Users icon, Step 4)
- [x] Bottleneck Audit contextual trigger (Owner Behaviour or Staff as primary bottleneck)

## Phase 17: Flywheel Principle Toolkit
- [x] FlywheelToolkit.tsx — 4-stage flywheel (Reviews → Referrals → Repeat → Momentum)
- [x] Industry selector: Retail, Trade, Professional Services, Food & Hospitality, Health & Wellness, Admin/Office Services, Social Media/Creative
- [x] 30-day reactivation plan generator (industry-specific)
- [x] WhatsApp reactivation message template (industry-specific)
- [x] Google review request template (industry-specific)
- [x] Referral ask template (industry-specific)
- [x] Progress tracker (reviews received, referrals generated, reactivations made)
- [x] Sidebar navigation entry (RefreshCw icon, Step 5)
- [x] Bottleneck Audit contextual trigger (Cash Flow as primary bottleneck)

## Phase 18: Active Coach Dashboard
- [x] useCoachSession hook: tracks firstLoginToday, daysSinceStart, weekCycle (7/14/21...), monthCycle (30/60...)
- [x] Daily check-in message templates (Voss-style, context-aware by bottleneck + archetype + day number)
- [x] 7-day deeper check-in prompt (weekly progress review with calibrated questions)
- [x] 30-day celebration prompt (wins review, goal completion count, encouragement)
- [x] Bottleneck spotlight card on Dashboard (persistent, shows top 2 bottlenecks, date identified, day counter, links to Goal Dashboard)
- [x] Daily check-in banner (first login of day only, dismissible, context-aware message)
- [x] Weekly deep-dive banner (appears on 7/14/21/28-day marks, deeper calibrated question)
- [x] 30-day celebration banner (appears on 30/60/90-day marks, archetype-aware celebration copy)

## Phase 19: Business Snapshot
- [x] BusinessSnapshot.tsx — 3-minute guided profile (6 questions: business name, revenue range, staff count, primary revenue stream, biggest time drain, one thing to change)
- [x] Snapshot result stored in sessionStorage (snapshotResult)
- [x] Sidebar navigation entry (Building2 icon)

## Phase 20: Pricing Confidence Toolkit
- [x] PricingToolkit.tsx — 5-question diagnostic (monthly revenue, monthly costs, average sale value, hours per month, desired take-home)
- [x] Break-even calculation (costs ÷ average sale = minimum sales needed)
- [x] Profit margin calculation ((revenue - costs) / revenue × 100)
- [x] Hourly rate reality check (revenue ÷ hours = effective hourly rate)
- [x] Personalised result: Undercharging / Break-even / Healthy margin
- [x] Actionable recommendations based on result (3 specific steps)
- [x] Sidebar navigation entry (TrendingUp icon)

## Phase 21: Weekly Rhythm Planner
- [x] WeeklyRhythm.tsx — 5-block weekly template (Monday: Plan, Tue-Thu: Execute, Friday: Review)
- [x] Monday planning block: set 3 weekly priorities
- [x] Execution blocks (Tue/Wed/Thu): daily focus + task list with checkboxes
- [x] Friday review block: wins, stuck points, next week priority
- [x] Week progress tracker (% tasks completed)
- [x] Weekly rhythm stored in sessionStorage per week (weekPlan_{weekKey})
- [x] Sidebar navigation entry (CalendarDays icon)

## Phase 22: 12-Month Financial Roadmap
- [x] FinancialRoadmap.tsx — adapted from FWP Day 20 HTML for business context
- [x] Three milestone sections (Months 1-3: Stabilise, 4-8: Build Momentum, 9-12: Measure & Recommit)
- [x] Interactive personal commitment fields (user fills in their specific targets per milestone)
- [x] Three Non-Negotiables section (user names their own)
- [x] Protection System: Red Flags + The Return cards
- [x] 4-step Rescue Plan
- [x] Accountability partner section
- [x] Archetype-aware copy (adapts language based on money identity)
- [x] Results stored in sessionStorage (roadmapCommitments)
- [x] Sidebar navigation entry (Map icon)
- [x] Dashboard module card showing roadmap status

## Phase 23: Dashboard Roadmap Status Card + Flow Audit
- [x] Add 12-Month Roadmap module card to Dashboard journey grid (shows completion status from sessionStorage)
- [x] Add Business Snapshot module card to Dashboard journey grid
- [x] Update Journey Map in Dashboard to include all 7 steps (including new modules)
- [x] Audit full OS user journey for logical flow and coherence
- [x] Fix double-wrapping bug: BusinessSnapshot, PricingToolkit, WeeklyRhythm were each wrapping themselves in AppLayout internally while App.tsx already wraps all routes — removed inner wrappers from all three pages

## Phase 24: Two-Tier Progressive Unlock System
- [x] Add unlock logic helpers to useOSSession: isWealthResetComplete, hasCashBottleneck, isPricingUnlocked, isWeeklyRhythmUnlocked, isRoadmapUnlocked
- [x] Move Business Snapshot to top of AppLayout sidebar (above Bottleneck Audit)
- [x] Update AppLayout sidebar: Pricing Toolkit, Weekly Rhythm, 12-Month Roadmap show lock icon + greyed text + tooltip when locked
- [x] Update Dashboard module cards: locked tools show lock overlay with unlock condition text
- [x] Add locked gate screen to Pricing Toolkit page (redirects to Wealth Reset or shows unlock path)
- [x] Add locked gate screen to Weekly Rhythm page
- [x] Add locked gate screen to 12-Month Roadmap page
- [x] WealthResetJourney sets wealthResetComplete=true in sessionStorage on enrolment click

## Phase 25: Admin Leads View
- [x] Audit existing DB schema and router for lead/session data already stored
- [x] Extend keystoneSessions table (or create leads table) to capture: archetype, bottleneck, blueprint friction score, modules completed, last seen timestamp
- [x] tRPC adminProcedure: getLeads — returns all sessions with full profile data (owner-only)
- [x] AdminLeads.tsx page: filterable/sortable table with archetype badge, bottleneck tag, modules completed, last seen
- [x] Lead detail drawer: expands to show full session profile (scores, goals, blueprint answers)
- [x] Admin sidebar nav entry (ShieldCheck icon, visible only to owner role)
- [x] Protect /admin/leads route — redirect non-owners to dashboard
- [x] Mark backlog item "Admin leads view" as complete in Phase 1 backlog

## Phase 26: Server-Side Email Delivery
- [x] Integrate Resend for transactional email (free tier: 3,000 emails/month)
- [x] Create server/email.ts with three branded HTML email templates
- [x] Lead capture confirmation email: sent when user completes Money Identity Checkpoint (name, archetype result, next step CTA)
- [x] Wealth Reset enrolment email: sent when user clicks enrol CTA (welcome + what to expect + unlock message)
- [x] Owner notification email: sent to owner when a new lead is captured (name, email, archetype, bottleneck, admin link)
- [x] tRPC leads.capture wired: sends user confirmation + owner notification (fire-and-forget, non-blocking)
- [x] tRPC leads.sendWealthResetEmail procedure added and wired to WealthResetJourney enrolment CTA
- [x] leadProfile stored in sessionStorage after lead capture so Wealth Reset page can read name/email
- [x] Graceful error handling: email failure never blocks lead capture or enrolment flow
- [x] Vitest tests: 17/17 passing — API key validation + live sends to Resend test addresses
- [ ] Domain verification for keystonebusinessgroup.co.za (manual DNS step — see delivery notes)
