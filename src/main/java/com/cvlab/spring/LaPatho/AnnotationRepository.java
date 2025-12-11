package com.cvlab.spring.LaPatho;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AnnotationRepository extends JpaRepository<AnnotationEntity, Long> {
    List<AnnotationEntity> findByImageId(Long imageId);

    // Find annotations by image and user (doctor)
    List<AnnotationEntity> findByImageIdAndUserId(Long imageId, Long userId);

    // Find all annotations by user
    List<AnnotationEntity> findByUserId(Long userId);

    // Check if annotation belongs to user
    boolean existsByIdAndUserId(Long id, Long userId);
}
