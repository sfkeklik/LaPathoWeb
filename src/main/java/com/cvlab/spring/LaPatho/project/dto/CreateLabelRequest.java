package com.cvlab.spring.LaPatho.project.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateLabelRequest {

    @NotBlank(message = "Label name is required")
    @Size(max = 100, message = "Label name must be at most 100 characters")
    private String name;

    @Size(max = 20, message = "Color must be at most 20 characters")
    private String color;

    @Size(max = 500, message = "Description must be at most 500 characters")
    private String description;

    private Long parentId;           // Üst kategori ID'si (null = root)
    private String labelType;        // REGION, FINDING, SIMPLE
    private String inputType;        // NONE, SELECT, BOOLEAN
    private List<String> options;    // Alt seçenekler
    private Integer sortOrder;       // Sıralama
}

