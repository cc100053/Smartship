# Supercharge 3D Visualization

## Goal
Make the 3D packing visualization more impressive for the school expo and presentation by adding a step-by-step packing animation and a transparent outer shipping box (glass effect).

## Tasks
- [x] **1. Transparent Outer Box (Glass Effect)**
  - Use `dimensions` (length, width, height) of the selected shipping method from the props.
  - Render a semi-transparent outer bounding box in the `Scene` component to represent the shipping box.
  - Ensure the coordinate system matches the packed items so they sit inside perfectly.

- [x] **2. Step-by-Step Packing Animation**
  - Add an animation state (e.g., `visibleItemsCount` and `isAnimating`).
  - Add a "Play Animation" control button to the UI.
  - Implement a visual drop-in or slide-in effect for each item sequentially as they are "packed" into the box.

- [x] **3. Environment & Lighting Polish**
  - Enhance the Three.js lighting and materials to make the boxes pop out more.
  - Give the items slightly varying colors or textures if possible to make them distinct.

## Review
- **Functionality Verification**: Verified the component builds cleanly (`npm run build`). Added the `ShippingBox` bounding component, animation scaling states, and `setInterval`-based timed drop animations.
- **Self-Review (Elegance & Impact)**: Used React Three Fiber standard `useFrame` interpolation instead of adding heavy animation libraries. The added functionality handles coordinate mapping efficiently by using the pre-existing max dimensions.
- **Action**: Ready to test interactively.

---

# Packing Regression Investigation (Small Item Inflates Size)

## Goal
Investigate and fix the case where a small added item is placed in a way that increases overall `L+W+H` unnecessarily (e.g., protruding yellow item in 3D view).

## Tasks
- [x] **1. Strengthen Library Path Packing**
  - Add a brute-force candidate pack in `USE_LIBRARY_ONLY` flow for small item counts.
  - Compare LAFF vs brute results by existing score function and keep the better result.
- [x] **2. Improve Top-Surface Gap Compaction**
  - Expand stack compaction from a single anchor (`support.x/s.y`) to multiple candidate anchors within support footprint.
  - Keep strict overlap and score-improvement gates.
- [x] **3. Safety Guard for Slide Pass**
  - Ensure slide pass does not accept overlap-causing moves.
- [x] **4. Verification**
  - Run packing tests when Java 21 is available.
  - If local runtime blocks tests, document limitation and required env.

## Review
- **Code changes completed**:
  - Added multi-candidate library packing (`Fast LAFF`, `LAFF`, and brute-force for small carts), then selected the best by packing score.
  - Added multi-anchor top-surface search for stacking compaction (instead of only support origin anchor).
  - Added overlap guard in slide compaction pass.
  - Added flat-layout preservation guard: skip stack-up pass when current packed height is already `<= 3.0cm`.
  - Set fallback container max-load to geometry-only values for dimension estimation (weight is validated separately in `ShippingMatcher`).
  - Added regression test `testCompactionCanUseNonCornerTopGap`.
- **Verification run**:
  - Ran with Java 21 explicitly:
    - `JAVA_HOME=$(/usr/libexec/java_home -v 21) PATH="$JAVA_HOME/bin:$PATH" ./mvnw clean test -Dtest=PackingServiceTest`
  - Result: all tests passed (`Tests run: 8, Failures: 0, Errors: 0`).

---

# Carrier-Specific Matching Fix

## Goal
Fix false size-class rejection by using carrier-specific packing results for size-sum checks instead of global packed dimensions.

## Tasks
- [x] **1. Add Carrier-Specific Packing API**
  - Implement `calculatePackedResultForCarrier(items, carrier)` in `PackingService`.
  - Reuse multi-strategy sorting and multiple packers against a single carrier container.
- [x] **2. Update ShippingMatcher Logic**
  - Remove global `dims.getSizeSum()` hard prefilter.
  - Validate size-sum using carrier-specific packed dimensions.
  - Improve why-not reason to use carrier-specific failure reason when available.
- [x] **3. Verification**
  - Run `PackingServiceTest` on Java 21.
  - Ensure backend compiles cleanly after `ShippingMatcher` update.

## Review
- **Implemented**:
  - Added `calculatePackedResultForCarrier(List<ProductReference>, ShippingCarrier)` and carrier-only pack flow in `PackingService`.
  - Added single-carrier multi-strategy + multi-packager candidate search without huge-container fallback.
  - Updated `ShippingMatcher` to use carrier-specific packed result for fit and size-sum checks.
  - Removed global packed `dims.getSizeSum()` hard prefilter from matching path.
  - Added carrier-specific not-fit reasons and used them in recommended option "why not" text.
- **Verification**:
  - Compile: `JAVA_HOME=$(/usr/libexec/java_home -v 21) PATH="$JAVA_HOME/bin:$PATH" ./mvnw -q -DskipTests compile` ✅
  - Tests: `JAVA_HOME=$(/usr/libexec/java_home -v 21) PATH="$JAVA_HOME/bin:$PATH" ./mvnw test -Dtest=PackingServiceTest` ✅
  - Result: `Tests run: 8, Failures: 0, Errors: 0`.

---

# Plush Compression Root Cause Fix

## Goal
Fix the mismatch where UI claims plush compression for Japanese plush names, but backend applied 0.6 compression only for English `"plush"` names.

## Tasks
- [x] **1. Unify Compression Detection**
  - Added shared compression helper in `PackingService`.
  - Plush detection now checks `name` and `nameJp` for `plush`, `ぬいぐるみ`, `ちびぐるみ`.
  - Fashion detection now supports both `Fashion` and `ファッション`.
- [x] **2. Remove Debug Noise**
  - Removed temporary noisy pass-0 `System.out` debug logs.
- [x] **3. Add Regression Test**
  - Added test verifying Japanese plush names are compressed equivalently to English plush keyword names.
- [x] **4. Verification**
  - Ran `./mvnw test -Dtest=PackingServiceTest` on Java 21.

## Review
- `PackingServiceTest` now passes with 9 tests, including plush-name regression.
