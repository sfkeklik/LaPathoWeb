package com.cvlab.spring.LaPatho.project.service;

import com.cvlab.spring.LaPatho.ImageEntity;
import com.cvlab.spring.LaPatho.ImageRepository;
import com.cvlab.spring.LaPatho.project.dto.CreateProjectRequest;
import com.cvlab.spring.LaPatho.project.dto.ProjectDTO;
import com.cvlab.spring.LaPatho.project.entity.Project;
import com.cvlab.spring.LaPatho.project.repository.ProjectRepository;
import com.cvlab.spring.LaPatho.security.entity.User;
import com.cvlab.spring.LaPatho.security.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ImageRepository imageRepository;
    private final LabelService labelService;

    @Transactional
    public ProjectDTO createProject(CreateProjectRequest request, User createdBy) {
        Project project = Project.builder()
                .name(request.getName())
                .description(request.getDescription())
                .createdBy(createdBy)
                .active(true)
                .gradeLevel(request.getGradeLevel() != null ? request.getGradeLevel() : 3)
                .showGrade(request.getShowGrade() != null ? request.getShowGrade() : true)
                .showNotes(request.getShowNotes() != null ? request.getShowNotes() : true)
                .build();

        if (request.getDoctorIds() != null && !request.getDoctorIds().isEmpty()) {
            List<User> doctors = userRepository.findAllById(request.getDoctorIds());
            project.setAssignedDoctors(new HashSet<>(doctors));
        }

        if (request.getImageIds() != null && !request.getImageIds().isEmpty()) {
            List<ImageEntity> images = imageRepository.findAllById(request.getImageIds());
            project.setImages(new HashSet<>(images));
        }

        project = projectRepository.save(project);

        // Note: Default labels are created via database schema (schema.sql)
        // For new projects created through admin panel, no default labels are added
        // Admin can add labels manually through the Labels management modal

        return toDTO(project);
    }

    public List<ProjectDTO> getAllProjects() {
        return projectRepository.findByActiveTrue().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<ProjectDTO> getProjectsForDoctor(User doctor) {
        return projectRepository.findByAssignedDoctor(doctor).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public ProjectDTO getProjectById(Long id) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found"));
        return toDTO(project);
    }

    @Transactional
    public ProjectDTO updateProject(Long id, CreateProjectRequest request) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        project.setName(request.getName());
        project.setDescription(request.getDescription());

        if (request.getGradeLevel() != null) {
            project.setGradeLevel(request.getGradeLevel());
        }

        if (request.getShowGrade() != null) {
            project.setShowGrade(request.getShowGrade());
        }

        if (request.getShowNotes() != null) {
            project.setShowNotes(request.getShowNotes());
        }

        if (request.getDoctorIds() != null) {
            List<User> doctors = userRepository.findAllById(request.getDoctorIds());
            project.setAssignedDoctors(new HashSet<>(doctors));
        }

        if (request.getImageIds() != null) {
            List<ImageEntity> images = imageRepository.findAllById(request.getImageIds());
            project.setImages(new HashSet<>(images));
        }

        project = projectRepository.save(project);
        return toDTO(project);
    }

    @Transactional
    public ProjectDTO addDoctorToProject(Long projectId, Long doctorId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));
        User doctor = userRepository.findById(doctorId)
                .orElseThrow(() -> new RuntimeException("Doctor not found"));

        project.getAssignedDoctors().add(doctor);
        project = projectRepository.save(project);
        return toDTO(project);
    }

    @Transactional
    public ProjectDTO removeDoctorFromProject(Long projectId, Long doctorId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        project.getAssignedDoctors().removeIf(d -> d.getId().equals(doctorId));
        project = projectRepository.save(project);
        return toDTO(project);
    }

    @Transactional
    public ProjectDTO addImageToProject(Long projectId, Long imageId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));
        ImageEntity image = imageRepository.findById(imageId)
                .orElseThrow(() -> new RuntimeException("Image not found"));

        project.getImages().add(image);
        project = projectRepository.save(project);
        return toDTO(project);
    }

    @Transactional
    public ProjectDTO removeImageFromProject(Long projectId, Long imageId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        project.getImages().removeIf(i -> i.getId().equals(imageId));
        project = projectRepository.save(project);
        return toDTO(project);
    }

    @Transactional
    public void deleteProject(Long id) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found"));
        project.setActive(false);
        projectRepository.save(project);
    }

    public boolean canDoctorAccessImage(Long imageId, Long doctorId) {
        return projectRepository.canDoctorAccessImage(imageId, doctorId);
    }

    public List<ImageEntity> getImagesForDoctor(User doctor) {
        return projectRepository.findByAssignedDoctor(doctor).stream()
                .flatMap(p -> p.getImages().stream())
                .distinct()
                .collect(Collectors.toList());
    }

    public List<ProjectDTO> getProjectsContainingImage(Long imageId) {
        return projectRepository.findByActiveTrue().stream()
                .filter(p -> p.getImages().stream().anyMatch(i -> i.getId().equals(imageId)))
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    private ProjectDTO toDTO(Project project) {
        return ProjectDTO.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .assignedDoctorIds(project.getAssignedDoctors().stream()
                        .map(User::getId)
                        .collect(Collectors.toList()))
                .assignedDoctorNames(project.getAssignedDoctors().stream()
                        .map(u -> u.getFirstName() + " " + u.getLastName())
                        .collect(Collectors.toList()))
                .imageIds(project.getImages().stream()
                        .map(ImageEntity::getId)
                        .collect(Collectors.toList()))
                .imageCount(project.getImages().size())
                .doctorCount(project.getAssignedDoctors().size())
                .active(project.isActive())
                .createdAt(project.getCreatedAt())
                .createdByName(project.getCreatedBy() != null
                        ? project.getCreatedBy().getFirstName() + " " + project.getCreatedBy().getLastName()
                        : null)
                .gradeLevel(project.getGradeLevel() != null ? project.getGradeLevel() : 3)
                .showGrade(project.getShowGrade() != null ? project.getShowGrade() : true)
                .showNotes(project.getShowNotes() != null ? project.getShowNotes() : true)
                .build();
    }
}

