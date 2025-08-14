package com.cvlab.spring.LaPatho;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/images")
@RequiredArgsConstructor
public class ImageController {

    @Autowired
    private ImageService imageService;

    @PostMapping
    public ResponseEntity<ImageDTO> createImage(@RequestBody CreateImageDTO dto) {
        ImageEntity img = new ImageEntity();
        img.setName(dto.getName());
        img.setWidth(dto.getWidth());
        img.setHeight(dto.getHeight());
        img.setTileSize(dto.getTileSize());
        // maxLevel hesaplanabilir veya DTO’dan geliyorsa kullan:
        img.setMaxLevel(dto.getMaxLevel());
        img.setPath(dto.getPath());
        ImageEntity saved = imageService.save(img);

        ImageDTO response = new ImageDTO(
                saved.getId(), saved.getName(),
                saved.getWidth(), saved.getHeight(),
                saved.getTileSize(), saved.getMaxLevel(),
                saved.getPath()
        );

        return ResponseEntity
                .created(URI.create("/api/images/" + saved.getId()))
                .body(response);
    }

    @GetMapping("/metadata/{id}")
    public ResponseEntity<ImageMetadataDTO> metadata(@PathVariable Long id) {
        return imageService.findById(id)
                .map(img -> ResponseEntity.ok(new ImageMetadataDTO(
                        img.getWidth(), img.getHeight(),
                        img.getTileSize(), img.getMaxLevel()
                )))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/get-images-list")
    public ResponseEntity<List<ImageOverviewDTO>> listImages() {
        List<ImageOverviewDTO> list = imageService.findAll().stream()
                .map(img -> {
                    String preview = (img.getStatus() == Status.READY)
                            ? String.format("http://localhost:8080/api/tiles/%d/0/0_0.jpg", img.getId())
                            : null;
                    return new ImageOverviewDTO(
                            img.getId(), img.getName(), img.getStatus(), preview
                    );
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    // GET specific image by ID
    @GetMapping("/{id}")
    public ResponseEntity<ImageEntity> getImage(@PathVariable Long id) {
        return imageService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // PUT - Update image
    @PutMapping("/{id}")
    public ResponseEntity<ImageEntity> updateImage(
            @PathVariable Long id,
            @RequestBody ImageEntity imageData) {
        ImageEntity updated = imageService.update(id, imageData);
        return ResponseEntity.ok(updated);
    }

    // DELETE image
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteImage(@PathVariable Long id) {
        imageService.delete(id);
        return ResponseEntity.noContent().build();
    }

}
/*private final TileService tileService;

    @PostMapping("/generate-tiles")
    public ResponseEntity<?> generateTiles() {
        try {
            String inputPath = "C:/Users/user/Desktop/openslide/wsi/B-16303-24-S1-K2.bif";
            String outputBasePath = "C:/Users/user/Desktop/openslide/tiles/";
            String imageId = "philips2"; // TODO: veya UUID.randomUUID().toString();

            tileService.generateTiles(inputPath, imageId, outputBasePath);
            return ResponseEntity.ok("Tile üretimi tamamlandı.");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Hata oluştu: " + e.getMessage());
        }
    }

    @GetMapping("/{imageId}/metadata")
    public ResponseEntity<ImageMetadataDTO> getImageMetadata(@PathVariable String imageId) {
        // Örnek olarak, tiles klasöründen ilk tile'ın boyutunu okuyalım
        // Gerçek çözünürlüğü daha doğru olarak kaydederek getirmek daha sağlıklı olur

        int width = 50744;     // TODO: Gerçek width'i buraya yaz
        int height = 51200;    // TODO: Gerçek height
        int tileSize = 512;   // TileService ile uyumlu olmalı
        int maxLevel = 7;   // TileService ile uyumlu olmalı

        ImageMetadataDTO metadata = new ImageMetadataDTO(width, height, tileSize, maxLevel);
        return ResponseEntity.ok(metadata);
    }*/