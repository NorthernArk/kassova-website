# Kassova Website

The Kassova marketing site at https://kassova.com. Squeeze pages and interactive tools live in their own repos, listed in the repo map.

- Source of truth: this GitLab repo, branch `main`. Change it by merge request; agents build the pages from the epics.
- Publishing: git-mirror-sync fast-forwards `main` to the public GitHub repo `NorthernArk/kassova-website` (a bidirectional pair in DroidOpsInc/nebula, the wiremark-web pattern; see docs/git-mirror-sync-coverage.md in FocusApiary/infrastructure). GitHub Pages serves it from the root of `main` at the domain in `CNAME`, with HTTPS enforced; `www.kassova.com` redirects to the apex.
- DNS: the Cloudflare Free zone `kassova.com` (TaoMgt account) and its records are Terraform in FocusApiary/infrastructure. The domain takes no mail: null MX, SPF `-all`, DMARC `p=reject`.
- CI: launch-sequence `static-site` (lint), `check:public-content` (no internal host, address or app surface on a public page), and `verify:live` (`ci/verify-live.sh`, reads the site from outside).
- Never put a client or person name, an internal hostname or a secret on a page. The app is `app.kassova.com`, reachable only through Ziti, and is never linked from here.
- Tracking: kassova/ops#18, epic kassova/overview&17.
