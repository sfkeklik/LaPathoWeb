package com.cvlab.spring.LaPatho;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ImageMetadataDTO {
    // Basic image properties
    private int width;
    private int height;
    private int tileSize;
    private int maxLevel;

    // File information
    private String fileName;
    private Long fileSize;
    private String format;
    private String path;

    // Technical details
    private Double pixelSizeX;
    private Double pixelSizeY;
    private Integer bitDepth;
    private Integer channels;
    private String colorSpace;
    private String compression;

    // Microscopy-specific metadata
    private Double magnification;
    private String objective;
    private String scanner;
    private String scanDate;

    // Timestamps
    private Instant created;
    private Instant updated;
    private String status;

    // Calculated properties
    private Double totalArea; // in square pixels
    private Double physicalWidth; // in micrometers
    private Double physicalHeight; // in micrometers
}
