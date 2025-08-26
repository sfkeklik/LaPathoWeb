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

            // Ensure the target file doesn't already exist
            if (Files.exists(target)) {
                filename = UUID.randomUUID() + "-" + UUID.randomUUID() + "-" + file.getOriginalFilename();
                target = uploadDir.resolve(filename);
            }

            file.transferTo(target);

            // Verify file was written successfully
            if (!Files.exists(target) || Files.size(target) == 0) {
                log.error("Dosya yazılamadı veya boş: {}", target.toAbsolutePath());
                Map<String, String> error = new HashMap<>();
                error.put("error", "Dosya yazma hatası: Dosya kaydedilemedi");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
            }

            log.info("Dosya başarıyla kaydedildi: {} (size: {} bytes)", target.toAbsolutePath(), Files.size(target));

            // ImageEntity oluştur ve kaydet - with better error handling
            ImageDTO dto;
            try {
                dto = imageService.create(file.getOriginalFilename(), target.toString());
                log.info("Image entity oluşturuldu: ID={}", dto.getId());
            } catch (Exception e) {
                log.error("Image entity oluşturma hatası: {}", e.getMessage(), e);
                // Clean up the uploaded file if database save fails
                try {
                    Files.deleteIfExists(target);
                } catch (IOException cleanupError) {
                    log.warn("Cleanup hatası: {}", cleanupError.getMessage());
                }
                Map<String, String> error = new HashMap<>();
                error.put("error", "Veritabanı kaydetme hatası: " + e.getMessage());
                error.put("details", e.getCause() != null ? e.getCause().getMessage() : "Unknown cause");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
            }

            // Async tile üretimi başlat - with error handling
            try {
                imageService.generateTilesAsync(dto.getId());
                log.info("Tile üretimi başlatıldı için ID: {}", dto.getId());
            } catch (Exception e) {
                log.error("Tile üretimi başlatma hatası: {}", e.getMessage(), e);
                // Don't fail the upload if tile generation fails - it can be retried
            }

            return ResponseEntity.ok(dto);

        } catch (IOException e) {
            log.error("IO Hatası:", e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Dosya yazma hatası: " + e.getMessage());
            error.put("path", uploadBasePath);
            error.put("stackTrace", e.getClass().getSimpleName());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);

        } catch (Exception e) {
            log.error("Genel Hata - Upload Debug:", e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Sunucu hatası: " + e.getMessage());
            error.put("type", e.getClass().getSimpleName());
            error.put("details", e.getCause() != null ? e.getCause().getMessage() : "No cause");
            error.put("uploadPath", uploadBasePath);

            // Add stack trace for debugging
            StackTraceElement[] stackTrace = e.getStackTrace();
            if (stackTrace.length > 0) {
                error.put("location", stackTrace[0].toString());
            }

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