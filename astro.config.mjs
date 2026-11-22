// kassova.com: a static Astro site served by GitHub Pages (docs/adr/0001-astro-site-and-lead-intake.md).
import { defineConfig, envField } from 'astro/config';

export default defineConfig({
  site: 'https://kassova.com',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  devToolbar: { enabled: false },
  env: {
    schema: {
      // The Logic App trigger URL every form posts to. Set by CI from the deployed workflow (intake:endpoint);
      // unset in merge request builds, where the forms render disabled. It is a public form endpoint, not a credential.
      KASSOVA_LEAD_ENDPOINT: envField.string({ context: 'server', access: 'public', optional: true }),
    },
  },
});
