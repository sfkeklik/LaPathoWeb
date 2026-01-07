package com.cvlab.spring.LaPatho;

import com.cvlab.spring.LaPatho.security.entity.User;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/images/annotations/{imageId}")
public class AnnotationController {

    @Autowired
    private AnnotationService annotationService;

    @Autowired
    private ObjectMapper objectMapper;


    // GET all annotations for image (filtered by user for doctors)
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAnnotations(
            @PathVariable Long imageId,
            @AuthenticationPrincipal User currentUser) {
        System.out.println("=== ANNOTATION OKUMA ===");
        System.out.println("Image ID: " + imageId);
        System.out.println("User: " + (currentUser != null ? currentUser.getUsername() : "null"));

        List<AnnotationEntity> entities = annotationService.getForImage(imageId, currentUser);
        System.out.println("Bulunan annotation sayısı: " + entities.size());

        List<Map<String, Object>> out = entities
                .stream()
                .map(e -> {
                    System.out.println("İşlenen annotation ID: " + e.getId());
                    System.out.println("Geometry içeriği: " + e.getGeometry());

                    try {
                        if (e.getGeometry() == null || e.getGeometry().trim().isEmpty()) {
                            System.out.println("UYARI: Geometry boş - ID: " + e.getId());
                            return null; // Skip empty geometry
                        }

                        JsonNode parsed = objectMapper.readTree(e.getGeometry());
                        System.out.println("Parse edildi: " + parsed);

                        // Database ID'sini ve dental labeling alanlarını da ekleyelim
                        Map<String, Object> result = new HashMap<>();
                        result.put("databaseId", e.getId());
                        result.put("annotation", parsed);

                        // Creator bilgisi - user varsa username, yoksa legacy creator field
                        String creator = e.getUser() != null ? e.getUser().getUsername() :
                                        (e.getCreator() != null ? e.getCreator() : "Unknown");
                        result.put("creator", creator);

                        // Dental labeling fields
                        result.put("region", e.getRegion());
                        result.put("subRegion", e.getSubRegion());
                        // Single finding with subtype
                        result.put("finding", e.getFinding());
                        result.put("findingSubtype", e.getFindingSubtype());
                        result.put("grade", e.getGrade());
                        result.put("notes", e.getNotes());

                        // Legacy: Findings JSON'ı parse et
                        if (e.getFindings() != null && !e.getFindings().isEmpty()) {
                            try {
                                JsonNode findingsJson = objectMapper.readTree(e.getFindings());
                                result.put("findings", findingsJson);
                            } catch (JsonProcessingException ex) {
                                result.put("findings", null);
                            }
                        } else {
                            result.put("findings", null);
                        }

                        return result;
                    } catch (JsonProcessingException ex) {
                        System.out.println("HATA: JSON parse hatası - ID: " + e.getId() + ", Error: " + ex.getMessage());
                        return null;
                    }
                })
                .filter(item -> item != null) // Null olanları filtrele
                .collect(Collectors.toList());

        System.out.println("Gönderilecek annotation sayısı: " + out.size());
        System.out.println("=========================");

        return ResponseEntity.ok(out);
    }

    // POST - Create new annotation
    @PostMapping
    public ResponseEntity<AnnotationEntity> createAnnotation(
            @PathVariable Long imageId,
            @RequestBody AnnotationEntity annotation,
            @AuthenticationPrincipal User currentUser) {

        System.out.println("=== ANNOTATION KAYDETME ===");
        System.out.println("Image ID: " + imageId);
        System.out.println("User: " + (currentUser != null ? currentUser.getUsername() : "null"));
        System.out.println("Gelen annotation: " + annotation);
        System.out.println("Type: " + annotation.getType());
        System.out.println("Geometry: " + annotation.getGeometry());
        System.out.println("Region: " + annotation.getRegion());
        System.out.println("SubRegion: " + annotation.getSubRegion());
        System.out.println("Finding: " + annotation.getFinding());
        System.out.println("FindingSubtype: " + annotation.getFindingSubtype());
        System.out.println("Findings (legacy): " + annotation.getFindings());
        System.out.println("Grade: " + annotation.getGrade());
        System.out.println("Notes: " + annotation.getNotes());

        // Geometry validation
        if (annotation.getGeometry() == null || annotation.getGeometry().trim().isEmpty()) {
            System.out.println("HATA: Geometry boş!");
            return ResponseEntity.badRequest().build();
        }

        // JSON format validation
        try {
            JsonNode geometryJson = objectMapper.readTree(annotation.getGeometry());
            System.out.println("✅ Geometry JSON validation başarılı");
            System.out.println("Geometry structure: " + geometryJson);

            // Check if geometry has required fields
            if (!geometryJson.has("shapes") && !geometryJson.has("target")) {
                System.out.println("UYARI: Geometry'de shapes veya target bulunamadı");
            }

        } catch (JsonProcessingException e) {
            System.out.println("HATA: Geometry JSON parse hatası: " + e.getMessage());
            return ResponseEntity.badRequest().build();
        }

        // Required fields validation
        if (annotation.getType() == null || annotation.getType().trim().isEmpty()) {
            System.out.println("HATA: Type boş!");
            return ResponseEntity.badRequest().build();
        }

        try {
            AnnotationEntity saved = annotationService.save(imageId, annotation, currentUser);

            System.out.println("✅ Annotation başarıyla kaydedildi");
            System.out.println("Kaydedilen ID: " + saved.getId());
            System.out.println("Kaydedilen geometry length: " +
                (saved.getGeometry() != null ? saved.getGeometry().length() : "null"));
            System.out.println("=========================");

            return ResponseEntity.ok(saved);

        } catch (Exception e) {
            System.out.println("HATA: Annotation kaydetme sırasında hata: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    // GET specific annotation by ID
    @GetMapping("/{annotationId}")
    public ResponseEntity<AnnotationEntity> getAnnotation(
            @PathVariable Long annotationId,
            @AuthenticationPrincipal User currentUser) {
        AnnotationEntity annotation = annotationService.findById(annotationId, currentUser);
        return ResponseEntity.ok(annotation);
    }

    // PUT - Update annotation
    @PutMapping("/{annotationId}")
    public ResponseEntity<AnnotationEntity> updateAnnotation(
            @PathVariable Long imageId,
            @PathVariable Long annotationId,
            @RequestBody AnnotationEntity annotationData,
            @AuthenticationPrincipal User currentUser) {
        AnnotationEntity updated = annotationService.update(annotationId, annotationData, currentUser);
        return ResponseEntity.ok(updated);
    }

    // DELETE annotation
    @DeleteMapping("/{annotationId}")
    public ResponseEntity<Void> deleteAnnotation(
            @PathVariable Long annotationId,
            @AuthenticationPrincipal User currentUser) {
        annotationService.delete(annotationId, currentUser);
        return ResponseEntity.noContent().build();
    }

    // DELETE all annotations for image
    @DeleteMapping
    public ResponseEntity<Void> deleteAllAnnotationsForImage(@PathVariable Long imageId) {
        System.out.println("=== TÜM ANNOTATION'LARI SİLME ===");
        System.out.println("Image ID: " + imageId);
        annotationService.deleteByImageId(imageId);
        System.out.println("Tüm annotation'lar silindi");
        System.out.println("=================================");
        return ResponseEntity.noContent().build();
    }
}



