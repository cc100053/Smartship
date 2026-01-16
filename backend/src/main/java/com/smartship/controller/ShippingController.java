package com.smartship.controller;

import com.smartship.dto.Dimensions;
import com.smartship.dto.PackingResult;
import com.smartship.dto.request.CartCalculationRequest;
import com.smartship.dto.request.CartItemDto;
import com.smartship.dto.request.ManualDimensionRequest;
import com.smartship.dto.response.CalculationResponse;
import com.smartship.dto.response.ShippingResultResponse;
import com.smartship.entity.ProductReference;
import com.smartship.repository.ProductRepository;
import com.smartship.service.DimensionCalculator;
import com.smartship.service.PackingService;
import com.smartship.service.ShippingMatcher;
import com.smartship.service.ShippingMatcher.ShippingMatch;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/shipping")
public class ShippingController {

    private final ProductRepository productRepository;
    private final DimensionCalculator dimensionCalculator;
    private final ShippingMatcher shippingMatcher;
    private final PackingService packingService;

    public ShippingController(ProductRepository productRepository,
            DimensionCalculator dimensionCalculator,
            ShippingMatcher shippingMatcher,
            PackingService packingService) {
        this.productRepository = productRepository;
        this.dimensionCalculator = dimensionCalculator;
        this.shippingMatcher = shippingMatcher;
        this.packingService = packingService;
    }

    @PostMapping("/calculate/manual")
    public CalculationResponse calculateManual(@RequestBody ManualDimensionRequest request) {
        Dimensions dims = dimensionCalculator.calculateFromManualInputGrams(
                request.lengthCm(),
                request.widthCm(),
                request.heightCm(),
                request.weightG());

        // For manual input, we create a single "Virtual Product" to represent the box
        ProductReference virtualProduct = new ProductReference(
                0, "Manual", "Manual Item", "手動入力",
                request.lengthCm(), request.widthCm(), request.heightCm(), request.weightG(), null);

        return buildResponse(new ArrayList<>(List.of(virtualProduct)), dims);
    }

    // New endpoint: Returns packed dimensions AND placements (for real-time 3D
    // preview)
    @PostMapping("/calculate/dimensions")
    public PackingResult calculateDimensions(@RequestBody CartCalculationRequest request) {
        if (request == null || request.items() == null || request.items().isEmpty()) {
            return new PackingResult(new Dimensions(0, 0, 0, 0, 0), List.of());
        }

        List<ProductReference> expandedItems = expandCartItems(request);
        return packingService.calculatePackedResult(expandedItems);
    }

    @PostMapping("/calculate/cart")
    public CalculationResponse calculateCart(@RequestBody CartCalculationRequest request) {
        System.out.println("[ShippingController] calculateCart called with " +
                (request.items() != null ? request.items().size() : 0) + " item types");

        if (request == null || request.items() == null || request.items().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart items are required.");
        }

        Set<Integer> productIds = request.items().stream()
                .filter(item -> item != null)
                .map(CartItemDto::productId)
                .collect(Collectors.toCollection(HashSet::new));

        if (productIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart items are required.");
        }

        List<ProductReference> products = productRepository.findAllById(productIds);
        Map<Integer, ProductReference> productMap = products.stream()
                .collect(Collectors.toMap(ProductReference::getId, product -> product));

        if (productMap.size() != productIds.size()) {
            Set<Integer> missing = new HashSet<>(productIds);
            missing.removeAll(productMap.keySet());
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unknown product IDs: " + missing);
        }

        // Expand items first
        List<ProductReference> expandedItems = new ArrayList<>();
        for (CartItemDto item : request.items()) {
            ProductReference product = productMap.get(item.productId());
            if (product != null && item.quantity() > 0) {
                for (int i = 0; i < item.quantity(); i++) {
                    expandedItems.add(product);
                }
            }
        }

        System.out.println("[ShippingController] Expanded items count: " + expandedItems.size());

        // Use PackingService to get REAL packed dimensions to show the user
        Dimensions dims = packingService.calculatePackedDimensions(expandedItems);
        System.out.println("[ShippingController] Packed dims: L=" + dims.getLengthCm() +
                ", W=" + dims.getWidthCm() + ", H=" + dims.getHeightCm());

        return buildResponse(expandedItems, dims);
    }

    private CalculationResponse buildResponse(List<ProductReference> items, Dimensions dims) {
        List<ShippingMatch> matches = shippingMatcher.findBestOptions(items, dims);
        List<ShippingResultResponse> options = matches.stream()
                .map(this::toResponse)
                .toList();
        ShippingResultResponse recommended = options.isEmpty() ? null : options.get(0);
        return new CalculationResponse(dims, recommended, options);
    }

    private List<ProductReference> expandCartItems(CartCalculationRequest request) {
        Set<Integer> productIds = request.items().stream()
                .filter(item -> item != null)
                .map(CartItemDto::productId)
                .collect(Collectors.toCollection(HashSet::new));

        List<ProductReference> products = productRepository.findAllById(productIds);
        Map<Integer, ProductReference> productMap = products.stream()
                .collect(Collectors.toMap(ProductReference::getId, product -> product));

        List<ProductReference> expandedItems = new ArrayList<>();
        for (CartItemDto item : request.items()) {
            ProductReference product = productMap.get(item.productId());
            if (product != null && item.quantity() > 0) {
                for (int i = 0; i < item.quantity(); i++) {
                    expandedItems.add(product);
                }
            }
        }
        return expandedItems;
    }

    private ShippingResultResponse toResponse(ShippingMatch match) {
        var carrier = match.carrier();
        return new ShippingResultResponse(
                carrier.getId(),
                carrier.getCompanyName(),
                carrier.getServiceName(),
                carrier.getPriceYen(),
                carrier.getHasTracking(),
                carrier.getSendLocation(),
                carrier.getNotes(),
                carrier.getMaxLength(),
                carrier.getMaxWidth(),
                carrier.getMaxHeight(),
                carrier.getMaxWeightG(),
                carrier.getSizeSumLimit(),
                match.canFit(),
                match.recommended(),
                match.reason());
    }
}
