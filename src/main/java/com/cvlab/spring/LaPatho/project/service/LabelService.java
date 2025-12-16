package com.cvlab.spring.LaPatho.project.service;

import com.cvlab.spring.LaPatho.project.dto.CreateLabelRequest;
import com.cvlab.spring.LaPatho.project.dto.LabelDTO;
import com.cvlab.spring.LaPatho.project.entity.Label;
import com.cvlab.spring.LaPatho.project.entity.Project;
import com.cvlab.spring.LaPatho.project.repository.LabelRepository;
import com.cvlab.spring.LaPatho.project.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LabelService {

    private final LabelRepository labelRepository;
    private final ProjectRepository projectRepository;

    public List<LabelDTO> getLabelsForProject(Long projectId) {
        return labelRepository.findByProjectIdOrderByName(projectId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public LabelDTO getLabelById(Long id) {
        Label label = labelRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Label not found"));
        return toDTO(label);
    }

    @Transactional
    public LabelDTO createLabel(Long projectId, CreateLabelRequest request) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        // Check for duplicate name
        if (labelRepository.existsByProjectIdAndName(projectId, request.getName())) {
            throw new RuntimeException("Label with this name already exists in the project");
        }

        Label label = Label.builder()
                .project(project)
                .name(request.getName())
                .color(request.getColor() != null ? request.getColor() : "#ff0000")
                .description(request.getDescription())
                .build();

        label = labelRepository.save(label);
        return toDTO(label);
    }

    @Transactional
    public LabelDTO updateLabel(Long id, CreateLabelRequest request) {
        Label label = labelRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Label not found"));

        // Check for duplicate name (excluding current label)
        if (!label.getName().equals(request.getName()) &&
            labelRepository.existsByProjectIdAndName(label.getProject().getId(), request.getName())) {
            throw new RuntimeException("Label with this name already exists in the project");
        }

        label.setName(request.getName());
        if (request.getColor() != null) {
            label.setColor(request.getColor());
        }
        label.setDescription(request.getDescription());

        label = labelRepository.save(label);
        return toDTO(label);
    }

    @Transactional
    public void deleteLabel(Long id) {
        if (!labelRepository.existsById(id)) {
            throw new RuntimeException("Label not found");
        }
        labelRepository.deleteById(id);
    }

    @Transactional
    public List<LabelDTO> createDefaultLabels(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        // Default labels for pathology projects
        String[][] defaultLabels = {
            {"Nucleus", "#ff0000", "Cell nucleus region"},
            {"Tumor", "#00ff00", "Tumor tissue region"},
            {"Necrosis", "#0000ff", "Necrotic tissue region"},
            {"Stroma", "#ffff00", "Stromal tissue region"},
            {"Muscle", "#800080", "Muscle tissue region"}
        };

        for (String[] labelData : defaultLabels) {
            if (!labelRepository.existsByProjectIdAndName(projectId, labelData[0])) {
                Label label = Label.builder()
                        .project(project)
                        .name(labelData[0])
                        .color(labelData[1])
                        .description(labelData[2])
                        .build();
                labelRepository.save(label);
            }
        }

        return getLabelsForProject(projectId);
    }

    private LabelDTO toDTO(Label label) {
        return LabelDTO.builder()
                .id(label.getId())
                .projectId(label.getProject().getId())
                .name(label.getName())
                .color(label.getColor())
                .description(label.getDescription())
                .build();
    }
}

