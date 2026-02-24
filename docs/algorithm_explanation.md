# 3D Packing Algorithm: Logic & Behavior

This document explains the technical logic behind SmartShip's 3D packing algorithm, specifically focusing on how it achieves optimal horizontal placement and orientation, contrasting it with simple vertical stacking.

## 1. Why "Horizontal Placement" over "Vertical Dropping"?

### The Problem with Vertical Dropping (Stacking)
A naive algorithm (often used in basic calculators) simply stacks items on top of each other.
- **Logic**: $Total Height = \sum Item Heights$
- **Result**: It simulates an infinitely thin column where every item is balanced on top of the previous one.
- **Flaw**: It ignores the *width* and *length* of the container. If you have a large box, you can place items *side-by-side* (horizontally), but a stacking algorithm misses this, resulting in a calculated height that is much taller than necessary.

### The SmartShip Approach: 3D Bin Packing
SmartShip leverages the powerful open-source library **[3d-bin-container-packing](https://github.com/skjolber/3d-bin-container-packing)** (by skjolber) to perform sophisticated brute-force packing simulations. Instead of just adding heights, it treats the container as a 3D coordinate system $(x, y, z)$.

- **Logic**: It uses a **Largest Area Fit First (LAFF)** heuristic combined with **Permutation-based Brute Force**.
    1.  It tries **all possible orders** of items.
    2.  It tests **all 6 rotation permutations** for each item (as enabled by `.withRotate3D()`).
    3.  It places items in the first available "free space" that maximizes contact with existing surfaces (minimizing gaps), often filling the "floor" level before stacking up.

- **Result**: If Item A is placed at $(0,0,0)$, the algorithm recognizes the free space at $(x', 0, 0)$. It can place Item B *next to* Item A. This mimics how a human would tetris-pack a box.

This behavior mimics how humans pack a box: filling the bottom layer first before acting on the vertical axis.

## 2. How Orientation is Decided

The algorithm determines the orientation of objects using a specific mechanism in the code (`PackingService.java`).

### The Code Mechanism: `.withRotate3D()`
When creating a box item for the algorithm, we explicitly enable 3D rotation:

```java
Box box = Box.newBuilder()
        .withId(item.getName())
        // ... dimensions ...
        .withRotate3D() // <--- CRITICAL INSTRUCTION
        .build();
```

### The Decision Criteria
The `BruteForcePackager` attempts to fit items into a container by trying permutations. For every item, it considers **6 possible orientations** by swapping dimensions:

1.  Length × Width × Height (Standard)
2.  Width × Length × Height (Rotated 90° on floor)
3.  Length × Height × Width (Tipped on side)
4.  Height × Length × Width
5.  Width × Height × Length
6.  Height × Width × Length

### Step-by-Step Decision Process

1.  **Select Box (Cheapest First)**:
    The system iterates through all available shipping containers, sorted by price (Nekopos -> Compact -> ...). It tries to fit the items into the *cheapest* container first.

2.  **Define Bounds**:
    The algorithm takes the dimensions of the current candidate container (e.g., "Nekopos": $31.2 \times 22.8 \times 3.0$ cm).

3.  **Permutation Search**: It tries to place **Item 1**. It tests all 6 orientations.
    *   *Example*: A book is $20 \times 15 \times 5$ cm.
    *   If placed standard ($h=5$cm), it exceeds Nekopos height limit (3cm). **Fail**.
    *   The algorithm rotates it to lay flat ($h$ becomes one of the smaller dimensions). **Success**.
3.  **Space Tracking**: Once Item 1 is placed, the algorithm marks that 3D space as "occupied".
4.  **Next Item**: For **Item 2**, it looks for the optimal free space.
    *   **Priority**: It generally tries to keep the "bounding box" of all items as small as possible.
    *   If Item 2 fits in the empty space *next* to Item 1 (Horizontal placement), it places it there.
    *   If no floor space is left, only then does it place it *on top* (Vertical placement).

## 3. Interpreting the Behavior

When you see objects placed horizontally in the visualizer, interpret it as follows:

*   **"Efficiency"**: The algorithm proved that placing items side-by-side results in a smaller total package than stacking them.
*   **"Rotation"**: If an item looks "tipped over" compared to its natural state (e.g., a standing botttle laying down), the algorithm determined that this specific orientation was necessary to fit inside the height constraints of the target box (e.g., to fit under the 3cm limit of a low-cost mailer).
