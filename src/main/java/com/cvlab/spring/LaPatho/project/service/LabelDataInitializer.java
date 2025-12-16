package com.cvlab.spring.LaPatho.project.service;

import com.cvlab.spring.LaPatho.project.entity.Label;
import com.cvlab.spring.LaPatho.project.entity.Project;
import com.cvlab.spring.LaPatho.project.repository.LabelRepository;
import com.cvlab.spring.LaPatho.project.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Uygulama başlatıldığında mevcut projelere varsayılan etiketleri ekler
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class LabelDataInitializer implements CommandLineRunner {

    private final ProjectRepository projectRepository;
    private final LabelRepository labelRepository;

    // Varsayılan etiketler: isim, renk, açıklama
    private static final String[][] DEFAULT_LABELS = {
        {"Nucleus", "#ff0000", "Cell nucleus region"},
        {"Tumor", "#00ff00", "Tumor tissue region"},
        {"Necrosis", "#0000ff", "Necrotic tissue region"},
        {"Stroma", "#ffff00", "Stromal tissue region"},
        {"Muscle", "#800080", "Muscle tissue region"}
    };

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Checking default labels for existing projects...");

        List<Project> activeProjects = projectRepository.findByActiveTrue();

        for (Project project : activeProjects) {
            List<Label> existingLabels = labelRepository.findByProjectId(project.getId());

            if (existingLabels.isEmpty()) {
                log.info("Adding default labels to project: {}", project.getName());
                addDefaultLabelsToProject(project);
            } else {
                log.info("Project '{}' already has {} labels", project.getName(), existingLabels.size());
            }
        }

        log.info("Label initialization completed.");
    }

    private void addDefaultLabelsToProject(Project project) {
        for (String[] labelData : DEFAULT_LABELS) {
            Label label = Label.builder()
                    .project(project)
                    .name(labelData[0])
                    .color(labelData[1])
                    .description(labelData[2])
                    .build();
            labelRepository.save(label);
            log.info("  - Added label: {} ({})", labelData[0], labelData[1]);
        }
    }
}

