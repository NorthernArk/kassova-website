# Lead intake and release runbook

What the site and the intake need from outside this repo, in order, and how each is checked. Names only; no
value of any secret appears here or anywhere in git.

## 1. One-off setup (FocusApiary/infrastructure and the Dataverse admin)

| Step | Where | Check |
|---|---|---|
| Resource group `rg-kassova-web-intake` (eastus) | infrastructure Terraform, Kassova subscription | `az group show -n rg-kassova-web-intake` |
| Entra app `sp-kassova-intake-deploy`, Contributor on that resource group | infrastructure Terraform (the fleet's intake deploy identity pattern) | role assignment listed on the group |
| Its client secret in Key Vault `kassova-secrets-kv` as `kassova-intake-deploy-sp-secret` | created outside Terraform, stored by the secret helper | item exists (name only) |
| CI variables on kassova/website, protected and masked: `KASSOVA_INTAKE_AZURE_CLIENT_ID`, `KASSOVA_INTAKE_AZURE_CLIENT_SECRET`, `KASSOVA_INTAKE_AZURE_TENANT_ID`, `KASSOVA_INTAKE_AZURE_SUBSCRIPTION_ID` | GitLab project settings, from Key Vault | `intake:deploy` appears on the next main pipeline |
| `sp-kassova-intake-deploy` as a Dataverse application user with System Administrator in `https://dream.crm.dynamics.com` | Power Platform admin, once | `intake:deploy` passes its Dataverse step |
| Job-token push allowed on kassova/website (`ci_push_repository_for_job_token_allowed`) | GitLab project setting, in infrastructure Terraform | `pages:publish` pushes `gh-pages` |
| GitHub branch `gh-pages` created at the shared root `cb69b33f` | infrastructure Terraform (`dns-kassova`) | `git ls-remote https://github.com/NorthernArk/kassova-website.git gh-pages` |
| git-mirror-sync pair carries `gh-pages` **only** (not `main`) to NorthernArk/kassova-website | DroidOpsInc/nebula `tools/git-mirror-sync` | the GitHub branch matches GitLab; GitHub `main` no longer moves |
| GitHub Pages source: branch `gh-pages`, root; HTTPS enforced | infrastructure Terraform (`dns-kassova`), after the first publish | `ci/verify-live.sh` |
| GitHub default branch `gh-pages`, GitHub `main` deleted | infrastructure Terraform (`dns-kassova`), after Pages serves `gh-pages` | `git ls-remote` lists `gh-pages` only |

## 2. Turn on publishing

When the steps above are done, set `GH_PAGES_PUBLISH: "true"` in `.gitlab-ci.yml` by MR. The next main
pipeline runs `intake:deploy` (Bicep, Dataverse, trigger URL) and then `pages:publish` (build with the
endpoint, audit with `--require-endpoint`, fast-forward `gh-pages`). The transitional root `index.html` can be
removed in the same MR once Pages serves `gh-pages`.

## 3. Prove it end to end

Set the CI variable `KASSOVA_INTAKE_E2E` to `true` and run a pipeline on main by hand (or from a schedule).
`intake:e2e` posts a synthetic lead (an `@example.com` address) through the live `/demo/` form, reads it back
from D365, checks `kas_sourcepage`, `kas_campaign`, `kas_form` and `leadsourcecode`, deletes it, and checks
that a honeypot post and an invalid post create nothing. Its `e2e-report.json` artifact carries the record id.

## Reading leads in D365

Leads from the site have Lead Source = Web and the columns Source page (`kas_sourcepage`), Campaign
(`kas_campaign`), Form (`kas_form`) and Intake run (`kas_intakeid`). Squeeze pages use campaigns starting
`sq-`; feature and site pages use `site-demo`, `site-waitlist`, `site-talk`. No agent contacts a lead.

## When something fails

- Visitors land on `/intake-error/?reason=unavailable`: the run failed. Read the Logic App run history (inputs
  and outputs are hidden by design; the failing action and its status code are not).
- `?reason=busy`: the hourly cap (`maxLeadsPerHour`) was reached. Look for abuse before raising it in Bicep.
- Rotate the trigger signature: regenerate the workflow's access keys, then run the main pipeline so the site is
  rebuilt with the new URL.
