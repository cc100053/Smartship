package com.smartship.service;

import com.github.skjolber.packing.api.Box;
import com.github.skjolber.packing.api.BoxItem;
import com.github.skjolber.packing.api.Container;
import com.github.skjolber.packing.api.ContainerItem;
import com.github.skjolber.packing.api.Packager;
import com.github.skjolber.packing.api.PackagerResult;
import com.github.skjolber.packing.api.Placement;
import com.github.skjolber.packing.packer.bruteforce.FastBruteForcePackager;
import com.github.skjolber.packing.packer.laff.FastLargestAreaFitFirstPackager;
import com.github.skjolber.packing.packer.laff.LargestAreaFitFirstPackager;
import com.smartship.dto.Dimensions;
import com.smartship.dto.PackingResult;
import com.smartship.dto.PlacementInfo;
import com.smartship.entity.ProductReference;
import com.smartship.entity.ShippingCarrier;
import com.smartship.repository.ShippingCarrierRepository;
import jakarta.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class PackingService {

    private final ShippingCarrierRepository carrierRepository;

    private static final boolean USE_LIBRARY_ONLY = true;
    private static final int BRUTE_FORCE_ITEM_LIMIT = 8;
    private static final int THIN_ITEM_HEIGHT_MM = 10; // 1 cm
    private static final int COMPACTION_PASSES = 4;

    static {
        System.out.println("[DEBUG] PackingService class loading...");
    }

    @Autowired
    public PackingService(ShippingCarrierRepository carrierRepository) {
        this.carrierRepository = carrierRepository;
    }

    // For tests or non-spring usage
    public PackingService() {
        this.carrierRepository = null;
    }

    @PostConstruct
    public void init() {
        System.out.println("[DEBUG] PackingService bean initialized!");
    }

    private static final double SOFT_ITEM_COMPRESSION = 0.8;
    private static final double PLUSH_ITEM_COMPRESSION = 0.6; // Plush toys can be compressed more

    /**
     * Check if items can fit into a carrier's container using 3D bin packing.
     *
     * Uses native library `LargestAreaFitFirstPackager` directly with no custom
     * fallback chain.
     * 
     * @param items   Products to pack
     * @param carrier Shipping carrier with container dimensions
     * @return true if items fit, false otherwise
     */
    public boolean canFit(List<ProductReference> items, ShippingCarrier carrier) {
        if (items.isEmpty()) {
            return true;
        }

        Container container = createContainer(carrier);
        List<ContainerItem> containerItems = ContainerItem.newListBuilder()
                .withContainer(container)
                .build();
        List<BoxItem> boxItems = createBoxItemsLibraryNative(items);

        try (LargestAreaFitFirstPackager laffPackager = LargestAreaFitFirstPackager.newBuilder().build()) {
            PackagerResult result = laffPackager.newResultBuilder()
                    .withContainerItems(containerItems)
                    .withBoxItems(boxItems)
                    .withMaxContainerCount(1)
                    .withDeadline(System.currentTimeMillis() + 1500)
                    .build();
            return result.isSuccess();
        }
    }

    public Dimensions calculatePackedDimensions(List<ProductReference> items) {
        return calculatePackedResult(items).dimensions();
    }

    /**
     * Calculate packed result for a specific carrier container.
     *
     * Uses native library `LargestAreaFitFirstPackager` directly.
     *
     * @return carrier-specific packed result, or null if the items do not fit this
     *         carrier
     */
    public PackingResult calculatePackedResultForCarrier(List<ProductReference> items, ShippingCarrier carrier) {
        if (items == null || items.isEmpty() || carrier == null) {
            return null;
        }

        Container container = createContainer(carrier);
        List<ContainerItem> containerItems = ContainerItem.newListBuilder().withContainer(container).build();
        List<BoxItem> boxItems = createBoxItemsLibraryNative(items);

        try (LargestAreaFitFirstPackager packager = LargestAreaFitFirstPackager.newBuilder().build()) {
            PackagerResult result = packager.newResultBuilder()
                    .withContainerItems(containerItems)
                    .withBoxItems(boxItems)
                    .withMaxContainerCount(1)
                    .withDeadline(System.currentTimeMillis() + 1800)
                    .build();
            if (!result.isSuccess()) {
                return null;
            }
            Container packedContainer = result.get(0);
            if (packedContainer.getStack() == null) {
                return null;
            }
            return buildPackingResult(packedContainer, items);
        }
    }

    public PackingResult calculatePackedResult(List<ProductReference> items) {
        if (items == null || items.isEmpty()) {
            return new PackingResult(new Dimensions(0, 0, 0, 0, 0), List.of());
        }

        if (USE_LIBRARY_ONLY) {
            return calculatePackedResultLibrary(items);
        }

        // Try multiple sorting strategies and pick the one with the most
        // shipping-efficient bounding box.
        // Prefer smaller size sum (L+W+H), then smaller max dimension, then smaller
        // volume.
        List<SortStrategy> strategies = List.of(
                new SortStrategy("VolumeDesc", (a, b) -> Double.compare(b.getVolumeCm3(), a.getVolumeCm3())),
                new SortStrategy("VolumeAsc", (a, b) -> Double.compare(a.getVolumeCm3(), b.getVolumeCm3())),
                new SortStrategy("FootprintDesc",
                        (a, b) -> Double.compare(b.getWidthCm() * b.getLengthCm(), a.getWidthCm() * a.getLengthCm())),
                new SortStrategy("HeightDesc", (a, b) -> Double.compare(b.getHeightCm(), a.getHeightCm())));

        PackingResult bestResult = null;
        PackingScore bestScore = null;
        String bestStrategy = "";

        for (SortStrategy strategy : strategies) {
            PackingResult result = tryPackWithSort(items, strategy.comparator);
            if (result != null && result.dimensions() != null) {
                PackingScore score = score(result.dimensions());
                if (score.volume() > 0 && (bestScore == null || isBetter(score, bestScore))) {
                    bestScore = score;
                    bestResult = result;
                    bestStrategy = strategy.name;
                }
            }
        }

        if (bestResult != null) {
            System.out.println("[PackingService] Best strategy: " + bestStrategy +
                    " (SizeSum: " + String.format("%.1f", bestScore.sizeSum()) +
                    " cm, FootprintAR: " + String.format("%.2f", bestScore.footprintAspect()) +
                    ", MaxDim: " + String.format("%.1f", bestScore.maxDim()) +
                    " cm, Volume: " + String.format("%.0f", bestScore.volume()) + " cm³)");
            return bestResult;
        }

        // Fallback to basic sum if all strategies fail
        return new PackingResult(basicSum(items), List.of());
    }

    private record SortStrategy(String name, java.util.Comparator<ProductReference> comparator) {
    }

    private record PackingScore(double sizeSum, double footprintAspect, double maxDim, double volume) {
    }

    private PackingScore score(Dimensions dims) {
        double length = dims.getLengthCm();
        double width = dims.getWidthCm();
        double height = dims.getHeightCm();
        double sizeSum = length + width + height;
        double footprintAspect = aspectRatio(length, width);
        double maxDim = Math.max(length, Math.max(width, height));
        double volume = length * width * height;
        return new PackingScore(sizeSum, footprintAspect, maxDim, volume);
    }

    private boolean isBetter(PackingScore candidate, PackingScore best) {
        final double eps = 1e-6;
        if (candidate.sizeSum() < best.sizeSum() - eps) {
            return true;
        }
        if (Math.abs(candidate.sizeSum() - best.sizeSum()) <= eps) {
            if (candidate.footprintAspect() < best.footprintAspect() - eps) {
                return true;
            }
            if (Math.abs(candidate.footprintAspect() - best.footprintAspect()) <= eps) {
                if (candidate.maxDim() < best.maxDim() - eps) {
                    return true;
                }
                if (Math.abs(candidate.maxDim() - best.maxDim()) <= eps) {
                    return candidate.volume() < best.volume() - eps;
                }
            }
        }
        return false;
    }

    private double aspectRatio(double a, double b) {
        double min = Math.min(a, b);
        double max = Math.max(a, b);
        if (min <= 0) {
            return Double.POSITIVE_INFINITY;
        }
        return max / min;
    }

    private PackingResult tryPackWithSort(List<ProductReference> items,
            java.util.Comparator<ProductReference> comparator) {
        List<Container> containers = getStandardContainers();
        List<BoxItem> boxItems = createBoxItemsWithSort(items, comparator);

        Packager<?> fastPackager = FastLargestAreaFitFirstPackager.newBuilder().build();
        Packager<?> brutePackager = items.size() <= BRUTE_FORCE_ITEM_LIMIT
                ? FastBruteForcePackager.newBuilder().build()
                : null;

        try {
            for (Container container : containers) {
                PackingCandidate bestCandidate = null;

                PackagerResult fastResult = packInContainer(fastPackager, container, boxItems, 1200);
                bestCandidate = considerCandidate(bestCandidate, fastResult, items);

                if (brutePackager != null) {
                    PackagerResult bruteResult = returnIfSuccess(brutePackager, container, boxItems, 1500);
                    bestCandidate = considerCandidate(bestCandidate, bruteResult, items);
                }

                if (bestCandidate != null) {
                    return bestCandidate.result();
                }
            }

            // Try with huge container as a last resort
            Container huge = Container.newBuilder()
                    .withDescription("Huge")
                    .withSize(3000, 3000, 3000)
                    .withEmptyWeight(0)
                    .withMaxLoadWeight(100_000_000)
                    .build();

            PackagerResult hugeResult = packInContainer(fastPackager, huge, boxItems, 500);
            if (!hugeResult.isSuccess()) {
                return null;
            }

            Container packedContainer = hugeResult.get(0);
            if (packedContainer.getStack() == null) {
                return null;
            }

            return extractPackingResult(packedContainer, items);
        } finally {
            closeQuietly(fastPackager);
            closeQuietly(brutePackager);
        }
    }

    private PackingResult calculatePackedResultLibrary(List<ProductReference> items) {
        List<BoxItem> boxItems = createBoxItemsLibraryNative(items);
        List<ContainerItem> containerItems = ContainerItem.newListBuilder()
                .withContainers(getFallbackContainers())
                .build();

        try (LargestAreaFitFirstPackager packager = LargestAreaFitFirstPackager.newBuilder().build()) {
            PackagerResult result = packager.newResultBuilder()
                    .withContainerItems(containerItems)
                    .withBoxItems(boxItems)
                    .withMaxContainerCount(1)
                    .withDeadline(System.currentTimeMillis() + 2000)
                    .build();

            if (result.isSuccess() && result.get(0).getStack() != null) {
                PackingResult packed = buildPackingResult(result.get(0), items);
                Dimensions dims = packed.dimensions();
                System.out.println("[PackingService-Library] Native LAFF result: "
                        + String.format("%.1f", dims.getLengthCm()) + "x"
                        + String.format("%.1f", dims.getWidthCm()) + "x"
                        + String.format("%.1f", dims.getHeightCm()));
                return packed;
            }
        }

        // Last-resort safeguard only (non-library heuristic, used only on hard failure).
        return new PackingResult(basicSum(items), List.of());
    }

    /**
     * Try packing items with a given sort order in a huge container, then
     * minimize the resulting bounding box via Extreme Points placement.
     * Returns compacted PackingResult, or null if packing failed entirely.
     */
    private PackingResult tryPackWithSortLibrary(List<ProductReference> items,
            Comparator<ProductReference> comparator) {
        List<BoxItem> boxItems = comparator != null
                ? createBoxItemsWithSort(items, comparator)
                : createBoxItemsOriginalOrder(items);

        PackingResult bestResult = null;
        PackingScore bestScore = null;

        // Candidate 1: Fast LAFF (fast path)
        Packager<?> fastPackager = FastLargestAreaFitFirstPackager.newBuilder().build();
        try {
            PackagerResult fastResult = tryPackInHugeContainer(fastPackager, boxItems, 1000);

            if (fastResult != null && fastResult.isSuccess()) {
                PackingResult candidate = compactPlacements(
                        minimizeBoundingBoxWithExtremePoints(buildPackingResult(fastResult.get(0), items)));
                PackingScore candidateScore = score(candidate.dimensions());
                if (candidateScore.volume() > 0) {
                    bestResult = candidate;
                    bestScore = candidateScore;
                }
            }
        } finally {
            closeQuietly(fastPackager);
        }

        // Candidate 2: Standard LAFF (slower, can find tighter layouts than fast LAFF)
        Packager<?> laffPackager = LargestAreaFitFirstPackager.newBuilder().build();
        try {
            PackagerResult laffResult = tryPackInHugeContainer(laffPackager, boxItems, 1500);

            if (laffResult != null && laffResult.isSuccess()) {
                PackingResult candidate = compactPlacements(
                        minimizeBoundingBoxWithExtremePoints(buildPackingResult(laffResult.get(0), items)));
                PackingScore candidateScore = score(candidate.dimensions());
                if (candidateScore.volume() > 0
                        && (bestScore == null || isBetter(candidateScore, bestScore))) {
                    bestResult = candidate;
                    bestScore = candidateScore;
                }
            }
        } finally {
            closeQuietly(laffPackager);
        }

        // Candidate 3: Brute-force for small item counts (more optimal placements)
        if (items.size() <= BRUTE_FORCE_ITEM_LIMIT) {
            Packager<?> brutePackager = FastBruteForcePackager.newBuilder().build();
            try {
                PackagerResult bruteResult = tryPackInHugeContainer(brutePackager, boxItems, 1500);

                if (bruteResult != null && bruteResult.isSuccess()) {
                    PackingResult candidate = compactPlacements(
                            minimizeBoundingBoxWithExtremePoints(buildPackingResult(bruteResult.get(0), items)));
                    PackingScore candidateScore = score(candidate.dimensions());
                    if (candidateScore.volume() > 0
                            && (bestScore == null || isBetter(candidateScore, bestScore))) {
                        bestResult = candidate;
                        bestScore = candidateScore;
                    }
                }
            } finally {
                closeQuietly(brutePackager);
            }
        }

        return bestResult;
    }

    /**
     * Try packing items with a given sort order into a single carrier container.
     * Returns best compacted result from multiple packers, or null if no fit.
     */
    private PackingResult tryPackWithSortForCarrier(List<ProductReference> items,
            Container container, Comparator<ProductReference> comparator) {
        List<BoxItem> boxItems = comparator != null
                ? createBoxItemsWithSort(items, comparator)
                : createBoxItemsOriginalOrder(items);

        List<ContainerItem> containerItems = ContainerItem.newListBuilder()
                .withContainer(container)
                .build();

        PackingResult bestResult = null;
        PackingScore bestScore = null;

        Packager<?> fastPackager = FastLargestAreaFitFirstPackager.newBuilder().build();
        try {
            PackingResult candidate = tryCarrierPackCandidate(
                    fastPackager, containerItems, boxItems, items, 700);
            if (candidate != null) {
                PackingScore candidateScore = score(candidate.dimensions());
                if (candidateScore.volume() > 0) {
                    bestResult = candidate;
                    bestScore = candidateScore;
                }
            }
        } finally {
            closeQuietly(fastPackager);
        }

        Packager<?> laffPackager = LargestAreaFitFirstPackager.newBuilder().build();
        try {
            PackingResult candidate = tryCarrierPackCandidate(
                    laffPackager, containerItems, boxItems, items, 1200);
            if (candidate != null) {
                PackingScore candidateScore = score(candidate.dimensions());
                if (candidateScore.volume() > 0
                        && (bestScore == null || isBetter(candidateScore, bestScore))) {
                    bestResult = candidate;
                    bestScore = candidateScore;
                }
            }
        } finally {
            closeQuietly(laffPackager);
        }

        if (items.size() <= BRUTE_FORCE_ITEM_LIMIT) {
            Packager<?> brutePackager = FastBruteForcePackager.newBuilder().build();
            try {
                PackingResult candidate = tryCarrierPackCandidate(
                        brutePackager, containerItems, boxItems, items, 1500);
                if (candidate != null) {
                    PackingScore candidateScore = score(candidate.dimensions());
                    if (candidateScore.volume() > 0
                            && (bestScore == null || isBetter(candidateScore, bestScore))) {
                        bestResult = candidate;
                        bestScore = candidateScore;
                    }
                }
            } finally {
                closeQuietly(brutePackager);
            }
        }

        return bestResult;
    }

    private PackingResult tryCarrierPackCandidate(Packager<?> packager, List<ContainerItem> containerItems,
            List<BoxItem> boxItems, List<ProductReference> items, long timeoutMs) {
        PackagerResult result = packager.newResultBuilder()
                .withContainerItems(containerItems)
                .withBoxItems(boxItems)
                .withMaxContainerCount(1)
                .withDeadline(System.currentTimeMillis() + timeoutMs)
                .build();

        if (!result.isSuccess()) {
            return null;
        }

        Container packedContainer = result.get(0);
        if (packedContainer.getStack() == null) {
            return null;
        }

        return compactPlacements(buildPackingResult(packedContainer, items));
    }

    private PackagerResult tryPackInHugeContainer(Packager<?> packager, List<BoxItem> boxItems, long timeoutMs) {
        Container huge = Container.newBuilder()
                .withDescription("Huge")
                .withSize(3000, 3000, 3000)
                .withEmptyWeight(0)
                .withMaxLoadWeight(100_000_000)
                .build();

        PackagerResult hugeResult = packager.newResultBuilder()
                .withContainerItems(ContainerItem.newListBuilder().withContainer(huge).build())
                .withBoxItems(boxItems)
                .withMaxContainerCount(1)
                .withDeadline(System.currentTimeMillis() + timeoutMs)
                .build();

        return hugeResult.isSuccess() ? hugeResult : null;
    }

    private PackagerResult packInContainer(Packager<?> packager, Container container,
            List<BoxItem> boxItems, long timeoutMs) {
        List<ContainerItem> containerItems = ContainerItem.newListBuilder()
                .withContainer(container)
                .build();

        return packager.newResultBuilder()
                .withContainerItems(containerItems)
                .withBoxItems(boxItems)
                .withMaxContainerCount(1)
                .withDeadline(System.currentTimeMillis() + timeoutMs)
                .build();
    }

    private PackagerResult returnIfSuccess(Packager<?> packager, Container container,
            List<BoxItem> boxItems, long timeoutMs) {
        PackagerResult result = packInContainer(packager, container, boxItems, timeoutMs);
        return result;
    }

    private PackingCandidate considerCandidate(PackingCandidate currentBest, PackagerResult result,
            List<ProductReference> items) {
        if (result == null || !result.isSuccess()) {
            return currentBest;
        }
        Container packedContainer = result.get(0);
        if (packedContainer.getStack() == null) {
            return currentBest;
        }
        PackingResult packingResult = extractPackingResult(packedContainer, items);
        PackingScore score = score(packingResult.dimensions());
        PackingCandidate candidate = new PackingCandidate(packingResult, score);

        if (currentBest == null || isBetter(candidate.score(), currentBest.score())) {
            return candidate;
        }
        return currentBest;
    }

    private record PackingCandidate(PackingResult result, PackingScore score) {
    }

    private void closeQuietly(Packager<?> packager) {
        if (packager == null) {
            return;
        }
        try {
            packager.close();
        } catch (Exception ignored) {
            // ignore cleanup errors
        }
    }

    private PackingResult extractPackingResult(Container packedContainer, List<ProductReference> items) {
        PackingResult packed = buildPackingResult(packedContainer, items);
        return compactThinPlacements(packed);
    }

    private PackingResult compactPlacements(PackingResult packed) {
        List<PlacementInfo> placements = packed.placements();
        if (placements.size() < 2) {
            return packed;
        }

        List<MutablePlacement> current = new ArrayList<>(placements.size());
        for (PlacementInfo p : placements) {
            current.add(new MutablePlacement(p));
        }

        boolean movedAny = false;

        // Pass 0: Defensive relocation — first priority
        // Find items that are on the bounding box edge (extending total size).
        // Try to relocate them into positions that do NOT increase the size sum
        // beyond the bounding box of the remaining items.
        for (int pass = 0; pass < COMPACTION_PASSES; pass++) {
            Dimensions fullDims = dimensionsFromPlacements(toPlacementInfos(current),
                    packed.dimensions().getWeightG(), packed.dimensions().getItemCount());
            PackingScore fullScore = score(fullDims);

            MoveCandidate bestDefensiveMove = null;

            for (int i = 0; i < current.size(); i++) {
                MutablePlacement item = current.get(i);

                // Check if this item is on the bounding box edge
                // (i.e., removing it would shrink the bounding box)
                Dimensions dimsWithout = dimensionsWithout(current, i,
                        packed.dimensions().getWeightG(), packed.dimensions().getItemCount());
                PackingScore scoreWithout = score(dimsWithout);
                if (scoreWithout.sizeSum() >= fullScore.sizeSum() - 1e-6) {
                    continue;
                }

                // This item extends the bounding box. Try to relocate it to a
                // position that keeps size sum ≤ sizeSum of other items' bbox.
                // Generate candidate positions: on top of each support + floor-level gaps
                List<int[]> candidates = generateDefensiveCandidates(item, current, i);

                for (int[] pos : candidates) {
                    int cx = pos[0], cy = pos[1], cz = pos[2];

                    if (cx == item.x && cy == item.y && cz == item.z) {
                        continue;
                    }

                    // Collision-free check
                    List<PlacementInfo> candidateList = toPlacementInfos(current);
                    candidateList.set(i, new PlacementInfo(item.name, cx, cy, cz,
                            item.width, item.depth, item.height, item.color));
                    if (wouldOverlap(i, cx, cy, cz, candidateList)) {
                        continue;
                    }

                    // Check if size sum doesn't increase beyond other items' bbox
                    Dimensions candidateDims = dimensionsFromPlacements(candidateList,
                            packed.dimensions().getWeightG(), packed.dimensions().getItemCount());
                    PackingScore candidateScore = score(candidateDims);

                    // Defensive gate: must not worsen the score
                    if (!isBetter(candidateScore, fullScore)) {
                        continue;
                    }

                    if (bestDefensiveMove == null || isBetter(candidateScore, bestDefensiveMove.score)) {
                        bestDefensiveMove = new MoveCandidate(i, cx, cy, cz, candidateScore);
                    }
                }
            }

            if (bestDefensiveMove == null) {
                break;
            }

            MutablePlacement moved = current.get(bestDefensiveMove.index);
            moved.x = bestDefensiveMove.x;
            moved.y = bestDefensiveMove.y;
            moved.z = bestDefensiveMove.z;
            movedAny = true;
        }

        // Pass 1: Slide toward origin (existing logic)
        for (int pass = 0; pass < COMPACTION_PASSES; pass++) {
            Dimensions baseDims = dimensionsFromPlacements(toPlacementInfos(current),
                    packed.dimensions().getWeightG(), packed.dimensions().getItemCount());
            PackingScore baseScore = score(baseDims);

            MoveCandidate bestMove = null;

            for (int i = 0; i < current.size(); i++) {
                MutablePlacement item = current.get(i);

                int targetX = maxLeft(current, i);
                int targetY = maxBack(current, i);
                int targetZ = maxDown(current, i);

                if (targetX == item.x && targetY == item.y && targetZ == item.z) {
                    continue;
                }

                List<PlacementInfo> candidate = toPlacementInfos(current);
                candidate.set(i, new PlacementInfo(item.name, targetX, targetY, targetZ,
                        item.width, item.depth, item.height, item.color));
                if (wouldOverlap(i, targetX, targetY, targetZ, candidate)) {
                    continue;
                }

                Dimensions candidateDims = dimensionsFromPlacements(candidate,
                        packed.dimensions().getWeightG(), packed.dimensions().getItemCount());
                PackingScore candidateScore = score(candidateDims);
                if (!isBetter(candidateScore, baseScore)) {
                    continue;
                }

                if (bestMove == null || isBetter(candidateScore, bestMove.score)) {
                    bestMove = new MoveCandidate(i, targetX, targetY, targetZ, candidateScore);
                }
            }

            if (bestMove == null) {
                break;
            }

            MutablePlacement moved = current.get(bestMove.index);
            moved.x = bestMove.x;
            moved.y = bestMove.y;
            moved.z = bestMove.z;
            movedAny = true;
        }

        // Pass 2: Gated gap-stacking — try placing items on top of supports
        // Strict safety gates:
        // 1. Item must fit within support's footprint (containment)
        // 2. Placement must be collision-free with all other items
        // 3. Bounding box size sum (L+W+H) must strictly improve
        Dimensions currentDims = dimensionsFromPlacements(toPlacementInfos(current),
                packed.dimensions().getWeightG(), packed.dimensions().getItemCount());
        PackingScore currentScore = score(currentDims);

        // Preserve already-flat results for 3cm-class envelopes.
        // Stacking pass is beneficial for generic boxes, but can regress flat-mail
        // use-cases by increasing thickness.
        if (currentDims.getHeightCm() > 3.0) {
            for (int pass = 0; pass < COMPACTION_PASSES; pass++) {
                MoveCandidate bestStackMove = null;

                for (int i = 0; i < current.size(); i++) {
                    MutablePlacement item = current.get(i);

                    for (int j = 0; j < current.size(); j++) {
                        if (i == j)
                            continue;
                        MutablePlacement support = current.get(j);

                        // Gate 1: Item must fit entirely within support's footprint
                        if (item.width > support.width || item.depth > support.depth) {
                            continue;
                        }

                        int candidateZ = support.z + support.height;
                        List<XYAnchor> topAnchors = generateTopAnchors(item, support, current, i);
                        for (XYAnchor anchor : topAnchors) {
                            int candidateX = anchor.x;
                            int candidateY = anchor.y;

                            // Skip if position is unchanged
                            if (candidateX == item.x && candidateY == item.y && candidateZ == item.z) {
                                continue;
                            }

                            // Gate 2: Collision-free check
                            List<PlacementInfo> candidateList = toPlacementInfos(current);
                            candidateList.set(i, new PlacementInfo(item.name, candidateX, candidateY, candidateZ,
                                    item.width, item.depth, item.height, item.color));
                            if (wouldOverlap(i, candidateX, candidateY, candidateZ, candidateList)) {
                                continue;
                            }

                            // Gate 3: Bounding box score must strictly improve
                            Dimensions candidateDims = dimensionsFromPlacements(candidateList,
                                    packed.dimensions().getWeightG(), packed.dimensions().getItemCount());
                            PackingScore candidateScore = score(candidateDims);
                            if (!isBetter(candidateScore, currentScore)) {
                                continue;
                            }

                            if (bestStackMove == null || isBetter(candidateScore, bestStackMove.score)) {
                                bestStackMove = new MoveCandidate(i, candidateX, candidateY, candidateZ,
                                        candidateScore);
                            }
                        }
                    }
                }

                if (bestStackMove == null) {
                    break;
                }

                MutablePlacement moved = current.get(bestStackMove.index);
                moved.x = bestStackMove.x;
                moved.y = bestStackMove.y;
                moved.z = bestStackMove.z;
                movedAny = true;

                // Update baseline for next pass
                currentDims = dimensionsFromPlacements(toPlacementInfos(current),
                        packed.dimensions().getWeightG(), packed.dimensions().getItemCount());
                currentScore = score(currentDims);
            }
        }

        if (!movedAny) {
            return packed;
        }

        return normalizeResult(toPlacementInfos(current), packed.dimensions().getWeightG(),
                packed.dimensions().getItemCount());
    }

    private record ExtremePoint(int x, int y, int z) {
    }

    private record ExtremePlacementCandidate(int x, int y, int z, PackingScore score) {
    }

    private PackingResult minimizeBoundingBoxWithExtremePoints(PackingResult packed) {
        List<PlacementInfo> source = packed.placements();
        if (source.size() < 2) {
            return packed;
        }

        List<PlacementInfo> remaining = new ArrayList<>(source);
        remaining.sort((a, b) -> {
            long volumeA = (long) a.width() * a.depth() * a.height();
            long volumeB = (long) b.width() * b.depth() * b.height();
            if (volumeA != volumeB) {
                return Long.compare(volumeB, volumeA);
            }

            int maxA = Math.max(a.width(), Math.max(a.depth(), a.height()));
            int maxB = Math.max(b.width(), Math.max(b.depth(), b.height()));
            if (maxA != maxB) {
                return Integer.compare(maxB, maxA);
            }

            return Integer.compare(b.height(), a.height());
        });

        List<PlacementInfo> rebuilt = new ArrayList<>(source.size());
        java.util.LinkedHashSet<ExtremePoint> extremePoints = new java.util.LinkedHashSet<>();
        extremePoints.add(new ExtremePoint(0, 0, 0));

        int weightG = packed.dimensions().getWeightG();
        int itemCount = packed.dimensions().getItemCount();
        int baseHeightMm = toMm(packed.dimensions().getHeightCm());
        boolean preserveFlatProfile = baseHeightMm <= 30;

        for (PlacementInfo item : remaining) {
            ExtremePlacementCandidate best = findBestExtremePointCandidate(
                    item, rebuilt, extremePoints, weightG, itemCount, preserveFlatProfile, baseHeightMm, true);
            if (best == null) {
                best = findBestExtremePointCandidate(
                        item, rebuilt, extremePoints, weightG, itemCount, preserveFlatProfile, baseHeightMm, false);
            }

            if (best == null) {
                int fallbackX = 0;
                for (PlacementInfo placed : rebuilt) {
                    fallbackX = Math.max(fallbackX, placed.x() + placed.width());
                }
                best = new ExtremePlacementCandidate(
                        fallbackX,
                        0,
                        0,
                        score(dimensionsFromPlacedAndCandidate(rebuilt, fallbackX, 0, 0,
                                item.width(), item.depth(), item.height(), weightG, itemCount)));
            }

            PlacementInfo placedItem = new PlacementInfo(
                    item.name(),
                    best.x(),
                    best.y(),
                    best.z(),
                    item.width(),
                    item.depth(),
                    item.height(),
                    item.color());
            rebuilt.add(placedItem);
            addExtremePoints(extremePoints, placedItem);
            extremePoints = pruneExtremePoints(extremePoints, rebuilt);
        }

        return normalizeResult(rebuilt, weightG, itemCount);
    }

    private ExtremePlacementCandidate findBestExtremePointCandidate(PlacementInfo item, List<PlacementInfo> placed,
            java.util.Set<ExtremePoint> extremePoints, int weightG, int itemCount,
            boolean preserveFlatProfile, int baseHeightMm, boolean requireSupport) {
        ExtremePlacementCandidate best = null;

        for (ExtremePoint point : new ArrayList<>(extremePoints)) {
            int x = point.x();
            int y = point.y();
            int z = point.z();

            if (x < 0 || y < 0 || z < 0) {
                continue;
            }

            if (requireSupport && !hasSupportAt(placed, x, y, z, item.width(), item.depth())) {
                continue;
            }

            if (overlapsAnyPlacement(placed, x, y, z, item.width(), item.depth(), item.height())) {
                continue;
            }

            Dimensions candidateDims = dimensionsFromPlacedAndCandidate(
                    placed, x, y, z, item.width(), item.depth(), item.height(), weightG, itemCount);

            if (preserveFlatProfile && toMm(candidateDims.getHeightCm()) > baseHeightMm) {
                continue;
            }

            ExtremePlacementCandidate candidate = new ExtremePlacementCandidate(x, y, z, score(candidateDims));
            if (isBetterExtremePlacement(candidate, best)) {
                best = candidate;
            }
        }

        return best;
    }

    private boolean isBetterExtremePlacement(ExtremePlacementCandidate candidate, ExtremePlacementCandidate best) {
        if (best == null) {
            return true;
        }
        if (isBetter(candidate.score(), best.score())) {
            return true;
        }
        if (isBetter(best.score(), candidate.score())) {
            return false;
        }

        if (candidate.z() != best.z()) {
            return candidate.z() < best.z();
        }

        int candidateSpread = candidate.x() + candidate.y();
        int bestSpread = best.x() + best.y();
        if (candidateSpread != bestSpread) {
            return candidateSpread < bestSpread;
        }

        if (candidate.x() != best.x()) {
            return candidate.x() < best.x();
        }

        return candidate.y() < best.y();
    }

    private void addExtremePoints(java.util.Set<ExtremePoint> points, PlacementInfo placed) {
        int x1 = placed.x();
        int y1 = placed.y();
        int z1 = placed.z();
        int x2 = x1 + placed.width();
        int y2 = y1 + placed.depth();
        int z2 = z1 + placed.height();

        points.add(new ExtremePoint(x2, y1, z1));
        points.add(new ExtremePoint(x1, y2, z1));
        points.add(new ExtremePoint(x1, y1, z2));
        points.add(new ExtremePoint(x2, y2, z1));
        points.add(new ExtremePoint(x2, y1, z2));
        points.add(new ExtremePoint(x1, y2, z2));
        points.add(new ExtremePoint(x2, y2, z2));
    }

    private java.util.LinkedHashSet<ExtremePoint> pruneExtremePoints(java.util.Set<ExtremePoint> points,
            List<PlacementInfo> placed) {
        java.util.LinkedHashSet<ExtremePoint> pruned = new java.util.LinkedHashSet<>();
        for (ExtremePoint point : points) {
            if (point.x() < 0 || point.y() < 0 || point.z() < 0) {
                continue;
            }
            if (!isInsideAnyPlacement(point, placed)) {
                pruned.add(point);
            }
        }
        return pruned;
    }

    private boolean isInsideAnyPlacement(ExtremePoint point, List<PlacementInfo> placed) {
        for (PlacementInfo p : placed) {
            boolean inside = point.x() >= p.x() && point.x() < p.x() + p.width() &&
                    point.y() >= p.y() && point.y() < p.y() + p.depth() &&
                    point.z() >= p.z() && point.z() < p.z() + p.height();
            if (inside) {
                return true;
            }
        }
        return false;
    }

    private boolean hasSupportAt(List<PlacementInfo> placed, int x, int y, int z, int width, int depth) {
        if (z == 0) {
            return true;
        }
        for (PlacementInfo p : placed) {
            if (p.z() + p.height() != z) {
                continue;
            }
            if (overlaps(x, width, p.x(), p.width()) && overlaps(y, depth, p.y(), p.depth())) {
                return true;
            }
        }
        return false;
    }

    private boolean overlapsAnyPlacement(List<PlacementInfo> placed, int x, int y, int z, int width, int depth,
            int height) {
        for (PlacementInfo other : placed) {
            boolean separated = x + width <= other.x() ||
                    other.x() + other.width() <= x ||
                    y + depth <= other.y() ||
                    other.y() + other.depth() <= y ||
                    z + height <= other.z() ||
                    other.z() + other.height() <= z;
            if (!separated) {
                return true;
            }
        }
        return false;
    }

    private Dimensions dimensionsFromPlacedAndCandidate(List<PlacementInfo> placed,
            int x, int y, int z, int width, int depth, int height, int weightG, int itemCount) {
        int maxX = x + width;
        int maxY = y + depth;
        int maxZ = z + height;

        for (PlacementInfo p : placed) {
            maxX = Math.max(maxX, p.x() + p.width());
            maxY = Math.max(maxY, p.y() + p.depth());
            maxZ = Math.max(maxZ, p.z() + p.height());
        }

        return new Dimensions(toCm(maxX), toCm(maxY), toCm(maxZ), weightG, itemCount);
    }

    private List<PlacementInfo> toPlacementInfos(List<MutablePlacement> placements) {
        List<PlacementInfo> infos = new ArrayList<>(placements.size());
        for (MutablePlacement p : placements) {
            infos.add(p.toPlacementInfo());
        }
        return infos;
    }

    private double volumeCm3(Dimensions dims) {
        return dims.getLengthCm() * dims.getWidthCm() * dims.getHeightCm();
    }

    private int maxLeft(List<MutablePlacement> placements, int index) {
        MutablePlacement moving = placements.get(index);
        int limit = 0;
        for (int i = 0; i < placements.size(); i++) {
            if (i == index) {
                continue;
            }
            MutablePlacement other = placements.get(i);
            if (!overlaps(moving.y, moving.depth, other.y, other.depth)) {
                continue;
            }
            if (!overlaps(moving.z, moving.height, other.z, other.height)) {
                continue;
            }
            int otherEnd = other.x + other.width;
            if (otherEnd <= moving.x) {
                limit = Math.max(limit, otherEnd);
            }
        }
        return limit;
    }

    private int maxBack(List<MutablePlacement> placements, int index) {
        MutablePlacement moving = placements.get(index);
        int limit = 0;
        for (int i = 0; i < placements.size(); i++) {
            if (i == index) {
                continue;
            }
            MutablePlacement other = placements.get(i);
            if (!overlaps(moving.x, moving.width, other.x, other.width)) {
                continue;
            }
            if (!overlaps(moving.z, moving.height, other.z, other.height)) {
                continue;
            }
            int otherEnd = other.y + other.depth;
            if (otherEnd <= moving.y) {
                limit = Math.max(limit, otherEnd);
            }
        }
        return limit;
    }

    private int maxDown(List<MutablePlacement> placements, int index) {
        MutablePlacement moving = placements.get(index);
        int limit = 0;
        for (int i = 0; i < placements.size(); i++) {
            if (i == index) {
                continue;
            }
            MutablePlacement other = placements.get(i);
            if (!overlaps(moving.x, moving.width, other.x, other.width)) {
                continue;
            }
            if (!overlaps(moving.y, moving.depth, other.y, other.depth)) {
                continue;
            }
            int otherEnd = other.z + other.height;
            if (otherEnd <= moving.z) {
                limit = Math.max(limit, otherEnd);
            }
        }
        return limit;
    }

    private boolean overlaps(int aStart, int aSize, int bStart, int bSize) {
        int aEnd = aStart + aSize;
        int bEnd = bStart + bSize;
        return aStart < bEnd && bStart < aEnd;
    }

    private static class MutablePlacement {
        private final String name;
        private int x;
        private int y;
        private int z;
        private final int width;
        private final int depth;
        private final int height;
        private final String color;

        private MutablePlacement(PlacementInfo info) {
            this.name = info.name();
            this.x = info.x();
            this.y = info.y();
            this.z = info.z();
            this.width = info.width();
            this.depth = info.depth();
            this.height = info.height();
            this.color = info.color();
        }

        private PlacementInfo toPlacementInfo() {
            return new PlacementInfo(name, x, y, z, width, depth, height, color);
        }
    }

    private record MoveCandidate(int index, int x, int y, int z, PackingScore score) {
    }

    /**
     * Compute bounding box dimensions excluding item at given index.
     * Used by Pass 0 to check if an item is on the bounding box edge.
     */
    private Dimensions dimensionsWithout(List<MutablePlacement> placements, int excludeIndex,
            int weightG, int itemCount) {
        int minX = Integer.MAX_VALUE, minY = Integer.MAX_VALUE, minZ = Integer.MAX_VALUE;
        int maxX = 0, maxY = 0, maxZ = 0;
        boolean hasAny = false;

        for (int i = 0; i < placements.size(); i++) {
            if (i == excludeIndex)
                continue;
            MutablePlacement p = placements.get(i);
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            minZ = Math.min(minZ, p.z);
            maxX = Math.max(maxX, p.x + p.width);
            maxY = Math.max(maxY, p.y + p.depth);
            maxZ = Math.max(maxZ, p.z + p.height);
            hasAny = true;
        }

        if (!hasAny) {
            return new Dimensions(0, 0, 0, weightG, itemCount);
        }

        return new Dimensions(
                toCm(maxX - minX), toCm(maxY - minY), toCm(maxZ - minZ),
                weightG, itemCount);
    }

    /**
     * Generate ALL candidate positions for defensive relocation of an edge item.
     * Uses x/y/z anchor points from ALL items' edges and surfaces.
     * No footprint constraint — collision detection handles physical validity.
     */
    private List<int[]> generateDefensiveCandidates(MutablePlacement item,
            List<MutablePlacement> placements, int movingIndex) {
        // Collect anchor points from all axis-aligned edges of every item
        java.util.LinkedHashSet<Integer> xAnchors = new java.util.LinkedHashSet<>();
        java.util.LinkedHashSet<Integer> yAnchors = new java.util.LinkedHashSet<>();
        java.util.LinkedHashSet<Integer> zAnchors = new java.util.LinkedHashSet<>();

        xAnchors.add(0);
        yAnchors.add(0);
        zAnchors.add(0);

        for (int k = 0; k < placements.size(); k++) {
            if (k == movingIndex)
                continue;
            MutablePlacement other = placements.get(k);

            // Left/right edges
            xAnchors.add(other.x);
            xAnchors.add(other.x + other.width);
            xAnchors.add(other.x - item.width); // right-align against left edge

            // Front/back edges
            yAnchors.add(other.y);
            yAnchors.add(other.y + other.depth);
            yAnchors.add(other.y - item.depth);

            // Top/bottom surfaces (critical for finding shelf positions)
            zAnchors.add(other.z);
            zAnchors.add(other.z + other.height);
            zAnchors.add(other.z - item.height);
        }

        // Build all (x, y, z) combinations from the anchor sets
        List<int[]> candidates = new ArrayList<>();
        for (int x : xAnchors) {
            if (x < 0)
                continue;
            for (int y : yAnchors) {
                if (y < 0)
                    continue;
                for (int z : zAnchors) {
                    if (z < 0)
                        continue;
                    candidates.add(new int[] { x, y, z });
                }
            }
        }

        return candidates;
    }

    private record XYAnchor(int x, int y) {
    }

    private List<XYAnchor> generateTopAnchors(MutablePlacement item, MutablePlacement support,
            List<MutablePlacement> placements, int movingIndex) {
        List<Integer> xCandidates = new ArrayList<>();
        List<Integer> yCandidates = new ArrayList<>();

        // Support corners and opposite edges are always good anchors.
        xCandidates.add(support.x);
        xCandidates.add(support.x + support.width - item.width);
        yCandidates.add(support.y);
        yCandidates.add(support.y + support.depth - item.depth);

        // Add edge-aligned anchors around other boxes to discover gap placements.
        for (int k = 0; k < placements.size(); k++) {
            if (k == movingIndex) {
                continue;
            }
            MutablePlacement other = placements.get(k);
            xCandidates.add(other.x);
            xCandidates.add(other.x + other.width);
            xCandidates.add(other.x - item.width);
            yCandidates.add(other.y);
            yCandidates.add(other.y + other.depth);
            yCandidates.add(other.y - item.depth);
        }

        List<XYAnchor> anchors = new ArrayList<>();
        java.util.LinkedHashSet<Long> seen = new java.util.LinkedHashSet<>();
        int supportX2 = support.x + support.width;
        int supportY2 = support.y + support.depth;

        for (int x : xCandidates) {
            if (x < support.x || x + item.width > supportX2) {
                continue;
            }
            for (int y : yCandidates) {
                if (y < support.y || y + item.depth > supportY2) {
                    continue;
                }
                long key = (((long) x) << 32) ^ (y & 0xffffffffL);
                if (seen.add(key)) {
                    anchors.add(new XYAnchor(x, y));
                }
            }
        }
        return anchors;
    }

    private PackingResult buildPackingResult(Container packedContainer, List<ProductReference> items) {
        int maxX = 0;
        int maxY = 0;
        int maxZ = 0;
        int minX = Integer.MAX_VALUE;
        int minY = Integer.MAX_VALUE;
        int minZ = Integer.MAX_VALUE;
        List<PlacementInfo> placements = new ArrayList<>();
        String[] colors = { "#4ade80", "#60a5fa", "#f472b6", "#facc15", "#a78bfa", "#fb923c" };
        int colorIndex = 0;

        List<Placement> rawPlacements = packedContainer.getStack().getPlacements();
        for (Placement p : rawPlacements) {
            minX = Math.min(minX, p.getAbsoluteX());
            minY = Math.min(minY, p.getAbsoluteY());
            minZ = Math.min(minZ, p.getAbsoluteZ());
            maxX = Math.max(maxX, p.getAbsoluteEndX());
            maxY = Math.max(maxY, p.getAbsoluteEndY());
            maxZ = Math.max(maxZ, p.getAbsoluteEndZ());
        }

        if (rawPlacements.isEmpty()) {
            return new PackingResult(new Dimensions(0, 0, 0, 0, 0), List.of());
        }

        for (Placement p : rawPlacements) {
            int width = p.getAbsoluteEndX() - p.getAbsoluteX();
            int depth = p.getAbsoluteEndY() - p.getAbsoluteY();
            int height = p.getAbsoluteEndZ() - p.getAbsoluteZ();

            String itemName = colorIndex < items.size() ? items.get(colorIndex).getName() : "Item " + colorIndex;

            placements.add(new PlacementInfo(
                    itemName,
                    p.getAbsoluteX() - minX,
                    p.getAbsoluteY() - minY,
                    p.getAbsoluteZ() - minZ,
                    width,
                    depth,
                    height,
                    colors[colorIndex % colors.length]));
            colorIndex++;
        }

        int totalWeight = items.stream().mapToInt(ProductReference::getWeightG).sum();

        Dimensions dims = new Dimensions(
                toCm(maxX - minX),
                toCm(maxY - minY),
                toCm(maxZ - minZ),
                totalWeight,
                items.size());

        return new PackingResult(dims, placements);
    }

    private PackingResult compactThinPlacements(PackingResult packed) {
        List<PlacementInfo> placements = packed.placements();
        if (placements.size() < 2) {
            return packed;
        }

        List<PlacementInfo> current = new ArrayList<>(placements);
        PackingScore bestScore = score(dimensionsFromPlacements(current, packed.dimensions().getWeightG(),
                packed.dimensions().getItemCount()));

        boolean improved = false;
        double baseHeightCm = packed.dimensions().getHeightCm();
        for (int i = 0; i < current.size(); i++) {
            PlacementInfo thin = current.get(i);
            if (thin.height() > THIN_ITEM_HEIGHT_MM) {
                continue;
            }

            PlacementInfo bestPlacement = null;
            PackingScore bestPlacementScore = bestScore;

            for (int j = 0; j < current.size(); j++) {
                if (i == j) {
                    continue;
                }
                PlacementInfo support = current.get(j);
                if (thin.width() > support.width() || thin.depth() > support.depth()) {
                    continue;
                }

                int candidateX = support.x();
                int candidateY = support.y();
                int candidateZ = support.z() + support.height();

                if (wouldOverlap(i, candidateX, candidateY, candidateZ, current)) {
                    continue;
                }

                List<PlacementInfo> candidateList = new ArrayList<>(current);
                candidateList.set(i, new PlacementInfo(
                        thin.name(),
                        candidateX,
                        candidateY,
                        candidateZ,
                        thin.width(),
                        thin.depth(),
                        thin.height(),
                        thin.color()));

                Dimensions candidateDims = dimensionsFromPlacements(candidateList,
                        packed.dimensions().getWeightG(),
                        packed.dimensions().getItemCount());
                PackingScore candidateScore = score(candidateDims);
                double candidateHeightCm = candidateDims.getHeightCm();

                // Tight rule: prefer stacking thin items even if score doesn't improve,
                // as long as height increase is minimal.
                boolean heightIncreaseOk = candidateHeightCm <= baseHeightCm + 1.0;

                if (isBetter(candidateScore, bestPlacementScore) || heightIncreaseOk) {
                    bestPlacementScore = candidateScore;
                    bestPlacement = candidateList.get(i);
                }
            }

            if (bestPlacement != null) {
                current.set(i, bestPlacement);
                bestScore = bestPlacementScore;
                improved = true;
            }
        }

        if (!improved) {
            return packed;
        }

        return normalizeResult(current, packed.dimensions().getWeightG(), packed.dimensions().getItemCount());
    }

    private boolean wouldOverlap(int movingIndex, int x, int y, int z, List<PlacementInfo> placements) {
        PlacementInfo moving = placements.get(movingIndex);
        int w = moving.width();
        int d = moving.depth();
        int h = moving.height();

        for (int k = 0; k < placements.size(); k++) {
            if (k == movingIndex) {
                continue;
            }
            PlacementInfo other = placements.get(k);

            boolean separated = x + w <= other.x() ||
                    other.x() + other.width() <= x ||
                    y + d <= other.y() ||
                    other.y() + other.depth() <= y ||
                    z + h <= other.z() ||
                    other.z() + other.height() <= z;

            if (!separated) {
                return true;
            }
        }

        return false;
    }

    private Dimensions dimensionsFromPlacements(List<PlacementInfo> placements, int weightG, int itemCount) {
        int minX = Integer.MAX_VALUE;
        int minY = Integer.MAX_VALUE;
        int minZ = Integer.MAX_VALUE;
        int maxX = 0;
        int maxY = 0;
        int maxZ = 0;

        for (PlacementInfo p : placements) {
            minX = Math.min(minX, p.x());
            minY = Math.min(minY, p.y());
            minZ = Math.min(minZ, p.z());
            maxX = Math.max(maxX, p.x() + p.width());
            maxY = Math.max(maxY, p.y() + p.depth());
            maxZ = Math.max(maxZ, p.z() + p.height());
        }

        return new Dimensions(
                toCm(maxX - minX),
                toCm(maxY - minY),
                toCm(maxZ - minZ),
                weightG,
                itemCount);
    }

    private PackingResult normalizeResult(List<PlacementInfo> placements, int weightG, int itemCount) {
        int minX = Integer.MAX_VALUE;
        int minY = Integer.MAX_VALUE;
        int minZ = Integer.MAX_VALUE;
        int maxX = 0;
        int maxY = 0;
        int maxZ = 0;

        for (PlacementInfo p : placements) {
            minX = Math.min(minX, p.x());
            minY = Math.min(minY, p.y());
            minZ = Math.min(minZ, p.z());
            maxX = Math.max(maxX, p.x() + p.width());
            maxY = Math.max(maxY, p.y() + p.depth());
            maxZ = Math.max(maxZ, p.z() + p.height());
        }

        List<PlacementInfo> normalized = new ArrayList<>(placements.size());
        for (PlacementInfo p : placements) {
            normalized.add(new PlacementInfo(
                    p.name(),
                    p.x() - minX,
                    p.y() - minY,
                    p.z() - minZ,
                    p.width(),
                    p.depth(),
                    p.height(),
                    p.color()));
        }

        Dimensions dims = new Dimensions(
                toCm(maxX - minX),
                toCm(maxY - minY),
                toCm(maxZ - minZ),
                weightG,
                itemCount);

        return new PackingResult(dims, normalized);
    }

    private List<Container> getStandardContainers() {
        List<Container> containers = new ArrayList<>();
        containers.addAll(getCarrierContainers());
        containers.addAll(getFallbackContainers());

        containers.sort(Comparator
                .comparingInt((Container c) -> c.getDx() + c.getDy() + c.getDz())
                .thenComparingInt(c -> Math.max(c.getDx(), Math.max(c.getDy(), c.getDz())))
                .thenComparingLong(c -> (long) c.getDx() * c.getDy() * c.getDz()));

        return containers;
    }

    private List<Container> getCarrierContainers() {
        if (carrierRepository == null) {
            return List.of();
        }

        List<ShippingCarrier> carriers = carrierRepository.findAll();
        if (carriers.isEmpty()) {
            return List.of();
        }

        List<ShippingCarrier> sized = carriers.stream()
                .filter(c -> c.getMaxLength() != null && c.getMaxWidth() != null && c.getMaxHeight() != null)
                .filter(c -> !isSizeSumOnlyCarrier(c))
                .toList();

        if (sized.isEmpty()) {
            return List.of();
        }

        List<ShippingCarrier> sorted = new ArrayList<>(sized);
        sorted.sort(Comparator
                .comparingDouble((ShippingCarrier c) -> c.getMaxLength() + c.getMaxWidth() + c.getMaxHeight())
                .thenComparingDouble(c -> Math.max(c.getMaxLength(), Math.max(c.getMaxWidth(), c.getMaxHeight())))
                .thenComparingDouble(c -> c.getMaxLength() * c.getMaxWidth() * c.getMaxHeight()));

        List<Container> containers = new ArrayList<>();
        for (ShippingCarrier carrier : sorted) {
            containers.add(createContainer(carrier));
        }
        return containers;
    }

    private List<Container> getFallbackContainers() {
        // Geometry-only containers for dimension estimation.
        // Weight constraints are evaluated separately in ShippingMatcher.
        final int GEOMETRY_ONLY_MAX_LOAD = 100_000_000;
        return List.of(
                // Nekoposu (A4 size, 3cm thick) - Prioritize flat packing!
                Container.newBuilder().withDescription("Nekoposu").withSize(312, 228, 30).withEmptyWeight(0)
                        .withMaxLoadWeight(GEOMETRY_ONLY_MAX_LOAD).build(),
                // Yu-Packet Post (Stick style, 3cm thick)
                Container.newBuilder().withDescription("Yu-Packet Post").withSize(327, 228, 30).withEmptyWeight(0)
                        .withMaxLoadWeight(GEOMETRY_ONLY_MAX_LOAD).build(),
                // Compact Box (5cm thick)
                Container.newBuilder().withDescription("Compact").withSize(250, 200, 50).withEmptyWeight(0)
                        .withMaxLoadWeight(GEOMETRY_ONLY_MAX_LOAD).build(),
                // Letter Pack Plus (User specified ~7cm height target)
                Container.newBuilder().withDescription("Letter Pack Plus").withSize(340, 248, 70).withEmptyWeight(0)
                        .withMaxLoadWeight(GEOMETRY_ONLY_MAX_LOAD).build(),
                // Size 60
                Container.newBuilder().withDescription("Size 60").withSize(250, 200, 150).withEmptyWeight(0)
                        .withMaxLoadWeight(GEOMETRY_ONLY_MAX_LOAD).build(),
                // Size 80
                Container.newBuilder().withDescription("Size 80").withSize(350, 250, 200).withEmptyWeight(0)
                        .withMaxLoadWeight(GEOMETRY_ONLY_MAX_LOAD).build(),
                // Size 100
                Container.newBuilder().withDescription("Size 100").withSize(450, 350, 200).withEmptyWeight(0)
                        .withMaxLoadWeight(GEOMETRY_ONLY_MAX_LOAD).build(),
                // Size 120
                Container.newBuilder().withDescription("Size 120").withSize(550, 400, 250).withEmptyWeight(0)
                        .withMaxLoadWeight(GEOMETRY_ONLY_MAX_LOAD).build(),
                // Size 140
                Container.newBuilder().withDescription("Size 140").withSize(600, 450, 350).withEmptyWeight(0)
                        .withMaxLoadWeight(GEOMETRY_ONLY_MAX_LOAD).build(),
                // Size 160
                Container.newBuilder().withDescription("Size 160").withSize(700, 500, 400).withEmptyWeight(0)
                        .withMaxLoadWeight(GEOMETRY_ONLY_MAX_LOAD).build());
    }

    private boolean isSizeSumOnlyCarrier(ShippingCarrier carrier) {
        if (carrier.getSizeSumLimit() == null) {
            return false;
        }
        double limit = carrier.getSizeSumLimit();
        return Math.abs(carrier.getMaxLength() - limit) < 0.0001 &&
                Math.abs(carrier.getMaxWidth() - limit) < 0.0001 &&
                Math.abs(carrier.getMaxHeight() - limit) < 0.0001;
    }

    private Container createContainer(ShippingCarrier carrier) {
        return Container.newBuilder()
                .withDescription(carrier.getFullName())
                .withSize(toMm(carrier.getMaxLength()), toMm(carrier.getMaxWidth()), toMm(carrier.getMaxHeight()))
                .withEmptyWeight(0)
                .withMaxLoadWeight(carrier.getMaxWeightG() != null ? carrier.getMaxWeightG() : 100_000)
                .build();
    }

    private List<BoxItem> createBoxItems(List<ProductReference> items) {
        // Sort items by VOLUME ASCENDING (smallest items first)
        // Small items fill gaps first, then large items are placed in remaining space
        // This can help reduce overall footprint by fitting small items into corners
        List<ProductReference> sortedItems = new ArrayList<>(items);
        sortedItems.sort((a, b) -> Double.compare(a.getVolumeCm3(), b.getVolumeCm3()));

        List<BoxItem> boxItems = new ArrayList<>();
        for (ProductReference item : sortedItems) {
            CompressedSize size = getCompressedSize(item);

            Box box = Box.newBuilder()
                    .withId(item.getName())
                    .withSize(toMm(size.lengthCm()), toMm(size.widthCm()), toMm(size.heightCm()))
                    .withWeight(item.getWeightG())
                    .withRotate3D()
                    .build();
            boxItems.add(new BoxItem(box, 1));
        }
        return boxItems;
    }

    private List<BoxItem> createBoxItemsLibraryNative(List<ProductReference> items) {
        List<BoxItem> boxItems = new ArrayList<>();
        for (ProductReference item : items) {
            Box box = Box.newBuilder()
                    .withId(item.getName())
                    .withSize(toMm(item.getLengthCm()), toMm(item.getWidthCm()), toMm(item.getHeightCm()))
                    .withWeight(item.getWeightG())
                    .withRotate3D()
                    .build();
            boxItems.add(new BoxItem(box, 1));
        }
        return boxItems;
    }

    private List<BoxItem> createBoxItemsOriginalOrder(List<ProductReference> items) {
        List<BoxItem> boxItems = new ArrayList<>();
        for (ProductReference item : items) {
            CompressedSize size = getCompressedSize(item);

            Box box = Box.newBuilder()
                    .withId(item.getName())
                    .withSize(toMm(size.lengthCm()), toMm(size.widthCm()), toMm(size.heightCm()))
                    .withWeight(item.getWeightG())
                    .withRotate3D()
                    .build();
            boxItems.add(new BoxItem(box, 1));
        }
        return boxItems;
    }

    private List<BoxItem> createBoxItemsWithSort(List<ProductReference> items,
            java.util.Comparator<ProductReference> comparator) {
        List<ProductReference> sortedItems = new ArrayList<>(items);
        sortedItems.sort(comparator);

        List<BoxItem> boxItems = new ArrayList<>();
        for (ProductReference item : sortedItems) {
            CompressedSize size = getCompressedSize(item);

            Box box = Box.newBuilder()
                    .withId(item.getName())
                    .withSize(toMm(size.lengthCm()), toMm(size.widthCm()), toMm(size.heightCm()))
                    .withWeight(item.getWeightG())
                    .withRotate3D()
                    .build();
            boxItems.add(new BoxItem(box, 1));
        }
        return boxItems;
    }

    private record CompressedSize(double lengthCm, double widthCm, double heightCm) {
    }

    private CompressedSize getCompressedSize(ProductReference item) {
        double l = item.getLengthCm();
        double w = item.getWidthCm();
        double h = item.getHeightCm();

        if (isPlushItem(item)) {
            // Plush toys (ぬいぐるみ/ちびぐるみ/plush) can be compressed to 60%
            l *= PLUSH_ITEM_COMPRESSION;
            w *= PLUSH_ITEM_COMPRESSION;
            h *= PLUSH_ITEM_COMPRESSION;
        } else if (isFashionItem(item)) {
            h *= SOFT_ITEM_COMPRESSION;
        }

        return new CompressedSize(l, w, h);
    }

    private boolean isPlushItem(ProductReference item) {
        return containsPlushKeyword(item.getName()) || containsPlushKeyword(item.getNameJp());
    }

    private boolean containsPlushKeyword(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }
        String lower = value.toLowerCase(Locale.ROOT);
        return lower.contains("plush") || value.contains("ぬいぐるみ") || value.contains("ちびぐるみ");
    }

    private boolean isFashionItem(ProductReference item) {
        String category = item.getCategory();
        if (category == null || category.isBlank()) {
            return false;
        }
        return "fashion".equalsIgnoreCase(category) || category.contains("ファッション");
    }

    private Dimensions basicSum(List<ProductReference> items) {
        double l = 0, w = 0, h = 0;
        int weight = 0;
        for (ProductReference item : items) {
            l = Math.max(l, item.getLengthCm());
            w = Math.max(w, item.getWidthCm());
            h += item.getHeightCm();
            weight += item.getWeightG();
        }
        return new Dimensions(l, w, h, weight, items.size());
    }

    private int toMm(double cm) {
        return (int) Math.round(cm * 10);
    }

    private double toCm(int mm) {
        return mm / 10.0;
    }
}
