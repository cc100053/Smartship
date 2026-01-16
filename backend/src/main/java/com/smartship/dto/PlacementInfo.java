package com.smartship.dto;

public record PlacementInfo(
        String name,
        int x,
        int y,
        int z,
        int width,
        int depth,
        int height,
        String color) {
}
