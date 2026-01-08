package com.cvlab.spring.LaPatho;

import com.cvlab.spring.LaPatho.security.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ImageLabelingStatusRepository extends JpaRepository<ImageLabelingStatus, Long> {

    Optional<ImageLabelingStatus> findByImageAndUser(ImageEntity image, User user);

    Optional<ImageLabelingStatus> findByImageIdAndUserId(Long imageId, Long userId);

    List<ImageLabelingStatus> findByUser(User user);

    List<ImageLabelingStatus> findByUserId(Long userId);

    List<ImageLabelingStatus> findByImage(ImageEntity image);

    List<ImageLabelingStatus> findByImageId(Long imageId);

    @Query("SELECT ils FROM ImageLabelingStatus ils WHERE ils.user.id = :userId AND ils.status = :status")
    List<ImageLabelingStatus> findByUserIdAndStatus(@Param("userId") Long userId, @Param("status") LabelingStatus status);

    @Query("SELECT COUNT(ils) FROM ImageLabelingStatus ils WHERE ils.user.id = :userId AND ils.status = :status")
    long countByUserIdAndStatus(@Param("userId") Long userId, @Param("status") LabelingStatus status);

    @Query("SELECT COUNT(ils) FROM ImageLabelingStatus ils WHERE ils.user.id = :userId")
    long countByUserId(@Param("userId") Long userId);

    void deleteByImageId(Long imageId);
}

