package com.cvlab.spring.LaPatho;

import org.springframework.context.ApplicationEvent;



/**
 * Sunucu tarafında bir görüntü için tile üretimi tamamlandığında
 * yayınlanacak event.
 */
public class ImageReadyEvent extends ApplicationEvent {

    private final Long imageId;

    /**
     * @param source  Event'i yayınlayan bean (çoğu zaman this)
     * @param imageId Hazır hale gelen görüntünün ID'si
     */
    public ImageReadyEvent(Object source, Long imageId) {
        super(source);
        this.imageId = imageId;
    }

    public Long getImageId() {
        return imageId;
    }
}
