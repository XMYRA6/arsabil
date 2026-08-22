# Arsabil Studio — 2D Editor Lite Design Spec

> **Parent spec:** `docs/superpowers/specs/2026-08-16-arsabil-studio-2d-3d-mvp-design.md`

## Product Decision

Arsabil Studio's 2D layer should be a controlled project-planning board, not a freeform CAD tool.

The user should be able to understand and lightly adjust:

- verified TKGM parcel boundary;
- proposed building footprint;
- setback/approach assumptions;
- ground-floor commercial band;
- residential program split such as `2+1` and `3+1`;
- warnings when the configured program exceeds the available feasibility area.

## Core User Story

Given a verified parcel and a rough feasibility result, the user wants to sketch a proposal scenario without becoming an architect:

> "Parsel burada, bina oturumu burada, zemin dukkanlar su cephede, ust katlarda su daire karmasi var."

The 2D layer is the bridge between raw TKGM geometry and the 3D mass.

## UX Principles

- Keep the interaction bounded and opinionated.
- Prefer sliders, numeric controls, segmented toggles and direct handles over a blank canvas.
- Never imply legal/cadastral precision; show "taslak" and "varsayim" language.
- Geometry warnings must be visible next to the affected control.
- Every visual adjustment must update the Studio snapshot, not live only in component state.

## Candidate Technical Direction

Start with a small spike before choosing the final canvas library:

- Konva: strong React integration and 2D interaction model.
- Fabric.js: mature object model, but may feel heavier.
- SVG-only: acceptable if first version only needs simple polygon display and handles.

Default recommendation: start SVG-only if interactions are limited; move to Konva only when direct manipulation becomes real.

## Non-Goals

- No full CAD.
- No wall-by-wall apartment plan drawing.
- No furniture placement.
- No interior rendering.
- No legal parcel editing.

## Acceptance Principles

- The user can see and adjust the building footprint assumption.
- The user can understand where commercial and residential program sits.
- The 3D view can consume the 2D output.
- The flow works with missing geometry by showing a manual/demo state instead of crashing.

