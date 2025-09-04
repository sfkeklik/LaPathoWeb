package com.cvlab.spring.LaPatho;

import com.cvlab.spring.LaPatho.AnnotationDTO;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
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


    // GET all annotations for image
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAnnotations(@PathVariable Long imageId) {
        System.out.println("=== ANNOTATION OKUMA ===");
        System.out.println("Image ID: " + imageId);

        List<AnnotationEntity> entities = annotationService.getForImage(imageId);
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

                        // Database ID'sini de ekleyelim
                        Map<String, Object> result = new HashMap<>();
                        result.put("databaseId", e.getId());
                        result.put("annotation", parsed);

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
            @RequestBody AnnotationEntity annotation) {

        System.out.println("=== ANNOTATION KAYDETME ===");
        System.out.println("Image ID: " + imageId);
        System.out.println("Gelen annotation: " + annotation);
        System.out.println("Creator: " + annotation.getCreator());
        System.out.println("Type: " + annotation.getType());
        System.out.println("Geometry: " + annotation.getGeometry());

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
        if (annotation.getCreator() == null || annotation.getCreator().trim().isEmpty()) {
            System.out.println("HATA: Creator boş!");
            return ResponseEntity.badRequest().build();
        }

        if (annotation.getType() == null || annotation.getType().trim().isEmpty()) {
            System.out.println("HATA: Type boş!");
            return ResponseEntity.badRequest().build();
        }

        try {
            AnnotationEntity saved = annotationService.save(imageId, annotation);

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
    public ResponseEntity<AnnotationEntity> getAnnotation(@PathVariable Long annotationId) {
        AnnotationEntity annotation = annotationService.findById(annotationId);
        return ResponseEntity.ok(annotation);
    }

    // PUT - Update annotation
    @PutMapping("/{annotationId}")
    public ResponseEntity<AnnotationEntity> updateAnnotation(
            @PathVariable Long imageId,
            @PathVariable Long annotationId,
            @RequestBody AnnotationEntity annotationData) {
        AnnotationEntity updated = annotationService.update(annotationId, annotationData);
        return ResponseEntity.ok(updated);
    }

    // DELETE annotation
    @DeleteMapping("/{annotationId}")
    public ResponseEntity<Void> deleteAnnotation(@PathVariable Long annotationId) {
        annotationService.delete(annotationId);
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



