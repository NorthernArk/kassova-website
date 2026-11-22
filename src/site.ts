/** Site-wide facts. Nothing here is a secret; the lead endpoint comes from astro:env at build time. */
export const SITE = {
  name: 'Kassova',
  origin: 'https://kassova.com',
  tagline: 'Kept to the cent.',
  descriptor: 'The controller workspace for many clients',
  description:
    'Kassova is the controller workspace for multi-client controllers and family-office teams: exact multi-entity books, a close board, and every client kept behind its own wall.',
  locale: 'en_US',
} as const;

/** The three ways in. There is no checkout, price or plan anywhere on the site. */
export type FormKind = 'demo' | 'waitlist' | 'talk';

export const FORM_KINDS: Record<FormKind, { label: string; page: string; button: string }> = {
  demo: { label: 'Request a demo', page: '/demo/', button: 'Request a demo' },
  waitlist: { label: 'Join the waitlist', page: '/waitlist/', button: 'Join the waitlist' },
  talk: { label: 'Talk to us', page: '/contact/', button: 'Send' },
};

/** Labels for what is real. The brand voice says built from planned, aloud. */
export type Status = 'Built' | 'Built, not yet live' | 'Planned';

export const NAV = [
  { href: '/features/', label: 'Features' },
  { href: '/insights/', label: 'Insights' },
  { href: '/contact/', label: 'Talk to us' },
] as const;

export function absolute(path: string): string {
  return new URL(path, SITE.origin).toString();
}
