# Lessons Learned

## 1. Arrow function hoisting
- **Mistake**: Defined `playAnimation` as `const` arrow function after the `useEffect` that called it.
- **Rule**: Always define functions BEFORE they are referenced in hooks. `const` arrow functions are NOT hoisted.

## 2. useEffect on array references
- **Mistake**: Used `useEffect(() => ..., [placements])` where `placements` was `someArray || []`. The `|| []` creates a new empty array on every render, making the effect fire infinitely.
- **Rule**: When tracking array changes in `useEffect`, depend on a **stable primitive** like `placements.length` or `JSON.stringify(placements)`, not the array reference itself. Or use `useMemo` in the parent to stabilize the reference.

## 3. Null guards in Three.js scenes
- **Mistake**: Did not guard against `dimensions` being null when passed to `getReferenceModel()` and `ShippingBox`.
- **Rule**: Always add null/existence checks for props used in 3D scene components, since data often arrives asynchronously.

## 4. Packing regressions need real scenario anchors
- **Mistake**: Accepted a synthetic packing regression case as sufficient while the user-reported real cart case still failed.
- **Rule**: For packing/layout bugs, always add at least one test that mirrors the user-reported geometry pattern (or exact SKU dimensions) and verify the production path (`calculatePackedResultLibrary` when `USE_LIBRARY_ONLY=true`).

## 5. Respect local-only investigation constraints
- **Mistake**: Started querying external data tooling when the user asked to investigate locally.
- **Rule**: If the user says to stay local, restrict investigation to repository code, local configs, and local test reproduction; do not call external data sources.

## 6. Container-first packing can bias global size
- **Mistake**: Relied on trying standard containers first and only doing local compaction, which can preserve protruding placements and inflate the overall bounding box.
- **Rule**: For global dimension quality issues, run a dedicated bounding-box minimization phase (Extreme Points rebuild) after extraction and score candidates on the final global box, not container trial order.

## 7. When asked for library-only behavior, remove heuristics from active path
- **Mistake**: Kept adding custom optimization layers after the user explicitly asked to rely on upstream library behavior.
- **Rule**: If the user requests \"library-only\" packing, implement a direct library path (single packer flow) and disable custom strategy sweeps/post-process fallback chains in the active code path.

## 8. Startup stability needs both backend resilience and frontend retry
- **Mistake**: Treated load flakiness as only algorithm/code debt without verifying boot/runtime failures and first-request behavior.
- **Rule**: For \"need multiple refreshes\" issues, always (1) reproduce backend boot logs, (2) harden datasource startup config, and (3) add frontend retry/backoff for initial API reads.

## 9. Re-verify Docker startup after JPA property changes
- **Mistake**: Changed Hibernate startup properties without validating `docker-compose up --build`, which introduced a dialect-resolution startup failure.
- **Rule**: Any change to datasource/JPA boot properties must be verified with both local Maven run and Docker Compose startup before closing the task.

## 10. Packer placements are not always gravity-stable for visualization
- **Mistake**: Assumed native library placements were always visually grounded, so frontend rendered raw coordinates directly.
- **Rule**: When using backend placements for 3D UI, always run a support/stability pass (or equivalent validation) before rendering so `z > 0` items are not shown floating without support.

## 11. Placement identity must not depend on placement iteration order
- **Mistake**: Assigned placement names by loop index (`items[colorIndex]`) instead of using the actual packed box identity, causing item-name/geometry mismatch and unstable animation keys.
- **Rule**: Always attach and return a stable per-item identifier from pack request to pack result (e.g., box ID), then derive UI identity from that identifier, not from result ordering.

## 12. Avoid edge-only top-drop effects in production diagnostic views
- **Mistake**: New-item drop animation rendered white edges before solid mesh settled, which users correctly interpreted as persistent floating defects.
- **Rule**: For operational 3D previews, prioritize stable final-coordinate transitions over cinematic top-drop effects unless an explicit playback mode is enabled.

## 13. Exhibition animation updates should be incremental, not full replay
- **Mistake**: Implemented a full packing replay flow (`ghost -> sequential playback`) for every placement update, which made add-item interactions feel repetitive and less responsive.
- **Rule**: For interactive 3D packing UX, preserve existing item continuity and animate only deltas (new items entry + existing items reposition transition); avoid resetting the whole sequence unless the user explicitly requests replay mode.

## 14. Scroll target must match the actual scrolling container
- **Mistake**: Wired auto-scroll and "Back to top" to only one container (`mainRef`), while desktop used a different nested scroll container and mobile had post-calc scroll timing differences.
- **Rule**: For mixed layouts (main scroll + nested panel scroll), always resolve and control the actual active scroll container(s) for both auto-navigation and "back to top". Verify behavior separately on mobile and desktop after action-triggered rerenders.

## 15. Mobile drawer animations need overlap control and low-trail layers
- **Mistake**: Used default presence choreography and blur-heavy overlay in a bottom drawer transition, which caused visible ghosting on mobile during open/close.
- **Rule**: For mobile bottom sheets, prefer deterministic enter/exit sequencing (`AnimatePresence mode=\"wait\"` when swapping states), GPU-friendly transforms, and lighter overlay effects over blur-heavy backdrops.

## 16. Secondary display UI must stay semantically aligned with primary view
- **Mistake**: Viewer waiting state used a custom spinning loader and did not surface reference-object text clearly, diverging from main-view UI semantics and reducing readability in expo mode.
- **Rule**: For mirrored/secondary display flows, reuse the same status icon language as the primary screen and ensure essential context labels (e.g., reference object) are always rendered in a high-contrast, prominent overlay.

## 17. Viewer framing tweaks must preserve scene-level size normalization
- **Mistake**: Viewer felt too far, but a broad change risked touching shared scene scaling and breaking product-size-based zoom behavior.
- **Rule**: When tuning viewer composition, adjust only viewer-local camera framing (position/FOV) and keep shared `Scene`/`maxDim` normalization logic untouched.
