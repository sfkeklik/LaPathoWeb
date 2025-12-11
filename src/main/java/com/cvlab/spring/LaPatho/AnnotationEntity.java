package com.cvlab.spring.LaPatho;

import com.cvlab.spring.LaPatho.security.entity.User;
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
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "image_id")
    private ImageEntity image;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "creator")
    private String creator; // Legacy field, kept for backward compatibility

    private String type;

    @Column(columnDefinition = "TEXT")
    private String geometry;

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
}