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
