# KPI Implementation Guide for AILEAN Dashboard

## Overview

This document provides the complete implementation guide for all validated KPIs from the AILEAN KPI Inventory. It covers the Supabase production database (`acughkfcgirmckvsndoh`), table structures, exact SQL queries, state mappings, and open questions that need decisions before implementation.

**Rule: Always check azure tables first. Only fall back to tenant tables if azure doesn't have the data. No other tables.**

---

## Database Architecture

### Azure Table Hierarchy

```
azure_accommodations (brand/PM company)
  └── azure_real_estate_condominia (building: address, property_owner)
       └── azure_real_estate_properties (unit: apartment_number, floor, rooms, size, main_tenant)
            └── azure_real_estate_deficiencies (ticket: tenant info, state, timestamps, craftsman)
                 └── azure_real_estate_craftsmen (craftsman: email, company, trade)
```

### Key Join Pattern (Azure Chain)

```sql
FROM azure_real_estate_deficiencies ard
JOIN azure_real_estate_properties arp ON ard.real_estate_property_id = arp.id
JOIN azure_real_estate_condominia arc ON arp.real_estate_condominium_id = arc.id
JOIN azure_accommodations aa ON arc.accommodation_id = aa.id
WHERE aa.name ILIKE '%novac%'  -- or '%peter%' for peterhalter
```

### Tenant Tables (Fallback Only)

```
tenant_profiles (611 rows: phone_number PK, name, email, address, apartment, brand)
tenant_conversations (645 rows: conversation_id, phone_number, brand)
tenant_inquiries (645 rows: conversation_id, inquiry metadata)
tenant_inquiry_events (1,165 rows: per-event data, deficiency_state, timestamps)
tenant_inquiry_ai_analysis (1,284 rows: AI evaluation, sentiment, bug detection)
tenant_deficiencies (476 rows: synced deficiency snapshots)
```

### Two Brands

- **peterhalter (PH)**: Has owner data, missing tenant names on Azure units
- **novac (NOVAC)**: Has tenant names on units, missing owner data

---

## State Mappings (from Linear RE-462)

### Deficiency States (0-16)

| State | Internal Name | DB Label | Set By |
|-------|--------------|----------|--------|
| 0 | Reported | Created/Reported | Initial creation |
| 1 | NotStarted | Craftsman Assigned | 24h follow-up or tenant confirms contact |
| 2 | Scheduled | Appointment Scheduled | Tenant confirms fix date |
| 3 | Started | (unused) | — |
| 4 | **Completed** | Awaiting Response | Tenant says deficiencyFixed=true |
| 5 | Deleted | (unused) | — |
| 6 | RejectedEscalated | On Hold | Craftsman clicks rejection link |
| 7 | Accepted | Sent to Craftsman | Admin/manual action |
| 8 | AwaitingFeedback | Under Repair | (unused) |
| 9 | **WaitingForCraftsman** | Repair Completed | Craftsman reminded but no action |
| 10 | RejectedCompanyReminded | Invoice Submitted | Tenant says contacted after rejection |
| 11 | RejectedCompanyEscalated | Invoice Disputed | 2nd escalation after rejection |
| 12 | IgnoredEscalated | Cost Approved | Craftsman didn't respond → admin |
| 13 | **IgnoredCompanyReminded** | Tenant Confirmed | Admin reminded |
| 14 | IgnoredCompanyEscalated | Reopened | Final escalation to company boss |
| 15 | **CompletedWithTenantFollowUp** | Cancelled | Follow-up loop |
| 16 | CompletedWithCompanyHelp | — | Tenant confirms fix during follow-up |

**Terminal/completed states:** 4, 9, 13, 15
**1st escalation states:** 6, 9, 12
**2nd escalation states:** 11, 13, 14

### State Machine Flows

```
Happy path:     Reported → NotStarted → Scheduled → Completed
Ignored path:   Reported → NotStarted → WaitingForCraftsman → IgnoredEscalated → IgnoredCompanyReminded → IgnoredCompanyEscalated
Rejection path: Reported → RejectedEscalated → RejectedCompanyReminded → RejectedCompanyEscalated
```

### Deficiency Types (Bitmask)

| Bit | Value | Category |
|-----|-------|----------|
| 0 | 1 | Handyman |
| 1 | 2 | Plumber |
| 2 | 4 | Appliance |
| 3 | 8 | Flooring |
| 4 | 16 | Locksmith |
| 5 | 32 | Windows |
| 6 | 64 | Electrician |
| 7 | 128 | Painter |
| 8 | 256 | Pest |
| 9 | 512 | Garage |
| 10 | 1024 | Elevator |
| 11 | 2048 | HVAC |
| 12 | 4096 | Sewage |
| 13 | 8192 | Emergency |
| 14 | 16384 | WindowRollers |

### Conversation States

| State | Name | Meaning |
|-------|------|---------|
| 0 | AIEnabled | AI is active (default) |
| 1 | AIDisabled | Admin took over |
| 2 | Closed | Manually closed |
| 3 | DisableOnAiMessage | AI responds once more, then disables |

### Message Types

| Type | Name | Meaning |
|------|------|---------|
| 0 | Agent | Human admin message |
| 1 | ChatGpt | AI response |
| 2 | LeanAi | Legacy AI |
| 3 | User | Tenant message |
| 4 | Takeover | Admin takeover |
| 5 | FunctionResponse | AI function call |
| 6 | GuestImage | Tenant sent image |
| 7 | AgentImage | Admin sent image |
| 8 | ErrorMessage | Error occurred |
| 9 | OptInMessage | Tenant opted in |
| 10 | OptOutMessage | Tenant opted out |
| 11 | PaymentAcknowledgement | Payment confirmed |
| 12 | TemplateMessage | WhatsApp template |

---

## KPI Implementations

### SECTION 1: PROPERTY & TENANT DATA (KPIs #1-#17)

#### KPI #1 — Owner
**Verdict:** PARTIAL
**Source:** `azure_real_estate_condominia.property_owner`
**Query:**
```sql
SELECT property_owner, COUNT(*) as buildings
FROM azure_real_estate_condominia
GROUP BY property_owner;
```
**Gap:** NOVAC has no owner data (all NULL). PH has owner filled.

#### KPI #2 — Fund
**Verdict:** PASS
**Source:** Not in DB. No fund/investment data tracked.

#### KPI #3 — PM Firm
**Verdict:** PASS
**Source:** `azure_accommodations.name` = brand = PM firm
**Query:**
```sql
SELECT name, id FROM azure_accommodations;
```

#### KPI #4 — Property Address
**Verdict:** PASS
**Source:** `azure_real_estate_condominia.address`
**Query:**
```sql
SELECT address, city, zip FROM azure_real_estate_condominia;
```

#### KPI #5 — Unit Details
**Verdict:** PARTIAL
**Source:** `azure_real_estate_properties`
**Query:**
```sql
SELECT apartment_number, floor, rooms, size, build_year
FROM azure_real_estate_properties;
```
**Gap:** 204/384 units have apartment_number (53%). floor, rooms, size partially filled.

#### KPI #6 — Tenant Name
**Verdict:** PASS
**Source:** `azure_real_estate_deficiencies.tenant_name` (per deficiency) + `azure_real_estate_properties.main_tenant` (per unit)
**Query:**
```sql
SELECT tenant_name, COUNT(*) FROM azure_real_estate_deficiencies
WHERE tenant_name IS NOT NULL GROUP BY tenant_name;
```

#### KPI #7 — Tenant Email
**Verdict:** PASS
**Source:** `azure_real_estate_deficiencies.tenant_email`
**Query:**
```sql
SELECT tenant_email, COUNT(*) FROM azure_real_estate_deficiencies
WHERE tenant_email IS NOT NULL GROUP BY tenant_email;
```
**Question:** When should email be stored — at registration or first deficiency?

#### KPI #8 — Mobile Number
**Verdict:** PASS
**Source:** `azure_real_estate_deficiencies.tenant_phone_number`

#### KPI #9 — Birthdate
**Verdict:** PASS
**Source:** Not in DB. Collectable via WhatsApp conversation.

#### KPI #10 — Gender
**Verdict:** PASS
**Source:** Not in DB. Derivable from salutation (Herr/Frau). Only 6/611 (1%) have salutations — negligible.

#### KPI #11 — Consent
**Verdict:** PASS
**Source:** Not in DB. WhatsApp opt-in = implicit consent.

#### KPI #12 — Move-in Date
**Verdict:** PASS
**Source:** Not in DB.

#### KPI #13 — Type of Use
**Verdict:** PASS
**Source:** Not in DB. No residential/commercial distinction.

#### KPIs #14-17 — Data Matching (Consolidated)
**Verdict:** PARTIAL
**Source:** Azure table chain (see Database Architecture above)
**5 Key Gaps:**
1. NOVAC: no property_owner
2. PH: no main_tenant on units
3. Only 53% of units have apartment_number
4. tenant_profiles.accommodation_id links to brand level (2 values), NOT unit level
5. No direct tenant → unit FK

**Suggested DB Fix:** Replace `tenant_profiles.accommodation_id` with `tenant_profiles.property_id` FK → `azure_real_estate_properties.id`

---

### SECTION 2: DEFICIENCY ANALYSIS (KPIs #18-#20)

#### KPI #18 — Deficiencies per Category
**Verdict:** PASS
**Source:** `azure_real_estate_deficiencies.deficiency_types` (bitmask)
**Query:**
```sql
SELECT deficiency_types, COUNT(*) as cnt
FROM azure_real_estate_deficiencies ard
JOIN azure_real_estate_properties arp ON ard.real_estate_property_id = arp.id
JOIN azure_real_estate_condominia arc ON arp.real_estate_condominium_id = arc.id
JOIN azure_accommodations aa ON arc.accommodation_id = aa.id
WHERE aa.name ILIKE '%novac%'
AND ard.time_added BETWEEN :start AND :end
GROUP BY deficiency_types
ORDER BY cnt DESC;
```
**Decode bitmask:** Use bitwise AND to check each category: `WHERE deficiency_types & 2 > 0` = Plumber
**Question:** Deficiency reports only, or all events? If all events, need AI layer.

#### KPI #19 — Subcategory
**Verdict:** PASS
**Source:** Only deficiency_types (categories), no granular subcategories.
**Question:** Why would we need a subcategory?

#### KPI #20 — % Solved with AILEAN
**Verdict:** PASS
**Source:** `azure_real_estate_deficiencies.deficiency_state` (terminal states) + ConversationState
**Query:**
```sql
-- Option A: Any terminal state
SELECT
  COUNT(*) FILTER (WHERE deficiency_state IN (4, 9, 13)) as solved,
  COUNT(*) as total,
  ROUND(COUNT(*) FILTER (WHERE deficiency_state IN (4, 9, 13))::numeric / COUNT(*) * 100, 1) as pct
FROM azure_real_estate_deficiencies ard
JOIN azure_real_estate_properties arp ON ard.real_estate_property_id = arp.id
JOIN azure_real_estate_condominia arc ON arp.real_estate_condominium_id = arc.id
JOIN azure_accommodations aa ON arc.accommodation_id = aa.id
WHERE aa.name ILIKE :brand
AND ard.time_added BETWEEN :start AND :end;
```
**Calculation Options:**
- **A)** Terminal state reached (4, 9, 13) = solved → ~25%
- **B)** Terminal state + ConversationState=0 (AI still enabled) = solved by AI
- **C)** has_deficiency_report=true in tenant_inquiry_events = ticket created
- **D)** Conversation completed without admin takeover

**Open Question:** In what phase does it still count as "solved with AILEAN"?
**Question:** Deficiency reports only, or all events?

---

### SECTION 3: TIME PERIODS (KPIs #21-24, Consolidated)

#### KPIs #21-24 — Time Period Analysis
**Verdict:** PASS
**Source:** `azure_real_estate_deficiencies.time_added`
**Queries:**
```sql
-- KPI #21: Per month
SELECT DATE_TRUNC('month', time_added) as month, COUNT(*)
FROM azure_real_estate_deficiencies ard JOIN ... WHERE ...
GROUP BY month ORDER BY month;

-- KPI #22: Per quarter
SELECT DATE_TRUNC('quarter', time_added) as quarter, COUNT(*)
FROM azure_real_estate_deficiencies ard JOIN ... WHERE ...
GROUP BY quarter ORDER BY quarter;

-- KPI #23: Per year
SELECT DATE_TRUNC('year', time_added) as year, COUNT(*)
FROM azure_real_estate_deficiencies ard JOIN ... WHERE ...
GROUP BY year ORDER BY year;

-- KPI #24: Custom date range
SELECT COUNT(*)
FROM azure_real_estate_deficiencies ard JOIN ... WHERE ...
AND time_added BETWEEN :start AND :end;
```
**Period comparison:** Run same query for current and previous period, calculate absolute change + % change.

---

### SECTION 4: REPORTING DIMENSIONS (KPIs #25-30)

#### KPI #25 — Reports per Owner
**Verdict:** PARTIAL
**Source:** `azure_real_estate_condominia.property_owner`
**Query:**
```sql
SELECT arc.property_owner, COUNT(*) as deficiency_count
FROM azure_real_estate_deficiencies ard
JOIN azure_real_estate_properties arp ON ard.real_estate_property_id = arp.id
JOIN azure_real_estate_condominia arc ON arp.real_estate_condominium_id = arc.id
GROUP BY arc.property_owner ORDER BY deficiency_count DESC;
```
**Gap:** NOVAC has no owner data.
**Question:** Deficiency reports only, or all events?

#### KPI #26 — Reports per Portfolio
**Verdict:** PASS
**Source:** `azure_accommodations.name` = portfolio = brand
**Query:**
```sql
SELECT aa.name as portfolio, COUNT(*) as deficiency_count
FROM azure_real_estate_deficiencies ard
JOIN azure_real_estate_properties arp ON ard.real_estate_property_id = arp.id
JOIN azure_real_estate_condominia arc ON arp.real_estate_condominium_id = arc.id
JOIN azure_accommodations aa ON arc.accommodation_id = aa.id
GROUP BY aa.name;
```
**Question:** How is portfolio different from brand/owner?

#### KPI #27 — Reports per Property/Building
**Verdict:** PARTIAL
**Source:** `azure_real_estate_condominia.address`
**Query:**
```sql
SELECT arc.address as building, COUNT(*) as deficiency_count
FROM azure_real_estate_deficiencies ard
JOIN azure_real_estate_properties arp ON ard.real_estate_property_id = arp.id
JOIN azure_real_estate_condominia arc ON arp.real_estate_condominium_id = arc.id
JOIN azure_accommodations aa ON arc.accommodation_id = aa.id
WHERE aa.name ILIKE :brand
AND ard.time_added BETWEEN :start AND :end
GROUP BY arc.address ORDER BY deficiency_count DESC;
```
**Question:** Deficiency reports only, or all events?

#### KPI #28 — Reports per Unit
**Verdict:** PARTIAL
**Source:** `azure_real_estate_properties.apartment_number`
**Query:**
```sql
SELECT arc.address || ' / ' || arp.apartment_number as unit, COUNT(*)
FROM azure_real_estate_deficiencies ard
JOIN azure_real_estate_properties arp ON ard.real_estate_property_id = arp.id
JOIN azure_real_estate_condominia arc ON arp.real_estate_condominium_id = arc.id
WHERE arp.apartment_number IS NOT NULL
GROUP BY unit ORDER BY COUNT(*) DESC;
```
**Gap:** Only 53% of units have apartment_number.
**Question:** Can we go per tenant instead of per unit?
**Question:** Deficiency reports only, or all events?

#### KPI #29 — Reports per Postal Code
**Verdict:** PARTIAL
**Source:** Derived from `azure_real_estate_condominia.address` via regex
**Query:**
```sql
SELECT (REGEXP_MATCH(arc.address, '(\d{4})\s+\w'))[1] as postal_code, COUNT(*)
FROM azure_real_estate_deficiencies ard
JOIN azure_real_estate_properties arp ON ard.real_estate_property_id = arp.id
JOIN azure_real_estate_condominia arc ON arp.real_estate_condominium_id = arc.id
GROUP BY postal_code ORDER BY COUNT(*) DESC;
```
**Note:** Swiss 4-digit postal code format. Not done but easily doable.
**Question:** Deficiency reports only, or all events?

#### KPI #30 — Reports per Tenant
**Verdict:** PASS
**Source:** `azure_real_estate_deficiencies.tenant_phone_number`
**Query:**
```sql
SELECT tenant_phone_number, tenant_name, COUNT(*) as deficiency_count
FROM azure_real_estate_deficiencies ard
JOIN azure_real_estate_properties arp ON ard.real_estate_property_id = arp.id
JOIN azure_real_estate_condominia arc ON arp.real_estate_condominium_id = arc.id
JOIN azure_accommodations aa ON arc.accommodation_id = aa.id
WHERE aa.name ILIKE :brand
AND ard.time_added BETWEEN :start AND :end
GROUP BY tenant_phone_number, tenant_name ORDER BY deficiency_count DESC;
```

---

### SECTION 5: SENTIMENT ANALYSIS (KPIs #31-34)

#### KPIs #31-32 — Sentiment Analysis (Consolidated)
**Verdict:** PASS
**Source:** `tenant_inquiry_ai_analysis.tenant_sentiment` (fallback — not in azure)
**8 Sentiment Values:** neutral (851), negative (153), positive (95), frustrated (90), satisfied (41), mixed (38), confused (11), urgent (5)
**Query:**
```sql
SELECT tia.tenant_sentiment, COUNT(*)
FROM tenant_inquiry_ai_analysis tia
JOIN tenant_inquiry_events tie ON tia.conversation_id = tie.conversation_id
  AND tia.inquiry_sequence = tie.inquiry_sequence
WHERE tie.brand = :brand
AND tie.started_at BETWEEN :start AND :end
GROUP BY tia.tenant_sentiment ORDER BY COUNT(*) DESC;
```
**Note:** Finer grain analysis with AI evaluation of all 8 categories.

#### KPI #33 — Positive → Negative Arc
**Verdict:** PASS
**Source:** Possible but needs setup and testing. Requires per-MESSAGE sentiment or start_sentiment + end_sentiment tracking.

#### KPI #34 — Negative → Positive Arc
**Verdict:** PASS
**Source:** Same as #33. Shows AILEAN's ability to turn frustrated tenants around.

---

### SECTION 6: DEFICIENCY LIFECYCLE (KPI #35)

#### KPI #35 — Deficiency Closing Time
**Verdict:** PASS
**Source:** `azure_real_estate_deficiencies` — `time_added`, `next_follow_up`, `deficiency_state`
**Query:**
```sql
SELECT deficiency_state,
  COUNT(*) as cnt,
  ROUND(AVG(EXTRACT(EPOCH FROM (next_follow_up - time_added)) / 86400.0)::numeric, 1) as avg_days,
  ROUND(MIN(EXTRACT(EPOCH FROM (next_follow_up - time_added)) / 86400.0)::numeric, 1) as min_days,
  ROUND(MAX(EXTRACT(EPOCH FROM (next_follow_up - time_added)) / 86400.0)::numeric, 1) as max_days
FROM azure_real_estate_deficiencies ard
JOIN azure_real_estate_properties arp ON ard.real_estate_property_id = arp.id
JOIN azure_real_estate_condominia arc ON arp.real_estate_condominium_id = arc.id
JOIN azure_accommodations aa ON arc.accommodation_id = aa.id
WHERE aa.name ILIKE :brand
AND deficiency_state IN (4, 9, 13, 15)
AND next_follow_up > '2000-01-01'
AND time_added BETWEEN :start AND :end
GROUP BY deficiency_state;
```
**Closing time = `next_follow_up - time_added`** for terminal states 9, 13, 15.
State 4 (Completed): tenant confirmed fix → no further follow-up, `next_follow_up` reset to 0001-01-01 is correct.

**Averages:**
- State 9 (Repair Completed): avg 5.6 days
- State 13 (Tenant Confirmed): avg 4.0 days
- State 15 (Cancelled): avg 27.6 days

**Question:** Should cancelled (state 15) count toward closing time?
**Question:** Deficiency reports only, or all events?

---

### SECTION 7: USER STATISTICS (KPIs #36-39)

#### KPI #36 — Who Uses AILEAN Most
**Verdict:** PASS
**Source:** `azure_real_estate_deficiencies` grouped by `tenant_phone_number`
**Query:**
```sql
SELECT ard.tenant_phone_number, ard.tenant_name,
  COUNT(*) as deficiency_count,
  array_agg(DISTINCT ard.deficiency_types) as type_codes
FROM azure_real_estate_deficiencies ard
JOIN azure_real_estate_properties arp ON ard.real_estate_property_id = arp.id
JOIN azure_real_estate_condominia arc ON arp.real_estate_condominium_id = arc.id
JOIN azure_accommodations aa ON arc.accommodation_id = aa.id
WHERE aa.name ILIKE :brand
AND ard.time_added BETWEEN :start AND :end
GROUP BY ard.tenant_phone_number, ard.tenant_name
ORDER BY deficiency_count DESC;
```
**Example (PH, Jan 1-15 2026):** Clara Blum: 4 deficiencies (Handyman, Windows, Sewage). 29 deficiencies from 21 tenants total.
**Question:** Deficiency reports only, or all events? If all events, need separate algorithm and AI layer.

#### KPI #37 — Deficiencies per Demographics
**Verdict:** FAIL
**Source:** No demographic data (birthdate, gender, age) in azure or tenant tables. Only `identified_language` available.
**Blocked by:** KPIs #9 and #10 being implemented.
**Question:** Deficiency reports only, or all events?

#### KPI #38 — Rating of AILEAN by User
**Verdict:** FAIL
**Source:** No rating mechanism in azure or tenant tables.
**Counter-proposal:** AI scoring per event using existing data: sentiment + resolution speed + escalation depth + outcome = composite score 1-5. Part of the broader AI layer.
**Question:** Deficiency reports only, or all events?

#### KPI #39 — Feedback Collection
**Verdict:** FAIL
**Source:** No feedback mechanism. Depends on KPI #38.
**Counter-proposal:** AI extracts failure reasons from conversation for low-scored events. Root cause classification: chatbot issue vs PM issue vs craftsman issue.
**Question:** Deficiency reports only, or all events?

---

### SECTION 8: ANALYTICS DELIVERY (KPIs #40-41)

#### KPI #40 — Dashboard
**Verdict:** PASS
**Source:** All KPI data validated above feeds into dashboard. Implementation task.

#### KPI #41 — Mail Analytics
**Verdict:** PASS
**Source:** `azure_real_estate_deficiencies.deficiency_report` (JSON) + `azure_real_estate_craftsmen.email`
**Query:**
```sql
SELECT ard.id, ard.time_added, ard.deficiency_report,
  arc2.email as craftsman_email, arc2.company
FROM azure_real_estate_deficiencies ard
JOIN azure_real_estate_craftsmen arc2 ON ard.craftsman_id = arc2.id
WHERE ard.time_added BETWEEN :start AND :end;
```
**Stats:** 476 reports generated, 367 sent to 24 craftsmen.
**Question:** What should mail analytics measure? Volume, delivery tracking, content analysis, or all?
**Question:** Deficiency reports only, or all events?

---

## NOVAC Review KPIs (Brand-Filtered Views)

All NOVAC KPIs use the same azure queries as AILEAN, filtered by `aa.name ILIKE '%novac%'`.

| NOVAC # | Name | Maps to AILEAN KPI | Verdict |
|---------|------|--------------------|---------|
| 1 | Anzahl versendeter Tickets | #18 (category count) | PASS |
| 2 | 1x Eskalation | #35 (states 6, 9, 12) | PASS |
| 3 | 2x Eskalation Head of NOVAC | #35 (states 11, 13, 14) | PASS |
| 4 | Themenverteilung | #18 (deficiency_types bitmask) | PASS |
| 5 | Verteilung nach Liegenschaften | #27 (per building) | PASS |
| 6 | Durchschnittliche Bearbeitungszeit | #35 (closing time) | PASS |
| 7 | Bugs gemeldet | Tenant fallback: tenant_inquiry_ai_analysis.is_bug | PASS |
| 8 | Jotform weitergeleitet | azure_messages.content search | FAIL |
| 9 | Externe vs Head of NOVAC | #35 (state groupings 1st vs 2nd) | PASS |
| 10 | AILEAN Tickets vs Fälle gesamt | #20 + #36 | PASS |

### NOVAC-Specific Queries

**Escalation ratio (KPIs #2, #3, #9 combined):**
```sql
SELECT
  COUNT(*) FILTER (WHERE deficiency_state IN (6, 9, 12)) as first_level,
  COUNT(*) FILTER (WHERE deficiency_state IN (11, 13, 14)) as second_level,
  ROUND(
    COUNT(*) FILTER (WHERE deficiency_state IN (6, 9, 12))::numeric /
    NULLIF(COUNT(*) FILTER (WHERE deficiency_state IN (11, 13, 14)), 0), 2
  ) as ratio
FROM azure_real_estate_deficiencies ard
JOIN azure_real_estate_properties arp ON ard.real_estate_property_id = arp.id
JOIN azure_real_estate_condominia arc ON arp.real_estate_condominium_id = arc.id
JOIN azure_accommodations aa ON arc.accommodation_id = aa.id
WHERE aa.name ILIKE '%novac%'
AND ard.time_added BETWEEN :start AND :end;
```
**Current:** 29 first-level, 36 second-level. Ratio 0.8:1 (UNHEALTHY — should be reversed).

**Bug tracking (KPI #7):**
```sql
SELECT tia.bug_category, COUNT(*)
FROM tenant_inquiry_ai_analysis tia
JOIN tenant_inquiry_events tie
  ON tia.conversation_id = tie.conversation_id
  AND tia.inquiry_sequence = tie.inquiry_sequence
WHERE tie.brand = 'novac' AND tia.is_bug = true
GROUP BY tia.bug_category ORDER BY COUNT(*) DESC;
```
**Current:** Logic (273), Data Retrieval (52), Performance (11). 74% bug rate — needs investigation.

---

### Combined Totals (All 3 Tabs: 66 KPIs)

| Verdict | AILEAN (41) | NOVAC (10) | Additional (15) | **Total** |
|---------|-------------|------------|-----------------|-----------|
| **PASS** | 30 | 9 | 10 | **49** |
| **PARTIAL** | 5 | 0 | 1 | **6** |
| **FAIL** | 3 | 1 | 4 | **8** |

**Implementation readiness:** 49/66 KPIs (74%) are ready to implement with existing data. 6 KPIs (9%) have partial data. 8 KPIs (12%) require new infrastructure (AI classification layer, surveys, human review workflows).

**Critical dependency:** ADD-1 (Event Classification) is the blocker for ADD-2, ADD-3, and ADD-4. Once the AI classification layer is built and trained on the Miro mapping (14 types → 3 categories), these 3 KPIs unlock automatically.

---

## Open Questions Requiring Decisions

### Global Questions

1. **Deficiency reports only vs all events?** — Applies to KPIs #18, #20, #25, #27, #28, #29, #30, #35, #36, #37, #38, #39, #41. If all events, need separate algorithm and AI layer to classify non-deficiency interactions.

2. **AI Layer scope** — KPIs #33, #34, #38, #39, and NOVAC #8 all require an AI evaluation layer. Build once, apply everywhere.

### Per-KPI Questions

| KPI | Question |
|-----|----------|
| #7 | When should tenant email be stored? |
| #14-17 | Should we add `tenant_profiles.property_id` FK? |
| #19 | Why would we need a subcategory? |
| #20 | In what phase does it still count as "solved with AILEAN"? |
| #26 | How is portfolio different from brand/owner? |
| #28 | Can we go per tenant instead of per unit? |
| #35 | Should cancelled deficiencies (state 15) count toward closing time? |
| #35 | Should reopened deficiencies (state 14) reset the clock? |
| #38 | Build explicit tenant rating OR use AI scoring? |
| #40 | Build custom dashboard or use off-the-shelf BI tool? |
| #41 | What should mail analytics measure (volume, delivery, content, all)? |
| #41 | Monthly or weekly reports? PDF or inline HTML? |
| NOVAC #7 | Is 74% bug rate realistic or is AI classification too aggressive? |
| ADD-1 | Training data and validation for AI event classification (14 types → 3 categories)? |
| ADD-3 | Confirm cost per category: Major CHF 28.88, Minor CHF 20.63, QnA CHF 8.25? |
| ADD-4 | Confirm time per category: Major 35 min, Minor 25 min, QnA 10 min? |
| ADD-5 | Resolution Rate: which deficiency states count as "resolved"? (17 states listed in Excel, decision needed) |
| ADD-6 | SLA calculation: workdays only or calendar days? How to handle severity classification? |
| ADD-12 | Ping-pong thresholds: confirm Normal (0-3), Elevated (4-6), Concerning (7-10), Loop (>10)? |
| ADD-13 | Effort score weights: confirm Message 30%, Time 20%, Friction 25%, Resolution 25%? |
| ADD-13 | Should we add a post-conversation survey (thumbs up/down) to validate the proxy? |

---

## Verdict Summary

### AILEAN Requested KPIs (41 total)

| Verdict | Count | KPIs |
|---------|-------|------|
| **PASS** | 30 | #2, #3, #4, #6, #7, #8, #9, #10, #11, #12, #13, #16(18), #17(19), #18(20), #19(21-24), #21(26), #25(30), #26(31-32), #27(33), #28(34), #29(35), #30(36), #34(40), #35(41) |
| **PARTIAL** | 5 | #1, #5, #15(14-17), #20(25), #22-24(27-29) |
| **FAIL** | 3 | #31(37), #32(38), #33(39) |

### NOVAC Review KPIs (10 total)

| Verdict | Count | KPIs |
|---------|-------|------|
| **PASS** | 9 | #1, #2, #3, #4, #5, #6, #7, #9, #10 |
| **FAIL** | 1 | #8 |

---

### Additional KPIs (15 total)

| Verdict | Count | KPIs |
|---------|-------|------|
| **PASS** | 10 | ADD-5, ADD-6, ADD-8, ADD-9, ADD-10, ADD-11, ADD-12, ADD-15, ADD-17 |
| **PARTIAL** | 1 | ADD-13 |
| **FAIL** | 4 | ADD-1, ADD-2, ADD-3, ADD-7 |

---

## SECTION 9: ADDITIONAL KPIs (Validated from Excel Tabs + New Proposals)

These KPIs were identified from the original Excel tabs (KPI Inventory, AI Analysis KPIs, Potential New KPIs, Cost Settings, Bug Detection Logic) and validated against the production database. They focus on operational performance, AI quality, and client value metrics beyond deficiency tracking.

### Key Tables for Additional KPIs

```
tenant_inquiry_events (1,165 rows — primary source for most Additional KPIs)
  Columns: phone_number, conversation_id, brand, inquiry_sequence, inquiry_type, intent,
           started_at, ended_at, message_count, inbound_count, ai_count, ping_pong_count,
           image_count, deficiency_type, deficiency_confidence, deficiencies_created,
           has_deficiency_report, has_self_repair, has_deficiency_update, first_response_sec,
           duration_minutes, human_agent_count, tool_call_count, has_agent_takeover,
           avg_ai_response_sec, avg_tenant_response_sec, time_to_deficiency_report_sec,
           automation_rate, is_inside_hours, started_dow, started_hour_cet,
           deficiency_state, deficiency_total_cost, has_craftsman, deficiency_scheduled_date,
           bug_no_reply_count, bug_failed_report, deficiency_state_label, failed_report_reason,
           bug_false_success, event_outcome

tenant_inquiry_ai_analysis (1,284 rows — AI evaluation per event)
  Columns: conversation_id, is_bug, bug_category, bug_cluster_id, bug_cluster_label,
           tenant_sentiment, resolution_method, primary_inquiry_type, ...

azure_real_estate_company_configurations (SLA settings per brand)
  Columns: cosmetic_issue_response_time, partial_limitation_response_time,
           severe_deficiency_response_time, ...
```

### Edge Functions (Bug Detection Pipeline)

```
analyze-events-ai (v19): Uses Claude claude-sonnet-4-5-20250929 with extended thinking.
  - Calls get_event_deficiency_context RPC → cross-references azure deficiency records
  - Outputs to tenant_inquiry_ai_analysis with bug_flags detection
  - Analysis version 18, uses ai_learning_rules for continuous improvement
  - Audit trail via ai_analysis_audit_log

send-bug-alert (v5): Creates Linear issues for detected bugs.
  - Reads from bug_alerts table, fetches tenant_inquiry_events
  - 16 bug patterns: failed_report, false_success, no_response, loop_failed_report,
    escalation_failure, identity_verification, low_quality, loop_detected, misunderstood,
    report_no_craftsman, sla_breach, wrong_triage, conversation_abandoned,
    excessive_pingpong, slow_first_response, excessive_tool_calls
```

---

### ADD-1 — Event Classification & Workload Reduction
**Verdict:** FAIL
**Depends on:** AI layer for event classification (not yet built)
**Concept:** Classify all incoming events into 3 categories based on Miro mapping (14 input types → 3 output buckets):

**Major Deficiency (5 types):** Major Deficiency, Major Deficiency - DIY Fix, Major Self Inflicted, Emergency (PM contact sharing), Emergency (Custom Text)
**Minor Deficiency (3 types):** Minor Deficiency, Minor Self Inflicted, 14 Day Rule
**QnA (6 types):** Complaint/Feedback, Legal/Contractual, Financial, Unrelated, Other, Status Update

**Workload Reduction formula:**
```
Workload Reduction = (Major + Minor events + 14 Day Rule + Status Update events handled autonomously) / Total events
Exclusion: Events where a bug was detected are NOT counted as autonomous
```

**Current state:** `tenant_inquiries.primary_inquiry_type` has 17 different labels but uses different naming than the Miro mapping. Azure tables only track deficiencies, not event types. An AI classification layer needs to be trained on top of `azure_messages.content` to map conversations to the 14 input types.

**To build:**
1. Train AI classification model on existing conversations
2. Map to 14 input types → 3 output categories
3. Store classification results in new column or table
4. Calculate workload reduction excluding bugged events

---

### ADD-2 — Inquiries per Day (Inside vs Outside Hours)
**Verdict:** FAIL
**Depends on:** ADD-1 (event classification)
**Concept:** Daily inquiry volume split by inside business hours (Mon-Fri 8-17 CET) vs outside hours (17-8 + weekends).
**Current state:** `tenant_inquiry_events` has `is_inside_hours`, `started_dow`, `started_hour_cet` but these only exist AFTER the event classification from ADD-1 is properly set up. Current data shows ~51.5% outside hours for PH, ~41.6% for NOVAC.
**Query (once ADD-1 is built):**
```sql
SELECT DATE(started_at) as day,
  SUM(CASE WHEN is_inside_hours THEN 1 ELSE 0 END) as inside,
  SUM(CASE WHEN NOT is_inside_hours THEN 1 ELSE 0 END) as outside
FROM tenant_inquiry_events
WHERE brand = :brand AND started_at BETWEEN :start AND :end
GROUP BY DATE(started_at) ORDER BY day;
```

---

### ADD-3 — Cost Saved (CHF)
**Verdict:** FAIL
**Depends on:** ADD-1 (event classification) + cost settings per category
**Concept:** Calculate CHF saved by AILEAN handling events autonomously instead of human PM staff.
**Cost Settings (from Excel):**
- Major Deficiency: 35 min × CHF 49.50/hr = CHF 28.88 per event
- Minor Deficiency: 25 min × CHF 49.50/hr = CHF 20.63 per event
- QnA: 10 min × CHF 49.50/hr = CHF 8.25 per event

**Formula:**
```
Cost Saved = Σ (autonomous_events_per_category × cost_per_category)
           = (major_auto × 28.88) + (minor_auto × 20.63) + (qna_auto × 8.25)
```
**Note:** Prices for the 3 categories need to be confirmed. This is covered in the ROI page on the dashboard.

---

### ADD-4 — Time Saved (minutes)
**Verdict:** FAIL
**Depends on:** ADD-1 (event classification) + time settings per category
**Concept:** Calculate total minutes saved by autonomous handling.
**Time Settings (from Excel):**
- Major Deficiency: 35 min per event
- Minor Deficiency: 25 min per event
- QnA: 10 min per event

**Formula:**
```
Time Saved = Σ (autonomous_events_per_category × minutes_per_category)
           = (major_auto × 35) + (minor_auto × 25) + (qna_auto × 10)
```
**Note:** Time per category needs to be confirmed. Covered in ROI page on dashboard.

---

### ADD-5 — Avg Response Time
**Verdict:** PASS
**Source:** `azure_messages` (time_sent difference between tenant and AI messages)
**Query:**
```sql
WITH pairs AS (
  SELECT am1.time_sent as tenant_time, am2.time_sent as ai_time,
    EXTRACT(EPOCH FROM (am2.time_sent - am1.time_sent)) as response_sec
  FROM azure_messages am1
  JOIN azure_messages am2 ON am1.conversation_id = am2.conversation_id
    AND am2.message_type = 1 AND am2.time_sent > am1.time_sent
  JOIN azure_conversations ac ON ac.id = am1.conversation_id
  JOIN azure_accommodations aa ON aa.id = ac.accommodation_id
  WHERE am1.message_type = 3 AND aa.brand = :brand
    AND NOT EXISTS (
      SELECT 1 FROM azure_messages am3
      WHERE am3.conversation_id = am1.conversation_id
        AND am3.message_type = 1
        AND am3.time_sent > am1.time_sent AND am3.time_sent < am2.time_sent
    )
)
SELECT
  ROUND(AVG(response_sec)::numeric, 1) as avg_sec,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_sec) as median_sec,
  COUNT(*) as pairs
FROM pairs WHERE response_sec BETWEEN 0 AND 120;
```
**Current values:** Median ~9.5-10.8 seconds (filtered to <120s to exclude outliers from re-opened conversations).
**Also available:** `tenant_inquiry_events.first_response_sec` and `avg_ai_response_sec` for pre-calculated values.

---

### ADD-6 — SLA Compliance Rate (Deficiency Only)
**Verdict:** PASS
**Source:** `azure_real_estate_company_configurations` (SLA thresholds) + `azure_real_estate_deficiencies` (timestamps)
**SLA Configuration:**
```
Peter Halter:
  cosmetic_issue_response_time = WorkdaysWithin72Hours
  partial_limitation_response_time = WorkdaysWithin72Hours
  severe_deficiency_response_time = WorkdaysWithin72Hours

NOVAC:
  cosmetic_issue_response_time = WorkdaysWithin48Hours
  partial_limitation_response_time = WorkdaysWithin48Hours
  severe_deficiency_response_time = WorkdaysWithin8Hours
```
**Scope:** Deficiency reports ONLY (user confirmed).
**Query:**
```sql
SELECT arcc.*
FROM azure_real_estate_company_configurations arcc
JOIN azure_accommodations aa ON aa.id = arcc.accommodation_id
WHERE aa.brand = :brand;
```
**Calculation:** Compare `deficiency.time_added` → `deficiency.next_follow_up` against SLA threshold for deficiency severity. Severity derived from `deficiency_types` bitmask (bit 13 = Emergency = severe).

**Also stores:** unresponsive_craftsman_behavior, contract_awarding_options, emergency_handling_options, notification_options, routine_maintenance_assignment_policy, tenant_dispute_handling_strategy, tenant_fault_repair_assignment, unclear_tenant_dispute_strategy.

---

### ADD-7 — Routing Accuracy
**Verdict:** FAIL
**Source:** `tenant_inquiry_ai_analysis.ai_correct_triage` exists but is AI self-assessed (55/45 split — unreliable).
**Issue:** No human-validated ground truth for routing decisions. AI evaluating its own triage accuracy creates circular validation.
**To build:** Human review workflow where PM staff confirms/corrects AI triage decisions, stored as ground truth for accuracy measurement.

---

### ADD-8 — False Success Rate
**Verdict:** PASS
**Source:** `tenant_inquiry_events.bug_false_success` (populated by `analyze-events-ai` edge function v19)
**Query:**
```sql
SELECT brand,
  COUNT(*) as total,
  SUM(CASE WHEN bug_false_success THEN 1 ELSE 0 END) as false_success,
  ROUND(100.0 * SUM(CASE WHEN bug_false_success THEN 1 ELSE 0 END) / COUNT(*), 2) as pct
FROM tenant_inquiry_events
WHERE brand = :brand
GROUP BY brand;
```
**Current values:**
- Peter Halter: 46/703 = 6.54%
- NOVAC: 10/462 = 2.16%

**How it works:** The `analyze-events-ai` edge function calls `get_event_deficiency_context` RPC which pulls azure deficiency records and cross-references them with conversation outcomes. When AI reported success but no actual deficiency was created/resolved in azure, it flags `bug_false_success = true`. The `send-bug-alert` function then creates Linear issues for review.

**Additional flags:** `bug_failed_report` (PH: 24.3%, NOVAC: 10.8%), `has_deficiency_report`, `has_craftsman`, `event_outcome` (resolved/unresolved/unanswered/no_response).

---

### ADD-9 — Message Count & Avg Messages per Event
**Verdict:** PASS
**Source:** `tenant_inquiry_events.message_count`, `inbound_count`, `ai_count`
**Query:**
```sql
SELECT brand,
  COUNT(*) as total_events,
  SUM(message_count) as total_messages,
  ROUND(AVG(message_count), 1) as avg_messages,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY message_count) as median_messages,
  SUM(inbound_count) as total_inbound,
  SUM(ai_count) as total_ai
FROM tenant_inquiry_events
WHERE brand = :brand
GROUP BY brand;
```
**Current values:**
- PH: 703 events, 16,212 msgs, avg 23.1, median 18, 5,745 inbound, 4,908 AI
- NOVAC: 462 events, 11,948 msgs, avg 25.9, median 14, 4,110 inbound, 3,434 AI

**Note:** `image_count` also available. Gap between total and inbound+AI = system/tool messages.

---

### ADD-10 — Language Distribution
**Verdict:** PASS
**Source:** `azure_messages.identified_language` (per message)
**Query:**
```sql
SELECT am.identified_language, COUNT(*) as msg_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as pct
FROM azure_messages am
JOIN azure_conversations ac ON ac.id = am.conversation_id
JOIN azure_accommodations aa ON aa.id = ac.accommodation_id
WHERE aa.brand = :brand
  AND am.identified_language IS NOT NULL AND am.identified_language != ''
GROUP BY am.identified_language ORDER BY msg_count DESC;
```
**Current values (PH + NOVAC combined):**
- English: 57.9%, German: 32.3%, French: 8.6%, Spanish: 1.1%, Other: <0.2%

**Note:** Per-message, not per-conversation. A single conversation may span multiple languages. Consider computing dominant language per conversation for cleaner reporting.

---

### ADD-11 — Repeat Tenant Rate
**Verdict:** PASS
**Source:** `tenant_inquiry_events` grouped by `phone_number`
**Query:**
```sql
SELECT brand,
  COUNT(DISTINCT phone_number) as unique_tenants,
  COUNT(DISTINCT CASE WHEN cnt > 1 THEN phone_number END) as repeat_tenants,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN cnt > 1 THEN phone_number END) /
    COUNT(DISTINCT phone_number), 2) as repeat_rate
FROM (
  SELECT phone_number, brand, COUNT(*) as cnt
  FROM tenant_inquiry_events WHERE brand = :brand
  GROUP BY phone_number, brand
) t GROUP BY brand;
```
**Current values:**
- PH: 410 unique, 153 repeat (37.3%)
- NOVAC: 203 unique, 83 repeat (40.9%)

**Interpretation:** ~38-41% repeat rate could indicate tenant trust or recurring issues. Segment by inquiry_type to distinguish.

---

### ADD-12 — Loop Detection / Ping Pong Rate
**Verdict:** PASS
**Source:** `tenant_inquiry_events.ping_pong_count`
**Query:**
```sql
SELECT brand,
  COUNT(*) as total,
  SUM(CASE WHEN ping_pong_count > 0 THEN 1 ELSE 0 END) as with_pingpong,
  ROUND(AVG(ping_pong_count), 2) as avg_pp,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ping_pong_count) as median_pp,
  MAX(ping_pong_count) as max_pp
FROM tenant_inquiry_events WHERE brand = :brand GROUP BY brand;
```
**Current values:**
- PH: 94.6% have ping-pong, avg 4.53, median 4, max 57
- NOVAC: 92.9%, avg 4.83, median 3, max 109

**What is ping-pong:** A ping-pong occurs when AI and tenant exchange messages without meaningful progress. The AI asks for clarification, tenant responds, but AI either asks the same thing again, misunderstands, or fails to advance the conversation. Each unproductive exchange cycle = 1 ping-pong.

**Why it matters:**
- High ping-pong frustrates tenants and increases effort
- Indicates AI is stuck (can't parse intent, missing context, tool failure)
- Directly impacts tenant satisfaction and trust
- Each unnecessary exchange delays resolution and increases cost

**Suggested thresholds:**
- Normal (0-3): Expected flow — AI gathers info (photos, location, description)
- Elevated (4-6): Extra clarification needed — unclear message, language barrier, complex issue
- Concerning (7-10): AI struggling — misunderstood intent, tool failures, tenant frustration
- Loop Detected (>10): Clear failure — should trigger automatic alert or agent takeover

**Distribution (approx):** ~50% normal (0-3), ~25% elevated (4-6), ~12% concerning (7-10), ~13% loop detected (>10)

**Recommended actions:**
1. Set automatic escalation threshold at >10 ping-pongs
2. Alert on >7 for review
3. Track trend over time — avg should decrease as AI improves
4. Cross-reference with bug_flags to check correlation
5. `excessive_pingpong` bug pattern already exists in send-bug-alert edge function

---

### ADD-13 — Avg Tenant Effort Score (Proxy)
**Verdict:** PARTIAL
**Source:** No direct survey exists. Composite proxy from `tenant_inquiry_events` fields.
**Available input metrics:**
- `inbound_count` — messages tenant sent (more = more effort)
- `duration_minutes` — conversation length (longer = more effort)
- `ping_pong_count` — unproductive exchanges (more = more frustration)
- `event_outcome` — whether issue was resolved
- `image_count` — photos tenant had to take and send

**Proposed effort score formula (1-10 scale, 1=effortless, 10=extreme):**
```
Components (suggested weights):
- Message Effort (30%): inbound_count → 1-3=1, 4-6=3, 7-10=5, 11-15=7, >15=9
- Time Effort (20%): duration_minutes → ≤5=1, 6-15=3, 16-30=5, 31-60=7, >60=9
- Friction (25%): ping_pong_count → 0-2=1, 3-5=3, 6-8=5, 9-12=7, >12=9
- Resolution (25%): resolved=1, no_response=5, unresolved=7, unanswered=9

TES = 0.30 × message_score + 0.20 × time_score + 0.25 × friction_score + 0.25 × resolution_score
```

**Query (proposed):**
```sql
SELECT brand,
  ROUND(AVG(
    0.30 * CASE WHEN inbound_count<=3 THEN 1 WHEN inbound_count<=6 THEN 3
               WHEN inbound_count<=10 THEN 5 WHEN inbound_count<=15 THEN 7 ELSE 9 END +
    0.20 * CASE WHEN duration_minutes<=5 THEN 1 WHEN duration_minutes<=15 THEN 3
               WHEN duration_minutes<=30 THEN 5 WHEN duration_minutes<=60 THEN 7 ELSE 9 END +
    0.25 * CASE WHEN ping_pong_count<=2 THEN 1 WHEN ping_pong_count<=5 THEN 3
               WHEN ping_pong_count<=8 THEN 5 WHEN ping_pong_count<=12 THEN 7 ELSE 9 END +
    0.25 * CASE WHEN event_outcome='resolved' THEN 1 WHEN event_outcome='no_response' THEN 5
               WHEN event_outcome='unresolved' THEN 7 ELSE 9 END
  ), 2) as avg_effort_score
FROM tenant_inquiry_events WHERE brand = :brand GROUP BY brand;
```

**Interpretation:** 1-3 Low effort (target), 4-5 Moderate (acceptable), 6-7 High (needs improvement), 8-10 Extreme (immediate attention).

**To build:**
1. Define final weights and thresholds
2. Create computed column or view
3. Cap duration at 60 min for calculation (multi-day conversations distort)
4. Validate against manually reviewed conversations
5. Future: add post-conversation survey (thumbs up/down) to validate proxy

---

### ADD-15 — Bug Rate (Overall)
**Verdict:** PASS
**Source:** `tenant_inquiry_events` (bug_false_success, bug_failed_report) + `tenant_inquiry_ai_analysis` (is_bug, bug_category)
**Query:**
```sql
SELECT brand,
  COUNT(*) as total,
  SUM(CASE WHEN bug_false_success OR bug_failed_report THEN 1 ELSE 0 END) as bugs,
  ROUND(100.0 * SUM(CASE WHEN bug_false_success OR bug_failed_report THEN 1 ELSE 0 END) / COUNT(*), 2) as bug_rate
FROM tenant_inquiry_events WHERE brand = :brand GROUP BY brand;
```
**Current values:**
- PH: 171/703 = 24.3% (false_success: 46, failed_report: 171)
- NOVAC: 50/462 = 10.8% (false_success: 10, failed_report: 50)

**Bug categories (from AI analysis):** Logic (dominant), Data Retrieval, Performance.

**Note:** PH bug rate (24.3%) significantly higher than NOVAC (10.8%). Most bugs are `failed_report` type. Partially overlaps with NOVAC Review KPI #7.

---

### ADD-17 — Tenant Adoption Rate (over time vs total units)
**Verdict:** PASS
**Source:** `tenant_inquiry_events` (monthly unique tenants) + `azure_real_estate_properties` (total units)
**Total managed units:** PH: 1,271 properties | NOVAC: 1,215 properties
**Query:**
```sql
-- Monthly unique tenants
SELECT brand, DATE_TRUNC('month', started_at) as month,
  COUNT(DISTINCT phone_number) as unique_tenants
FROM tenant_inquiry_events WHERE brand = :brand
GROUP BY brand, DATE_TRUNC('month', started_at) ORDER BY month;

-- Total units
SELECT aa.brand, COUNT(DISTINCT arp.id) as total_properties
FROM azure_accommodations aa
JOIN azure_real_estate_condominia arc ON arc.accommodation_id = aa.id
JOIN azure_real_estate_properties arp ON arp.real_estate_condominium_id = arc.id
WHERE aa.brand = :brand GROUP BY aa.brand;

-- Adoption rate = unique_tenants / total_properties × 100
```
**Current trend:**
- PH: 0.3% (Mar 2025) → 8.9% (Jan 2026) — clear upward growth, Dec/Jan spike (heating season)
- NOVAC: 0.1% (Mar 2025) → 3.8% peak (Oct 2025) — slower plateau around 2-4%

**Considerations:**
1. 100% adoption unrealistic — not all tenants have issues monthly
2. Track cumulative unique tenants (ever used) AND monthly active separately
3. New vs returning tenants per month for richer adoption insights
4. Seasonality effects (heating season, holiday periods)

---

## Suggested DB Fix (Priority)

Replace `tenant_profiles.accommodation_id` (currently links to brand, 2 values) with `tenant_profiles.property_id` FK → `azure_real_estate_properties.id` for clean tenant→unit linking. This fixes KPIs #14-17 and improves #28.

```sql
-- Migration
ALTER TABLE tenant_profiles ADD COLUMN property_id UUID REFERENCES azure_real_estate_properties(id);
-- Backfill where possible (address + apartment match)
UPDATE tenant_profiles tp
SET property_id = arp.id
FROM azure_real_estate_properties arp
JOIN azure_real_estate_condominia arc ON arp.real_estate_condominium_id = arc.id
WHERE tp.building_address = arc.address
AND tp.apartment_number = arp.apartment_number
AND tp.apartment_number IS NOT NULL;
```
