package com.cvlab.spring.LaPatho;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

// ImageEntity.java
@Entity
@Table(name = "images")
@AllArgsConstructor
@NoArgsConstructor
@Data
public class ImageEntity {
    @Id @GeneratedValue private Long id;
    private String name;
    private int width, height, tileSize, maxLevel;
    private String path;
    @Enumerated(EnumType.STRING)
    private Status status;            // PENDING, PROCESSING, READY, ERROR
    private Instant created, updated;
    // getters/setters, @PrePersist/@PreUpdate
}
