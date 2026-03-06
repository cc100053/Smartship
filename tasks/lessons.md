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

## 18. UI language must stay consistent across the whole project
- **Mistake**: Mixed Cantonese copy into a project flow that had already been standardized to Japanese, causing inconsistent runtime UI.
- **Rule**: Once the user sets a project-wide UI language, treat every visible runtime string, toast, modal, and error message as part of that contract and keep them all in the same language unless the user explicitly requests mixed-language copy.

## 19. Scope scroll refactors to the exact panel the user cares about
- **Mistake**: Replaced all nested desktop scrolling with global page scrolling, even though the user still wanted the heavy-content Product Selection panel to keep its own independent scroll.
- **Rule**: For layout/scroll requests, preserve independent scrolling in explicitly content-dense panels unless the user clearly asks to remove those panel-level scroll regions too.

## 20. Dense saved-item shelves should prefer multi-column grids with capped height
- **Mistake**: Left `My Product` and `Liked Product` shelves in a one-card-per-row layout, which wasted vertical space and let the section grow indefinitely.
- **Rule**: For compact product shelves, default to a multi-column grid and cap the visible height to a small number of rows, then use internal scrolling for overflow.

## 21. Avoid duplicate authenticated summaries when badges already carry the counts
- **Mistake**: Kept a second text summary for `My Product` / `Liked Product` counts even though the badge row already exposed the same information.
- **Rule**: In dense headers, if badges already communicate key counts, remove duplicate summary sentences and reserve supporting copy for states that actually need explanation.

## 22. Inline utility forms inside dashboard shelves should be visually compressed
- **Mistake**: Left the add-product form styled like a full feature card, so it dominated the `My Section` area and competed with the actual saved/liked shelves.
- **Rule**: For embedded utility forms inside dense sections, prefer compact spacing, smaller controls, and concise headers so the form supports the page instead of becoming the page.

## 23. Decorative badges in dense utility panels need a clear informational job
- **Mistake**: Added `QUICK SHELF` and `COMPACT FORM` badges that looked polished but did not communicate anything users actually needed.
- **Rule**: In compact utility sections, remove decorative badges unless they encode state, count, or an actionable distinction the user benefits from immediately.

## 24. Outer container whitespace should be tuned separately from internal card spacing
- **Mistake**: Left extra bottom padding on the `My Section` shell after compacting the inner content, so the section still felt taller than necessary.
- **Rule**: After compressing a dense panel, re-check outer container top/bottom padding independently; excess shell padding can erase the benefit of internal compaction.

## 25. When a user asks to tighten spacing again, bias to the shell before touching content
- **Mistake**: First spacing pass on `My Section` still left enough outer bottom padding that the user immediately asked for a further reduction.
- **Rule**: On iterative spacing tweaks, reduce outer shell padding aggressively first and preserve inner content rhythm unless the user points at a specific internal gap.

## 26. Corner actions must reserve space from existing CTA clusters
- **Mistake**: Moved the like button to the card corner without pushing the existing add/delete action cluster away, so controls overlapped.
- **Rule**: When promoting one action to a corner position, explicitly reserve layout space for the remaining action group instead of assuming the old alignment will still fit.

## 27. For stacked card actions, prefer a dedicated action column over absolute overlays
- **Mistake**: Tried to fix the overlap by padding around an absolutely positioned heart button, which still broke once the real card height/action spacing differed from the assumption.
- **Rule**: If a card needs both a top-right secondary action and a primary CTA, use a dedicated right-side flex column so the top and bottom controls participate in layout instead of fighting it.

## 28. Long cart lists should cap the item area before they push primary actions away
- **Mistake**: Let the cart item list expand indefinitely, which made the cart panel keep growing instead of preserving a stable area for totals and the calculate button.
- **Rule**: In cart panels, cap the item-list viewport once it exceeds a small number of visible rows and use internal scrolling so summary/actions stay anchored.

## 29. Header utility actions should default to icon-only when the label is redundant
- **Mistake**: Kept a visible `ログアウト` label even though the surrounding authenticated header already established the account context and the icon conveyed the action.
- **Rule**: In dense header utility areas, prefer icon-only controls with proper `aria-label`s when the text adds clutter more than clarity.

## 30. Logged-out teaser copy should be removed when the section already explains itself elsewhere
- **Mistake**: Left the `ログインすると、よく使う商品とお気に入り商品をここにまとめられます。` helper sentence even though the section structure and login prompt already conveyed the same idea.
- **Rule**: When a UI already includes a dedicated explanation block, remove duplicate teaser copy from the collapsed header to keep the summary row clean.

## 31. Repeated auth actions on the same screen should share one visual language
- **Mistake**: Left the `My Section` login CTA using a different icon, label, and button treatment from the main header login button.
- **Rule**: When the same action appears in multiple places on one screen, reuse the same icon, copy, and button styling unless there is a deliberate hierarchy difference.

## 32. Header hover states should feel responsive without shifting the layout
- **Mistake**: Used a vertical lift hover on the main login button, which made the header feel jumpy when the user only wanted a subtle interactive response.
- **Rule**: In dense header bars, prefer color, glow, shadow, or slight scale hover feedback over upward translation unless motion is explicitly part of the design language.

## 33. Attention-driving CTAs can use stronger hover contrast if they stay layout-safe
- **Mistake**: Kept the vote badge hover too polite, so it reacted but still did not feel like a standout call-to-action.
- **Rule**: For explicit attention CTAs in fixed headers, increase hover contrast through glow, saturation, ring energy, and faster accent motion before resorting to layout-shifting movement.

## 34. Pointer-reactive badges should map motion to cursor position, not fixed hover transforms
- **Mistake**: Boosted the vote badge hover intensity with a fixed rotation, which looked louder but did not actually respond to the user's pointer location.
- **Rule**: For interactive badges meant to feel tactile, drive tilt from pointer position and leave fixed hover transforms to secondary polish only.

## 35. "Always on top" header requests require fixed positioning, not normal-flow styling
- **Mistake**: Left the header in normal document flow, so it scrolled away even after the user explicitly asked for it to stay pinned at the top.
- **Rule**: When the user says a header should remain on top regardless of scroll position, implement viewport-level `fixed` positioning and add a spacer so content does not slide underneath it.

## 36. Fixed wrappers must inherit the same width system as the content column
- **Mistake**: Froze the header with viewport padding math that did not match the main content container, which made the header slightly wider than the sections below and created a visible right-edge mismatch.
- **Rule**: When pinning a centered layout element, keep the fixed wrapper full-width and apply the exact same `max-width + horizontal padding` structure inside it as the main page container; tune the spacer separately for gap size.

## 37. If a pinned element must exactly match sibling section width, keep it in the same layout flow
- **Mistake**: Kept trying to simulate exact column alignment with viewport-level fixed wrappers even after the user still saw a small rightward mismatch.
- **Rule**: When a pinned header must visually match sibling sections exactly, prefer an in-flow `sticky` element inside the shared centered container before reaching for independent fixed wrappers and spacer hacks.

## 38. Stats formulas must follow the product definition the user chooses, not the most rigorous metric by default
- **Mistake**: Proposed a more defensible volume-reduction baseline before locking the user's preferred product-facing definition for the stat.
- **Rule**: When discussing showcase metrics, first align on the user's preferred comparison basis and only then optimize the formula for consistency and implementation simplicity.

## 39. Clickable buttons should not use upward hover motion
- **Mistake**: Left clickable buttons using `hover:-translate-y-*`, including primary actions like `マイ商品に保存`, which made the UI feel jumpy against the user's preferred interaction style.
- **Rule**: For this project, do not use upward hover motion on clickable buttons. Keep hover feedback to color, glow, ring, brightness, or shadow changes that do not shift the button's vertical position.

## 40. Identical repeated actions should reuse the same component, not duplicated styling
- **Mistake**: Left the My Section login button as a separately styled local button even though the user wanted it to be exactly the same as the Header login button.
- **Rule**: When the same action must look identical in multiple places, extract and reuse one shared component instead of copying class strings between files.

## 41. CTA color weight should match the page visual language
- **Mistake**: Kept the integrated `追加` CTA too dark even after the surrounding card/grid had shifted to a softer glassy pastel look, so the button felt bolted on rather than native to the card.
- **Rule**: When a UI is already using light glass/pastel surfaces, prefer lighter glassy CTAs with stronger hover contrast before defaulting to a heavy dark slab. Make the hover obvious through contrast and glow, not just subtle brightness shifts.
## 42. Responsive UI fixes must target the active frontend path, not a legacy duplicate
- **Mistake**: Implemented a header/card UI change in the legacy root src/main/webapp JSP path even though the live responsive product/like interactions were in frontend/src.
- **Rule**: Before editing UI for this repo, confirm the active rendering path by tracing the exact component that owns the reported interaction (App.jsx, page component, or shared card component). Do not assume the first matching header/card file is the one the user is looking at.

## 43. Dashboard polling errors must distinguish backend connectivity from data/query failures
- **Mistake**: Left the stats dashboard showing one generic update-failed message even when the more likely failure mode was that the backend or stats API was simply unavailable.
- **Rule**: For polling dashboards, map network/unreachable failures to an explicit backend-connectivity message and reserve generic update-failed copy for real API/query failures.

## 44. Dashboard controls should stay visually subordinate unless the user explicitly wants them prominent
- **Mistake**: Made the reset control a fixed high-visibility CTA and added a sparkline that pulled attention even though the user preferred the reset action to stay subtle.
- **Rule**: For monitoring dashboards, keep destructive or utility controls low-emphasis and in-flow by default. Only add always-visible/focal widgets like fixed CTAs or sparklines when the user clearly wants that prominence.

## 45. Showcase cards need contrast proof, not just palette intent
- **Mistake**: Left the `Impact Story` card using low-contrast white-on-light treatments that looked acceptable in styling terms but failed in actual readability.
- **Rule**: For dashboard/showcase hero cards, verify text contrast against the real rendered background and prefer darker text or stronger surface separation before adding decorative glow layers.

## 46. "Rolling numbers" means sequential digit motion, not just swapping whole strings
- **Mistake**: Implemented KPI value transitions as an overall text roll, which still skipped the intermediate digit sequence the user expected.
- **Rule**: When the user asks for rolling/odometer numbers, animate each digit through its intermediate numeric sequence (`...7,8,9,0...`) instead of only sliding the old full string out and the new full string in.

## 47. Animated digit rows must use the same measurement basis for row height and translate distance
- **Mistake**: Built odometer digits with row heights sized in `em` but animated their vertical offset in `rem`, so large KPI font sizes caused the translate distance to be too short and digits overlapped.
- **Rule**: For stacked text/digit animations, keep the cell height and transform offset in the same unit system (`em` with `em`, px with px) or derive both from the same measured value before shipping.

## 48. Rolling numeric viewports should animate digits only; units and symbols need their own baseline-safe layer
- **Mistake**: Let `¥ / kg / L` live inside the same clipped rolling viewport as the digits and also kept `helper` / `footnote` as two parallel config fields, which created baseline clipping and needless layout branching.
- **Rule**: For KPI number animations, separate static prefix/unit glyphs from the rolling digit track, and collapse semantically identical config fields into one shared `note` field before polishing layout.

## 49. Decorative display fonts are a bad default for animated KPI numerals
- **Mistake**: Kept KPI values on a Mincho-style display font even after splitting digits and units, which still left punctuation and unit glyphs with inconsistent metrics and apparent baseline drift.
- **Rule**: For animated numeric KPIs, use a dedicated numeric-friendly font/style with consistent tabular/lining metrics across digits, punctuation, prefixes, and units. Keep expressive display fonts for headings, not live counters.

## 50. Visual glyph alignment needs rendered proof, not just semantic baseline cleanup
- **Mistake**: Tried to fix KPI symbol/unit misalignment only by normalizing flex/baseline classes, even after the user-visible issue remained in the rendered UI.
- **Rule**: When adjacent glyphs still look off after structural alignment cleanup, add explicit per-glyph visual offsets (`translateY`, padding, or measured adjustments) and verify the rendered result instead of assuming baseline semantics are sufficient.

## 51. Rolling-number punctuation needs its own optical alignment pass
- **Mistake**: Fixed unit/prefix offsets but left `,` and `.` inside the rolling number track using the default glyph alignment, even though punctuation has different optical height from digits.
- **Rule**: In animated KPI numbers, treat punctuation as a separate glyph class and give it its own configurable offset instead of assuming digit alignment settings will also fit commas and decimal points.

## 52. Large injected numbers are a layout test, not just a data test
- **Mistake**: Verified the stats pipeline with a huge injected event but did not immediately pressure-test whether the KPI card typography still fit once the formatted value gained multiple extra separators/digits.
- **Rule**: When injecting outlier data to validate a dashboard, also add or verify a fit strategy for long formatted values (font-size scaling, tighter gaps, or measured fit) before considering the UI safe.
