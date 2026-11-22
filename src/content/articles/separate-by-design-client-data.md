---
title: "Separate by design: keeping each client's books apart"
description: "If you keep books for several families, separation must hold even when software makes a mistake. What database-level separation means in practice."
published: 2026-11-22
category: "Security"
feature: security-and-scale
cta: talk
generalInformation: false
sources:
  - title: "Row Security Policies"
    publisher: "PostgreSQL documentation"
    url: "https://www.postgresql.org/docs/current/ddl-rowsecurity.html"
  - title: "SP 800-53 Rev. 5, Security and Privacy Controls (AC-3 Access Enforcement)"
    publisher: "National Institute of Standards and Technology"
    url: "https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final"
---

A controller who serves several families holds each family's trust at once. Each family expects, rightly, that no one else will ever see its figures. How that promise is kept matters as much as the promise.

## Two ways to separate

**In the application.** Every screen and report remembers to filter by client. This works until one query forgets, and then one client's figures appear in another's report. Nothing in the data stops it.

**In the database.** The database itself refuses to return rows that do not belong to the current client. PostgreSQL calls this row security: policies on a table restrict which rows a session can see or change, whatever query the application sends. If the application forgets a filter, the database still applies it.

The second is separation by design. It does not depend on every line of code being right.

## What to ask

- Is separation enforced by the database, or only by the application?
- What happens if a report is written without a client filter?
- Are staff who serve several clients given access per client, and is that access reviewed?
- Is there a role that can see status without seeing amounts, for people who coordinate but do not need figures?

## Separation is also about people

Access enforcement, in the language of NIST's security controls, is the system applying the access you approved. The approval itself is a human decision: who serves which client. Review it on a schedule, and remove access when work ends.

## In Kassova

Each client in Kassova sits behind its own wall, enforced by row-level security in the database, and a view-only role sees status without a single amount.
