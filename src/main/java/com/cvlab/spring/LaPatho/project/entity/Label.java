package com.cvlab.spring.LaPatho.project.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.EqualsAndHashCode;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "labels")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"parent", "children"})
@EqualsAndHashCode(exclude = {"parent", "children"})
public class Label {

    /**
     * Etiket türü
     */
    public enum LabelType {
        REGION,      // Bölge (anatomik alan)
        FINDING,     // Radyografik bulgu
        SIMPLE       // Basit etiket (eski sistem uyumluluğu)
    }

    /**
     * Alt seçenek giriş türü
     */
    public enum InputType {
        NONE,        // Alt seçenek yok (sadece parent kategori)
        SELECT,      // Tek seçim (radio button/dropdown)
        BOOLEAN      // Var/Yok seçimi
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    // Hiyerarşik yapı için parent-child ilişkisi
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Label parent;

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    @OrderBy("sortOrder ASC, name ASC")
    private List<Label> children = new ArrayList<>();

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String color = "#ff0000";

    @Column(length = 500)
    private String description;

    // Etiket türü: REGION, FINDING, SIMPLE
    @Enumerated(EnumType.STRING)
    @Column(name = "label_type", length = 20)
    @Builder.Default
    private LabelType labelType = LabelType.SIMPLE;

    // Alt seçenek giriş türü: SELECT, BOOLEAN, NONE
    @Enumerated(EnumType.STRING)
    @Column(name = "input_type", length = 20)
    @Builder.Default
    private InputType inputType = InputType.NONE;

    // JSON formatında seçenekler (örn: ["Localized", "Extended", "Advanced"])
    @Column(name = "options", columnDefinition = "TEXT")
    private String options;

    // Sıralama için
    @Column(name = "sort_order")
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    public void prePersist() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }

    // Helper method: Ana kategorinin root olup olmadığını kontrol et
    public boolean isRoot() {
        return parent == null;
    }

    // Helper method: Alt seçenekleri olan bir kategori mi?
    public boolean hasChildren() {
        return children != null && !children.isEmpty();
    }
}

