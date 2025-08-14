package com.cvlab.spring.LaPatho;

import loci.formats.FormatException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@RestController
@RequestMapping("/api/images")
@RequiredArgsConstructor
public class FileUploadController {
    @Autowired
    private ImageService imageService;

    @Autowired
    private TileService tileService;

    @PostMapping("/upload")
    public ResponseEntity<ImageDTO> upload(
            @RequestParam("file") MultipartFile file) throws IOException, FormatException {

        // 1) dosyayı diske kaydet
        Path uploadDir = Paths.get("uploads");
        Files.createDirectories(uploadDir);
        String filename = UUID.randomUUID() + "-" + file.getOriginalFilename();
        Path target = uploadDir.resolve(filename);
        file.transferTo(target);

        // 2) ImageEntity oluşturup PENDING olarak kaydet
        ImageDTO dto = imageService.create(
                file.getOriginalFilename(),
                target.toString()
        );

        // 3) Arka plan tile üretimini başlat
        imageService.generateTilesAsync(dto.getId());

        return ResponseEntity.ok(dto);
    }

    @GetMapping("/status/{id}")
    public ResponseEntity<String> status(@PathVariable Long id) {
        Status s = imageService.getStatus(id);
        return ResponseEntity.ok(s.name());
    }
}