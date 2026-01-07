package com.cvlab.spring.LaPatho.project.service;

import com.cvlab.spring.LaPatho.project.dto.CreateLabelRequest;
import com.cvlab.spring.LaPatho.project.dto.LabelDTO;
import com.cvlab.spring.LaPatho.project.entity.Label;
import com.cvlab.spring.LaPatho.project.entity.Project;
import com.cvlab.spring.LaPatho.project.repository.LabelRepository;
import com.cvlab.spring.LaPatho.project.repository.ProjectRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LabelService {

    private final LabelRepository labelRepository;
    private final ProjectRepository projectRepository;
    private final ObjectMapper objectMapper;

    /**
     * Projeye ait tüm etiketleri düz liste olarak getir (eski uyumluluk)
     */
    public List<LabelDTO> getLabelsForProject(Long projectId) {
        return labelRepository.findByProjectIdOrderByName(projectId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Projeye ait etiketleri hiyerarşik yapıda getir (yeni)
     */
    public List<LabelDTO> getHierarchicalLabelsForProject(Long projectId) {
        List<Label> rootLabels = labelRepository.findByProjectIdAndParentIsNull(projectId);
        return rootLabels.stream()
                .map(this::toDTOWithChildren)
                .collect(Collectors.toList());
    }

    /**
     * Sadece bölge etiketlerini getir
     */
    public List<LabelDTO> getRegionLabels(Long projectId) {
        List<Label> regions = labelRepository.findByProjectIdAndParentIsNullAndLabelType(projectId, Label.LabelType.REGION);
        return regions.stream()
                .map(this::toDTOWithChildren)
                .collect(Collectors.toList());
    }

    /**
     * Sadece bulgu etiketlerini getir
     */
    public List<LabelDTO> getFindingLabels(Long projectId) {
        List<Label> findings = labelRepository.findByProjectIdAndParentIsNullAndLabelType(projectId, Label.LabelType.FINDING);
        return findings.stream()
                .map(this::toDTOWithChildren)
                .collect(Collectors.toList());
    }

    public LabelDTO getLabelById(Long id) {
        Label label = labelRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Label not found"));
        return toDTOWithChildren(label);
    }

    @Transactional
    public LabelDTO createLabel(Long projectId, CreateLabelRequest request) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        // Parent label kontrolü
        Label parent = null;
        if (request.getParentId() != null) {
            parent = labelRepository.findById(request.getParentId())
                    .orElseThrow(() -> new RuntimeException("Parent label not found"));
        }

        // Duplicate kontrol (aynı parent altında aynı isim)
        if (request.getParentId() != null) {
            if (labelRepository.existsByProjectIdAndNameAndParentId(projectId, request.getName(), request.getParentId())) {
                throw new RuntimeException("Label with this name already exists under this parent");
            }
        } else {
            if (labelRepository.existsByProjectIdAndNameAndParentIsNull(projectId, request.getName())) {
                throw new RuntimeException("Label with this name already exists at root level");
            }
        }

        // Label type parse
        Label.LabelType labelType = Label.LabelType.SIMPLE;
        if (request.getLabelType() != null) {
            try {
                labelType = Label.LabelType.valueOf(request.getLabelType());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid label type: {}, using SIMPLE", request.getLabelType());
            }
        }

        // Input type parse
        Label.InputType inputType = Label.InputType.NONE;
        if (request.getInputType() != null) {
            try {
                inputType = Label.InputType.valueOf(request.getInputType());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid input type: {}, using NONE", request.getInputType());
            }
        }

        // Options JSON'a dönüştür
        String optionsJson = null;
        if (request.getOptions() != null && !request.getOptions().isEmpty()) {
            try {
                optionsJson = objectMapper.writeValueAsString(request.getOptions());
            } catch (JsonProcessingException e) {
                log.error("Error serializing options", e);
            }
        }

        Label label = Label.builder()
                .project(project)
                .parent(parent)
                .name(request.getName())
                .color(request.getColor() != null ? request.getColor() : "#ff0000")
                .description(request.getDescription())
                .labelType(labelType)
                .inputType(inputType)
                .options(optionsJson)
                .sortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0)
                .build();

        label = labelRepository.save(label);
        return toDTO(label);
    }

    @Transactional
    public LabelDTO updateLabel(Long id, CreateLabelRequest request) {
        Label label = labelRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Label not found"));

        // Name değişikliği varsa duplicate kontrol
        if (!label.getName().equals(request.getName())) {
            Long parentId = label.getParent() != null ? label.getParent().getId() : null;
            if (parentId != null) {
                if (labelRepository.existsByProjectIdAndNameAndParentId(label.getProject().getId(), request.getName(), parentId)) {
                    throw new RuntimeException("Label with this name already exists under this parent");
                }
            } else {
                if (labelRepository.existsByProjectIdAndNameAndParentIsNull(label.getProject().getId(), request.getName())) {
                    throw new RuntimeException("Label with this name already exists at root level");
                }
            }
        }

        label.setName(request.getName());
        if (request.getColor() != null) {
            label.setColor(request.getColor());
        }
        label.setDescription(request.getDescription());

        // Label type güncelle
        if (request.getLabelType() != null) {
            try {
                label.setLabelType(Label.LabelType.valueOf(request.getLabelType()));
            } catch (IllegalArgumentException e) {
                log.warn("Invalid label type: {}", request.getLabelType());
            }
        }

        // Input type güncelle
        if (request.getInputType() != null) {
            try {
                label.setInputType(Label.InputType.valueOf(request.getInputType()));
            } catch (IllegalArgumentException e) {
                log.warn("Invalid input type: {}", request.getInputType());
            }
        }

        // Options güncelle
        if (request.getOptions() != null) {
            try {
                label.setOptions(objectMapper.writeValueAsString(request.getOptions()));
            } catch (JsonProcessingException e) {
                log.error("Error serializing options", e);
            }
        }

        if (request.getSortOrder() != null) {
            label.setSortOrder(request.getSortOrder());
        }

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

    /**
     * Eski default labels (patoloji için)
     */
    @Transactional
    public List<LabelDTO> createDefaultLabels(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        String[][] defaultLabels = {
            {"Nucleus", "#ff0000", "Cell nucleus region"},
            {"Tumor", "#00ff00", "Tumor tissue region"},
            {"Necrosis", "#0000ff", "Necrotic tissue region"},
            {"Stroma", "#ffff00", "Stromal tissue region"},
            {"Muscle", "#800080", "Muscle tissue region"}
        };

        for (String[] labelData : defaultLabels) {
            if (!labelRepository.existsByProjectIdAndNameAndParentIsNull(projectId, labelData[0])) {
                Label label = Label.builder()
                        .project(project)
                        .name(labelData[0])
                        .color(labelData[1])
                        .description(labelData[2])
                        .labelType(Label.LabelType.SIMPLE)
                        .build();
                labelRepository.save(label);
            }
        }

        return getLabelsForProject(projectId);
    }

    /**
     * Dental radyografi için hazır şablon oluştur
     */
    @Transactional
    public List<LabelDTO> createDentalLabels(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        log.info("Creating dental labels for project: {}", projectId);

        // Önce mevcut etiketleri temizle (opsiyonel)
        // labelRepository.deleteByProjectId(projectId);

        // =====================
        // BÖLGELER (REGIONS)
        // =====================
        String[][] maxillerRegions = {
            {"Maksiller sağ molar bölge", "#e74c3c"},
            {"Maksiller sağ premolar bölge", "#e67e22"},
            {"Maksilla anterior", "#f1c40f"},
            {"Maksiller sol premolar bölge", "#2ecc71"},
            {"Maksiller sol molar bölge", "#1abc9c"}
        };

        String[][] mandibularRegions = {
            {"Mandibular sağ molar bölge", "#3498db"},
            {"Mandibular sağ premolar bölge", "#9b59b6"},
            {"Mandibula anterior", "#34495e"},
            {"Mandibular sol premolar bölge", "#e91e63"},
            {"Mandibular sol molar bölge", "#00bcd4"}
        };

        // Maksiller bölgeler (Alveolar, Basal alt seçenekleri)
        int sortOrder = 1;
        for (String[] region : maxillerRegions) {
            createRegionWithSubOptions(project, region[0], region[1], sortOrder++,
                new String[]{"Alveolar", "Basal"});
        }

        // Mandibular bölgeler (Alveolar Porsiyon, Basis, Mandibular kanal alt seçenekleri)
        for (String[] region : mandibularRegions) {
            createRegionWithSubOptions(project, region[0], region[1], sortOrder++,
                new String[]{"Alveolar porsiyon", "Basis", "Mandibular kanal"});
        }

        // =====================
        // RADYOGRAFIK BULGULAR (FINDINGS)
        // =====================

        // SELECT tipli bulgular (çoklu seçenek)
        createFinding(project, "Osteolizis", "#c0392b", 1, Label.InputType.SELECT,
            new String[]{"Localized", "Extended", "Advanced"});
        createFinding(project, "Sekestr", "#8e44ad", 2, Label.InputType.SELECT,
            new String[]{"Serbest", "Parsiyel"});
        createFinding(project, "Skleroz", "#2980b9", 3, Label.InputType.SELECT,
            new String[]{"Fokal", "Diffuz"});

        // BOOLEAN tipli bulgular (Var/Yok)
        createFinding(project, "Düzensiz trabeküler patern", "#27ae60", 4, Label.InputType.BOOLEAN, null);
        createFinding(project, "İyileşmemiş ekstraksiyon soketleri", "#f39c12", 5, Label.InputType.BOOLEAN, null);
        createFinding(project, "Lamina durada kalınlaşma", "#d35400", 6, Label.InputType.BOOLEAN, null);
        createFinding(project, "Periodontal aralıkta daralma", "#16a085", 7, Label.InputType.BOOLEAN, null);
        createFinding(project, "Mandibular kanal sınırlarının belirginleşmesi", "#7f8c8d", 8, Label.InputType.BOOLEAN, null);
        createFinding(project, "Patolojik fraktür", "#c0392b", 9, Label.InputType.BOOLEAN, null);
        createFinding(project, "Oroantral ilişki", "#9b59b6", 10, Label.InputType.BOOLEAN, null);
        createFinding(project, "Maksiller sinüs mukozasında kalınlaşma", "#3498db", 11, Label.InputType.BOOLEAN, null);

        log.info("Dental labels created successfully for project: {}", projectId);
        return getHierarchicalLabelsForProject(projectId);
    }

    /**
     * Bölge ve alt seçeneklerini oluştur
     */
    private void createRegionWithSubOptions(Project project, String name, String color, int sortOrder, String[] subOptions) {
        // Önce var mı kontrol et
        if (labelRepository.existsByProjectIdAndNameAndParentIsNull(project.getId(), name)) {
            log.info("Region already exists: {}", name);
            return;
        }

        // Ana bölge etiketini oluştur
        Label region = Label.builder()
                .project(project)
                .name(name)
                .color(color)
                .labelType(Label.LabelType.REGION)
                .inputType(Label.InputType.SELECT) // Alt seçenekler için SELECT
                .sortOrder(sortOrder)
                .build();

        // Alt seçenekleri JSON olarak kaydet
        if (subOptions != null && subOptions.length > 0) {
            try {
                region.setOptions(objectMapper.writeValueAsString(subOptions));
            } catch (JsonProcessingException e) {
                log.error("Error serializing options for region: {}", name, e);
            }
        }

        labelRepository.save(region);
        log.debug("Created region: {}", name);
    }

    /**
     * Radyografik bulgu oluştur
     */
    private void createFinding(Project project, String name, String color, int sortOrder,
                              Label.InputType inputType, String[] options) {
        // Önce var mı kontrol et
        if (labelRepository.existsByProjectIdAndNameAndParentIsNull(project.getId(), name)) {
            log.info("Finding already exists: {}", name);
            return;
        }

        Label finding = Label.builder()
                .project(project)
                .name(name)
                .color(color)
                .labelType(Label.LabelType.FINDING)
                .inputType(inputType)
                .sortOrder(sortOrder)
                .build();

        // SELECT için özel seçenekler, BOOLEAN için Var/Yok
        if (inputType == Label.InputType.BOOLEAN) {
            try {
                finding.setOptions(objectMapper.writeValueAsString(new String[]{"Var", "Yok"}));
            } catch (JsonProcessingException e) {
                log.error("Error serializing boolean options", e);
            }
        } else if (options != null && options.length > 0) {
            try {
                finding.setOptions(objectMapper.writeValueAsString(options));
            } catch (JsonProcessingException e) {
                log.error("Error serializing options for finding: {}", name, e);
            }
        }

        labelRepository.save(finding);
        log.debug("Created finding: {}", name);
    }

    /**
     * Label'ı DTO'ya dönüştür (düz, children olmadan)
     */
    private LabelDTO toDTO(Label label) {
        List<String> options = parseOptions(label.getOptions());

        return LabelDTO.builder()
                .id(label.getId())
                .projectId(label.getProject().getId())
                .parentId(label.getParent() != null ? label.getParent().getId() : null)
                .name(label.getName())
                .color(label.getColor())
                .description(label.getDescription())
                .labelType(label.getLabelType() != null ? label.getLabelType().name() : "SIMPLE")
                .inputType(label.getInputType() != null ? label.getInputType().name() : "NONE")
                .options(options)
                .sortOrder(label.getSortOrder())
                .children(null)
                .build();
    }

    /**
     * Label'ı DTO'ya dönüştür (recursive, children ile)
     */
    private LabelDTO toDTOWithChildren(Label label) {
        List<String> options = parseOptions(label.getOptions());

        List<LabelDTO> childrenDTOs = null;
        if (label.getChildren() != null && !label.getChildren().isEmpty()) {
            childrenDTOs = label.getChildren().stream()
                    .map(this::toDTOWithChildren)
                    .collect(Collectors.toList());
        }

        return LabelDTO.builder()
                .id(label.getId())
                .projectId(label.getProject().getId())
                .parentId(label.getParent() != null ? label.getParent().getId() : null)
                .name(label.getName())
                .color(label.getColor())
                .description(label.getDescription())
                .labelType(label.getLabelType() != null ? label.getLabelType().name() : "SIMPLE")
                .inputType(label.getInputType() != null ? label.getInputType().name() : "NONE")
                .options(options)
                .sortOrder(label.getSortOrder())
                .children(childrenDTOs)
                .build();
    }

    /**
     * JSON options string'i List'e parse et
     */
    private List<String> parseOptions(String optionsJson) {
        if (optionsJson == null || optionsJson.isEmpty()) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(optionsJson, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            log.error("Error parsing options JSON: {}", optionsJson, e);
            return new ArrayList<>();
        }
    }
}

