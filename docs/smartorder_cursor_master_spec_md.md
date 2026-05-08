# SmartOrder — Master Product Specification

Version: MVP v1 Platform: Web First (Mobile-Responsive) Primary Future Platform: iPhone App Primary Use Case: Operational inventory/order-prep assistant for businesses already using Zebra scanners and paper/PDF order guides.

---

# 1. Core Product Concept

SmartOrder is NOT an ordering platform.

It does NOT replace:

- Zebra devices
- ERP systems
- Procurement software
- Vendor ordering systems

Instead, SmartOrder acts as:

```text
A smart operational companion layer.
```

The product helps businesses:

- Convert paper/PDF order guides into searchable structured inventory
- Build inventory/order-prep lists faster
- Track scans from existing Zebra workflows
- Reduce manual lookup friction
- Speed up inventory and ordering preparation

Core workflow:

```text
Import Order Guide
→ OCR + AI Parsing
→ Searchable Inventory Catalog
→ Voice Build List
→ Guided Scan Session
→ Review Quantities
→ Export / Reference List
```

---

# 2. The Most Important Product Insight

The phone is NOT the scanner.

The Zebra scanner already exists.

The phone acts as:

- a smart companion
- a workflow guide
- a scan tracker
- a quantity verifier
- an operational memory layer

The iPhone/web app should NEVER attempt to compete with Zebra hardware.

Instead:

```text
The app augments existing workflows.
```

---

# 3. Primary Workflow

## STEP 1 — Import Order Guide

The user:

- uploads a PDF OR
- photographs a paper order guide

The system:

- performs OCR
- extracts tables
- identifies products
- structures inventory data using AI

Output: A searchable inventory catalog.

---

## STEP 2 — Build List

The user creates a working inventory/order-prep list using:

- voice input
- search
- manual add

Example:

```text
"Add 2 cases of paper towels and 3 coffee creamers"
```

The system:

- parses speech
- fuzzy matches products
- builds a structured list

---

## STEP 3 — Guided Scan Session

The user starts a scan session.

The app then:

- guides item-by-item
- displays the product image
- displays stacked barcodes
- tracks scan count
- detects scan events
- advances through workflow

The app does NOT directly scan.

Instead:

- the Zebra scanner scans normally
- the iPhone front camera/proximity/light sensor detects the Zebra scan laser activity
- the app increments counts intelligently

---

## STEP 4 — Review + Export

After scanning:

- show all items
- show quantities
- distinguish cases vs units
- allow editing
- export/share/reference list

---

# 4. OCR + AI Parsing System

## Goal

Turn messy real-world order guides into searchable structured inventory.

---

## Inputs

Supported:

- PDFs
- photos
- screenshots
- scanned pages
- vendor sheets
- printed guides

---

## OCR Pipeline

Recommended:

```text
Image/PDF
→ preprocessing
→ OCR extraction
→ table detection
→ AI parsing
→ structured JSON
→ searchable inventory database
```

---

## Recommended OCR Stack

Preferred:

- AWS Textract

Alternative:

- Google Vision
- Azure OCR
- Tesseract

---

## AI Parsing Layer

Use GPT structured outputs.

The AI should:

- normalize item names
- parse quantities
- parse units
- detect categories
- identify UPCs
- identify pack sizes
- infer table structure
- fix OCR inconsistencies

IMPORTANT: AI should NEVER hallucinate values.

If uncertain:

- return null
- return confidence scores

---

# 4B. Smart Inventory Recommendations System

## Purpose

The AI should help users avoid forgetting commonly needed inventory items.

The system should act like:

```text
An operational memory assistant.
```

---

## Recommendation Sources

The AI should recommend products based on:

### Historical Frequency

Example:

```text
Bolillos ordered daily
Coffee creamer ordered every Monday
Paper towels always paired with cleaning supplies
```

The system should identify:

- recurring products
- commonly paired products
- time-based ordering patterns
- department-based patterns

---

## Out-of-Stock Detection

Users should be able to:

- photograph their Zebra device
- photograph inventory screens
- photograph warehouse shelves
- photograph out-of-stock lists

The AI should:

- OCR the image
- detect phrases like:
  - out of stock
  - unavailable
  - low inventory
  - reorder
- identify missing products
- suggest adding them to the active list

---

## Missing Inventory Suggestions

The AI should proactively suggest:

```text
You usually order bolillos daily.
Would you like to add them?
```

OR:

```text
The Zebra device shows these products as out of stock.
Add them to your scan list?
```

---

## Camera-Based Item Addition

Users should also be able to add items using:

- camera photos
- product photos
- shelf photos
- Zebra screen photos

The AI should:

- identify products visually
- OCR labels/barcodes
- fuzzy match inventory items
- suggest matches
- allow one-tap add-to-list

---

## UX Principle

The AI should feel:

- assistive
- operational
- proactive
- lightweight

NOT annoying.

Recommendations should be:

- subtle
- contextual
- dismissible
- confidence-based

---

# 5. Voice List Creation System

## Purpose

Minimize typing.

---

## UX Flow

```text
Tap microphone
→ speak naturally
→ parse inventory items
→ fuzzy match catalog
→ build list
```

---

## Example Inputs

```text
Add 3 cases of water
Add coffee creamer
Need 2 boxes of paper towels
```

---

## Voice Parsing Requirements

The system must:

- detect quantities
- detect units/cases
- fuzzy match inventory
- handle typos
- support shorthand language

---

## Important UX Principle

The system should feel:

- fast
- forgiving
- conversational

NOT robotic.

---

# 6. Guided Scan Session (MOST IMPORTANT FEATURE)

This is the primary differentiator.

---

## Core Concept

The app guides users item-by-item through an order-prep or inventory workflow.

Instead of scanning random products:

```text
The app focuses the user on one item at a time.
```

This reduces:

- cognitive overload
- missed scans
- wrong quantities
- operational chaos

---

# 7. Scan Session UI Requirements

## Active Scan Screen

The scan screen should contain:

### Product Image

Large centered image.

### Product Name

Large readable title.

### Package Type

Examples:

- 2 ct
- 12 pack
- 32 oz
- 1 case

### Barcode Stack

Two versions of the barcode stacked vertically:

1. White barcode on black background
2. Black barcode on white background

Purpose: Improve Zebra scanner reliability under varying lighting conditions.

---

## Scan Count Badge

Position: UNDER the product.

The badge should display:

```text
2 cases
3 units
1 case
```

NOT just a number.

The quantity field must be editable.

---

## Bottom CTA

Large full-width button:

```text
Next
```

Purpose: Advance to next inventory item.

---

# 8. How Scan Detection Works

IMPORTANT: The phone is NOT scanning barcodes.

The Zebra scanner scans.

The phone detects scan activity.

Potential detection methods:

- front camera light changes
- red laser detection
- brightness spikes
- temporal scan timing
- proximity sensor changes
- motion timing

The app then:

- increments scan quantity
- updates badge
- advances workflow

This is scan-assisted tracking.

NOT barcode decoding.

---

# 9. Inventory Catalog System

The imported order guide becomes:

```text
A searchable operational inventory catalog.
```

---

## Each Item Should Store

```ts
{
  id: string
  name: string
  barcode: string
  category: string
  vendor: string
  packSize: string
  unitType: string
  image?: string
  confidence?: number
}
```

---

## Search Requirements

Support:

- fuzzy search
- UPC lookup
- partial names
- synonyms
- categories
- recent items
- favorites

Search must feel instant.

---

# 10. UX Principles

## The UX should feel:

- industrial
- operational
- calm
- fast
- dense but readable
- enterprise-grade
- low friction

---

## The UX should NOT feel:

- social media-like
- futuristic sci-fi
- overly animated
- consumer fintech
- gimmicky

---

# 11. Visual Design System

## Style Direction

Inspired by:

- enterprise inventory systems
- Kroger operational UI
- Zebra workflows
- warehouse software
- industrial dashboards

---

## Colors

```text
Primary Blue: #2563EB
Background: #F8FAFC
Surface: #FFFFFF
Text: #0F172A
Muted: #64748B
Border: #E2E8F0
Success: #22C55E
Error: #EF4444
```

---

## UI Characteristics

Use:

- flat design
- subtle shadows
- rounded cards
- strong spacing
- large tap targets
- minimal gradients
- clean typography

---

# 12. Mobile UX Rules

## Prioritize

- one-handed usage
- thumb accessibility
- large controls
- speed
- readability
- operational efficiency

---

## Avoid

- hamburger-heavy navigation
- hidden workflows
- deep nested menus
- excessive transitions
- clutter

---

# 12B. BackroomVision System

## Purpose

BackroomVision is a shared operational computer-vision workspace.

It allows teams to:

- scan backroom inventory
- monitor storage areas
- detect products visually
- estimate counts
- identify missing inventory
- share inventory visibility across teams

The goal:

```text
Turn the backroom into a searchable visual inventory layer.
```

---

# Core Technologies

Use:

- AWS Textract
- Segment Anything Model (SAM)
- object detection
- OCR
- image segmentation
- barcode detection
- date parsing

---

# Primary Workflow

```text
Capture Backroom Photo
→ Segment Inventory Objects
→ OCR Labels + Dates
→ Estimate Counts
→ Save Shared Snapshot
→ Team Reviews Inventory State
```

---

# Main Features

## Shared Backroom Feed

Organizations should have:

```text
BackroomVision Tab
```

This tab acts as:

- a shared inventory camera feed
- a historical visual log
- a searchable operational memory system

Users can:

- upload photos
- browse snapshots
- compare historical inventory states
- inspect detected items

---

## AI Inventory Detection

The AI should:

- segment visible boxes/items
- estimate item quantities
- identify products visually
- OCR visible labels
- OCR barcodes
- OCR shelf labels
- identify cases vs units

---

## Date Tracking Requirements

IMPORTANT: Every detected box/item should support:

```text
Date received
```

The system should:

- OCR handwritten dates
- OCR printed dates
- detect stickers/labels
- allow manual correction

---

## Inventory Aging

The system should help users identify:

- old inventory
- aging product
- forgotten stock
- stale inventory
- inventory turnover issues

Example:

```text
These boxes were received 19 days ago.
```

---

## Snapshot View

Each uploaded backroom snapshot should contain:

```ts
{
  image: string,
  detectedItems: [],
  estimatedCounts: [],
  receivedDates: [],
  labels: [],
  confidenceScores: [],
  uploadedBy: string,
  uploadedAt: Date
}
```

---

## Shared Team Visibility

All organization members should be able to:

- view snapshots
- search snapshots
- inspect inventory changes
- compare counts over time
- identify missing inventory

---

## UX Principles

BackroomVision should feel:

- visual
- operational
- collaborative
- intelligent
- low-friction

NOT like:

- CCTV software
- security tooling
- surveillance systems

It should feel like:

```text
Shared visual operational memory.
```

---

# 13. Main Screens

## Authentication

Features:

- sign in
- create account
- join organization
- create organization

---

## Tutorial Carousel

Explain:

- import order guides
- searchable inventory
- voice list creation
- Zebra-assisted scanning

---

## Dashboard

Contains:

- quick actions
- recent lists
- inventory stats
- search
- recent activity
- BackroomVision entry point
- quick actions
- recent lists
- inventory stats
- search
- recent activity

---

## BackroomVision Screen

Contains:

- shared backroom snapshots
- AI-detected inventory overlays
- item counts
- received dates
- aging indicators
- search snapshots
- compare historical snapshots
- upload camera/photo button

---

## Search Screen

Contains:

- instant search
- filters
- inventory cards
- add-to-list actions

---

## Voice Screen

Contains:

- microphone UI
- waveform
- live transcript
- parsed results

---

## Scan Session Screen

Contains:

- product image
- barcode stack
- editable count badge
- next button

---

## Review Screen

Contains:

- every scanned item
- completion status
- quantities
- edit actions
- export button

---

# 14. Technical Stack

## Frontend

Preferred:

```text
Next.js App Router
TypeScript
Tailwind
ShadCN UI
Zustand
React Query
```

---

## Backend

```text
tRPC
Prisma
PostgreSQL
```

---

## OCR

```text
AWS Textract
```

---

## AI

```text
OpenAI structured outputs
```

---

## Search

```text
Algolia
OR
Typesense
```

---

# 15. Most Important Engineering Priorities

## PRIORITY #1

Reliable OCR ingestion.

This is the moat.

---

## PRIORITY #2

Fast search.

Inventory search must feel instant.

---

## PRIORITY #3

Guided scan workflow.

This is the signature UX.

---

## PRIORITY #4

Operational simplicity.

Everything should reduce friction.

---

# 16. Product Positioning

DO NOT market this as:

```text
AI procurement automation
```

Position it as:

```text
Operational memory for inventory workflows.
```

OR:

```text
Turn paper order guides into searchable operational systems.
```

That positioning is significantly stronger.

---

# 17. Cursor AI Guidance

When generating code:

Always prioritize:

- clean architecture
- modular components
- operational UX
- responsiveness
- speed
- maintainability

The application should feel:

- professional
- enterprise-grade
- calm
- highly usable
- warehouse-friendly

The most important UX principle:

```text
Reduce operational friction to near-zero.
```

Every feature should support that goal.

