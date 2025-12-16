package com.cvlab.spring.LaPatho.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LabelDTO {
    private Long id;
    private Long projectId;
    private String name;
    private String color;
    private String description;
}
