package com.cvlab.spring.LaPatho.project.repository;

import com.cvlab.spring.LaPatho.project.entity.Label;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LabelRepository extends JpaRepository<Label, Long> {

    List<Label> findByProjectId(Long projectId);

    Optional<Label> findByProjectIdAndName(Long projectId, String name);

    boolean existsByProjectIdAndName(Long projectId, String name);

    void deleteByProjectId(Long projectId);

    @Query("SELECT l FROM Label l WHERE l.project.id = :projectId ORDER BY l.name")
    List<Label> findByProjectIdOrderByName(@Param("projectId") Long projectId);

    // Sadece root (üst seviye) etiketleri getir
    @Query("SELECT l FROM Label l WHERE l.project.id = :projectId AND l.parent IS NULL ORDER BY l.sortOrder ASC, l.name ASC")
    List<Label> findByProjectIdAndParentIsNull(@Param("projectId") Long projectId);

    // Belirli türdeki root etiketleri getir
    @Query("SELECT l FROM Label l WHERE l.project.id = :projectId AND l.parent IS NULL AND l.labelType = :labelType ORDER BY l.sortOrder ASC, l.name ASC")
    List<Label> findByProjectIdAndParentIsNullAndLabelType(@Param("projectId") Long projectId, @Param("labelType") Label.LabelType labelType);

    // Alt kategorileri getir
    List<Label> findByParentIdOrderBySortOrderAscNameAsc(Long parentId);

    // Proje ve parent'a göre duplicate kontrol
    boolean existsByProjectIdAndNameAndParentId(Long projectId, String name, Long parentId);

    // Proje ve parent null olduğunda duplicate kontrol
    @Query("SELECT CASE WHEN COUNT(l) > 0 THEN true ELSE false END FROM Label l WHERE l.project.id = :projectId AND l.name = :name AND l.parent IS NULL")
    boolean existsByProjectIdAndNameAndParentIsNull(@Param("projectId") Long projectId, @Param("name") String name);
}

