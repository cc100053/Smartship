/**
 * Dynamic Reference Object Utilities
 * Provides scale reference for 3D package visualization
 */

/**
 * Selects appropriate reference model based on package's largest dimension.
 * @param {Object} packageDimensions - { lengthCm, widthCm, heightCm }
 * @returns {Object} - { modelPath, name, realWorldSize (cm), color }
 */
export function getReferenceModel(packageDimensions) {
    const { lengthCm = 0, widthCm = 0, heightCm = 0 } = packageDimensions;
    const maxDim = Math.max(lengthCm, widthCm, heightCm);

    if (maxDim < 20) {
        return {
            modelPath: '/models/smartphone.glb',
            name: 'スマートフォン',
            // Approximate real-world bounding box (cm)
            realWorldSize: { width: 7.5, height: 15.0, depth: 0.8 },
            color: '#4FC3F7' // Light blue
        };
    } else if (maxDim < 80) {
        return {
            modelPath: '/models/soda_can.glb',
            name: '缶ジュース',
            realWorldSize: { width: 6.6, height: 12.0, depth: 6.6 },
            color: '#81C784' // Light green
        };
    } else if (maxDim < 160) {
        return {
            modelPath: '/models/office_chair.glb',
            name: 'オフィスチェア',
            realWorldSize: { width: 60, height: 100, depth: 60 },
            color: '#FFB74D' // Orange
        };
    } else {
        return {
            modelPath: '/models/human_silhouette.glb',
            name: '人物 (170cm)',
            realWorldSize: { width: 45, height: 170, depth: 25 },
            color: '#BA68C8' // Purple
        };
    }
}

/**
 * Calculates the Axis-Aligned Bounding Box (AABB) for all placements.
 * Handles coordinate system conversion from packing library to Three.js.
 * 
 * Packing lib: X=width, Y=depth, Z=height
 * Three.js:    X=width, Y=height, Z=depth
 * 
 * @param {Array} placements - Array of { x, y, z, width, depth, height } in mm
 * @returns {Object} - { min, max, center, size } all in mm (packing coordinates)
 */
export function calculateAABB(placements) {
    if (!placements || placements.length === 0) {
        return {
            min: { x: 0, y: 0, z: 0 },
            max: { x: 0, y: 0, z: 0 },
            center: { x: 0, y: 0, z: 0 },
            size: { x: 0, y: 0, z: 0 }
        };
    }

    const min = { x: Infinity, y: Infinity, z: Infinity };
    const max = { x: -Infinity, y: -Infinity, z: -Infinity };

    placements.forEach(p => {
        // In packing coordinates (before Three.js conversion)
        min.x = Math.min(min.x, p.x);
        min.y = Math.min(min.y, p.y);
        min.z = Math.min(min.z, p.z);
        max.x = Math.max(max.x, p.x + p.width);
        max.y = Math.max(max.y, p.y + p.depth);
        max.z = Math.max(max.z, p.z + p.height);
    });

    return {
        min,
        max,
        center: {
            x: (min.x + max.x) / 2,
            y: (min.y + max.y) / 2,
            z: (min.z + max.z) / 2
        },
        size: {
            x: max.x - min.x,
            y: max.y - min.y,
            z: max.z - min.z
        }
    };
}

/**
 * Calculates the position for the reference object to avoid overlap.
 * Places the object to the RIGHT of the package (positive X axis in Three.js).
 * 
 * Formula: Position_X = Package_AABB_Max_X + (ReferenceWidth / 2) + GapPadding
 * 
 * @param {Object} aabb - The AABB of the package group (in mm, packing coords)
 * @param {Object} refSize - { width, height, depth } of reference model (in cm)
 * @param {number} scale - The scene scale factor (scene units per mm)
 * @param {number} gapPaddingCm - Gap between package and reference (default 5cm)
 * @returns {Object} - { x, y, z } position in Three.js scene units
 */
export function calculateReferencePosition(aabb, refSize, scale, gapPaddingCm = 5) {
    // Convert reference size from cm to mm
    const refWidthMm = refSize.width * 10;
    const refHeightMm = refSize.height * 10;
    const refDepthMm = refSize.depth * 10;

    // Gap in mm
    const gapMm = gapPaddingCm * 10;

    // === Three.js Position Calculation ===
    // Three.js X = Packing X (width axis)
    // Three.js Y = Packing Z (height axis) 
    // Three.js Z = Packing Y (depth axis)

    // Position X: Right of package AABB max + half reference width + gap
    const posX = (aabb.max.x + (refWidthMm / 2) + gapMm) * scale;

    // Position Y: Grounded at Y=0, reference model origin at center, so lift by half height
    const posY = (refHeightMm / 2) * scale;

    // Position Z: Center aligned with package center (depth axis)
    // Packing Y -> Three Z
    const posCenterZ = aabb.center.y * scale;

    return { x: posX, y: posY, z: posCenterZ };
}

/**
 * Ghost material properties for the hologram effect
 */
export const GHOST_MATERIAL = {
    color: '#FFFFFF',
    metalness: 0.1,
    roughness: 0.9,
    opacity: 0.4,
    transparent: true,
    depthWrite: false // Prevents z-fighting with transparent objects
};
