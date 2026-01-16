package com.smartship.service;

import com.github.skjolber.packing.api.Box;
import com.github.skjolber.packing.api.BoxItem;
import com.github.skjolber.packing.api.Container;
import com.github.skjolber.packing.api.ContainerItem;
import com.github.skjolber.packing.api.PackagerResult;
import com.github.skjolber.packing.api.Placement;
import com.github.skjolber.packing.packer.bruteforce.BruteForcePackager;
import com.smartship.dto.Dimensions;
import com.smartship.dto.PackingResult;
import com.smartship.dto.PlacementInfo;
import com.smartship.entity.ProductReference;
import com.smartship.entity.ShippingCarrier;
import jakarta.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class PackingService {

    static {
        System.out.println("[DEBUG] PackingService class loading...");
    }

    @PostConstruct
    public void init() {
        System.out.println("[DEBUG] PackingService bean initialized!");
    }

    private static final double SOFT_ITEM_COMPRESSION = 0.8;

    public boolean canFit(List<ProductReference> items, ShippingCarrier carrier) {
        if (items.isEmpty()) {
            return true;
        }

        Container container = createContainer(carrier);
        List<ContainerItem> containerItems = ContainerItem.newListBuilder()
                .withContainer(container)
                .build();
        List<BoxItem> boxItems = createBoxItems(items);

        // Use BruteForcePackager as LAFF was missing
        BruteForcePackager packager = BruteForcePackager.newBuilder().build();

        PackagerResult result = packager.newResultBuilder()
                .withContainerItems(containerItems)
                .withBoxItems(boxItems)
                .withMaxContainerCount(1)
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

        // Use standard containers to find the best fit (natural packing)
        List<Container> containers = getStandardContainers();

        List<ContainerItem> containerItems = ContainerItem.newListBuilder()
                .withContainers(containers)
                .build();

        List<BoxItem> boxItems = createBoxItems(items);

        BruteForcePackager packager = BruteForcePackager.newBuilder().build();

        PackagerResult result = packager.newResultBuilder()
                .withContainerItems(containerItems)
                .withBoxItems(boxItems)
                .build();

        // If standard containers fail (too big), try a fallback huge container
        if (!result.isSuccess()) {
            Container huge = Container.newBuilder()
                    .withDescription("Huge")
                    .withSize(3000, 3000, 3000)
                    .withEmptyWeight(0)
                    .withMaxLoadWeight(100_000_000)
                    .build();

            containerItems = ContainerItem.newListBuilder()
                    .withContainer(huge)
                    .build();

            result = packager.newResultBuilder()
                    .withContainerItems(containerItems)
                    .withBoxItems(boxItems)
                    .build();
        }

        if (!result.isSuccess()) {
            System.out.println("[PackingService] Packing failed even with huge container!");
            return new PackingResult(basicSum(items), List.of());
        }

        Container packedContainer = result.get(0);
        if (packedContainer.getStack() == null) {
            return new PackingResult(basicSum(items), List.of());
        }

        int maxX = 0;
        int maxY = 0;
        int maxZ = 0;
        List<PlacementInfo> placements = new ArrayList<>();
        String[] colors = { "#4ade80", "#60a5fa", "#f472b6", "#facc15", "#a78bfa", "#fb923c" };
        int colorIndex = 0;

        for (Placement p : packedContainer.getStack().getPlacements()) {
            maxX = Math.max(maxX, p.getAbsoluteEndX());
            maxY = Math.max(maxY, p.getAbsoluteEndY());
            maxZ = Math.max(maxZ, p.getAbsoluteEndZ());

            int width = p.getAbsoluteEndX() - p.getAbsoluteX();
            int depth = p.getAbsoluteEndY() - p.getAbsoluteY();
            int height = p.getAbsoluteEndZ() - p.getAbsoluteZ();

            String itemName = colorIndex < items.size() ? items.get(colorIndex).getName() : "Item " + colorIndex;

            placements.add(new PlacementInfo(
                    itemName,
                    p.getAbsoluteX(),
                    p.getAbsoluteY(),
                    p.getAbsoluteZ(),
                    width,
                    depth,
                    height,
                    colors[colorIndex % colors.length]));
            colorIndex++;
        }

        int totalWeight = items.stream().mapToInt(ProductReference::getWeightG).sum();

        Dimensions dims = new Dimensions(
                toCm(maxX),
                toCm(maxY),
                toCm(maxZ),
                totalWeight,
                items.size());

        return new PackingResult(dims, placements);
    }

    private List<Container> getStandardContainers() {
        return List.of(
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

    private Container createContainer(ShippingCarrier carrier) {
        return Container.newBuilder()
                .withDescription(carrier.getFullName())
                .withSize(toMm(carrier.getMaxLength()), toMm(carrier.getMaxWidth()), toMm(carrier.getMaxHeight()))
                .withEmptyWeight(0)
                .withMaxLoadWeight(carrier.getMaxWeightG() != null ? carrier.getMaxWeightG() : 100_000)
                .build();
    }

    private List<BoxItem> createBoxItems(List<ProductReference> items) {
        List<BoxItem> boxItems = new ArrayList<>();
        for (ProductReference item : items) {
            double h = item.getHeightCm();
            if ("Fashion".equals(item.getCategory())) {
                h *= SOFT_ITEM_COMPRESSION;
            }
            Box box = Box.newBuilder()
                    .withId(item.getName())
                    .withSize(toMm(item.getLengthCm()), toMm(item.getWidthCm()), toMm(h))
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
