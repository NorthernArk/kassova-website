---
title: "The silent failure: stale bank and custodian feeds"
description: "A feed that stops without telling anyone is worse than no feed. How to make data freshness visible so stale figures are named as stale."
published: 2026-11-22
category: "Treasury"
feature: data-and-integrations
cta: demo
generalInformation: false
sources:
  - title: "Recordkeeping"
    publisher: "Internal Revenue Service"
    url: "https://www.irs.gov/businesses/small-businesses-self-employed/recordkeeping"
---

Automated feeds from banks and custodians save hours. They also introduce a new failure: the feed stops, the numbers stop moving, and the screen looks exactly as it did yesterday. Nobody notices until a payment bounces or a report is wrong.

## Why feeds fail quietly

Connections expire, credentials change, a bank alters its format, or an account is closed and reopened under a new number. Many systems record the error somewhere nobody looks and keep showing the last figures they had.

## Make freshness part of the figure

The fix is to treat the age of data as part of the data:

- **Every feed shows its last success.** Not the last attempt; the last time data actually arrived.
- **Every balance shows its source and its age.** "From feed, 2 hours ago" and "from statement, 9 days ago" are different facts.
- **Stale is a state.** A figure past its expected age is labelled stale, not shown as current.
- **Unknown is allowed.** When there is no data, the honest figure is unknown, never zero.

## Who watches

Someone must own each feed: who notices when it fails, and who reconnects it. A short daily list of feeds that have not succeeded in their expected window is enough. Without an owner, an alert is just more noise.

## Statements are still evidence

Even with feeds, keep the statements. They are the records that support your figures, and they let you check that the feed delivered what the bank actually reported.
