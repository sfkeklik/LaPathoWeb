package com.cvlab.spring.LaPatho;

import loci.formats.FormatException;
import loci.formats.ImageReader;
import loci.formats.FormatTools;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
public class ImageService {
    @Autowired private ImageRepository imageRepository;
    @Autowired private TileService tileService;
    @Autowired private ApplicationEventPublisher events;

    // Desteklenen formatların listesi
    private static final List<String> SUPPORTED_EXTENSIONS = Arrays.asList(
        ".tiff", ".tif", ".bif", ".ome.tiff", ".ome.tif", ".svs", ".ndpi", ".scn", ".mrxs"
    );

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
        log.info("Creating image: name={}, path={}", name, inputPath);

        // Format doğrulama
        if (!isSupportedFormat(inputPath)) {
            log.warn("Desteklenmeyen format: {}", inputPath);
            throw new FormatException("Desteklenmeyen dosya formatı: " + inputPath);
        }

        // 1) Yeni ImageEntity oluşturup temel alanları set et
        ImageEntity img = new ImageEntity();
        img.setName(name);
        img.setPath(inputPath);
        img.setStatus(Status.PENDING);

        // Dosya boyutu ve formatı (uzantıdan) önden tespit et
        try {
            Path p = Paths.get(inputPath);
            if (Files.exists(p)) {
                img.setFileSize(Files.size(p));
            }
        } catch (Exception e) {
            log.debug("Dosya boyutu okunamadı: {}", e.getMessage());
        }
        // Uzantıya göre formatı belirle (BIF gibi vendor formatlarını doğru göster)
        img.setFormat(detectFormatFromPath(inputPath));

        // 2) Bio-Formats ImageReader ile boyutları ve teknik bilgileri oku
        ImageReader reader = new ImageReader();
        try {
            log.info("Bio-Formats ile dosya okunuyor: {}", inputPath);

            // Bio-Formats format bilgisini al
            String bfFormat = reader.getFormat(inputPath);
            log.info("Tespit edilen BF format: {}", bfFormat);

            reader.setId(inputPath);

            // Format'a özgü yapılandırma
            configureReaderForFormat(reader, bfFormat);

            int seriesCount = reader.getSeriesCount();
            log.info("Toplam seri sayısı: {}", seriesCount);

            // BIF dosyaları için WSI serisini bul (3 kanallı olan)
            int wsiSeriesIndex = findWSISeries(reader);
            log.info("WSI serisi bulundu: Series {}", wsiSeriesIndex);

            reader.setSeries(wsiSeriesIndex);
            int width  = reader.getSizeX();
            int height = reader.getSizeY();
            int channels = reader.getSizeC();
            int bitsPerPixel = reader.getBitsPerPixel();
            boolean isRgb = reader.isRGB();

            img.setWidth(width);
            img.setHeight(height);
            img.setChannels(channels);
            img.setBitDepth(bitsPerPixel);
            // Renk uzayı temel çıkarımı
            if (isRgb || channels >= 3) {
                img.setColorSpace("RGB");
            } else if (channels == 1) {
                img.setColorSpace("Grayscale");
            } else {
                img.setColorSpace(channels + "-channel");
            }

            // BF'nin tespit ettiği format bilgisi Ventana/BIF içeriyorsa formatı buna göre güncelle
            if (bfFormat != null) {
                String lf = bfFormat.toLowerCase();
                if (lf.contains("ventana") || lf.contains("bif")) {
                    img.setFormat("BIF");
                } else if (lf.contains("tiff") || lf.contains("tif")) {
                    img.setFormat("TIFF");
                } else if (lf.contains("svs")) {
                    img.setFormat("SVS");
                }
            }

            log.info("WSI Serisi - Seri: {}, Kanallar: {}, BPP: {}, Boyutları: {}x{}",
                    wsiSeriesIndex, channels, bitsPerPixel, width, height);

            // BIF dosyaları için ek bilgileri logla
            if (bfFormat != null && bfFormat.toLowerCase().contains("ventana")) {
                log.info("Ventana BIF dosyası işleniyor - WSI Series: {}", wsiSeriesIndex);
                logBifMetadata(reader);
            }

        } catch (Exception e) {
            log.error("Bio-Formats okuma hatası: {}", e.getMessage(), e);

            // Özel hata mesajları
            if (e.getMessage() != null) {
                if (e.getMessage().contains("Unsupported format")) {
                    throw new FormatException("Desteklenmeyen dosya formatı: " + inputPath);
                } else if (e.getMessage().contains("BIF") || e.getMessage().contains("Ventana")) {
                    log.warn("BIF dosya okuma hatası, varsayılan değerlerle devam ediliyor");
                }
            }

            // Fallback: Default değerler ata (format ve dosya boyutu zaten set edildi)
            img.setWidth(1024);
            img.setHeight(1024);
            log.warn("Default boyutlar atandı: 1024x1024");
        } finally {
            try {
                reader.close();
            } catch (Exception e) {
                log.warn("ImageReader kapatma hatası: {}", e.getMessage());
            }
        }

        // 3) Tile boyutu ve maxLevel hesaplama
        int tileSize = 512;
        img.setTileSize(tileSize);
        int maxLevel = (int) Math.ceil(
                Math.log(Math.max(img.getWidth(), img.getHeight()) / (double) tileSize)
                        / Math.log(2)
        );
        img.setMaxLevel(maxLevel);
        log.info("Tile yapılandırması: tileSize={}, maxLevel={}", tileSize, maxLevel);

        // 4) Veritabanına kaydet
        try {
            imageRepository.save(img);
            log.info("Image veritabanına kaydedildi: ID={}", img.getId());
        } catch (Exception e) {
            log.error("Veritabanı kaydetme hatası: {}", e.getMessage(), e);
            throw new RuntimeException("Veritabanı hatası: " + e.getMessage());
        }

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

    // Uzantıya göre format tespiti (kısa ve kullanıcı dostu)
    private String detectFormatFromPath(String filePath) {
        String lower = filePath == null ? "" : filePath.toLowerCase();
        if (lower.endsWith(".bif")) return "BIF";
        if (lower.endsWith(".ome.tiff") || lower.endsWith(".ome.tif")) return "OME-TIFF";
        if (lower.endsWith(".tiff") || lower.endsWith(".tif")) return "TIFF";
        if (lower.endsWith(".svs")) return "SVS";
        if (lower.endsWith(".ndpi")) return "NDPI";
        if (lower.endsWith(".scn")) return "SCN";
        if (lower.endsWith(".mrxs")) return "MRXS";
        return "Unknown";
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
        log.info("Async tile üretimi başladı: imageId={}, thread={}", imageId, Thread.currentThread().getName());

        try {
            ImageEntity img = imageRepository.findById(imageId).orElseThrow();
            log.info("Image bulundu: {}", img.getName());

            img.setStatus(Status.PROCESSING);
            imageRepository.save(img);
            log.info("Status PROCESSING olarak güncellendi");

            tileService.generateTiles(img.getPath(), img.getId().toString());
            log.info("Tile üretimi tamamlandı");

            img.setStatus(Status.READY);
            imageRepository.save(img);
            log.info("Status READY olarak güncellendi");

            events.publishEvent(new ImageReadyEvent(this, imageId));
            log.info("ImageReadyEvent gönderildi");

        } catch (Exception ex) {
            log.error("Tile üretimi hatası: imageId={}", imageId, ex);
            try {
                ImageEntity img = imageRepository.findById(imageId).orElse(null);
                if (img != null) {
                    img.setStatus(Status.ERROR);
                    imageRepository.save(img);
                    log.info("Status ERROR olarak güncellendi");
                }
            } catch (Exception saveEx) {
                log.error("Status güncelleme hatası: {}", saveEx.getMessage());
            }
        }
    }

    /**
     * Dosya formatının desteklenip desteklenmediğini kontrol eder
     */
    private boolean isSupportedFormat(String filePath) {
        String lowerPath = filePath.toLowerCase();
        return SUPPORTED_EXTENSIONS.stream().anyMatch(lowerPath::endsWith);
    }

    /**
     * Format'a özgü reader yapılandırması
     */
    private void configureReaderForFormat(ImageReader reader, String format) {
        try {
            if (format != null) {
                String lowerFormat = format.toLowerCase();

                // BIF/Ventana dosyaları için özel ayarlar
                if (lowerFormat.contains("ventana") || lowerFormat.contains("bif")) {
                    log.info("Ventana BIF format için reader yapılandırılıyor");
                    // BIF dosyaları için metadata seçenekleri
                    reader.setMetadataFiltered(true);
                    reader.setOriginalMetadataPopulated(true);
                }

                // TIFF dosyaları için optimizasyon
                else if (lowerFormat.contains("tiff") || lowerFormat.contains("tif")) {
                    log.info("TIFF format için reader yapılandırılıyor");
                    reader.setNormalized(false);
                }
            }
        } catch (Exception e) {
            log.warn("Reader yapılandırma hatası: {}", e.getMessage());
        }
    }

    /**
     * BIF dosyaları için metadata bilgilerini logla
     */
    private void logBifMetadata(ImageReader reader) {
        try {
            log.info("BIF Metadata:");
            log.info("  - Pixel Type: {}", FormatTools.getPixelTypeString(reader.getPixelType()));
            log.info("  - Channel Count: {}", reader.getSizeC());
            log.info("  - Z-Stack Count: {}", reader.getSizeZ());
            log.info("  - Time Points: {}", reader.getSizeT());
            log.info("  - Bits Per Pixel: {}", reader.getBitsPerPixel());
            log.info("  - Is RGB: {}", reader.isRGB());
            log.info("  - Is Interleaved: {}", reader.isInterleaved());

            // Metadata tablosu
            java.util.Hashtable<String, Object> metadata = reader.getGlobalMetadata();
            if (metadata != null && !metadata.isEmpty()) {
                log.info("  - Global Metadata Count: {}", metadata.size());
                // Sadece önemli metadata'ları logla
                metadata.entrySet().stream()
                    .filter(entry -> entry.getKey().toLowerCase().contains("vendor") ||
                                   entry.getKey().toLowerCase().contains("model") ||
                                   entry.getKey().toLowerCase().contains("objective"))
                    .forEach(entry -> log.info("    {}: {}", entry.getKey(), entry.getValue()));
            }
        } catch (Exception e) {
            log.debug("BIF metadata okuma hatası: {}", e.getMessage());
        }
    }

    /**
     * BIF dosyalarında WSI serisini bulur (3 kanallı olanı)
     * Maske serilerini atlar (1 kanallı olanları)
     */
    private int findWSISeries(ImageReader reader) throws FormatException, IOException {
        int seriesCount = reader.getSeriesCount();

        for (int series = 0; series < seriesCount; series++) {
            reader.setSeries(series);
            int channels = reader.getSizeC();
            int width = reader.getSizeX();
            int height = reader.getSizeY();

            log.debug("Seri {} analizi: Kanallar={}, Boyutlar={}x{}", series, channels, width, height);

            // WSI serisi genellikle 3 kanallı (RGB) ve büyük boyutludur
            if (channels == 3 && width > 1000 && height > 1000) {
                log.info("WSI serisi tespit edildi: Series {}, Kanallar: {}, Boyutlar: {}x{}",
                        series, channels, width, height);
                return series;
            }
        }

        // Eğer 3 kanallı bulunamazsa, en büyük boyutlu seriyi al
        int bestSeries = 0;
        long maxPixels = 0;

        for (int series = 0; series < seriesCount; series++) {
            reader.setSeries(series);
            int channels = reader.getSizeC();
            long pixels = (long) reader.getSizeX() * reader.getSizeY();

            if (pixels > maxPixels) {
                maxPixels = pixels;
                bestSeries = series;
            }
        }

        reader.setSeries(bestSeries);
        log.info("En büyük seri seçildi: Series {}, Kanallar: {}, Boyutlar: {}x{}",
                bestSeries, reader.getSizeC(), reader.getSizeX(), reader.getSizeY());

        return bestSeries;
    }
}
