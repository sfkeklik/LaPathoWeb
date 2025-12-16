package com.cvlab.spring.LaPatho.project.controller;

import com.cvlab.spring.LaPatho.project.dto.CreateProjectRequest;
import com.cvlab.spring.LaPatho.project.dto.ProjectDTO;
import com.cvlab.spring.LaPatho.project.service.ProjectService;
import com.cvlab.spring.LaPatho.security.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    // Admin endpoints
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProjectDTO> createProject(
            @Valid @RequestBody CreateProjectRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(projectService.createProject(request, currentUser));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ProjectDTO>> getAllProjects() {
        return ResponseEntity.ok(projectService.getAllProjects());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectDTO> getProject(@PathVariable Long id) {
        return ResponseEntity.ok(projectService.getProjectById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProjectDTO> updateProject(
            @PathVariable Long id,
            @Valid @RequestBody CreateProjectRequest request
    ) {
        return ResponseEntity.ok(projectService.updateProject(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteProject(@PathVariable Long id) {
        projectService.deleteProject(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{projectId}/doctors/{doctorId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProjectDTO> addDoctorToProject(
            @PathVariable Long projectId,
            @PathVariable Long doctorId
    ) {
        return ResponseEntity.ok(projectService.addDoctorToProject(projectId, doctorId));
    }

    @DeleteMapping("/{projectId}/doctors/{doctorId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProjectDTO> removeDoctorFromProject(
            @PathVariable Long projectId,
            @PathVariable Long doctorId
    ) {
        return ResponseEntity.ok(projectService.removeDoctorFromProject(projectId, doctorId));
    }

    @PostMapping("/{projectId}/images/{imageId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProjectDTO> addImageToProject(
            @PathVariable Long projectId,
            @PathVariable Long imageId
    ) {
        return ResponseEntity.ok(projectService.addImageToProject(projectId, imageId));
    }

    @DeleteMapping("/{projectId}/images/{imageId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProjectDTO> removeImageFromProject(
            @PathVariable Long projectId,
            @PathVariable Long imageId
    ) {
        return ResponseEntity.ok(projectService.removeImageFromProject(projectId, imageId));
    }

    // Doctor endpoints
    @GetMapping("/my-projects")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<List<ProjectDTO>> getMyProjects(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(projectService.getProjectsForDoctor(currentUser));
    }

    // Get projects containing a specific image
    @GetMapping("/by-image/{imageId}")
    public ResponseEntity<List<ProjectDTO>> getProjectsByImage(@PathVariable Long imageId) {
        return ResponseEntity.ok(projectService.getProjectsContainingImage(imageId));
    }
}

