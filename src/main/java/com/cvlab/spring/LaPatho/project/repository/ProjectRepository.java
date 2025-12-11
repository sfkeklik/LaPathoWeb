package com.cvlab.spring.LaPatho.project.repository;

import com.cvlab.spring.LaPatho.project.entity.Project;
import com.cvlab.spring.LaPatho.security.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {

    @Query("SELECT p FROM Project p JOIN p.assignedDoctors d WHERE d = :doctor AND p.active = true")
    List<Project> findByAssignedDoctor(@Param("doctor") User doctor);

    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM Project p JOIN p.assignedDoctors d WHERE p.id = :projectId AND d.id = :doctorId")
    boolean isDoctorAssignedToProject(@Param("projectId") Long projectId, @Param("doctorId") Long doctorId);

    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM Project p JOIN p.images i JOIN p.assignedDoctors d WHERE i.id = :imageId AND d.id = :doctorId")
    boolean canDoctorAccessImage(@Param("imageId") Long imageId, @Param("doctorId") Long doctorId);

    List<Project> findByActiveTrue();
}
