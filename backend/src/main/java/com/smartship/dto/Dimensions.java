package com.smartship.dto;

import java.io.Serializable;

public class Dimensions implements Serializable {
    private static final long serialVersionUID = 1L;

    private double lengthCm;
    private double widthCm;
    private double heightCm;
    private int weightG;
    private int itemCount;

    public Dimensions() {}

    public Dimensions(double lengthCm, double widthCm, double heightCm, int weightG, int itemCount) {
        this.lengthCm = lengthCm;
        this.widthCm = widthCm;
        this.heightCm = heightCm;
        this.weightG = weightG;
        this.itemCount = itemCount;
    }

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

    public double getWeightKg() {
        return weightG / 1000.0;
    }

    public double getSizeSum() {
        return lengthCm + widthCm + heightCm;
    }
}
