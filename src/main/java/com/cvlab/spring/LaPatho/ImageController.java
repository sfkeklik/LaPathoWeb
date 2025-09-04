package com.cvlab.spring.LaPatho;

import jakarta.servlet.http.HttpServletRequest;
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
    public ResponseEntity<List<ImageOverviewDTO>> listImages(HttpServletRequest request) {
        List<ImageOverviewDTO> list = imageService.findAll().stream()
                .map(img -> {
                    String preview = (img.getStatus() == Status.READY)
                            ? String.format("%s://%s/api/tiles/%d/0/0_0.jpg",
                            request.getScheme(), request.getServerName() + ":" + request.getServerPort(), img.getId())
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
