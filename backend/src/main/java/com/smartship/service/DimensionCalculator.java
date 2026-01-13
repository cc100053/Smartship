package com.smartship.service;

import com.smartship.dto.Dimensions;
import com.smartship.dto.request.CartItemDto;
import com.smartship.entity.ProductReference;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class DimensionCalculator {

    private static final double SOFT_ITEM_COMPRESSION = 0.8;

    public Dimensions calculateFromCart(List<CartItemDto> items, Map<Integer, ProductReference> productMap) {
        if (items == null || items.isEmpty()) {
            return new Dimensions(0, 0, 0, 0, 0);
        }

        double maxLength = 0;
        double maxWidth = 0;
        double totalHeight = 0;
        int totalWeight = 0;
        int totalItems = 0;

        for (CartItemDto item : items) {
            if (item == null || item.quantity() <= 0) {
                continue;
            }

            ProductReference product = productMap.get(item.productId());
            if (product == null) {
                continue;
            }

            int quantity = item.quantity();

            maxLength = Math.max(maxLength, product.getLengthCm());
            maxWidth = Math.max(maxWidth, product.getWidthCm());

            double itemHeight = product.getHeightCm() * quantity;
            if ("Fashion".equals(product.getCategory())) {
                itemHeight *= SOFT_ITEM_COMPRESSION;
            }

            totalHeight += itemHeight;
            totalWeight += product.getWeightG() * quantity;
            totalItems += quantity;
        }

        return new Dimensions(maxLength, maxWidth, totalHeight, totalWeight, totalItems);
    }

    public Dimensions calculateFromManualInputGrams(double length, double width, double height, int weightG) {
        return new Dimensions(length, width, height, weightG, 1);
    }
}
