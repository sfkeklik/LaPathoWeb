package com.cvlab.spring.LaPatho.project.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateProjectRequest {
    @NotBlank(message = "Project name is required")
    private String name;

    private String description;

    private List<Long> doctorIds;

    private List<Long> imageIds;

    private Integer gradeLevel;

    private Boolean showGrade;

    private Boolean showNotes;
}

