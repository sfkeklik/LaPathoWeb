package com.cvlab.spring.LaPatho;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ImageOverviewDTO {
    private Long id;
    private String name;
    private Status status;
    private String previewUrl;  // tile'ların 0/0_0.jpg kademe url'i
    private LabelingStatus labelingStatus;  // Doktor bazlı etiketleme durumu (IN_PROGRESS, COMPLETED)

    // Eski constructor - geriye uyumluluk için
    public ImageOverviewDTO(Long id, String name, Status status, String previewUrl) {
        this.id = id;
        this.name = name;
        this.status = status;
        this.previewUrl = previewUrl;
        this.labelingStatus = null; // Henüz etiketleme başlamamış
    }
}
