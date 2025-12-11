package jv16_Kadai03_B19.model;

import java.io.Serializable;

/**
 * Represents an item in the user's cart.
 * Links a product reference with a quantity.
 */
public class CartItem implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private ProductReference product;
    private int quantity;
    
    // Default constructor
    public CartItem() {
        this.quantity = 1;
    }
    
    // Constructor with product
    public CartItem(ProductReference product) {
        this.product = product;
        this.quantity = 1;
    }
    
    // Full constructor
    public CartItem(ProductReference product, int quantity) {
        this.product = product;
        this.quantity = quantity;
    }
    
    // Getters and Setters
    public ProductReference getProduct() { return product; }
    public void setProduct(ProductReference product) { this.product = product; }
    
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    
    /**
     * Increment quantity by 1
     */
    public void increment() {
        this.quantity++;
    }
    
    /**
     * Decrement quantity by 1 (minimum 0)
     */
    public void decrement() {
        if (this.quantity > 0) {
            this.quantity--;
        }
    }
    
    /**
     * Get total weight for this cart item (product weight × quantity)
     */
    public int getTotalWeightG() {
        return product.getWeightG() * quantity;
    }
    
    /**
     * Get total height for this cart item (stacked height)
     */
    public double getTotalHeightCm() {
        return product.getHeightCm() * quantity;
    }
    
    @Override
    public String toString() {
        return String.format("CartItem[%s × %d]", product.getNameJp(), quantity);
    }
}
