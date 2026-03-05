# Category Filter Auto-Nudge UX

# Mobile Responsive Stability Audit (Header/Footer/Cart)

## Goal
Identify and fix intermittent mobile responsive layout glitches:
- Header/icon row occasionally shifts to an incorrect height.
- Footer occasionally shifts upward and overlaps/competes with the bottom cart bar.
- Audit for additional frontend stability/safety risks related to viewport, fixed positioning, and touch interactions.

## Tasks
- [x] **1. Reproduce and locate layout fault lines**
  - Inspect `App.jsx`, `ShippingCalculator.jsx`, `MobileCartDrawer.jsx`, `ProductCard.jsx`.
  - Trace interactions between `dvh`, nested scroll containers, fixed overlays, and transforms.
- [x] **2. Apply minimal targeted fixes**
  - Correct safe-area padding behavior for mobile fixed cart container.
  - Increase/compute bottom spacer so fixed cart pill does not overlap content/footer.
  - Reduce mobile touch-induced transform/hitbox instability in product cards.
  - Remove/limit mobile nested overflow behavior that can cause mid-page footer artifacts.
- [x] **3. Verify and report**
  - Run frontend production build.
  - Document all responsive optimization points with file/line references.
  - Document remaining stability/safety risks and suggested follow-up.

## Review
- Updated viewport/fixed behavior:
  - `frontend/src/App.jsx`: removed `y` transform animation on `motion.main` and added safe-area-aware top padding + `min-h-[100svh]`.
  - `frontend/src/pages/ShippingCalculator.jsx`: disabled mobile nested inner scroll for product list; added safe-area-aware spacer under content for fixed cart pill.
  - `frontend/src/components/MobileCartDrawer.jsx`: replaced non-existent `pb-safe` utility with real `env(safe-area-inset-bottom)` style and added deterministic touch listener cleanup.
  - `frontend/src/components/ProductCard.jsx`: gated hover/3D tilt effects to pointer-fine hover devices to avoid mobile touch hitbox/visual drift.
- Follow-up responsive pass:
  - `frontend/src/components/ScrollToTopButton.jsx`: made mobile bottom offset safe-area-aware.
  - `frontend/src/components/MobileCartDrawer.jsx`: changed drawer cap from `85vh` to `min(85dvh, 85svh)` for viewport-toolbar stability.
  - `frontend/src/components/CategoryTabs.jsx`: increased left/right arrow touch targets to 44px-equivalent on mobile.
- Post-calculate stability pass:
  - `frontend/src/pages/ShippingCalculator.jsx`: switched to resolved scroll-parent targeting with `behavior: "smooth"` and desktop right-panel support, so "計算" now auto-scrolls to result on both mobile and desktop.
  - `frontend/src/components/ScrollToTopButton.jsx`: removed scale-in animation (kept fade/slide only), so button no longer appears as "small then large".
  - `frontend/src/components/ScrollToTopButton.jsx` + `App.jsx` + `ShippingCalculator.jsx`: unified multi-container scroll target detection (`data-scroll-container`) so "Return to top" works even with nested desktop panel scrolling.
- Verification:
  - `cd frontend && npm run build` ✅ (Vite build successful)

# Mobile Cart Drawer Animation Polish

## Goal
Improve mobile cart drawer open/close animation quality to remove visible ghosting and make transitions feel smooth and comfortable.

## Tasks
- [x] **1. Refine drawer transition choreography**
  - Tune open/close easing and duration for both collapsed pill and expanded drawer.
  - Reduce overlap artifacts between entering/exiting states.
- [x] **2. Reduce visual ghosting sources**
  - Adjust motion/render classes (`transform-gpu`, opacity strategy, backdrop treatment) to minimize trails on mobile browsers.
- [x] **3. Verify**
  - Run frontend production build and confirm no regressions.

## Review
- Updated `frontend/src/components/MobileCartDrawer.jsx`:
  - Added tuned non-bouncy tween transitions for drawer and collapsed pill.
  - Set `AnimatePresence` to `initial={false}` and `mode="wait"` for the drawer/pill switch, preventing overlap-induced ghosting.
  - Reworked drawer enter/exit from viewport-relative values (`y: "100%" -> 0`) with opacity support.
  - Added `transform-gpu`/`will-change` hints to animated layers.
  - Reduced backdrop intensity and removed blur from overlay to cut residual trails on mobile GPUs.
- Verification:
  - `cd frontend && npm run build` ✅

## Goal
When a user selects a filter near the right or left edge, auto-nudge the horizontal tab list so adjacent options become visible without manual drag or arrow clicks.

## Tasks
- [x] **1. Add Active-Tab Edge Nudge Logic**
  - Detect active tab position relative to the visible scroll container.
  - If active tab is near the right edge, scroll slightly right.
  - If active tab is near the left edge, scroll slightly left.
- [x] **2. Keep Existing Manual Controls**
  - Preserve current left/right button behavior and scroll visibility indicators.
- [x] **3. Verification**
  - Run frontend build to ensure no regressions.

## Review
- Implemented active-tab edge nudge in `frontend/src/components/CategoryTabs.jsx` using tab refs and threshold-based smooth scroll.
- Preserved existing left/right button scroll behavior and visibility indicators.
- Verified with `cd frontend && npm run build` (pass).

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

---

# Mobile Footer Height Fix

## Goal
Fix the mobile layout issue where footer appears excessively tall (around one-third of viewport) on small screens.

## Tasks
- [x] **1. Identify Root Cause**
  - Inspect footer layout classes and parent flex/scroll container interactions on mobile breakpoints.
- [x] **2. Apply Minimal Layout Fix**
  - Remove/adjust the rule causing artificial vertical expansion while keeping desktop layout behavior unchanged.
- [x] **3. Verification**
  - Run frontend build to ensure no regressions.
  - Confirm footer keeps compact natural height on small screens.

## Review
- Root cause: `mt-auto` on footer inside a mobile flex column created a large auto top margin, which looked like an oversized footer area.
- Fix: updated `frontend/src/App.jsx` footer classes by removing `mt-auto` and reducing mobile vertical padding (`pt-3 pb-2`, preserving larger spacing on `sm+`).
- Additional iPad-landscape root cause: spacer below calculator used `min-[1170px]:hidden`, so 1024px (`lg`) still had a forced `h-24` blank block even though drawer is already hidden at `lg`.
- Additional fix: updated `frontend/src/pages/ShippingCalculator.jsx` spacer to `lg:hidden h-24 shrink-0` so blank space exists only when mobile drawer is actually visible.
- Verification: `cd frontend && npm run build` passed successfully (Vite production build OK).

---

# 3D Packing Animation Upgrade (Ghost + Settle + Camera Follow)

## Goal
Upgrade the 3D packing animation for exhibition impact with: (1) ghost preview before placement, (2) collision-like settle motion, and (3) subtle camera choreography during placement.

## Tasks
- [x] **1. Add Sequenced Placement State**
  - Add a stable sequence loop in `ParcelVisualizer3D` scene (`ghost -> drop -> settle`) per item.
  - Reset sequence when placements change.
- [x] **2. Implement Ghost Preview + Settle Motion**
  - Render a ghost box for the active item before drop.
  - Add a short settle/bounce effect after each item reaches target position.
- [x] **3. Implement Camera Follow Choreography**
  - Add a lightweight camera rig that lerps camera target toward active item during placement.
  - Preserve `OrbitControls` interaction and resume idle auto-rotate after sequence.
- [x] **4. Verification**
  - Run frontend lint/build and confirm no regressions.

## Review
- Implemented in `frontend/src/components/ParcelVisualizer3D.jsx` only (no backend/API changes).
- Updated per feedback to remove ghost preview and camera choreography.
- Changed from full replay to incremental behavior:
  - Existing items keep identity and smoothly transition to new packed positions.
  - Only truly new items play a short `drop -> settle` entry motion.
- Auto-rotate now pauses during new item entry and resumes as slow rotation after entry completes.
- Verification:
  - `cd frontend && npx eslint src/components/ParcelVisualizer3D.jsx` ✅
  - `cd frontend && npm run build` ✅
  - `cd frontend && npm run lint` still reports pre-existing unrelated lint errors in other files (unchanged by this task).

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

---

# Stability Audit & Hardening Plan (2026-03-05)

## Goal
Identify instability root causes across frontend state flow, backend packing APIs, and Supabase connectivity; then define a prioritized hardening plan for production-grade reliability.

## Tasks
- [x] **1. Reproduce and trace cart/3D mismatch path**
  - Traced cart quantity source (`CartPanel`) vs 3D data source (`useCart` -> `calculate/dimensions`).
  - Confirmed stale 3D state can persist when latest dimensions request fails or is overtaken by an older in-flight response.
- [x] **2. Audit frontend async safety and rendering consistency**
  - Reviewed request retry/timeout behavior in `shippingApi`.
  - Reviewed race/cancellation handling in `useCart` and product loading effects in `ShippingCalculator`.
  - Reviewed 3D scene reconciliation path in `ParcelVisualizer3D`.
- [x] **3. Audit backend API data integrity and failure semantics**
  - Compared `/calculate/cart` vs `/calculate/dimensions` validation behavior.
  - Reviewed packing fallback behavior and response semantics in `PackingService`.
  - Checked input validation surface on request DTOs/controllers.
- [x] **4. Audit Supabase/infra resiliency**
  - Reviewed datasource/Hikari/JPA settings and compose startup behavior.
  - Verified current test suite behavior under no-network conditions.
- [x] **5. Verification run**
  - `cd backend && ./mvnw -q -DskipTests compile` ✅
  - `cd backend && ./mvnw -q -Dtest=PackingServiceTest test` ✅
  - `cd frontend && npm run -s build` ✅
  - `cd frontend && npm run -s lint` ❌ (18 existing lint violations)
  - `cd backend && ./mvnw -q test` ❌ (`SmartshipApplicationTests` fails when Supabase host cannot resolve)

## Review
- Primary root cause for the reported mismatch is asynchronous state drift: cart UI is local optimistic state, while 3D preview depends on async backend dimensions with no request sequencing, no cancellation, no timeout, and silent stale-state retention on error.
- Secondary instability source is backend data-integrity mismatch: `/calculate/dimensions` silently drops unknown product IDs (unlike `/calculate/cart`), allowing item-count drift without explicit error.
- Current reliability baseline is weak for CI/offline environments: context-load test hard-depends on Supabase DNS/network and fails without connectivity.
- Hardening plan is prepared with P0/P1/P2 phases covering frontend consistency, API contracts, validation/rate limits, Supabase resilience, and observability.

---

# Stability Hardening Implementation (2026-03-05)

## Goal
Implement all identified high-impact stability fixes across frontend preview sync, backend validation/limits, and Supabase-connected runtime/test resilience.

## Tasks
- [x] **1. Frontend preview sync hardening**
  - Added request timeout + abort propagation in `frontend/src/api/shippingApi.js`.
  - Added stale-request cancellation and version gating in `frontend/src/hooks/useCart.js`.
  - Added explicit preview loading/error state with retry action in `frontend/src/pages/ShippingCalculator.jsx`.
  - Added loading placeholder support in `frontend/src/components/ParcelVisualizer3D.jsx`.
- [x] **2. Frontend fetch race hardening**
  - Added `AbortController` cleanup for categories/products fetch effects in `ShippingCalculator`.
- [x] **3. Backend API contract hardening**
  - Added bean validation constraints to cart/manual request DTOs.
  - Unified cart expansion and validation path for `/calculate/cart` and `/calculate/dimensions`.
  - Added unknown-ID rejection parity and expanded-item upper bound guard.
  - Added explicit preview-unavailable 503 when dimensions packing result is invalid/empty.
- [x] **4. Backend abuse/stability guards**
  - Added rate limiting filter on `/api/shipping/calculate*` endpoints.
  - Tightened default CORS policy by removing broad wildcard origin pattern.
- [x] **5. Supabase/runtime & test resilience**
  - Added Hikari lifecycle tuning knobs and health probe properties.
  - Added actuator dependency and readiness endpoint exposure.
  - Added Docker backend healthcheck and `depends_on: service_healthy`.
  - Added isolated test profile (`H2`) so context-load test no longer depends on Supabase network.
  - Added Mockito mock-maker fallback config to prevent JVM attach test failures.
- [x] **6. Docs/env sync**
  - Updated `.env.example` and README with new stability-related settings.

## Review
- Cart and 3D preview are now synchronized by request versioning and cancellation semantics instead of best-effort timing.
- Preview no longer silently displays stale old dimensions after failed requests; users now get explicit status and retry.
- Backend now rejects inconsistent or oversized cart payloads deterministically and applies the same validation for both calculate endpoints.
- Supabase/network instability is isolated from test context by dedicated test profile; `backend` tests can run offline in CI/local.
- Verification:
  - `cd backend && ./mvnw -q -DskipTests compile` ✅
  - `cd backend && ./mvnw -q test` ✅
  - `cd frontend && npm run -s build` ✅
  - `cd frontend && npx eslint src/api/shippingApi.js src/hooks/useCart.js src/pages/ShippingCalculator.jsx src/components/ParcelVisualizer3D.jsx` ✅

---

# 3D UX Animation Continuity Update (2026-03-05)

## Goal
Remove disruptive loading indicator during add-to-cart updates and keep a continuous 3D animation where existing items smoothly reposition and only newly added items play entry motion.

## Tasks
- [x] **1. Remove spinner-based interruption**
  - Removed `loading` gate/spinner from `ParcelVisualizer3D`.
  - Stopped passing loading prop from `ShippingCalculator`.
- [x] **2. Preserve previous 3D state during refresh**
  - Removed eager `setPackedDimensions(null)` in `useCart` so canvas state is retained while new packing result is fetched.
- [x] **3. Improve animation identity matching**
  - Updated placement matching key to ignore color changes, reducing false "all items are new" animation resets.
- [x] **4. Verify**
  - `cd frontend && npx eslint src/hooks/useCart.js src/pages/ShippingCalculator.jsx src/components/ParcelVisualizer3D.jsx` ✅
  - `cd frontend && npm run -s build` ✅

## Review
- 3D preview now stays visible continuously during cart updates without loading icon flicker.
- Existing boxes transition to new positions; newly introduced boxes keep entry animation behavior.

---

# Header Vote Badge Visual Upgrade

## Goal
Make the `IT21-219 に投票してね！🙌` badge more eye-catching with a stronger animated border treatment.

## Tasks
- [x] **1. Redesign Badge Container**
  - Replace current flat animated strip with a more dynamic moving border effect.
- [x] **2. Keep Readability**
  - Ensure text contrast and layout remain clear across mobile and desktop.
- [x] **3. Verification**
  - Run frontend build and confirm no style/runtime regressions.

## Review
- Replaced vote badge border with rotating `conic-gradient` ring and subtle glow using `.vote-badge` styles in `frontend/src/index.css`.
- Kept content readability by using a semi-opaque white inner capsule (`.vote-badge-core`) and high-contrast text.
- Added a light waving animation to `🙌` (`.vote-badge-wave`) and disabled motion under `prefers-reduced-motion`.
- Verified with `cd frontend && npm run build` (pass).
- Follow-up (Option 1 / Champagne Ring): slowed ring animation to `12s`, switched palette to champagne-gold metallic tones, softened glow/shadow, and removed waving emoji motion for a more premium and calm style.

---

# Deploy Frontend + Backend from Current Branch (2026-03-05)

## Goal
Deploy both frontend and backend using the currently checked out branch (`animation-feature`) as the source of truth.

## Tasks
- [x] **1. Confirm branch and deployment path**
  - Confirm current git branch and repository deploy instructions.
  - Confirm frontend will deploy from current branch (Vercel preview path) and backend from current working tree.
- [ ] **2. Deploy frontend from current branch**
  - Push current branch to remote to trigger Vercel branch deployment.
  - Capture resulting remote update state.
- [x] **2. Deploy frontend from current branch**
  - Pushed `animation-feature` and created one empty trigger commit to force a fresh branch deploy.
  - Verified GitHub commit status `Vercel: success` for commit `b3f0152`.
- [x] **3. Deploy backend to Azure Container Apps**
  - Build and push backend container image from current branch code via ACR.
  - Update Azure Container App to the newly built image.
- [x] **4. Verify deployment status**
  - Verify branch push and backend container app provisioning status.

## Review
- Branch in use: `animation-feature`.
- Frontend:
  - Trigger commit: `b3f0152`.
  - GitHub status: `Vercel` = `success`.
  - Deploy URL: `https://vercel.com/rexs-projects-6b1bf957/smartship/F18bkgGiQ32PJ4fMGVrj19VQvJW9`.
- Backend:
  - ACR builds: `ce1` (latest), `ce2` (latest + `b3f0152` tag).
  - Deployed image: `smartshipacr.azurecr.io/smartship-backend:b3f0152`.
  - Container App state: `provisioningState=Succeeded`, `runningStatus=Running`.
  - Active revisions include new `smartship-backend--0000002` (created `2026-03-05T07:48:00Z`).

---

# Deployment Runbook Documentation (2026-03-05)

## Goal
Document the fastest repeatable deployment flow for frontend (Vercel) and backend (Azure Container Apps).

## Tasks
- [x] **1. Capture production flow**
  - Feature branch merge path to production branch (`master`) for Vercel production URL.
- [x] **2. Capture backend release flow**
  - ACR build and container app update using commit-tagged image.
- [x] **3. Capture verification flow**
  - Vercel status check, Azure revision/image check, and API/CORS smoke checks.
- [x] **4. Link from README**
  - Add direct pointer so next deployment follows same runbook.

## Review
- Added `docs/deployment_runbook.md`.
- Added runbook link under `README.md` Deployment section.

---

# Extended Display Viewer Implementation

## Goal
Implement `docs/extended_display_plan.md` so a separate `#/viewer` window can render the 3D packing animation in real time via `BroadcastChannel`, while the main app remains unchanged.

## Tasks
- [x] **1. Plan + scope check**
  - Read `docs/extended_display_plan.md` and map required files/changes.
- [x] **2. Broadcast channel hook + cart sender**
  - Add `frontend/src/hooks/useViewerBroadcast.js`.
  - Integrate sender broadcasts in `frontend/src/hooks/useCart.js`.
- [x] **3. Export reusable 3D scene primitives**
  - Export `Scene` and `CanvasErrorBoundary` from `frontend/src/components/ParcelVisualizer3D.jsx`.
- [x] **4. Add viewer page + hash route**
  - Add `frontend/src/pages/PackingViewer.jsx`.
  - Update `frontend/src/main.jsx` to render viewer only on `#/viewer`.
- [x] **5. Verification + review note**
  - Run `cd frontend && npm run build`.
  - Document implementation results in this section.

## Review
- Added `frontend/src/hooks/useViewerBroadcast.js` with:
  - `useBroadcastSender()` for posting `CART_UPDATE` events on `smartship-viewer`.
  - `useBroadcastReceiver()` for viewer-side state sync (`dimensions`, `placements`, `mode`, `connected`).
  - BroadcastChannel support guard for safe no-op behavior when unsupported.
- Updated `frontend/src/hooks/useCart.js`:
  - Wired `useBroadcastSender()`.
  - Broadcasts latest packed payload whenever `packedDimensions` changes.
  - Sends explicit clear payload in `clearCart()`.
- Updated `frontend/src/components/ParcelVisualizer3D.jsx`:
  - Exported `Scene`.
  - Exported `CanvasErrorBoundary`.
- Added `frontend/src/pages/PackingViewer.jsx`:
  - Fullscreen dark viewer with loading/connection state.
  - Reuses shared `Scene`/`CanvasErrorBoundary`.
  - Includes fallback single box rendering when only dimensions exist.
- Updated `frontend/src/main.jsx`:
  - Added lightweight hash route switch.
  - Renders `PackingViewer` only when hash is `#/viewer`; otherwise keeps existing `App`.
- Verification:
  - `cd frontend && npm run build` ✅
