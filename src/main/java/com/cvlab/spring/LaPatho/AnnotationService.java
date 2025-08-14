package com.cvlab.spring.LaPatho;

import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;




@Service
public class AnnotationService {
    @Autowired private AnnotationRepository anno;
    @Autowired private ImageRepository images;

    public List<AnnotationEntity> getForImage(Long imageId) {
        return anno.findByImageId(imageId);
    }

    public AnnotationEntity save(Long imageId, AnnotationEntity annotation) {
        ImageEntity img = images.findById(imageId)
                .orElseThrow(() -> new EntityNotFoundException("Image not found"));
        annotation.setImage(img);
        return anno.save(annotation);
    }

    public AnnotationEntity findById(Long id) {
        return anno.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Annotation not found"));
    }

    public List<AnnotationEntity> findAll() {
        return anno.findAll();
    }

    @Transactional
    public AnnotationEntity update(Long id, AnnotationEntity annotationData) {
        AnnotationEntity existing = anno.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Annotation not found"));
        
        if (annotationData.getCreator() != null) {
            existing.setCreator(annotationData.getCreator());
        }
        if (annotationData.getType() != null) {
            existing.setType(annotationData.getType());
        }
        if (annotationData.getGeometry() != null) {
            existing.setGeometry(annotationData.getGeometry());
        }
        existing.setUpdated(java.time.Instant.now());
        
        return anno.save(existing);
    }

    @Transactional
    public void delete(Long id) {
        if (!anno.existsById(id)) {
            throw new EntityNotFoundException("Annotation not found");
        }
        anno.deleteById(id);
    }

    @Transactional
    public void deleteByImageId(Long imageId) {
        List<AnnotationEntity> annotations = anno.findByImageId(imageId);
        anno.deleteAll(annotations);
    }

//    @Transactional
//    public JsonNode updateAnnotation(Long imageId, String jsonId, JsonNode annotation) {
//        // 1) Doğru kaydı bulun (imageId + JSON-LD id’e göre)
//        AnnotationEntity ent = anno.findByImageIdAndJsonId(imageId, jsonId)
//                .orElseThrow(() -> new EntityNotFoundException("Annotation not found"));
//
//        // 2) Yeni JSON’u body’ye set edin
//        ent.setBody(annotation.toString());
//        // 3) DB’ye kaydedin
//        anno.save(ent);
//
//        // 4) Güncel JSON’u döndürün
//        return annotation;
//    }

}



/*@Service
public class AnnotationService {
    @Autowired
    private AnnotationRepository anno;
    @Autowired private ImageRepository images;

    public List<AnnotationEntity> getForImage(Long imageId) {
        return anno.findByImageId(imageId);
    }

    public AnnotationEntity save(Long imageId, AnnotationEntity annotation) {
        ImageEntity img = images.findById(imageId)
                .orElseThrow(() -> new EntityNotFoundException("Image not found"));
        annotation.setImage(img);
        return anno.save(annotation);
    }
}
*/