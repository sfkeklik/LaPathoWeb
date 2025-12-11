package com.cvlab.spring.LaPatho.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectDTO {
    private Long id;
    private String name;
    private String description;
    private List<Long> assignedDoctorIds;
    private List<String> assignedDoctorNames;
    private List<Long> imageIds;
    private int imageCount;
    private int doctorCount;
    private boolean active;
    private Instant createdAt;
    private String createdByName;
}

