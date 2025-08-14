package com.cvlab.spring.LaPatho;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/annotations")
public class AnnotationStandaloneController {

    @Autowired
    private AnnotationService annotationService;

    // GET all annotations
    @GetMapping
    public ResponseEntity<List<AnnotationEntity>> getAllAnnotations() {
        List<AnnotationEntity> annotations = annotationService.findAll();
        return ResponseEntity.ok(annotations);
    }

    // GET annotation by ID
    @GetMapping("/{id}")
    public ResponseEntity<AnnotationEntity> getAnnotation(@PathVariable Long id) {
        AnnotationEntity annotation = annotationService.findById(id);
        return ResponseEntity.ok(annotation);
    }

    // POST - Create new annotation
    @PostMapping
    public ResponseEntity<AnnotationEntity> createAnnotation(@RequestBody AnnotationCreateRequest request) {
        AnnotationEntity saved = annotationService.save(request.getImageId(), request.getAnnotation());
        return ResponseEntity
                .created(URI.create("/api/annotations/" + saved.getId()))
                .body(saved);
    }

    // PUT - Update annotation
    @PutMapping("/{id}")
    public ResponseEntity<AnnotationEntity> updateAnnotation(
            @PathVariable Long id,
            @RequestBody AnnotationEntity annotationData) {
        AnnotationEntity updated = annotationService.update(id, annotationData);
        return ResponseEntity.ok(updated);
    }

    // DELETE annotation
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAnnotation(@PathVariable Long id) {
        annotationService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // GET annotations by image ID
    @GetMapping("/by-image/{imageId}")
    public ResponseEntity<List<AnnotationEntity>> getAnnotationsByImage(@PathVariable Long imageId) {
        List<AnnotationEntity> annotations = annotationService.getForImage(imageId);
        return ResponseEntity.ok(annotations);
    }

    // DELETE all annotations for an image
    @DeleteMapping("/by-image/{imageId}")
    public ResponseEntity<Void> deleteAnnotationsByImage(@PathVariable Long imageId) {
        annotationService.deleteByImageId(imageId);
        return ResponseEntity.noContent().build();
    }

    // Request DTO for creating annotations
    public static class AnnotationCreateRequest {
        private Long imageId;
        private AnnotationEntity annotation;

        public Long getImageId() { return imageId; }
        public void setImageId(Long imageId) { this.imageId = imageId; }
        public AnnotationEntity getAnnotation() { return annotation; }
        public void setAnnotation(AnnotationEntity annotation) { this.annotation = annotation; }
    }
}
