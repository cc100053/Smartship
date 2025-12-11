package jv16_Kadai03_B19.model;

import java.io.Serializable;

/**
 * Represents a shipping recommendation result.
 * Contains the carrier, whether it's recommended, and the reason.
 */
public class ShippingResult implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private ShippingCarrier carrier;
    private boolean isRecommended;
    private String reason;
    private boolean canFit;
    
    // Default constructor
    public ShippingResult() {}
    
    // Constructor for fitting carrier
    public ShippingResult(ShippingCarrier carrier, boolean isRecommended, String reason) {
        this.carrier = carrier;
        this.isRecommended = isRecommended;
        this.reason = reason;
        this.canFit = true;
    }
    
    // Constructor with canFit flag
    public ShippingResult(ShippingCarrier carrier, boolean canFit, boolean isRecommended, String reason) {
        this.carrier = carrier;
        this.canFit = canFit;
        this.isRecommended = isRecommended;
        this.reason = reason;
    }
    
    // Getters and Setters
    public ShippingCarrier getCarrier() { return carrier; }
    public void setCarrier(ShippingCarrier carrier) { this.carrier = carrier; }
    
    public boolean isRecommended() { return isRecommended; }
    public void setRecommended(boolean recommended) { isRecommended = recommended; }
    
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    
    public boolean canFit() { return canFit; }
    public void setCanFit(boolean canFit) { this.canFit = canFit; }
    
    /**
     * Get display text for price with yen symbol
     */
    public String getPriceDisplay() {
        return "¥" + carrier.getPriceYen();
    }
    
    @Override
    public String toString() {
        String prefix = isRecommended ? "🏆 " : "";
        return String.format("%s%s - %s (%s)",
            prefix, carrier.getFullName(), getPriceDisplay(), reason);
    }
}
