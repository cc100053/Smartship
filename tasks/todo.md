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

---

# Extreme Points Bounding Box Minimization

## Goal
Replace the library packing path from "try standard containers" to a true "minimize bounding box" flow so small items are not placed in protruding positions that inflate total dimensions.

## Tasks
- [x] **1. Switch library path to huge-container-first extraction**
  - Keep multiple packers (Fast LAFF / LAFF / optional brute-force) for seed placements.
  - Remove dependency on fallback-container trial order for `calculatePackedResultLibrary`.
- [x] **2. Implement Extreme Points minimization pass**
  - Rebuild placements with greedy Extreme Points search.
  - For each item, evaluate candidate points and choose the placement minimizing global bounding-box score.
  - Keep collision safety and normalize coordinates.
- [x] **3. Integrate EP pass in candidate scoring**
  - Score candidates after EP minimization (and existing compaction, if still beneficial).
  - Return best result by existing score tie-breakers.
- [x] **4. Add regression verification**
  - Add/update backend tests for small-item protrusion and EP behavior.
  - Run `PackingServiceTest`.
- [x] **5. Documentation sync**
  - Update `memory-bank/packing-logic.md` with new production path.

## Review
- Updated `calculatePackedResultLibrary` to use huge-container extraction for all packers, then `minimizeBoundingBoxWithExtremePoints` + `compactPlacements`.
- Added Extreme Points rebuild implementation in `PackingService` with support/collision checks, tie-breakers, and a flat-profile guard (`<=3.0cm` seed height).
- Added regression test `testExtremePointsMinimizationRemovesProtrusion` in `PackingServiceTest`.
- Verified with:
  - `cd backend && ./mvnw -q -Dtest=PackingServiceTest test`
  - Result: pass (`Failures: 0, Errors: 0`).

---

# Native Library-Only Packing Refactor

## Goal
Use `3d-bin-container-packing` native behavior directly and remove custom packing heuristics/fallback chains from the active path.

## Tasks
- [x] **1. Align with upstream usage**
  - Reviewed upstream repository packing API usage and packager options.
- [x] **2. Remove custom active-path heuristics**
  - Switched active `calculatePackedResultLibrary` flow to single `LargestAreaFitFirstPackager` call.
  - Removed active-path sort strategy sweep, extreme-points pass, custom compaction, and huge-container retry chain.
- [x] **3. Apply same native path for carrier checks**
  - Updated `canFit` and `calculatePackedResultForCarrier` to use native LAFF path with raw dimensions.
- [x] **4. Verify**
  - Ran backend packing tests and compile.
- [x] **5. Documentation sync**
  - Updated `memory-bank/packing-logic.md` to match current active behavior.

## Review
- Code now uses library-native LAFF packing directly in active paths.
- Verification:
  - `cd backend && ./mvnw -q -Dtest=PackingServiceTest test` ✅
  - `cd backend && ./mvnw -q -DskipTests compile` ✅

---

# 3D Preview Fallback Rendering Fix

## Goal
Make 3D preview render even when backend returns dimensions but no per-item placements.

## Tasks
- [x] **1. Identify render gate bug**
  - Confirmed canvas was gated by `placements.length > 0`.
- [x] **2. Add fallback placement rendering**
  - Generate a synthetic placement from packed dimensions when placements are empty.
  - Keep existing real placements path unchanged.
- [x] **3. Validate scene helpers**
  - Updated reference object positioning to work with dimension-only fallback.
- [x] **4. Verify frontend build**
  - Run `npm run build` in frontend.
 
## Review
- Updated `ParcelVisualizer3D` to render from `displayPlacements`, which falls back to a synthetic dimension-based box when API placements are empty.
- Kept normal per-item placement rendering unchanged when placements are present.
- Verified with:
  - `cd frontend && npm run build` ✅
  - Result: build succeeded.

---

# Backend Load Stability Cleanup

## Goal
Stop first-load failures that force manual page refreshes, and remove stale config/code that contributes to unstable startup behavior.

## Tasks
- [x] **1. Frontend retry hardening**
  - Add retry/backoff for initial product/category API fetches so cold backend startup does not require manual refresh.
- [x] **2. Backend startup resilience config**
  - Harden datasource/Hibernate startup settings to avoid crashy startup on transient DB issues.
- [x] **3. Remove stale backend noise/config**
  - Remove legacy debug `System.out` logs and outdated config mismatches.
  - Add missing `.env.example` referenced by README.
- [x] **4. Verification**
  - Run backend compile/tests and frontend build.
- [x] **5. Docs sync**
  - Update README/setup notes and task review.

## Review
- Root-cause signal found during reproduction: backend can fail startup with DB auth errors (`FATAL: Tenant or user not found`), and frontend initial fetch previously had no retry path.
- Added API retry/backoff in `frontend/src/api/shippingApi.js` for initial reads and lightweight retry for calculation requests.
- Hardened backend startup config in `backend/src/main/resources/application.properties`:
  - Hikari resilience settings (`initialization-fail-timeout=0`, pool/timeout tuning, test query)
  - Reduced startup fragility (`ddl-auto=none`, `hibernate.boot.allow_jdbc_metadata_access=false`)
  - Added `app.frontend-extra-origins` support.
- Replaced hard-coded CORS origins with env-driven list in `backend/src/main/java/com/smartship/config/CorsConfig.java`.
- Removed stale debug logging noise from backend service/controller.
- Added missing `.env.example` and updated README setup notes with Supabase username format troubleshooting.
- Verification:
  - `cd backend && ./mvnw -q -DskipTests compile` ✅
  - `cd backend && ./mvnw -q -Dtest=PackingServiceTest test` ✅
  - `cd frontend && npm run build` ✅

---

# Docker Compose Startup Regression Fix

## Goal
Restore `docker-compose up --build` startup after backend config hardening introduced a JPA initialization regression.

## Tasks
- [x] **1. Reproduce compose failure**
  - Captured backend crash loop and root error from container logs.
- [x] **2. Fix JPA dialect initialization regression**
  - Restored explicit Hibernate dialect setting.
  - Removed metadata-access disable that prevented dialect resolution at startup.
- [x] **3. Re-verify compose boot**
  - Re-ran `docker-compose up --build` and confirmed backend reached `Started SmartshipApplication`.

## Review
- Root cause: `spring.jpa.properties.hibernate.boot.allow_jdbc_metadata_access=false` combined with removed explicit dialect caused `Unable to determine Dialect without JDBC metadata` during container startup.
- Applied fix in `backend/src/main/resources/application.properties`:
  - `spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect`
  - removed `hibernate.boot.allow_jdbc_metadata_access=false`
  - kept datasource resilience settings and frontend retry hardening.
- Verification:
  - `docker-compose up --build` ✅
  - `docker-compose ps` shows both `backend` and `frontend` containers `Up` ✅
