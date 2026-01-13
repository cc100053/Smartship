package com.smartship.controller;

import com.smartship.dto.Dimensions;
import com.smartship.dto.request.CartCalculationRequest;
import com.smartship.dto.request.CartItemDto;
import com.smartship.dto.request.ManualDimensionRequest;
import com.smartship.dto.response.CalculationResponse;
import com.smartship.dto.response.ShippingResultResponse;
import com.smartship.entity.ProductReference;
import com.smartship.repository.ProductRepository;
import com.smartship.service.DimensionCalculator;
import com.smartship.service.ShippingMatcher;
import com.smartship.service.ShippingMatcher.ShippingMatch;
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

    public ShippingController(ProductRepository productRepository,
                              DimensionCalculator dimensionCalculator,
                              ShippingMatcher shippingMatcher) {
        this.productRepository = productRepository;
        this.dimensionCalculator = dimensionCalculator;
        this.shippingMatcher = shippingMatcher;
    }

    @PostMapping("/calculate/manual")
    public CalculationResponse calculateManual(@RequestBody ManualDimensionRequest request) {
        Dimensions dims = dimensionCalculator.calculateFromManualInputGrams(
            request.lengthCm(),
            request.widthCm(),
            request.heightCm(),
            request.weightG()
        );
        return buildResponse(dims);
    }

    @PostMapping("/calculate/cart")
    public CalculationResponse calculateCart(@RequestBody CartCalculationRequest request) {
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
                "Unknown product IDs: " + missing
            );
        }

        Dimensions dims = dimensionCalculator.calculateFromCart(request.items(), productMap);
        return buildResponse(dims);
    }

    private CalculationResponse buildResponse(Dimensions dims) {
        List<ShippingMatch> matches = shippingMatcher.findBestOptions(dims);
        List<ShippingResultResponse> options = matches.stream()
            .map(this::toResponse)
            .toList();
        ShippingResultResponse recommended = options.isEmpty() ? null : options.get(0);
        return new CalculationResponse(dims, recommended, options);
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
            match.reason()
        );
    }
}
