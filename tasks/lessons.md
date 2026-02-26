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
