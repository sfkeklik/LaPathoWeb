package com.cvlab.spring.LaPatho;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ImageOverviewDTO {
    private Long id;
    private String name;
    private Status status;
    private String previewUrl;  // tile’ların 0/0_0.jpg kademe url’i
}
