package com.cvlab.spring.LaPatho;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "annotations")
@AllArgsConstructor
@NoArgsConstructor
@Data
public class AnnotationEntity {
    @Id
    @GeneratedValue private Long id;
    @ManyToOne @JoinColumn(name = "image_id") private ImageEntity image;
    private String creator;
    private String type;
    @Column(columnDefinition = "TEXT") private String geometry;
    private Instant created;
    private Instant updated;

    @PrePersist
    public void prePersist() {
        created = Instant.now();
        updated = Instant.now();
    }

    @PreUpdate
    public void preUpdate() {
        updated = Instant.now();
    }

    // getters/setters, lifecycle callbacks
}