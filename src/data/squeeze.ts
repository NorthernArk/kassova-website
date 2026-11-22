import type { FormKind } from '../site';

/**
 * Squeeze pages: one offer, one form, no navigation. The campaign value is what D365 shows in the lead's
 * kas_campaign column, so each page is told apart there. Change a campaign only with the D365 views in mind.
 */
export interface SqueezePage {
  slug: string;
  campaign: string;
  form: FormKind;
  eyebrow: string;
  headline: string;
  lede: string;
  points: string[];
  button: string;
}

export const SQUEEZE: SqueezePage[] = [
  {
    slug: 'multi-entity-close',
    campaign: 'sq-multi-entity-close',
    form: 'demo',
    eyebrow: 'For controllers who close many entities',
    headline: 'See a multi-entity close run on one board.',
    lede: 'A short walkthrough of the Kassova close board with synthetic data: each client, each step, who holds it, and what needs the owner.',
    points: [
      'The close board, client by client and step by step.',
      'Owner decision cards with a recommendation and a plain otherwise.',
      'Maker and checker on every entry.',
    ],
    button: 'Request the walkthrough',
  },
  {
    slug: 'family-office-consolidation',
    campaign: 'sq-family-office-consolidation',
    form: 'demo',
    eyebrow: 'For family-office teams',
    headline: 'Many entities, one exact set of books.',
    lede: 'See how an entity graph rolls trusts, holding companies and rentals up by ownership, with exact decimals that tie out to the cent.',
    points: [
      'Ownership modelled as a graph, so roll-ups follow the structure.',
      'Exact decimal amounts and one rounding rule.',
      'Every figure linked to the evidence behind it.',
    ],
    button: 'Request a demo',
  },
  {
    slug: 'audit-readiness',
    campaign: 'sq-audit-readiness',
    form: 'talk',
    eyebrow: 'Before the auditor asks',
    headline: 'Books you can answer for.',
    lede: 'Talk to us about keeping evidence on the figure, a full trail of who made and approved each entry, and a close you can show.',
    points: [
      'Statements linked to the entries they produced.',
      'Who made and who approved every entry.',
      'A view-only role for reviewers that shows status without amounts.',
    ],
    button: 'Talk to us',
  },
  {
    slug: 'compliance-calendar',
    campaign: 'sq-compliance-calendar',
    form: 'waitlist',
    eyebrow: 'Planned: compliance calendar',
    headline: 'Every filing, its entity and its owner.',
    lede: 'The compliance calendar is planned, not built. Join the waitlist to hear when it is ready and to tell us which deadlines matter to you.',
    points: [
      'Filings and deadlines per entity.',
      'An owner and a reminder on each one.',
      'A trail of what was filed and when.',
    ],
    button: 'Join the waitlist',
  },
  {
    slug: 'treasury-visibility',
    campaign: 'sq-treasury-visibility',
    form: 'demo',
    eyebrow: 'For whoever answers the cash question',
    headline: 'Cash across every bank and entity, with its source.',
    lede: 'See imported statements per entity, fingerprinted so nothing counts twice, and balances that say where they came from.',
    points: [
      'Statements imported per entity, never double counted.',
      'Balances that show their source and when it arrived.',
      'Bank feeds per client: built, not yet live.',
    ],
    button: 'Request a demo',
  },
];
