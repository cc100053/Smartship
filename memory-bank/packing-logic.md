# Current Packing Logic (Backend)

This document describes the current packing behavior in:
- `backend/src/main/java/com/smartship/service/PackingService.java`

## 1. Entry Points

- `calculatePackedResult(List<ProductReference> items)`
  - Main packing result API (`Dimensions + placements`).
  - If `items` is empty: returns zero dimensions.
  - `USE_LIBRARY_ONLY` is currently `true`, so production path goes to `calculatePackedResultLibrary(...)`.

- `calculatePackedDimensions(List<ProductReference> items)`
  - Returns only dimensions by calling `calculatePackedResult(...)`.

- `canFit(List<ProductReference> items, ShippingCarrier carrier)`
  - Carrier-fit check path (used by `ShippingMatcher`).
  - Tries packers in this order for that specific carrier container:
    1. `FastLargestAreaFitFirstPackager`
    2. `LargestAreaFitFirstPackager`
    3. `FastBruteForcePackager` (only when `items.size() <= 6`)

## 2. Item Modeling

- Box item creation uses `withRotate3D()`.
- Compression rules:
  - name contains `"plush"`: `length/width/height * 0.6`
  - category `"Fashion"`: `height * 0.8`
- Dimensions are converted cm -> mm (`toMm`), and output is mm -> cm (`toCm`).

## 3. Library Packing Path (`USE_LIBRARY_ONLY = true`)

`calculatePackedResultLibrary(...)` does multi-strategy ordering and picks the best score.

### 3.1 Sort Strategies Tried

1. `OriginalOrder`
2. `VolumeDesc`
3. `VolumeAsc`
4. `FootprintDesc` (`length * width`)
5. `HeightDesc`

For each strategy, `tryPackWithSortLibrary(...)` is executed and scored.

### 3.2 Packager Candidates per Strategy

Inside `tryPackWithSortLibrary(...)`, candidates are attempted and compared:

1. `FastLargestAreaFitFirstPackager` (deadline ~1000ms)
2. `LargestAreaFitFirstPackager` (deadline ~1500ms)
3. `FastBruteForcePackager` when `items.size() <= BRUTE_FORCE_ITEM_LIMIT` (8) (deadline ~1500ms)

If a candidate fails in fallback containers, it tries a huge container (`3000^3` mm) using `tryPackInHugeContainer(...)` for extraction purposes.

Each successful candidate is converted into placements and then post-processed with `compactPlacements(...)`.

## 4. Scoring and Best-Result Selection

`PackingScore` fields:
- `sizeSum = length + width + height`
- `footprintAspect = max(length,width)/min(length,width)`
- `maxDim`
- `volume`

`isBetter(candidate, best)` tie-break order:
1. Smaller `sizeSum`
2. Smaller `footprintAspect`
3. Smaller `maxDim`
4. Smaller `volume`

This same scoring is used:
- across sort strategies
- across packager candidates
- inside compaction move selection

## 5. Post-Packing Compaction (`compactPlacements`)

Runs on library-path results. `COMPACTION_PASSES = 4` per pass type. Each pass picks the single best move per iteration and applies it greedily.

### 5.0 Pass 0: Defensive Relocation (First Priority)

Goal: prevent items from unnecessarily extending the bounding box. If a small item can be relocated without increasing the total size, do it first.

Steps:
1. For each item, compute the bounding box **without** it (`dimensionsWithout`).
2. If removing the item would shrink the bounding box → this item is an **edge item** (it's extending the box).
3. Generate **all** candidate (x, y, z) positions using anchor points from every other item's edges and surfaces (`generateDefensiveCandidates`):
   - X anchors: origin, left/right edges, right-aligned positions
   - Y anchors: origin, front/back edges, back-aligned positions
   - Z anchors: origin, top/bottom surfaces of every item
   - All combinations of (x, y, z) are tried
4. For each candidate position:
   - Must be collision-free (`wouldOverlap == false`)
   - Must strictly improve the score (`isBetter(candidateScore, fullScore)`)
5. Pick the best-scoring valid move and apply it.

### 5.1 Pass 1: Slide Toward Origin

For each item, computes farthest non-overlapping move toward:
- left (`maxLeft`)
- back (`maxBack`)
- down (`maxDown`)

Move is accepted only if:
- no overlap (`wouldOverlap(...) == false`)
- score strictly improves (`isBetter(candidateScore, baseScore)`)

### 5.2 Pass 2: Gap-Stacking on Supports

Goal: place items on top of others when score improves.

Important guards:
- This pass runs only when current packed height is `> 3.0cm` (to preserve already-flat 3cm envelope layouts).
- Moving item must fit within support footprint.
- Candidate position must be overlap-free.
- Candidate score must strictly improve.

Top-surface search is not single-corner only; it uses `generateTopAnchors(...)`:
- support corners/edges
- edge-aligned anchors derived from nearby placements

## 6. Other Compaction Path (Non-library legacy extraction)

- `extractPackingResult(...)` uses `compactThinPlacements(...)`.
- `compactThinPlacements(...)` is thin-item specific (`THIN_ITEM_HEIGHT_MM = 10`), but this is not the primary production path while `USE_LIBRARY_ONLY = true`.

## 7. Container Sets

- `getLibraryContainers()` currently returns `getFallbackContainers()`.
- Fallback container dimensions include Nekoposu, Yu-Packet Post, Compact, Letter Pack Plus, Size 60/80/100/120/140/160.
- Fallback container `maxLoadWeight` is set to a geometry-only large value (`100_000_000`) because weight eligibility is handled separately in `ShippingMatcher`.

## 8. ShippingMatcher Interaction

- UI dimensions shown to users come from `packingService.calculatePackedResult(...)`.
- Shipping option eligibility uses:
  - weight pre-check
  - size-sum pre-check (`dims.getSizeSum()`)
  - `packingService.canFit(items, carrier)` for geometry per carrier container

So:
- Packing result path is primarily for best packed dimensions/visualization.
- Carrier fit path does independent container-specific geometry checks.
