package com.cvlab.spring.LaPatho;

import lombok.Data;

@Data
public class CreateImageDTO {
    private String name;
    private int width, height, tileSize, maxLevel;
    private String path;

}