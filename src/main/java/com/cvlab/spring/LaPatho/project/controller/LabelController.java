package com.cvlab.spring.LaPatho.project.controller;

import com.cvlab.spring.LaPatho.project.dto.CreateLabelRequest;
import com.cvlab.spring.LaPatho.project.dto.LabelDTO;
import com.cvlab.spring.LaPatho.project.service.LabelService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/labels")
@RequiredArgsConstructor
public class LabelController {

    private final LabelService labelService;

    @GetMapping
    public ResponseEntity<List<LabelDTO>> getLabelsForProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(labelService.getLabelsForProject(projectId));
    }

    @GetMapping("/{labelId}")
    public ResponseEntity<LabelDTO> getLabel(@PathVariable Long projectId, @PathVariable Long labelId) {
        return ResponseEntity.ok(labelService.getLabelById(labelId));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<LabelDTO> createLabel(
            @PathVariable Long projectId,
            @Valid @RequestBody CreateLabelRequest request
    ) {
        return ResponseEntity.ok(labelService.createLabel(projectId, request));
    }

    @PutMapping("/{labelId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<LabelDTO> updateLabel(
            @PathVariable Long projectId,
            @PathVariable Long labelId,
            @Valid @RequestBody CreateLabelRequest request
    ) {
        return ResponseEntity.ok(labelService.updateLabel(labelId, request));
    }

    @DeleteMapping("/{labelId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteLabel(@PathVariable Long projectId, @PathVariable Long labelId) {
        labelService.deleteLabel(labelId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/defaults")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<LabelDTO>> createDefaultLabels(@PathVariable Long projectId) {
        return ResponseEntity.ok(labelService.createDefaultLabels(projectId));
    }
}

