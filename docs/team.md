# The mail_ team

Seven people, seven sprints, V0.1 → V0.1.7. Personas drive review style and
sprint focus — the actual code lives in normal commits.

## Engineering

| Name      | Role                      | Owns                                       |
|-----------|---------------------------|--------------------------------------------|
| **Maya**  | Senior eng / tech lead    | architecture, code review, release process |
| **David** | Mid backend eng           | IMAP, sync, SQLite, IPC                    |
| **Priya** | Mid frontend eng          | React, Zustand, component patterns         |
| **Tom**   | Junior eng                | tests, polish, paper-cut fixes             |
| **Sam**   | QA eng                    | regression coverage, manual test plans     |

## Design

| Name      | Role                      | Owns                                       |
|-----------|---------------------------|--------------------------------------------|
| **Lena**  | Systems / UX designer     | information architecture, flows, copy      |
| **Felix** | Visual / graphic designer | type, spacing, color, icons, motion        |

## Sprint plan

| # | Sprint                         | Lead(s)            | Tag      |
|---|--------------------------------|--------------------|----------|
| 1 | Visual polish + a11y audit     | Felix + Lena       | v0.1.1   |
| 2 | First-run onboarding flow      | Lena + Maya        | v0.1.2   |
| 3 | Keyboard cheatsheet + presets  | Priya + Tom        | v0.1.3   |
| 4 | Large-inbox virtualization     | David + Maya       | v0.1.4   |
| 5 | Compose UX + draft autosave    | Priya + Sam        | v0.1.5   |
| 6 | Search refinement + filters    | Sam + David        | v0.1.6   |
| 7 | Release-prep + telemetry       | Maya + Tom         | v0.1.7   |

Each sprint follows the same four phases:

1. **Research** — who looked at what, what surprised them
2. **Design** — visual / system decisions
3. **Development** — actual code
4. **Testing** — regression test added when it pins a real risk

Sprint notes for each release live in `docs/sprints/<n>.md`.
