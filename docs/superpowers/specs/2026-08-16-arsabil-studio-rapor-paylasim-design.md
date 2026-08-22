# Arsabil Studio — Raporlama ve Paylasim Design Spec

> **Parent spec:** `docs/superpowers/specs/2026-08-16-arsabil-studio-2d-3d-mvp-design.md`

## Product Decision

Studio output must become a shareable proposal artifact. If a user builds a scenario but cannot save, compare, print or send it, the premium value leaks away.

The report/share layer should produce:

- saved Studio snapshot;
- scenario thumbnail;
- PDF/report section;
- shareable summary page or report link;
- clear assumptions and warnings.

## Core User Story

The user prepares a project proposal and needs to show it to a partner, landowner or investor:

> "Bu parsel dogrulandi, bu fizibilite cikti, bu 3D/2D senaryo olustu, arsa sahibine su teklif alternatifi oneriliyor."

## Artifact Structure

Each exported Studio proposal should include:

- parcel identity and TKGM verification status;
- feasibility summary;
- 2D plan snapshot;
- 3D massing snapshot/thumbnail;
- program mix summary;
- landowner offer scenario;
- assumptions and warnings.

## UX Principles

- Report language must be confident but careful.
- Separate calculated facts from user assumptions.
- Highlight missing assumptions before export.
- Keep share output client-friendly: visual first, numbers second, warnings visible.

## Non-Goals

- No legally binding contract generation.
- No e-signature.
- No payment or credit integration.
- No hidden valuation claims.

## Acceptance Principles

- A Studio scenario can be reopened from saved data.
- A report can show the same program/offer numbers the user saw in Studio.
- Missing-value warnings survive export.
- The exported artifact is good enough for an early business conversation.

