package com.cvlab.spring.LaPatho;

import loci.formats.FormatException;
import loci.formats.ImageReader;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
public class ImageService {
    @Autowired private ImageRepository imageRepository;
    @Autowired private TileService tileService;
    @Autowired private ApplicationEventPublisher events;

    public ImageEntity save(ImageEntity img) {
        return imageRepository.save(img);
    }

    public Optional<ImageEntity> findById(Long id) {
        return imageRepository.findById(id);
    }

    public List<ImageEntity> findAll() {
        return imageRepository.findAll();
    }

    public ImageDTO create(String name, String inputPath) throws IOException, FormatException {
        log.info("Creating image: name={}, path={}", name, inputPath);

        // 1) Yeni ImageEntity oluşturup temel alanları set et
        ImageEntity img = new ImageEntity();
        img.setName(name);
        img.setPath(inputPath);
        img.setStatus(Status.PENDING);

        // 2) Bio-Formats ImageReader ile boyutları oku
        ImageReader reader = new ImageReader();
        try {
            log.info("Bio-Formats ile dosya okunuyor: {}", inputPath);
            reader.setId(inputPath);
            // Eğer çoklu seri varsa, ilk seriyi kullanıyoruz
            reader.setSeries(0);
            int width  = reader.getSizeX();
            int height = reader.getSizeY();
            img.setWidth(width);
            img.setHeight(height);
            log.info("Dosya boyutları: {}x{}", width, height);
        } catch (Exception e) {
            log.error("Bio-Formats okuma hatası: {}", e.getMessage(), e);
            // Fallback: Default değerler ata
            img.setWidth(1024);
            img.setHeight(1024);
            log.warn("Default boyutlar atandı: 1024x1024");
        } finally {
            try {
                reader.close();
            } catch (Exception e) {
                log.warn("ImageReader kapatma hatası: {}", e.getMessage());
            }
        }

        // 3) Tile boyutu ve maxLevel hesaplama
        int tileSize = 512;
        img.setTileSize(tileSize);
        int maxLevel = (int) Math.ceil(
                Math.log(Math.max(img.getWidth(), img.getHeight()) / (double) tileSize)
                        / Math.log(2)
        );
        img.setMaxLevel(maxLevel);
        log.info("Tile yapılandırması: tileSize={}, maxLevel={}", tileSize, maxLevel);

        // 4) Veritabanına kaydet
        try {
            imageRepository.save(img);
            log.info("Image veritabanına kaydedildi: ID={}", img.getId());
        } catch (Exception e) {
            log.error("Veritabanı kaydetme hatası: {}", e.getMessage(), e);
            throw new RuntimeException("Veritabanı hatası: " + e.getMessage());
        }

        // 5) DTO döndür
        return new ImageDTO(
                img.getId(),
                img.getName(),
                img.getWidth(),
                img.getHeight(),
                img.getTileSize(),
                img.getMaxLevel(),
                img.getPath()
        );
    }

    public Status getStatus(Long id) {
        return imageRepository.findById(id).map(ImageEntity::getStatus).orElse(Status.ERROR);
    }

    @Transactional
    public ImageEntity update(Long id, ImageEntity imageData) {
        ImageEntity existing = imageRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Image not found"));

        if (imageData.getName() != null) {
            existing.setName(imageData.getName());
        }
        if (imageData.getStatus() != null) {
            existing.setStatus(imageData.getStatus());
        }
        existing.setUpdated(java.time.Instant.now());

        return imageRepository.save(existing);
    }

    @Transactional
    public void delete(Long id) {
        if (!imageRepository.existsById(id)) {
            throw new EntityNotFoundException("Image not found");
        }
        imageRepository.deleteById(id);
    }

    // Async tile üretimi
    @Async
    public void generateTilesAsync(Long imageId) {
        log.info("Async tile üretimi başladı: imageId={}, thread={}", imageId, Thread.currentThread().getName());

        try {
            ImageEntity img = imageRepository.findById(imageId).orElseThrow();
            log.info("Image bulundu: {}", img.getName());

            img.setStatus(Status.PROCESSING);
            imageRepository.save(img);
            log.info("Status PROCESSING olarak güncellendi");

            tileService.generateTiles(img.getPath(), img.getId().toString());
            log.info("Tile üretimi tamamlandı");

            img.setStatus(Status.READY);
            imageRepository.save(img);
            log.info("Status READY olarak güncellendi");

            events.publishEvent(new ImageReadyEvent(this, imageId));
            log.info("ImageReadyEvent gönderildi");

        } catch (Exception ex) {
            log.error("Tile üretimi hatası: imageId={}", imageId, ex);
            try {
                ImageEntity img = imageRepository.findById(imageId).orElse(null);
                if (img != null) {
                    img.setStatus(Status.ERROR);
                    imageRepository.save(img);
                    log.info("Status ERROR olarak güncellendi");
                }
            } catch (Exception saveEx) {
                log.error("Status güncelleme hatası: {}", saveEx.getMessage());
            }
        }
    }
}

/*
@Service
public class ImageService {
    @Autowired
    private ImageRepository images;

    public ImageEntity save(ImageEntity img) { return images.save(img); }
    public Optional<ImageEntity> findById(Long id) { return images.findById(id); }
    // metadata güncelleme, listeleme vb.
}
*/