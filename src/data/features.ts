import type { Status } from '../site';

/**
 * Feature pages. One per product epic in kassova/overview (&5 to &13, F3 to F11). Every capability carries an honest
 * status; nothing marked Built may be claimed unless it exists in the product today.
 */
export interface Capability {
  name: string;
  detail: string;
  status: Status;
}

export interface Feature {
  slug: string;
  epic: number;
  title: string;
  summary: string;
  problem: string;
  capabilities: Capability[];
  proof: string;
  campaign: string;
}

export const FEATURES: Feature[] = [
  {
    slug: 'treasury-and-liquidity',
    epic: 5,
    title: 'Treasury and liquidity',
    summary: 'Cash, liquidity and upcoming obligations across entities and banks, in one current view.',
    problem:
      'Cash sits in several banks under several entities, and each bank describes the same money differently. The daily question, what do we have and what is due, takes a morning of bank websites and a spreadsheet.',
    capabilities: [
      { name: 'Statement imports', detail: 'Bank statements are imported per entity, and each file is fingerprinted so the same statement is never counted twice.', status: 'Built' },
      { name: 'Exact amounts', detail: 'Money is stored as exact decimals with one rounding rule, so totals tie out to the cent.', status: 'Built' },
      { name: 'Bank feeds', detail: 'Transactions arrive per client from the client\'s own connected account.', status: 'Built, not yet live' },
      { name: 'Outbox for payments by post', detail: 'Mailed checks and letters leave through one outbox, with a person\'s approval and a hard spend limit.', status: 'Built, not yet live' },
      { name: 'Obligations view', detail: 'Upcoming obligations set against available cash, by entity and by date.', status: 'Planned' },
    ],
    proof: 'Every balance shows the statement or feed it came from, and when that source last arrived.',
    campaign: 'feature-treasury',
  },
  {
    slug: 'planning-and-performance',
    epic: 6,
    title: 'Planning and performance',
    summary: 'Budgets, forecasts and plan against actual, kept with the books instead of in side spreadsheets.',
    problem:
      'Budgets and board packs live in spreadsheets copied from last year. By the time actuals are pasted in, the numbers have already moved.',
    capabilities: [
      { name: 'Budgets per entity', detail: 'A budget is set per entity and period, against the same chart of accounts the ledger uses.', status: 'Built, not yet live' },
      { name: 'Plan against actual', detail: 'Variance by entity and period, read straight from the ledger, never pasted.', status: 'Built, not yet live' },
      { name: 'Forecasts', detail: 'Rolling forecasts that carry their assumptions with them.', status: 'Planned' },
    ],
    proof: 'Actuals come from posted ledger entries, so a variance can be traced to the entries behind it.',
    campaign: 'feature-planning',
  },
  {
    slug: 'family-office-assets',
    epic: 7,
    title: 'Family-office assets',
    summary: 'Every holding, liquid and illiquid, recorded with ownership, valuation and history.',
    problem:
      'Listed securities have a price every day. The rental, the private fund interest and the loan to a relative do not, and those are the holdings that get lost.',
    capabilities: [
      { name: 'Entity graph', detail: 'Who owns what, and through which structure, so roll-ups follow ownership.', status: 'Built' },
      { name: 'Asset register', detail: 'One register for securities, property, private investments and loans, each linked to its owning entity.', status: 'Planned' },
      { name: 'Valuation history', detail: 'Each valuation is dated and carries its basis and its source document.', status: 'Planned' },
    ],
    proof: 'Ownership is modelled as a graph, so an interest held through a trust rolls up through the trust.',
    campaign: 'feature-assets',
  },
  {
    slug: 'documents-and-records',
    epic: 8,
    title: 'Documents and records',
    summary: 'Documents filed against the entities and figures they concern, kept and retired by policy.',
    problem:
      'Statements, agreements and notices end up in shared folders and inboxes. When an auditor asks for the evidence behind a figure, someone has to go looking.',
    capabilities: [
      { name: 'Evidence on the figure', detail: 'An imported statement stays linked to the entries it produced.', status: 'Built' },
      { name: 'Records by entity', detail: 'Agreements and notices are filed against the entity they belong to.', status: 'Planned' },
      { name: 'Retention policy', detail: 'Each record class has a retention period, and disposal is a reviewed step with a trail.', status: 'Planned' },
    ],
    proof: 'Evidence is linked to the figure it supports, not left in a folder beside it.',
    campaign: 'feature-records',
  },
  {
    slug: 'workflow-and-relationships',
    epic: 9,
    title: 'Workflow, people and relationships',
    summary: 'Requests, approvals and tasks between people, run inside the workspace that holds the books.',
    problem:
      'The work between people, who asked, who approved, what is still open, lives in email threads that nobody else can see.',
    capabilities: [
      { name: 'Close board', detail: 'The monthly close runs on a board: each client, each step, who holds it.', status: 'Built' },
      { name: 'Owner decision cards', detail: 'What needs the owner becomes a card with a recommendation and a plain otherwise.', status: 'Built' },
      { name: 'Maker and checker', detail: 'One person prepares an entry and another approves it, and both are recorded.', status: 'Built' },
      { name: 'Requests and tasks', detail: 'Requests between people with an owner and a state, linked to the client they concern.', status: 'Planned' },
    ],
    proof: 'Every entry records who made it and who approved it.',
    campaign: 'feature-workflow',
  },
  {
    slug: 'risk-and-regulatory-registers',
    epic: 10,
    title: 'Risk and regulatory registers',
    summary: 'Risks, obligations and filings registered with an owner and a review date.',
    problem:
      'Missed obligations and filings are the expensive failures. They are usually tracked in a calendar that one person keeps.',
    capabilities: [
      { name: 'Risks and open items report', detail: 'Open items per client, with who holds each one.', status: 'Built' },
      { name: 'Compliance calendar', detail: 'Filings and deadlines per entity, each with an owner and a reminder.', status: 'Planned' },
      { name: 'Risk register', detail: 'Risks with an owner, a rating and a review date, and a trail of every change.', status: 'Planned' },
    ],
    proof: 'We say which parts are planned. The compliance calendar is planned, not built.',
    campaign: 'feature-registers',
  },
  {
    slug: 'data-and-integrations',
    epic: 11,
    title: 'Data and integrations',
    summary: 'Bank, custodian and accounting data that arrives on schedule, with every failure visible.',
    problem:
      'A feed that silently stops is worse than no feed: the numbers look current and are not.',
    capabilities: [
      { name: 'Statement import with fingerprints', detail: 'A file imported twice is recognised and not counted again.', status: 'Built' },
      { name: 'Feed health', detail: 'Each feed shows when it last succeeded, so a stale source is named as stale.', status: 'Built, not yet live' },
      { name: 'Bank feeds per client', detail: 'Each client connects their own account; nothing is shared across clients.', status: 'Built, not yet live' },
      { name: 'Custodian and payroll feeds', detail: 'Further sources on the same scheduled, recoverable path.', status: 'Planned' },
    ],
    proof: 'A figure is shown as exact, unknown, restricted or stale, never as a silent zero.',
    campaign: 'feature-data',
  },
  {
    slug: 'client-experience',
    epic: 12,
    title: 'Client experience and AI governance',
    summary: 'A clear view for the families served, and assistance that drafts while a person decides.',
    problem:
      'Families want to know where things stand without being handed a ledger. Any AI help has to be explainable and stay inside policy.',
    capabilities: [
      { name: 'View-only role', detail: 'A view-only role sees status and progress without a single amount.', status: 'Built' },
      { name: 'A person approves every send', detail: 'Letters and payments by post wait in the outbox until a person approves them.', status: 'Built, not yet live' },
      { name: 'Governed assistance', detail: 'Assistance that prepares and drafts, explains its sources, and never acts without approval.', status: 'Planned' },
      { name: 'Client portal', detail: 'A governed view for the families served, with their own documents and questions.', status: 'Planned' },
    ],
    proof: 'A view-only role sees status and progress without a single amount.',
    campaign: 'feature-client',
  },
  {
    slug: 'security-and-scale',
    epic: 13,
    title: 'Security and scale',
    summary: 'Each client behind its own wall, enforced by the database, with access that is private and reviewed.',
    problem:
      'A controller serving several families carries every family\'s trust at once. Separation has to hold even when the application code is wrong.',
    capabilities: [
      { name: 'Row-level security per client', detail: 'Each client\'s rows are walled off by the database itself, not only by application code.', status: 'Built' },
      { name: 'Private access', detail: 'The workspace is not reachable from the public internet.', status: 'Built' },
      { name: 'Audit trail', detail: 'Who did what, and when, on every entry and approval.', status: 'Built' },
      { name: 'Access reviews', detail: 'Scheduled reviews of who can see which client, with evidence kept.', status: 'Planned' },
    ],
    proof: 'Separation is enforced in the database, so one client\'s data cannot appear in another\'s view.',
    campaign: 'feature-security',
  },
];

export function featureBySlug(slug: string): Feature {
  const found = FEATURES.find((f) => f.slug === slug);
  if (!found) throw new Error(`Unknown feature slug "${slug}". Known: ${FEATURES.map((f) => f.slug).join(', ')}`);
  return found;
}
