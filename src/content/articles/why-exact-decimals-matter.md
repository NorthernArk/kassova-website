---
title: "Why your books need exact decimals, not floating point"
description: "Binary floating point cannot hold most cent amounts exactly. Here is why that matters when totals must tie out, and what exact decimals change."
published: 2026-11-22
category: "Treasury"
feature: treasury-and-liquidity
cta: demo
generalInformation: false
sources:
  - title: "Floating-Point Arithmetic: Issues and Limitations"
    publisher: "Python documentation"
    url: "https://docs.python.org/3/tutorial/floatingpoint.html"
  - title: "Numeric Types"
    publisher: "PostgreSQL documentation"
    url: "https://www.postgresql.org/docs/current/datatype-numeric.html"
---

Most software stores numbers as binary floating point. It is fast and fine for measurements. It is not fine for money, because most decimal fractions, including most cent amounts, have no exact binary form.

## The problem in one line

The Python documentation shows it plainly: in binary floating point, `0.1 + 0.2` does not equal `0.3`. Each of those values is stored as the nearest binary fraction, and the small errors survive the addition. A ledger that adds thousands of such values carries thousands of such errors.

Usually they round away. Sometimes they do not, and a consolidation is off by a cent that no entry explains. Someone then spends an afternoon proving that the books are right and the arithmetic is wrong.

## What exact decimals change

A decimal type stores the digits you wrote. PostgreSQL's `numeric` type, for example, is documented as exact and recommended for monetary amounts where exactness is required. With exact storage:

- a total is the sum of its parts, to the cent, every time;
- a rounding step happens once, by one named rule, at a point you can see;
- a difference between two figures is a real difference, worth investigating.

## Rounding is a policy, not an accident

Exact storage does not remove rounding. Allocations, currency conversion and tax calculations still produce fractions of a cent. The difference is that rounding becomes a decision: which rule, applied where, with the remainder posted somewhere visible. Without that, rounding happens wherever the software happened to convert a number.

## What to ask of any system that holds your books

1. How are amounts stored, and are they exact?
2. Where does rounding happen, and by which rule?
3. When two reports disagree by a cent, can the system show why?

If the answers are vague, the cent will eventually be yours to find.
