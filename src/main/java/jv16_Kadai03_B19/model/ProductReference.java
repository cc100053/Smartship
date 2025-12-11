package jv16_Kadai03_B19.model;

import java.io.Serializable;

/**
 * Represents a product reference from the database.
 * Used for "Quick Add" feature - users can select common items without measuring.
 */
public class ProductReference implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private int id;
    private String category;
    private String name;
    private String nameJp;
    private double lengthCm;
    private double widthCm;
    private double heightCm;
    private int weightG;
    private String imageIcon;
    
    // Default constructor
    public ProductReference() {}
    
    // Full constructor
    public ProductReference(int id, String category, String name, String nameJp,
                           double lengthCm, double widthCm, double heightCm,
                           int weightG, String imageIcon) {
        this.id = id;
        this.category = category;
        this.name = name;
        this.nameJp = nameJp;
        this.lengthCm = lengthCm;
        this.widthCm = widthCm;
        this.heightCm = heightCm;
        this.weightG = weightG;
        this.imageIcon = imageIcon;
    }
    
    // Getters and Setters
    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getNameJp() { return nameJp; }
    public void setNameJp(String nameJp) { this.nameJp = nameJp; }
    
    public double getLengthCm() { return lengthCm; }
    public void setLengthCm(double lengthCm) { this.lengthCm = lengthCm; }
    
    public double getWidthCm() { return widthCm; }
    public void setWidthCm(double widthCm) { this.widthCm = widthCm; }
    
    public double getHeightCm() { return heightCm; }
    public void setHeightCm(double heightCm) { this.heightCm = heightCm; }
    
    public int getWeightG() { return weightG; }
    public void setWeightG(int weightG) { this.weightG = weightG; }
    
    public String getImageIcon() { return imageIcon; }
    public void setImageIcon(String imageIcon) { this.imageIcon = imageIcon; }
    
    /**
     * Calculate volume in cubic centimeters
     */
    public double getVolumeCm3() {
        return lengthCm * widthCm * heightCm;
    }
    
    @Override
    public String toString() {
        return String.format("ProductReference[id=%d, name=%s, %s, %.1f×%.1f×%.1fcm, %dg]",
            id, nameJp, category, lengthCm, widthCm, heightCm, weightG);
    }
}
