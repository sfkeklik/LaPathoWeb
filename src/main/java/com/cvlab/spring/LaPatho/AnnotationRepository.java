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

//    @Query("SELECT a FROM AnnotationEntity a " +
//            "WHERE a.image.id = :imageId AND a.body LIKE %:jsonId%")
//    Optional<AnnotationEntity> findByImageIdAndJsonId(
//            @Param("imageId") Long imageId,
//            @Param("jsonId") String jsonId
//    );
}
