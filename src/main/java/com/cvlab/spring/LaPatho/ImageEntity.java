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
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name")
    private String name;

    @Column(name = "width")
    private int width;

    @Column(name = "height")
    private int height;

    @Column(name = "tile_size")
    private int tileSize;

    @Column(name = "max_level")
    private int maxLevel;

    @Column(name = "path")
    private String path;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private Status status = Status.PENDING;            // PENDING, PROCESSING, READY, ERROR

    @Column(name = "created")
    private Instant created;

    @Column(name = "updated")
    private Instant updated;

    // Enhanced metadata fields
    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "format")
    private String format;

    @Column(name = "pixel_size_x")
    private Double pixelSizeX;

    @Column(name = "pixel_size_y")
    private Double pixelSizeY;

    @Column(name = "bit_depth")
    private Integer bitDepth;

    @Column(name = "channels")
    private Integer channels;

    @Column(name = "color_space")
    private String colorSpace;

    @Column(name = "compression")
    private String compression;

    @Column(name = "magnification")
    private Double magnification;

    @Column(name = "objective")
    private String objective;

    @Column(name = "scanner")
    private String scanner;

    @Column(name = "scan_date")
    private String scanDate;

    @PrePersist
    public void prePersist() {
        if (created == null) {
            created = Instant.now();
        }
        updated = Instant.now();
        if (status == null) {
            status = Status.PENDING;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updated = Instant.now();
    }
}
