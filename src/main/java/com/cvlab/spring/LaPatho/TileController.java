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

    @GetMapping("/{imageId}/{level}/{tileX}_{tileY}.jpg")
    public ResponseEntity<Resource> getTile(
            @PathVariable String imageId,
            @PathVariable int level,
            @PathVariable int tileX,
            @PathVariable int tileY) {

        String filename = String.format("tile_%d_%d.jpg", tileX, tileY);
        Path tilePath = Paths.get(baseOutputPath, imageId, String.valueOf(level), filename);

        if (!Files.exists(tilePath)) {
            return ResponseEntity.notFound().build();
        }

        try {
            Resource file = new UrlResource(tilePath.toUri());
            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_JPEG)
                    .body(file);
        } catch (MalformedURLException e) {
            return ResponseEntity.status(500).build();
        }
    }
}
