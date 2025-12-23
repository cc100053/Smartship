package com.smartship.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.io.Serializable;

@Entity
@Table(name = "shipping_carrier")
public class ShippingCarrier implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "company_name", nullable = false, length = 50)
    private String companyName;

    @Column(name = "service_name", nullable = false, length = 50)
    private String serviceName;

    @Column(name = "max_length", nullable = false)
    private double maxLength;

    @Column(name = "max_width", nullable = false)
    private double maxWidth;

    @Column(name = "max_height", nullable = false)
    private double maxHeight;

    @Column(name = "max_weight_g")
    private Integer maxWeightG;

    @Column(name = "size_sum_limit")
    private Integer sizeSumLimit;

    @Column(name = "price_yen", nullable = false)
    private int priceYen;

    @Column(name = "has_tracking")
    private Boolean hasTracking;

    @Column(name = "send_location", length = 255)
    private String sendLocation;

    @Column(name = "notes", length = 255)
    private String notes;

    public ShippingCarrier() {}

    public ShippingCarrier(Integer id, String companyName, String serviceName,
                           double maxLength, double maxWidth, double maxHeight,
                           Integer maxWeightG, Integer sizeSumLimit, int priceYen,
                           String notes, String sendLocation) {
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

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

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

    public Integer getMaxWeightG() { return maxWeightG; }
    public void setMaxWeightG(Integer maxWeightG) { this.maxWeightG = maxWeightG; }

    public Integer getSizeSumLimit() { return sizeSumLimit; }
    public void setSizeSumLimit(Integer sizeSumLimit) { this.sizeSumLimit = sizeSumLimit; }

    public int getPriceYen() { return priceYen; }
    public void setPriceYen(int priceYen) { this.priceYen = priceYen; }

    public Boolean getHasTracking() { return hasTracking; }
    public void setHasTracking(Boolean hasTracking) { this.hasTracking = hasTracking; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getSendLocation() { return sendLocation; }
    public void setSendLocation(String sendLocation) { this.sendLocation = sendLocation; }

    @Transient
    public String getFullName() {
        return companyName + " " + serviceName;
    }

    public boolean canFit(double length, double width, double height, int weightG) {
        if (length > maxLength || width > maxWidth || height > maxHeight) {
            return false;
        }
        if (maxWeightG != null && weightG > maxWeightG) {
            return false;
        }
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
