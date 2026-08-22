# Arsabil Studio — AR, Ic Mimari ve Marketplace Karar Kapisi Design Spec

> **Parent spec:** `docs/superpowers/specs/2026-08-16-arsabil-studio-2d-3d-mvp-design.md`

## Product Decision

AR, interior design and furniture marketplace should not be mixed into the first Arsabil Studio MVP. They are attractive, but each one changes the product category:

- outdoor AR requires native mobile and geospatial anchoring;
- interior design requires a room planner, 3D assets and a different user journey;
- furniture marketplace requires catalog partnerships, pricing, logistics, checkout and regulated finance/payment decisions.

The correct approach is a formal decision gate after Studio proves value with parcel verification, feasibility, 2D/3D massing, program mix and offer scenarios.

## Decision Gate Inputs

Before funding these branches, collect evidence from Studio usage:

- How often users open 3D massing.
- How often they configure program mix.
- How often landowner offer scenarios are exported/shared.
- Whether users ask for outdoor placement, interior design or furniture purchasing.
- Whether the business wants B2B feasibility software, B2C marketplace or a separate product line.

## Branch A — Outdoor AR

Use case:

> "Telefon kamerasini arsaya tutayim, onerilen bina kutlesini gercek konumunda goreyim."

Recommended technical path:

- Native mobile app required for serious GPS/geospatial AR.
- ARCore Geospatial API / ARKit-compatible approach should be researched.
- Web `<model-viewer>` can only be a lightweight preview; it is not a true parcel-anchored AR solution.

Risks:

- Street View / VPS coverage in Turkey may be uneven.
- Native app adds distribution and maintenance cost.
- Legal/expectation risk if users treat approximate AR placement as official approval.

## Branch B — Interior Design

Use case:

> "Daire tipini secip ic mekan planini, odalari ve mobilyayi gormek istiyorum."

Recommended technical path:

- Separate product stream after Studio massing succeeds.
- Start with apartment-type templates, not freeform wall drawing.
- If later needed, evaluate Konva/Fabric for 2D plan and react-three-fiber for 3D room.

Risks:

- Asset library cost grows quickly.
- Roomstyler-like quality is a long product investment.
- It may distract from Arsabil's core land/developer feasibility promise.

## Branch C — Furniture Marketplace

Use case:

> "Mobilya markalarinin urunlerini 3D olarak deneyip fiyat/stok ile satin alayim."

Recommended technical path:

- Only after interior design has real usage.
- Requires brand partnerships or data feeds.
- Requires glTF/USDZ model pipeline or photogrammetry process.
- Checkout/BNPL/credit must use licensed providers; Arsabil should not become a lender.

Risks:

- Logistics, returns, stock accuracy and finance compliance.
- B2C marketplace focus may conflict with B2B feasibility SaaS.
- Multi-piece furniture sets multiply 3D production cost.

## Acceptance Principles

- The gate must protect the core Studio MVP from scope explosion.
- Each branch needs a business owner, not only an engineering owner.
- Users should first validate the value of "parcel -> feasibility -> scenario -> offer".
- AR/interior/marketplace should be funded only when evidence justifies the jump.

