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
