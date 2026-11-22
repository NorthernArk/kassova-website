# Kassova Website

The public Kassova site at https://kassova.com. It describes what the product does, and
nothing else: no account access, no product code, no data, no names of the families or people
served, and no prices.

- **Source of truth:** the GitLab repo kassova/website, branch `main`. Change it by merge
  request.
- **Publishing:** git-mirror-sync fast-forwards `main` to the public GitHub repo
  `NorthernArk/kassova-website`. GitHub Pages serves its root at the domain in `CNAME`, with
  HTTPS enforced; `www.kassova.com` redirects to the apex. The mirror only fast-forwards, so
  never rewrite `main` and never merge by squash.
- **DNS:** the Cloudflare Free zone `kassova.com`, declared in Terraform with the
  infrastructure code. The domain takes no mail: null MX, SPF `-all`, DMARC `p=reject`.
- **CI:** launch-sequence `static-site` (lint); `check:public-content`
  (`ci/check-public-content.sh`: no internal host or address, no product link, no account
  access, form or script, no interface reference and no price in any published file, this README
  included); `verify:live` (`ci/verify-live.sh`, reads the site from outside).
- The product itself is private and is never linked from here.
- Tracking: kassova/ops#18, epic kassova/overview&17.
