package com.cvlab.spring.LaPatho;

import com.cvlab.spring.LaPatho.security.entity.User;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class ImageLabelingStatusService {

    private final ImageLabelingStatusRepository labelingStatusRepository;
    private final ImageRepository imageRepository;

    /**
     * Belirli bir kullanıcının belirli bir görüntü için etiketleme durumunu getirir.
     * Eğer kayıt yoksa null döndürür (henüz etiketleme başlamamış).
     */
    public LabelingStatus getLabelingStatus(Long imageId, User user) {
        return labelingStatusRepository.findByImageIdAndUserId(imageId, user.getId())
                .map(ImageLabelingStatus::getStatus)
                .orElse(null);
    }

    /**
     * Belirli bir kullanıcının belirli bir görüntü için etiketleme durumunu günceller.
     * Kayıt yoksa yeni oluşturur.
     */
    @Transactional
    public ImageLabelingStatus updateLabelingStatus(Long imageId, User user, LabelingStatus newStatus) {
        log.info("Updating labeling status for image {} by user {} to {}", imageId, user.getUsername(), newStatus);

        ImageEntity image = imageRepository.findById(imageId)
                .orElseThrow(() -> new EntityNotFoundException("Image not found: " + imageId));

        Optional<ImageLabelingStatus> existingStatus = labelingStatusRepository.findByImageIdAndUserId(imageId, user.getId());

        if (existingStatus.isPresent()) {
            ImageLabelingStatus status = existingStatus.get();
            status.setStatus(newStatus);
            return labelingStatusRepository.save(status);
        } else {
            ImageLabelingStatus newLabelingStatus = ImageLabelingStatus.builder()
                    .image(image)
                    .user(user)
                    .status(newStatus)
                    .build();
            return labelingStatusRepository.save(newLabelingStatus);
        }
    }

    /**
     * Bir kullanıcının tüm etiketleme durumlarını getirir.
     */
    public List<ImageLabelingStatus> getUserLabelingStatuses(User user) {
        return labelingStatusRepository.findByUser(user);
    }

    /**
     * Bir kullanıcının belirli durumdaki görüntü sayısını döndürür.
     */
    public long countByUserAndStatus(User user, LabelingStatus status) {
        return labelingStatusRepository.countByUserIdAndStatus(user.getId(), status);
    }

    /**
     * Bir kullanıcının toplam etiketleme kaydı sayısını döndürür.
     */
    public long countByUser(User user) {
        return labelingStatusRepository.countByUserId(user.getId());
    }

    /**
     * Kullanıcı için etiketleme istatistiklerini döndürür.
     */
    public LabelingStats getUserLabelingStats(User user, long totalAssignedImages) {
        long completed = labelingStatusRepository.countByUserIdAndStatus(user.getId(), LabelingStatus.COMPLETED);
        long inProgress = labelingStatusRepository.countByUserIdAndStatus(user.getId(), LabelingStatus.IN_PROGRESS);
        long notStarted = totalAssignedImages - completed - inProgress;

        return new LabelingStats(totalAssignedImages, completed, inProgress, Math.max(0, notStarted));
    }

    /**
     * Görüntü silindiğinde ilgili etiketleme durumlarını temizler.
     */
    @Transactional
    public void deleteByImageId(Long imageId) {
        labelingStatusRepository.deleteByImageId(imageId);
    }

    // İstatistik DTO'su
    public record LabelingStats(long total, long completed, long inProgress, long notStarted) {}
}

