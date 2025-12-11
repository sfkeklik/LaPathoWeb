package com.cvlab.spring.LaPatho;

import com.cvlab.spring.LaPatho.project.repository.ProjectRepository;
import com.cvlab.spring.LaPatho.security.entity.Role;
import com.cvlab.spring.LaPatho.security.entity.User;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AnnotationService {
    @Autowired private AnnotationRepository anno;
    @Autowired private ImageRepository images;
    @Autowired private ProjectRepository projectRepository;

    // Get annotations for image - filtered by user for doctors
    public List<AnnotationEntity> getForImage(Long imageId, User currentUser) {
        if (currentUser.getRole() == Role.ADMIN) {
            return anno.findByImageId(imageId);
        }
        // Doctors only see their own annotations
        return anno.findByImageIdAndUserId(imageId, currentUser.getId());
    }

    // Legacy method for backward compatibility
    public List<AnnotationEntity> getForImage(Long imageId) {
        return anno.findByImageId(imageId);
    }

    public AnnotationEntity save(Long imageId, AnnotationEntity annotation, User currentUser) {
        // Check if doctor can access this image
        if (currentUser.getRole() == Role.DOCTOR) {
            if (!projectRepository.canDoctorAccessImage(imageId, currentUser.getId())) {
                throw new AccessDeniedException("You don't have access to this image");
            }
        }

        ImageEntity img = images.findById(imageId)
                .orElseThrow(() -> new EntityNotFoundException("Image not found"));
        annotation.setImage(img);
        annotation.setUser(currentUser);
        annotation.setCreator(currentUser.getUsername());
        return anno.save(annotation);
    }

    // Legacy method
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

    public AnnotationEntity findById(Long id, User currentUser) {
        AnnotationEntity annotation = anno.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Annotation not found"));

        // Check access
        if (currentUser.getRole() == Role.DOCTOR &&
            (annotation.getUser() == null || !annotation.getUser().getId().equals(currentUser.getId()))) {
            throw new AccessDeniedException("You don't have access to this annotation");
        }

        return annotation;
    }

    public List<AnnotationEntity> findAll() {
        return anno.findAll();
    }

    public List<AnnotationEntity> findByUser(User user) {
        return anno.findByUserId(user.getId());
    }

    @Transactional
    public AnnotationEntity update(Long id, AnnotationEntity annotationData, User currentUser) {
        AnnotationEntity existing = anno.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Annotation not found"));

        // Check ownership for doctors
        if (currentUser.getRole() == Role.DOCTOR) {
            if (existing.getUser() == null || !existing.getUser().getId().equals(currentUser.getId())) {
                throw new AccessDeniedException("You can only update your own annotations");
            }
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

    // Legacy method
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
    public void delete(Long id, User currentUser) {
        AnnotationEntity existing = anno.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Annotation not found"));

        // Check ownership for doctors
        if (currentUser.getRole() == Role.DOCTOR) {
            if (existing.getUser() == null || !existing.getUser().getId().equals(currentUser.getId())) {
                throw new AccessDeniedException("You can only delete your own annotations");
            }
        }

        anno.deleteById(id);
    }

    // Legacy method
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