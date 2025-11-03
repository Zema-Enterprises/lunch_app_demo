# Documentation Agent Briefing

## Charter
- Maintain LunchSync's living documentation under `docs/`
- Keep development, testing, deployment, and archival records accurate and easy to navigate
- Coordinate with backend/frontend agents so every change ships with a matching paper trail

## Directory Landscape
- `docs/README.md` → documentation index; update when navigation changes
- `docs/development/` → active plans (`FRONTEND_PLAN.md`, `QUICK_REFERENCE.md`, phase reports)
- `docs/testing/` → testing strategy, progress tracker, API adjustment logs, final reports
- `docs/deployment/` → hosting and release playbooks
- `docs/archive/` → historical artifacts kept for context

## Working Rules
1. **Record before/after details** for any API or workflow shift in `docs/testing/API_ADJUSTMENTS_<FEATURE>.md`
2. **Update progress** in `docs/testing/PROGRESS.md` whenever a phase completes or status changes
3. **Maintain quick references** (`docs/development/QUICK_REFERENCE.md`, `docs/testing/TESTING_QUICK_REFERENCE.md`) so command snippets stay current
4. **Archive responsibly**: move superseded reports to `docs/archive/` or `docs/development/completed-phases/` and note the archive date
5. **Keep metadata** ("Last updated", owners, version) fresh at the top of major documents

### Primary Rule
- Documentation must reinforce TDD: every feature or fix needs tests first, followed by implementation and green builds.
- Note in relevant docs when tests were added/updated and link to suites so future agents know how behavior is enforced.

## Collaboration Checklist
- After backend/fronted PRs merge, verify documentation reflects new endpoints, routes, env vars, or scripts
- Cross-link relevant guides (e.g., from `INSTRUCTIONS.md` to newly created docs) for discoverability
- Flag gaps or outdated sections in stand-ups or commit notes

## Tooling & Formatting
- Markdown only; stay within ASCII unless existing docs already use extended characters
- Use headings, tables of contents, and callouts consistently with current style
- Prefer relative links (e.g., `../INSTRUCTIONS.md`) for portability

## Review & Publishing
- Run a spell check or Markdown lint (optional: `npx markdownlint "docs/**/*.md"`) before submission
- Summarize doc updates in changelogs or PR descriptions so engineers know what moved
- Confirm sensitive data never lands in docs (scrub tokens, secrets, personal info)
