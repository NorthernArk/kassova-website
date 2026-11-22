# kassova.com

The public Kassova marketing site: an Astro static site for family offices and multi-entity finance teams, with
feature pages, articles, squeeze pages and lead forms that create leads in D365 through an Azure Logic App.
Order: kassova/website#2. Design: [ADR 0001](docs/adr/0001-astro-site-and-lead-intake.md).

Only the built site is public: git-mirror-sync carries the `gh-pages` branch to NorthernArk/kassova-website, and
the sources stay on GitLab (ADR 0001, decision 8). No page may name an internal system, a client or a price, or
contain a secret; `scripts/audit-site.mjs` enforces that on every build. No secret is ever in this repo.

## Layout

| Path | What |
|---|---|
| `src/pages/` | Home, features, insights (articles), demo, waitlist, contact, thanks, intake-error, privacy, 404, squeeze pages under `go/`, and the sitemap, RSS and robots endpoints |
| `src/data/features.ts` | Feature pages, one per product epic (kassova/overview &5 to &13), each capability marked Built, Built not yet live, or Planned |
| `src/data/squeeze.ts` | Squeeze pages and the campaign each one writes to D365 |
| `src/content/articles/` | Articles: Markdown with title, description, category, feature link, sources and call to action in the front matter |
| `src/components/LeadForm.astro` | The one lead form (no script; posts to the Logic App) |
| `infra/lead-intake/` | The Logic App (Bicep and workflow definition), the Dataverse definition and applier, the what-if gate, the live e2e check |
| `scripts/audit-site.mjs` | The gate on the built site |
| `tests/` | `node --test` unit tests: the form-to-workflow-to-Dataverse contract, the audit, the gate |
| `index.html`, `CNAME`, `.nojekyll` (root) | The transitional page Pages serves from `main` until it serves `gh-pages` |

## Writing an article

Add `src/content/articles/<slug>.md`. The schema in `src/content.config.ts` requires a feature slug, a call to
action and at least one source. Rules:

- Every figure and rule comes from a cited source. No invented numbers, testimonials, customers or certifications.
- Tax, legal or compliance content sets `generalInformation: true`, which prints the general-information notice.
- Plain, exact, calm (kassova/app `docs/brand/voice-and-messaging.md`). Mark anything not built as planned.

## Checks

CI runs everything; nothing is built on a workstation. `site:build` runs `npm test`, `astro check`, the build
and the audit. `intake:validate` compiles the Bicep and validates the Dataverse definition. Release and intake
setup: [docs/lead-intake-runbook.md](docs/lead-intake-runbook.md).
