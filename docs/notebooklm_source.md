# Project SmartShip: Comprehensive Documentation for AI Analysis

## 1. Executive Summary
**SmartShip** is a modernized shipping calculation engine designed to solve the complexity of Japanese logistics pricing. Unlike traditional calculators that perform simple linear addition, SmartShip utilizes a specific **3D Bin Packing Algorithm** to simulate the physical packing of items, resulting in highly accurate cost estimates and significant user savings.

## 2. Technical Architecture

### Tech Stack
*   **Frontend**: React 19, Vite, Tailwind CSS. Features a custom **CSS-based 3D Visualizer** (lightweight, no WebGL libraries) for real-time box simulation.
*   **Backend**: Spring Boot 3 (Java 21). Handles the core logic and packing simulations.
*   **Database**: Supabase (PostgreSQL) for product and carrier data.
*   **Library**: `com.github.skjolber:3d-bin-container-packing` (Version 4.1.0).

### Core Algorithm: "BruteForcePackager"
The system does NOT use simple stacking ($Height = \sum h_i$). Instead, it uses a **Brute Force 3D Packing** approach.

*   **Mechanism**: The algorithm iterates through **all possible permutations** of item orders.
*   **Rotation**: It utilizes the `.withRotate3D()` configuration, testing **all 6 possible 3D orientations** for every item to find the optimal fit (e.g., laying a tall bottle flat).
*   **Heuristic**: It employs a **Largest Area Fit First (LAFF)** strategy, prioritizing the filling of the "floor" area $(x, y)$ to minimize vertical height usage.
*   **Result**: This allows items to be placed side-by-side or in complex 3D arrangements, achieving a packing efficiency that mimics human intelligence (Tetris-style packing).

## 3. The "Why" (Business Value)

### The Problem
*   Logistics in Japan (Yamato, Japan Post) has complex tiered pricing based on size (60/80/100) and weight.
*   Users struggle to select the correct box from charts (e.g., Mercari lists), leading to overpayment (selecting a too-large box) or rejection (box too small).
*   Simple calculators fail because they cannot account for spatial geometry (e.g., nesting items).

### The Solution (SmartShip)
*   **Visual Confidence**: Real-time 3D feedback proves to the user *why* a box was selected.
*   **Visual Reference**: Displays common objects (Soda Can, Smartphone) next to the box for scale.
*   **transparency**: If a cheaper option is rejected, the system explains exactly why (e.g., "Height exceeds Nekopos limit by 2mm").

## 4. Key Features for Demo
1.  **Real-Time 3D Visualization**: As items are added, the box grows instantly.
2.  **Reference Objects**: Users can toggle a 3D "Soda Can" or "Smartphone" inside the scene to judge scale.
3.  **Manual Mode**: Users can override the algorithm for edge cases.
4.  **Instant Comparison**: Compares 20+ carrier services (Nekopos, Yu-Pack, etc.) in milliseconds.

## 5. Contest Strategy Tips
*   **Highlight the "Custom 3D"**: Emphasize that the frontend visualizer is custom-built with CSS transforms, showing deep understanding of rendering fundamentals.
*   **Highlight the ".withRotate3D()"**: This single line of code enables the "smart" horizontal placement behavior, distinguishing this project from basic school projects.
