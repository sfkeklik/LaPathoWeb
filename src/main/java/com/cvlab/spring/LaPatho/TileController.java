package com.cvlab.spring.LaPatho;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/tiles")
public class TileController {

    @Value("${tile.output-base-path}")
    String baseOutputPath;

    // Format: /api/tiles/{imageId}/{level}/{tileX}_{tileY}.jpg
    @GetMapping("/{imageId}/{level}/{tileX}_{tileY}.jpg")
    public ResponseEntity<Resource> getTile(
            @PathVariable String imageId,
            @PathVariable int level,
            @PathVariable int tileX,
            @PathVariable int tileY) {

        String filename = String.format("tile_%d_%d.jpg", tileX, tileY);
        Path tilePath = Paths.get(baseOutputPath, imageId, String.valueOf(level), filename);

        System.out.println("Tile request: imageId=" + imageId + ", level=" + level + ", tileX=" + tileX + ", tileY=" + tileY);
        System.out.println("Looking for file: " + tilePath.toAbsolutePath());

        if (!Files.exists(tilePath)) {
            System.out.println("Tile not found: " + tilePath.toAbsolutePath());
            return ResponseEntity.notFound().build();
        }

        try {
            Resource file = new UrlResource(tilePath.toUri());
            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_JPEG)
                    .body(file);
        } catch (MalformedURLException e) {
            System.err.println("Error loading tile: " + e.getMessage());
            return ResponseEntity.status(500).build();
        }
    }

    // Alternative format: /api/tiles/{imageId}/{level}/tile_{tileX}_{tileY}.jpg
    @GetMapping("/{imageId}/{level}/tile_{tileX}_{tileY}.jpg")
    public ResponseEntity<Resource> getTileAlt(
            @PathVariable String imageId,
            @PathVariable int level,
            @PathVariable int tileX,
            @PathVariable int tileY) {
        return getTile(imageId, level, tileX, tileY);
    }
}
