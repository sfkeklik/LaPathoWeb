package com.cvlab.spring.LaPatho;

import loci.formats.FormatException;
import loci.formats.ImageReader;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/images")
@RequiredArgsConstructor
@Slf4j
public class FileUploadController {
    @Autowired
    private ImageService imageService;

    @Autowired
    private TileService tileService;

    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file) {
        try {
            log.info("Upload başladı: {}", file.getOriginalFilename());

            // Dosya kontrolü
            if (file.isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Dosya seçilmedi");
                return ResponseEntity.badRequest().body(error);
            }

            // Upload directory oluştur
            Path uploadDir = Paths.get("uploads");
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
                log.info("Upload dizini oluşturuldu: {}", uploadDir.toAbsolutePath());
            }

            // Dosyayı kaydet
            String filename = UUID.randomUUID() + "-" + file.getOriginalFilename();
            Path target = uploadDir.resolve(filename);
            file.transferTo(target);
            log.info("Dosya kaydedildi: {}", target.toAbsolutePath());

            // ImageEntity oluştur ve kaydet
            ImageDTO dto = imageService.create(
                file.getOriginalFilename(),
                target.toString()
            );
            log.info("Image entity oluşturuldu: ID={}", dto.getId());

            // Async tile üretimi başlat
            imageService.generateTilesAsync(dto.getId());
            log.info("Tile üretimi başlatıldı");

            return ResponseEntity.ok(dto);

        } catch (IOException e) {
            log.error("IO Hatası:", e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Dosya yazma hatası: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);

        } catch (FormatException e) {
            log.error("Format Hatası:", e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Desteklenmeyen dosya formatı: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);

        } catch (Exception e) {
            log.error("Genel Hata - WSL Debug:", e);
            log.error("Hata detayları: {}", e.getStackTrace());
            Map<String, String> error = new HashMap<>();
            error.put("error", "Sunucu hatası: " + e.getMessage());
            error.put("type", e.getClass().getSimpleName());
            error.put("details", e.getCause() != null ? e.getCause().getMessage() : "No cause");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @GetMapping("/status/{id}")
    public ResponseEntity<Map<String, String>> status(@PathVariable Long id) {
        try {
            Status s = imageService.getStatus(id);
            Map<String, String> response = new HashMap<>();
            response.put("status", s.name());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Status alma hatası:", e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> health = new HashMap<>();
        try {
            // Check tile directory
            Path tileDir = Paths.get("/app/tiles");
            health.put("tileDirectoryExists", Files.exists(tileDir));
            health.put("tileDirectoryWritable", Files.isWritable(tileDir));

            // Check upload directory
            Path uploadDir = Paths.get("uploads");
            health.put("uploadDirectoryExists", Files.exists(uploadDir));
            health.put("uploadDirectoryWritable", Files.isWritable(uploadDir));

            // Check profile
            health.put("activeProfile", System.getProperty("spring.profiles.active"));

            // Check Bio-Formats
            try {
                ImageReader reader = new ImageReader();
                health.put("bioFormatsAvailable", true);
                reader.close();
            } catch (Exception e) {
                health.put("bioFormatsAvailable", false);
                health.put("bioFormatsError", e.getMessage());
            }

            return ResponseEntity.ok(health);
        } catch (Exception e) {
            health.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(health);
        }
    }
}