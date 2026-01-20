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

    public boolean canFit(List<ProductReference> items, ShippingCarrier carrier) {
        if (items.isEmpty()) {
            return true;
        }

        Container container = createContainer(carrier);
        List<ContainerItem> containerItems = ContainerItem.newListBuilder()
                .withContainer(container)
                .build();
        List<BoxItem> boxItems = createBoxItems(items);

        // Use FastLargestAreaFitFirstPackager - stacks in 2D within each level for
        // tighter packing
        FastLargestAreaFitFirstPackager packager = FastLargestAreaFitFirstPackager.newBuilder().build();

        PackagerResult result = packager.newResultBuilder()
                .withContainerItems(containerItems)
                .withBoxItems(boxItems)
                .withMaxContainerCount(1)
                .withDeadline(System.currentTimeMillis() + 5000) // 5 second timeout
                .build();

        return result.isSuccess();
    }

    public Dimensions calculatePackedDimensions(List<ProductReference> items) {
        return calculatePackedResult(items).dimensions();
    }

    public PackingResult calculatePackedResult(List<ProductReference> items) {
        if (items == null || items.isEmpty()) {
            return new PackingResult(new Dimensions(0, 0, 0, 0, 0), List.of());
        }

        if (USE_LIBRARY_ONLY) {
            return calculatePackedResultLibrary(items);
        }

        // Try multiple sorting strategies and pick the one with the most shipping-efficient bounding box.
        // Prefer smaller size sum (L+W+H), then smaller max dimension, then smaller volume.
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
        List<Container> containers = getLibraryContainers();
        List<ContainerItem> containerItems = ContainerItem.newListBuilder()
                .withContainers(containers)
                .build();
        List<BoxItem> boxItems = createBoxItemsOriginalOrder(items);

        Packager<?> packager = FastLargestAreaFitFirstPackager.newBuilder().build();
        try {
            PackagerResult result = packager.newResultBuilder()
                    .withContainerItems(containerItems)
                    .withBoxItems(boxItems)
                    .withDeadline(System.currentTimeMillis() + 2000)
                    .build();

            if (!result.isSuccess()) {
                Container huge = Container.newBuilder()
                        .withDescription("Huge")
                        .withSize(3000, 3000, 3000)
                        .withEmptyWeight(0)
                        .withMaxLoadWeight(100_000_000)
                        .build();

                PackagerResult hugeResult = packager.newResultBuilder()
                        .withContainerItems(ContainerItem.newListBuilder().withContainer(huge).build())
                        .withBoxItems(boxItems)
                        .withDeadline(System.currentTimeMillis() + 500)
                        .build();

                if (!hugeResult.isSuccess()) {
                    return new PackingResult(basicSum(items), List.of());
                }
                result = hugeResult;
            }

            Container packedContainer = result.get(0);
            if (packedContainer.getStack() == null) {
                return new PackingResult(basicSum(items), List.of());
            }

            PackingResult packed = buildPackingResult(packedContainer, items);
            return compactPlacements(packed);
        } finally {
            closeQuietly(packager);
        }
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
        for (int pass = 0; pass < COMPACTION_PASSES; pass++) {
            Dimensions baseDims = dimensionsFromPlacements(toPlacementInfos(current),
                    packed.dimensions().getWeightG(), packed.dimensions().getItemCount());
            double baseVolume = volumeCm3(baseDims);

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

                Dimensions candidateDims = dimensionsFromPlacements(candidate,
                        packed.dimensions().getWeightG(), packed.dimensions().getItemCount());
                double candidateVolume = volumeCm3(candidateDims);
                double delta = candidateVolume - baseVolume;
                PackingScore candidateScore = score(candidateDims);

                if (bestMove == null || delta < bestMove.delta - 1e-6
                        || (Math.abs(delta - bestMove.delta) <= 1e-6
                                && isBetter(candidateScore, bestMove.score))) {
                    bestMove = new MoveCandidate(i, targetX, targetY, targetZ, delta, candidateScore);
                }
            }

            if (bestMove == null || bestMove.delta >= -1e-6) {
                break;
            }

            MutablePlacement moved = current.get(bestMove.index);
            moved.x = bestMove.x;
            moved.y = bestMove.y;
            moved.z = bestMove.z;
            movedAny = true;
        }

        if (!movedAny) {
            return packed;
        }

        return normalizeResult(toPlacementInfos(current), packed.dimensions().getWeightG(), packed.dimensions().getItemCount());
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

    private record MoveCandidate(int index, int x, int y, int z, double delta, PackingScore score) {
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

    private List<Container> getLibraryContainers() {
        return getFallbackContainers();
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
        return List.of(
                // Nekoposu (A4 size, 3cm thick) - Prioritize flat packing!
                Container.newBuilder().withDescription("Nekoposu").withSize(312, 228, 30).withEmptyWeight(0)
                        .withMaxLoadWeight(1000).build(),
                // Yu-Packet Post (Stick style, 3cm thick)
                Container.newBuilder().withDescription("Yu-Packet Post").withSize(327, 228, 30).withEmptyWeight(0)
                        .withMaxLoadWeight(2000).build(),
                // Compact Box (5cm thick)
                Container.newBuilder().withDescription("Compact").withSize(250, 200, 50).withEmptyWeight(0)
                        .withMaxLoadWeight(5000).build(),
                // Letter Pack Plus (User specified ~7cm height target)
                Container.newBuilder().withDescription("Letter Pack Plus").withSize(340, 248, 70).withEmptyWeight(0)
                        .withMaxLoadWeight(4000).build(),
                // Size 60
                Container.newBuilder().withDescription("Size 60").withSize(250, 200, 150).withEmptyWeight(0)
                        .withMaxLoadWeight(2000).build(),
                // Size 80
                Container.newBuilder().withDescription("Size 80").withSize(350, 250, 200).withEmptyWeight(0)
                        .withMaxLoadWeight(5000).build(),
                // Size 100
                Container.newBuilder().withDescription("Size 100").withSize(450, 350, 200).withEmptyWeight(0)
                        .withMaxLoadWeight(10000).build(),
                // Size 120
                Container.newBuilder().withDescription("Size 120").withSize(550, 400, 250).withEmptyWeight(0)
                        .withMaxLoadWeight(15000).build(),
                // Size 140
                Container.newBuilder().withDescription("Size 140").withSize(600, 450, 350).withEmptyWeight(0)
                        .withMaxLoadWeight(20000).build(),
                // Size 160
                Container.newBuilder().withDescription("Size 160").withSize(700, 500, 400).withEmptyWeight(0)
                        .withMaxLoadWeight(25000).build());
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
            double l = item.getLengthCm();
            double w = item.getWidthCm();
            double h = item.getHeightCm();

            // Apply compression for soft/compressible items
            String name = item.getName();
            if (name != null && name.toLowerCase().contains("plush")) {
                // Plush toys (ぬいぐるみ/ちびぐるみ) can be compressed to 60%
                l *= PLUSH_ITEM_COMPRESSION;
                w *= PLUSH_ITEM_COMPRESSION;
                h *= PLUSH_ITEM_COMPRESSION;
            } else if ("Fashion".equals(item.getCategory())) {
                h *= SOFT_ITEM_COMPRESSION;
            }

            Box box = Box.newBuilder()
                    .withId(item.getName())
                    .withSize(toMm(l), toMm(w), toMm(h))
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
            double l = item.getLengthCm();
            double w = item.getWidthCm();
            double h = item.getHeightCm();

            // Apply compression for soft/compressible items
            String name = item.getName();
            if (name != null && name.toLowerCase().contains("plush")) {
                // Plush toys (ぬいぐるみ/ちびぐるみ) can be compressed to 60%
                l *= PLUSH_ITEM_COMPRESSION;
                w *= PLUSH_ITEM_COMPRESSION;
                h *= PLUSH_ITEM_COMPRESSION;
            } else if ("Fashion".equals(item.getCategory())) {
                h *= SOFT_ITEM_COMPRESSION;
            }

            Box box = Box.newBuilder()
                    .withId(item.getName())
                    .withSize(toMm(l), toMm(w), toMm(h))
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
            double l = item.getLengthCm();
            double w = item.getWidthCm();
            double h = item.getHeightCm();

            // Apply compression for soft/compressible items
            String name = item.getName();
            if (name != null && name.toLowerCase().contains("plush")) {
                l *= PLUSH_ITEM_COMPRESSION;
                w *= PLUSH_ITEM_COMPRESSION;
                h *= PLUSH_ITEM_COMPRESSION;
            } else if ("Fashion".equals(item.getCategory())) {
                h *= SOFT_ITEM_COMPRESSION;
            }

            Box box = Box.newBuilder()
                    .withId(item.getName())
                    .withSize(toMm(l), toMm(w), toMm(h))
                    .withWeight(item.getWeightG())
                    .withRotate3D()
                    .build();
            boxItems.add(new BoxItem(box, 1));
        }
        return boxItems;
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
