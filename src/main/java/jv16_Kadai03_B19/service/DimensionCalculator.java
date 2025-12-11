package jv16_Kadai03_B19.service;

import java.util.List;

import jv16_Kadai03_B19.model.CartItem;
import jv16_Kadai03_B19.model.Dimensions;
import jv16_Kadai03_B19.model.ProductReference;

/**
 * Service for calculating total dimensions from multiple items.
 * Implements smart stacking logic to estimate package size.
 */
public class DimensionCalculator {
    
    // Compression factor for soft items (e.g., clothing)
    private static final double SOFT_ITEM_COMPRESSION = 0.8;
    
    /**
     * Calculate total dimensions from a list of cart items.
     * 
     * Logic:
     * - Total weight = Sum of all item weights
     * - Length = Maximum length among all items
     * - Width = Maximum width among all items  
     * - Height = Sum of all heights (stacked), with compression for soft items
     */
    public Dimensions calculateFromCart(List<CartItem> cartItems) {
        if (cartItems == null || cartItems.isEmpty()) {
            return new Dimensions(0, 0, 0, 0, 0);
        }
        
        double maxLength = 0;
        double maxWidth = 0;
        double totalHeight = 0;
        int totalWeight = 0;
        int totalItems = 0;
        
        for (CartItem item : cartItems) {
            ProductReference product = item.getProduct();
            int quantity = item.getQuantity();
            
            // Find max length and width (assume flat packing)
            maxLength = Math.max(maxLength, product.getLengthCm());
            maxWidth = Math.max(maxWidth, product.getWidthCm());
            
            // Sum heights (stacked)
            double itemHeight = product.getHeightCm() * quantity;
            
            // Apply compression for soft items (Fashion category)
            if ("Fashion".equals(product.getCategory())) {
                itemHeight *= SOFT_ITEM_COMPRESSION;
            }
            
            totalHeight += itemHeight;
            
            // Sum weights
            totalWeight += product.getWeightG() * quantity;
            
            totalItems += quantity;
        }
        
        return new Dimensions(maxLength, maxWidth, totalHeight, totalWeight, totalItems);
    }
    
    /**
     * Calculate dimensions from manual input (W, D, H in cm, weight in kg).
     * Converts from the current app's format.
     */
    public Dimensions calculateFromManualInput(int w, int d, int h, double weightKg) {
        // W = 縦 (length), D = 横 (width), H = 厚さ (height)
        return new Dimensions(w, d, h, (int)(weightKg * 1000), 1);
    }
    
    /**
     * Calculate dimensions from manual input with weight in grams.
     */
    public Dimensions calculateFromManualInputGrams(double length, double width, double height, int weightG) {
        return new Dimensions(length, width, height, weightG, 1);
    }
}
