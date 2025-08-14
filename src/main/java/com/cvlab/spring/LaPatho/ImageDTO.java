package com.cvlab.spring.LaPatho;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ImageDTO {
    private Long id;
    private String name;
    private int width, height, tileSize, maxLevel;
    private String path;
    // constructor + getters
}