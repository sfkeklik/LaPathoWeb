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
}

