package com.cvlab.spring.LaPatho;

import loci.formats.FormatException;
import loci.formats.ImageReader;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;


import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Service
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
        // 1) Yeni ImageEntity oluşturup temel alanları set et
        ImageEntity img = new ImageEntity();
        img.setName(name);
        img.setPath(inputPath);
        img.setStatus(Status.PENDING);

        // 2) Bio-Formats ImageReader ile boyutları oku
        ImageReader reader = new ImageReader();
        try {
            reader.setId(inputPath);
            // Eğer çoklu seri varsa, ilk seriyi kullanıyoruz
            reader.setSeries(0);
            int width  = reader.getSizeX();
            int height = reader.getSizeY();
            img.setWidth(width);
            img.setHeight(height);
        } finally {
            reader.close();
        }

        // 3) Tile boyutu ve maxLevel hesaplama
        int tileSize = 512;
        img.setTileSize(tileSize);
        int maxLevel = (int) Math.ceil(
                Math.log(Math.max(img.getWidth(), img.getHeight()) / (double) tileSize)
                        / Math.log(2)
        );
        img.setMaxLevel(maxLevel);

        // 4) Veritabanına kaydet
        imageRepository.save(img);

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
        System.out.println("Async start: " + Thread.currentThread().getName());
        System.out.println("IMAGE ID: " + imageId);
        ImageEntity img = imageRepository.findById(imageId).orElseThrow();

        try {
            img.setStatus(Status.PROCESSING); imageRepository.save(img);
            tileService.generateTiles(img.getPath(), img.getId().toString());
            img.setStatus(Status.READY); imageRepository.save(img);
            events.publishEvent(new ImageReadyEvent(this, imageId));
        } catch (Exception ex) {
            img.setStatus(Status.ERROR); imageRepository.save(img);
            throw new RuntimeException(ex);
        }
        System.out.println("Async end:   " + Thread.currentThread().getName());
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