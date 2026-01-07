package com.cvlab.spring.LaPatho;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;
@Data
@AllArgsConstructor
@NoArgsConstructor
public class AnnotationDTO {
    private String id;
    private String type;
    private Map<String, Object> body;
    private Map<String, Object> target;

    // Dental labeling fields
    private String region;
    private String subRegion;
    private Map<String, String> findings; // {"Osteolizis": "Extended", "Sekestr": "Serbest"}
    private String grade;
    private String notes;
}
