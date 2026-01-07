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

    /**
     * Projeye ait tüm etiketleri düz liste olarak getir (eski uyumluluk)
     */
    @GetMapping
    public ResponseEntity<List<LabelDTO>> getLabelsForProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(labelService.getLabelsForProject(projectId));
    }

    /**
     * Projeye ait etiketleri hiyerarşik yapıda getir
     */
    @GetMapping("/hierarchical")
    public ResponseEntity<List<LabelDTO>> getHierarchicalLabels(@PathVariable Long projectId) {
        return ResponseEntity.ok(labelService.getHierarchicalLabelsForProject(projectId));
    }

    /**
     * Sadece bölge (REGION) etiketlerini getir
     */
    @GetMapping("/regions")
    public ResponseEntity<List<LabelDTO>> getRegionLabels(@PathVariable Long projectId) {
        return ResponseEntity.ok(labelService.getRegionLabels(projectId));
    }

    /**
     * Sadece bulgu (FINDING) etiketlerini getir
     */
    @GetMapping("/findings")
    public ResponseEntity<List<LabelDTO>> getFindingLabels(@PathVariable Long projectId) {
        return ResponseEntity.ok(labelService.getFindingLabels(projectId));
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

    /**
     * Varsayılan patoloji etiketleri oluştur
     */
    @PostMapping("/defaults")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<LabelDTO>> createDefaultLabels(@PathVariable Long projectId) {
        return ResponseEntity.ok(labelService.createDefaultLabels(projectId));
    }

    /**
     * Dental radyografi için hazır şablon oluştur (10 bölge + 11 bulgu)
     */
    @PostMapping("/dental-template")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<LabelDTO>> createDentalLabels(@PathVariable Long projectId) {
        return ResponseEntity.ok(labelService.createDentalLabels(projectId));
    }
}

