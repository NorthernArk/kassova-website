/**
 * The Content-Security-Policy every page carries in a meta tag (GitHub Pages cannot set headers). The browser may load
 * nothing from another origin; a form may post only to the Logic App and be redirected back here. JSON-LD is data and
 * never runs, so no script source is allowed at all.
 */
export const CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; form-action 'self' https://*.logic.azure.com; base-uri 'none'; upgrade-insecure-requests";
