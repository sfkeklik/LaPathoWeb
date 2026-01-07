package com.cvlab.spring.LaPatho.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LabelDTO {
    private Long id;
    private Long projectId;
    private Long parentId;
    private String name;
    private String color;
    private String description;
    private String labelType;    // REGION, FINDING, SIMPLE
    private String inputType;    // NONE, SELECT, BOOLEAN
    private List<String> options; // Alt seçenekler (JSON'dan parse edilmiş)
    private Integer sortOrder;
    private List<LabelDTO> children; // Alt kategoriler (recursive)
}
