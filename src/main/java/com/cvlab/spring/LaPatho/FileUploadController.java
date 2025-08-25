package com.cvlab.spring.LaPatho;

import loci.formats.FormatException;
import loci.formats.ImageReader;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.attribute.PosixFilePermissions;
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

    @Value("${upload.base-path:/app/uploads}")
    private String uploadBasePath;

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
            Path uploadDir = Paths.get(uploadBasePath);
            if (!Files.exists(uploadDir)) {
                try {
                    Files.createDirectories(uploadDir);
                    // Set permissions for Linux/Unix systems
                    try {
                        Files.setPosixFilePermissions(uploadDir, PosixFilePermissions.fromString("rwxrwxrwx"));
                    } catch (UnsupportedOperationException e) {
                        // Ignore on Windows systems
                        log.debug("POSIX permissions not supported on this system");
                    }
                    log.info("Upload dizini oluşturuldu: {}", uploadDir.toAbsolutePath());
                } catch (IOException e) {
                    log.error("Upload dizini oluşturulamadı: {}", uploadDir.toAbsolutePath(), e);
                    Map<String, String> error = new HashMap<>();
                    error.put("error", "Upload dizini oluşturulamadı: " + e.getMessage());
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
                }
            }

            // Check directory permissions
            if (!Files.isWritable(uploadDir)) {
                log.error("Upload dizini yazılabilir değil: {}", uploadDir.toAbsolutePath());
                Map<String, String> error = new HashMap<>();
                error.put("error", "Upload dizini yazılabilir değil: " + uploadDir.toAbsolutePath());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
            }

            // Dosyayı kaydet
            String filename = UUID.randomUUID() + "-" + file.getOriginalFilename();
            Path target = uploadDir.resolve(filename);

            log.info("Dosya kaydediliyor: {}", target.toAbsolutePath());
            file.transferTo(target);
            log.info("Dosya başarıyla kaydedildi: {}", target.toAbsolutePath());

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
            error.put("path", uploadBasePath);
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
            error.put("uploadPath", uploadBasePath);
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

            // Check upload directory with configurable path
            Path uploadDir = Paths.get(uploadBasePath);
            health.put("uploadDirectoryExists", Files.exists(uploadDir));
            health.put("uploadDirectoryWritable", Files.isWritable(uploadDir));
            health.put("uploadPath", uploadBasePath);

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