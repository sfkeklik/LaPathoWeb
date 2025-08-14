package com.cvlab.spring.LaPatho;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ImageMetadataDTO {
    private int width;
    private int height;
    private int tileSize;
    private int maxLevel;
}
