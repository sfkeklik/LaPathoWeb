package com.cvlab.spring.LaPatho;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.stream.Collectors;
import java.nio.file.Files;
import java.nio.file.Paths;

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
                .map(img -> {
                    // Create comprehensive metadata DTO
                    ImageMetadataDTO metadata = new ImageMetadataDTO();

                    // Basic image properties
                    metadata.setWidth(img.getWidth());
                    metadata.setHeight(img.getHeight());
                    metadata.setTileSize(img.getTileSize());
                    metadata.setMaxLevel(img.getMaxLevel());

                    // File information
                    metadata.setFileName(img.getName());
                    // Fallback: file size from disk if missing
                    Long fileSize = img.getFileSize();
                    if (fileSize == null && img.getPath() != null) {
                        try { fileSize = Files.size(Paths.get(img.getPath())); } catch (Exception ignored) {}
                    }
                    metadata.setFileSize(fileSize);

                    // Format with fallback detection by extension
                    String format = img.getFormat();
                    if (format == null || format.isBlank() || "Unknown".equalsIgnoreCase(format)) {
                        format = detectFormatFromPath(img.getPath());
                    }
                    metadata.setFormat(format);

                    metadata.setPath(img.getPath());

                    // Technical details
                    metadata.setPixelSizeX(img.getPixelSizeX());
                    metadata.setPixelSizeY(img.getPixelSizeY());
                    metadata.setBitDepth(img.getBitDepth());
                    metadata.setChannels(img.getChannels());
                    metadata.setColorSpace(img.getColorSpace());
                    metadata.setCompression(img.getCompression());

                    // Microscopy-specific metadata
                    metadata.setMagnification(img.getMagnification());
                    metadata.setObjective(img.getObjective());
                    metadata.setScanner(img.getScanner());
                    metadata.setScanDate(img.getScanDate());

                    // Timestamps and status
                    metadata.setCreated(img.getCreated());
                    metadata.setUpdated(img.getUpdated());
                    metadata.setStatus(img.getStatus() != null ? img.getStatus().toString() : "UNKNOWN");

                    // Calculate derived properties
                    metadata.setTotalArea((double) img.getWidth() * img.getHeight());
                    if (img.getPixelSizeX() != null && img.getPixelSizeY() != null) {
                        metadata.setPhysicalWidth(img.getWidth() * img.getPixelSizeX());
                        metadata.setPhysicalHeight(img.getHeight() * img.getPixelSizeY());
                    }

                    return ResponseEntity.ok(metadata);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Simple extension-based format detector for legacy records
    private String detectFormatFromPath(String path) {
        if (path == null) return "Unknown";
        String lower = path.toLowerCase();
        if (lower.endsWith(".bif")) return "BIF";
        if (lower.endsWith(".ome.tiff") || lower.endsWith(".ome.tif")) return "OME-TIFF";
        if (lower.endsWith(".tiff") || lower.endsWith(".tif")) return "TIFF";
        if (lower.endsWith(".svs")) return "SVS";
        if (lower.endsWith(".ndpi")) return "NDPI";
        if (lower.endsWith(".scn")) return "SCN";
        if (lower.endsWith(".mrxs")) return "MRXS";
        return "Unknown";
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
