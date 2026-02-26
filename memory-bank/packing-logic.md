# Current Packing Logic (Backend)

This document describes the current packing behavior in:
- `backend/src/main/java/com/smartship/service/PackingService.java`

## 1. Entry Points

- `calculatePackedResult(List<ProductReference> items)`
  - Main packing result API (`Dimensions + placements`).
  - If `items` is empty: returns zero dimensions.
  - `USE_LIBRARY_ONLY` is `true`, so production path uses native library packing in `calculatePackedResultLibrary(...)`.

- `calculatePackedDimensions(List<ProductReference> items)`
  - Returns only dimensions by calling `calculatePackedResult(...)`.

- `canFit(List<ProductReference> items, ShippingCarrier carrier)`
  - Carrier-fit check path (used by `ShippingMatcher`).
  - Uses a single native `LargestAreaFitFirstPackager` attempt against the carrier container.

- `calculatePackedResultForCarrier(List<ProductReference> items, ShippingCarrier carrier)`
  - Uses a single native `LargestAreaFitFirstPackager` attempt for that carrier.
  - Returns `null` when packing fails.

## 2. Native Library Packing Mode (No Custom Post-Processing)

The active paths now use the library flow directly:

1. Build `BoxItem`s from raw item dimensions in original order (`createBoxItemsLibraryNative`).
2. Build `ContainerItem`s from target container(s).
3. Run `LargestAreaFitFirstPackager.newResultBuilder()` with `withMaxContainerCount(1)` and deadline.
4. On success, convert library placements using `buildPackingResult(...)`.

Not applied in the active library path:
- custom sort strategy sweeps
- extreme-points rebuild/minimization
- custom compaction passes
- huge-container fallback for failed packing

If native packing fails, `calculatePackedResultLibrary(...)` returns `basicSum(...)` as a last-resort safeguard.

## 3. Container Set in Library Path

`calculatePackedResultLibrary(...)` currently packs against `getFallbackContainers()`:
- Nekoposu, Yu-Packet Post, Compact, Letter Pack Plus, Size 60/80/100/120/140/160.
- `maxLoadWeight` is geometry-only large (`100_000_000`) for these geometry containers.

The returned dimensions come from actual placement bounds (`buildPackingResult`) rather than container outer size.

## 4. Item Modeling in Active Path

For the active native library path (`calculatePackedResultLibrary`, `canFit`, `calculatePackedResultForCarrier`):
- Dimensions are raw item dimensions (no plush/fashion compression in this path).
- Boxes are created with `withRotate3D()`.
- Units are converted cm -> mm (`toMm`) and output mm -> cm (`toCm`).

## 5. ShippingMatcher Interaction

- UI packed dimensions come from `packingService.calculatePackedResult(...)`.
- Shipping option eligibility uses `packingService.calculatePackedResultForCarrier(...)` per carrier.
- Carrier-fit reasoning remains carrier-specific in `ShippingMatcher`.

## 6. Legacy/Non-Active Methods

`PackingService` still contains legacy custom helpers (sort sweeps, compaction, extreme points, huge-container helper), but they are not used by the active `USE_LIBRARY_ONLY` production path described above.
