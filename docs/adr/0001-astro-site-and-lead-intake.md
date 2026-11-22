# ADR 0001: kassova.com in Astro, released to gh-pages, with lead intake through a Logic App into D365

- Status: accepted
- Date: 2026-11-22
- Order: kassova/website#2 (CEO, via Atlas)

## Context

kassova.com was one static page on GitHub Pages, served from the root of `main` of the public mirror
NorthernArk/kassova-website (kassova/ops#18, nebula!281). The order on #2 asks for a SaaS marketing site with
feature pages, articles, squeeze pages and lead forms whose submissions become leads in D365, while staying static
on GitHub Pages, with no third-party scripts, fonts, analytics, form vendors or CAPTCHA, and no secret in the repo.

## Decision

1. **Astro, static output, zero client JavaScript.** Pages are rendered at build time. The only `<script>` is
   JSON-LD, which browsers never run. Styles are inlined, fonts are the system stack. A Content-Security-Policy
   meta tag (`default-src 'none'`) makes the "nothing from elsewhere" rule a browser guarantee, not a convention.
   Sitemap, RSS and robots are Astro endpoints built from the same data as the pages.
2. **Release to a `gh-pages` branch.** `main` holds sources. On main, `pages:publish` builds the site and
   fast-forwards `gh-pages` with a new commit (never a force push). git-mirror-sync carries it to GitHub and
   Pages serves it. This is the fleet pattern (HardMagic, World Enterprise, launch-sequence static-site). It is
   gated by `GH_PAGES_PUBLISH` until Pages is switched to that branch; until then the transitional root
   `index.html` keeps kassova.com answering.
3. **Plain HTML forms post straight to a Consumption Logic App.** No JavaScript, no proxy. The Logic App parses
   the urlencoded body, drops honeypot submissions silently, validates every field against an allowlist and
   length limits, rate-limits (trigger concurrency and queue; at most 3 leads per address and 50 in total per
   hour, read back from Dataverse), creates the lead and answers `303` to `/thanks/` or `/intake-error/`.
   Run history hides inputs and outputs of every step that touches personal data.
4. **The Logic App reaches Dataverse as a user-assigned managed identity.** No managed API connection and no
   stored secret: the identity is the connection. In Dataverse it is an application user in its own business
   unit with one role (Create, Read, Write, Append, Append To on Lead at business-unit depth), so it can see only
   the leads it created. Everything is in git: `infra/lead-intake/main.bicep`, `workflow.json`, and
   `dataverse/definition.json` applied by an idempotent script.
5. **The D365 environment is Dream Dataverse, `https://dream.crm.dynamics.com`.** It is the organisation's
   Dynamics environment that already receives leads from other Logic Apps through the same managed-identity
   pattern. Leads carry `leadsourcecode` 8 (Web) and four new columns: `kas_sourcepage`, `kas_campaign`,
   `kas_form` and `kas_intakeid`. Every page sets its own campaign; squeeze pages use `sq-<slug>`.
6. **The trigger URL is public by design and is not a secret.** A browser form must name where it posts, so
   the URL appears in every page. It carries a signature that only allows invoking this one public trigger,
   which accepts what any visitor may send anyway. It is never committed to `main`: CI reads it at deploy time
   and injects it into the build. Abuse is handled by validation, the honeypot and the rate limits; the
   signature can be rotated by regenerating the workflow's access keys and republishing.
7. **CI deploys with `sp-kassova-intake-deploy`.** Its client secret lives in Key Vault `kassova-secrets-kv`
   (item `kassova-intake-deploy-sp-secret`) and in protected, masked CI variables; GitLab OIDC cannot federate
   to Entra because the GitLab issuer is internal. Without those variables the deploy jobs are not created.

## Consequences

- The site cannot run code in the browser, so there is no client-side validation beyond HTML attributes, and no
  campaign capture from query strings. Campaigns are per page, which is what the D365 views need.
- Infrastructure outside this repo is needed once: the deploy identity and its roles, the resource group, the
  Dataverse bootstrap of that identity, the job-token push setting, the Pages source switch and the mirror of
  `gh-pages`. docs/lead-intake-runbook.md lists them.
- If the Dataverse environment ever needs a licence for application users or leads that we do not hold, the
  gap is written on kassova/website#2; nothing is bought.
