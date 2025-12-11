package jv16_Kadai03_B19.model;

import java.io.Serializable;

/**
 * Represents calculated dimensions from cart items.
 * Used as output from DimensionCalculator service.
 */
public class Dimensions implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private double lengthCm;
    private double widthCm;
    private double heightCm;
    private int weightG;
    private int itemCount;
    
    // Default constructor
    public Dimensions() {}
    
    // Full constructor
    public Dimensions(double lengthCm, double widthCm, double heightCm, int weightG, int itemCount) {
        this.lengthCm = lengthCm;
        this.widthCm = widthCm;
        this.heightCm = heightCm;
        this.weightG = weightG;
        this.itemCount = itemCount;
    }
    
    // Getters and Setters
    public double getLengthCm() { return lengthCm; }
    public void setLengthCm(double lengthCm) { this.lengthCm = lengthCm; }
    
    public double getWidthCm() { return widthCm; }
    public void setWidthCm(double widthCm) { this.widthCm = widthCm; }
    
    public double getHeightCm() { return heightCm; }
    public void setHeightCm(double heightCm) { this.heightCm = heightCm; }
    
    public int getWeightG() { return weightG; }
    public void setWeightG(int weightG) { this.weightG = weightG; }
    
    public int getItemCount() { return itemCount; }
    public void setItemCount(int itemCount) { this.itemCount = itemCount; }
    
    /**
     * Get weight in kilograms
     */
    public double getWeightKg() {
        return weightG / 1000.0;
    }
    
    /**
     * Get size sum (L + W + H) for サイズ判定
     */
    public double getSizeSum() {
        return lengthCm + widthCm + heightCm;
    }
    
    /**
     * Get formatted size string
     */
    public String getSizeString() {
        return String.format("%.1f × %.1f × %.1f cm", lengthCm, widthCm, heightCm);
    }
    
    /**
     * Get formatted weight string
     */
    public String getWeightString() {
        if (weightG >= 1000) {
            return String.format("%.1f kg", getWeightKg());
        } else {
            return String.format("%d g", weightG);
        }
    }
    
    @Override
    public String toString() {
        return String.format("Dimensions[%s, %s, %d items]", getSizeString(), getWeightString(), itemCount);
    }
}
