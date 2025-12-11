package jv16_Kadai03_B19.model;

import java.io.Serializable;

/**
 * Represents a shipping carrier service from the database.
 * Contains carrier limits (size, weight) and pricing.
 */
public class ShippingCarrier implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private int id;
    private String companyName;
    private String serviceName;
    private double maxLength;
    private double maxWidth;
    private double maxHeight;
    private int maxWeightG;
    private Integer sizeSumLimit;  // For services with L+W+H limit (e.g., Size 60)
    private int priceYen;
    private boolean hasTracking;  // 追跡あり/なし
    private String notes;
    private String sendLocation;
    
    // Default constructor
    public ShippingCarrier() {}
    
    // Full constructor
    public ShippingCarrier(int id, String companyName, String serviceName,
                          double maxLength, double maxWidth, double maxHeight,
                          int maxWeightG, Integer sizeSumLimit, int priceYen, String notes, String sendLocation) {
        this.id = id;
        this.companyName = companyName;
        this.serviceName = serviceName;
        this.maxLength = maxLength;
        this.maxWidth = maxWidth;
        this.maxHeight = maxHeight;
        this.maxWeightG = maxWeightG;
        this.sizeSumLimit = sizeSumLimit;
        this.priceYen = priceYen;
        this.notes = notes;
        this.sendLocation = sendLocation;
    }
    
    // Getters and Setters
    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    
    public String getServiceName() { return serviceName; }
    public void setServiceName(String serviceName) { this.serviceName = serviceName; }
    
    public double getMaxLength() { return maxLength; }
    public void setMaxLength(double maxLength) { this.maxLength = maxLength; }
    
    public double getMaxWidth() { return maxWidth; }
    public void setMaxWidth(double maxWidth) { this.maxWidth = maxWidth; }
    
    public double getMaxHeight() { return maxHeight; }
    public void setMaxHeight(double maxHeight) { this.maxHeight = maxHeight; }
    
    public int getMaxWeightG() { return maxWeightG; }
    public void setMaxWeightG(int maxWeightG) { this.maxWeightG = maxWeightG; }
    
    public Integer getSizeSumLimit() { return sizeSumLimit; }
    public void setSizeSumLimit(Integer sizeSumLimit) { this.sizeSumLimit = sizeSumLimit; }
    
    public int getPriceYen() { return priceYen; }
    public void setPriceYen(int priceYen) { this.priceYen = priceYen; }
    
    public boolean isHasTracking() { return hasTracking; }
    public void setHasTracking(boolean hasTracking) { this.hasTracking = hasTracking; }
    
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    
    public String getSendLocation() { return sendLocation; }
    public void setSendLocation(String sendLocation) { this.sendLocation = sendLocation; }
    
    /**
     * Get full display name (company + service)
     */
    public String getFullName() {
        return companyName + " " + serviceName;
    }
    
    /**
     * Check if given dimensions fit this carrier
     */
    public boolean canFit(double length, double width, double height, int weightG) {
        // Check individual dimensions
        if (length > maxLength || width > maxWidth || height > maxHeight) {
            return false;
        }
        
        // Check weight
        if (weightG > maxWeightG) {
            return false;
        }
        
        // Check size sum limit if applicable (e.g., 60サイズ = L+W+H <= 60)
        if (sizeSumLimit != null) {
            double sizeSum = length + width + height;
            if (sizeSum > sizeSumLimit) {
                return false;
            }
        }
        
        return true;
    }
    
    @Override
    public String toString() {
        return String.format("ShippingCarrier[%s %s, ¥%d]", companyName, serviceName, priceYen);
    }
}
