package com.cvlab.spring.LaPatho;

import loci.formats.FormatException;
import loci.formats.FormatTools;
import loci.formats.ImageReader;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.CompletableFuture;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class TileService {


    // application.properties’den okunacak
    @Value("${tile.output-base-path}")
    private String outputBasePath;

    @Value("${tile.block-size:4096}")
    private int blockSize;

    @Value("${tile.size:512}")
    private int tileSize;


    // TODO: tilegenerate ne kadar sürüyor database'e kaydet.

    /**
     * Tek bir tile parçasını arka planda üretir.
     *
     * @param inputPath  Orijinal WSI dosya yolu
     * @param imageId    Görüntü için benzersiz ID (tile klasörü adı)
     * @param level      Zoom seviyesi (0=en düşük, maxLevel=orijinal)
     * @param tileX      X indeksi (0-based)
     * @param tileY      Y indeksi (0-based)
     */
    @Async("taskExecutor")
    public CompletableFuture<Void> generateTilesChunk(String inputPath, String imageId, int level, int tileX, int tileY) throws Exception {

        // 1) Reader'ı aç
        ImageReader reader = new ImageReader();
        try {
            log.debug("Tile üretimi başladı: imageId={}, level={}, tileX={}, tileY={}", imageId, level, tileX, tileY);

            // Format kontrolü
            String format = reader.getFormat(inputPath);
            log.debug("Dosya formatı: {}", format);

            reader.setId(inputPath);

            // BIF dosyaları için özel yapılandırma
            if (format != null && (format.toLowerCase().contains("ventana") || format.toLowerCase().contains("bif"))) {
                configureBifReader(reader);
            }

            // 2) Metadata
            reader.setSeries(0);
            int originalWidth  = reader.getSizeX();
            int originalHeight = reader.getSizeY();
            int pixelType      = reader.getPixelType();
            int channels       = reader.getSizeC();

            // 3) Hesaplamalar
            int maxLevel = (int) Math.ceil(
                    Math.log(Math.max(originalWidth, originalHeight) / (double) tileSize)
                            / Math.log(2)
            );
            double scale = 1.0 / Math.pow(2, maxLevel - level);

            int scaledWidth  = (int) (originalWidth  * scale);
            int scaledHeight = (int) (originalHeight * scale);

            // 4) Bu tile'ın koordinatları ve boyutu (scaled düzlemde)
            int x0 = tileX * tileSize;
            int y0 = tileY * tileSize;
            int tw = Math.min(tileSize, scaledWidth  - x0);
            int th = Math.min(tileSize, scaledHeight - y0);

            // 5) Orijinalden parçayı oku ve küçült
            int srcX = (int) (x0 / scale);
            int srcY = (int) (y0 / scale);
            int srcW = (int) (tw  / scale);
            int srcH = (int) (th  / scale);

            BufferedImage tileImage = readRegionInBlocks(
                    reader, srcX, srcY, srcW, srcH,
                    tw, th, pixelType, channels
            );

            // 6) Dosyaya yaz
            Path levelDir = Paths.get(outputBasePath, imageId, String.valueOf(level));
            Files.createDirectories(levelDir);
            String filename = String.format("tile_%d_%d.jpg", tileX, tileY);
            ImageIO.write(tileImage, "JPEG", levelDir.resolve(filename).toFile());

            log.debug("Tile başarıyla oluşturuldu: {}", filename);

        } catch (Exception e) {
            log.error("Tile üretim hatası: imageId={}, level={}, tileX={}, tileY={}, error={}",
                     imageId, level, tileX, tileY, e.getMessage(), e);
            throw e;
        } finally {
            // 7) Kaynakları kapat ve geri dön
            try {
                reader.close();
            } catch (Exception e) {
                log.warn("Reader kapatma hatası: {}", e.getMessage());
            }
        }

        return CompletableFuture.completedFuture(null);
    }






    /**
     * Ana generateTiles metodu artık sadece inputPath ve imageId ister,
     * outputBasePath config’ten gelir.
     */

    public void generateTiles(String inputPath, String imageId) throws Exception {
        ImageReader reader = new ImageReader();
        try {
            log.info("Tile üretimi başlıyor: inputPath={}, imageId={}", inputPath, imageId);

            // Format kontrolü ve yapılandırma
            String format = reader.getFormat(inputPath);
            log.info("Tespit edilen format: {}", format);

            reader.setId(inputPath);

            // BIF dosyaları için özel yapılandırma
            if (format != null && (format.toLowerCase().contains("ventana") || format.toLowerCase().contains("bif"))) {
                configureBifReader(reader);
                log.info("BIF format için özel yapılandırma uygulandı");
            }

            int seriesCount = reader.getSeriesCount();
            log.info("Toplam seri sayısı: {}", seriesCount);

            // BIF dosyaları için sadece WSI serisini işle
            if (format != null && format.toLowerCase().contains("ventana")) {
                int wsiSeriesIndex = findWSISeriesInTileService(reader);
                reader.setSeries(wsiSeriesIndex);
                log.info("Sadece WSI serisi işlenecek: Series {}", wsiSeriesIndex);
                generateTilesWithDownscaling(reader, imageId, outputBasePath, format);
            } else {
                // Diğer formatlar için tüm serileri işle
                if (seriesCount > 1) {
                    for (int series = 0; series < seriesCount; series++) {
                        reader.setSeries(series);
                        log.info("Seri {} işleniyor", series);
                        generateTilesWithDownscaling(reader, imageId, outputBasePath, format);
                    }
                } else {
                    reader.setSeries(0);
                    generateTilesWithDownscaling(reader, imageId, outputBasePath, format);
                }
            }

            log.info("Tile üretimi tamamlandı: imageId={}", imageId);

        } catch (Exception e) {
            log.error("Tile üretimi genel hatası: inputPath={}, imageId={}, error={}",
                     inputPath, imageId, e.getMessage(), e);
            throw e;
        } finally {
            try {
                reader.close();
            } catch (Exception e) {
                log.warn("Reader kapatma hatası: {}", e.getMessage());
            }
        }
    }

    /**
     * BIF dosyalarında WSI serisini bulur (3 kanallı olanı)
     * Maske serilerini atlar (1 kanallı olanları)
     */
    private int findWSISeriesInTileService(ImageReader reader) throws Exception {
        int seriesCount = reader.getSeriesCount();

        for (int series = 0; series < seriesCount; series++) {
            reader.setSeries(series);
            int channels = reader.getSizeC();
            int width = reader.getSizeX();
            int height = reader.getSizeY();

            log.debug("Seri {} analizi: Kanallar={}, Boyutlar={}x{}", series, channels, width, height);

            // WSI serisi: 3 kanallı (RGB) ve büyük boyutlu
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

    private void generateTilesWithDownscaling(ImageReader reader, String imageId, String outputBasePath, String format) throws Exception {
        int originalWidth = reader.getSizeX();
        int originalHeight = reader.getSizeY();
        int pixelType = reader.getPixelType();
        int channels = reader.getSizeC();

        log.info("Tile üretimi başlıyor - Format: {}, Boyutlar: {}x{}", format, originalWidth, originalHeight);

        int maxLevel = (int) Math.ceil(Math.log(Math.max(originalWidth, originalHeight) / (double) tileSize) / Math.log(2));

        for (int level = 0; level <= maxLevel; level++) {
            double scale = 1.0 / Math.pow(2, maxLevel - level);
            int scaledWidth = (int) (originalWidth * scale);
            int scaledHeight = (int) (originalHeight * scale);

            Path levelDir = Paths.get(outputBasePath, imageId, String.valueOf(level));
            Files.createDirectories(levelDir);

            log.debug("Level {} işleniyor - Ölçekli boyutlar: {}x{}", level, scaledWidth, scaledHeight);

            for (int y = 0; y < scaledHeight; y += tileSize) {
                for (int x = 0; x < scaledWidth; x += tileSize) {
                    int tileWidth = Math.min(tileSize, scaledWidth - x);
                    int tileHeight = Math.min(tileSize, scaledHeight - y);

                    int srcX = (int) (x / scale);
                    int srcY = (int) (y / scale);
                    int srcWidth = (int) (tileWidth / scale);
                    int srcHeight = (int) (tileHeight / scale);

                    BufferedImage scaledTile = readRegionInBlocks(
                            reader, srcX, srcY, srcWidth, srcHeight,
                            tileWidth, tileHeight, pixelType, channels
                    );

                    String filename = String.format("tile_%d_%d.jpg", x / tileSize, y / tileSize);
                    ImageIO.write(scaledTile, "JPEG", levelDir.resolve(filename).toFile());
                }
            }
            log.debug("Level {} tamamlandı", level);
        }

        log.info("Tüm tile seviyeleri tamamlandı - Format: {}", format);
    }

    /**
     * BIF dosyaları için özel reader yapılandırması
     */
    private void configureBifReader(ImageReader reader) {
        try {
            log.info("BIF reader yapılandırması uygulanıyor");
            reader.setMetadataFiltered(true);
            reader.setOriginalMetadataPopulated(true);
            reader.setNormalized(false);
            reader.setGroupFiles(false); // BIF dosyaları için grup dosya desteğini kapat
        } catch (Exception e) {
            log.warn("BIF reader yapılandırma hatası: {}", e.getMessage());
        }
    }

    private BufferedImage createImageFromBytes(byte[] bytes, int width, int height, int pixelType, int channels) {
        try {
            int bpp = FormatTools.getBytesPerPixel(pixelType);
            BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
            int[] pixelBuffer = new int[width * height];

            // BIF dosyaları için güvenli pixel okuma
            int expectedSize = width * height * channels * bpp;
            if (bytes.length < expectedSize) {
                log.warn("Byte array boyutu beklenen değerden küçük: {} < {}, varsayılan renk kullanılıyor",
                        bytes.length, expectedSize);
                // Varsayılan gri renk
                for (int i = 0; i < pixelBuffer.length; i++) {
                    pixelBuffer[i] = 0x808080; // Gri renk
                }
                img.setRGB(0, 0, width, height, pixelBuffer, 0, width);
                return img;
            }

            // BIF dosyaları genellikle interleaved değildir (planar format)
            boolean interleaved = channels <= 1;
            boolean isRGB = channels >= 3;

            int planeSize = width * height * bpp;

            for (int y = 0; y < height; y++) {
                for (int x = 0; x < width; x++) {
                    int index = y * width + x;
                    int r = 0, g = 0, b = 0;

                    try {
                        if (channels == 1) {
                            // Grayscale - tek kanal
                            int offset = index * bpp;
                            if (offset < bytes.length) {
                                int gray = bytes[offset] & 0xFF;
                                if (bpp > 1 && offset + 1 < bytes.length) {
                                    gray = ((bytes[offset + 1] & 0xFF) << 8) | gray;
                                    gray = gray >> 8; // 16-bit'i 8-bit'e çevir
                                }
                                r = g = b = gray;
                            }
                        } else if (isRGB) {
                            // RGB channels
                            if (interleaved) {
                                // RGBRGBRGB... (nadiren kullanılır BIF'de)
                                int offset = index * channels * bpp;
                                if (offset + (channels * bpp) <= bytes.length) {
                                    r = bytes[offset] & 0xFF;
                                    g = (channels > 1 && offset + bpp < bytes.length) ? bytes[offset + bpp] & 0xFF : r;
                                    b = (channels > 2 && offset + 2 * bpp < bytes.length) ? bytes[offset + 2 * bpp] & 0xFF : r;
                                }
                            } else {
                                // RRR...GGG...BBB... (BIF dosyalarında yaygın)
                                int offset = index * bpp;
                                if (offset < bytes.length) {
                                    r = bytes[offset] & 0xFF;
                                    // Güvenli kanal erişimi
                                    if (channels > 1 && offset + planeSize < bytes.length) {
                                        g = bytes[offset + planeSize] & 0xFF;
                                    } else {
                                        g = r; // Fallback
                                    }

                                    if (channels > 2 && offset + 2 * planeSize < bytes.length) {
                                        b = bytes[offset + 2 * planeSize] & 0xFF;
                                    } else {
                                        b = r; // Fallback
                                    }
                                }
                            }
                        } else {
                            // Fallback - tek kanal olarak işle
                            int offset = index * bpp;
                            if (offset < bytes.length) {
                                int gray = bytes[offset] & 0xFF;
                                r = g = b = gray;
                            }
                        }

                        pixelBuffer[index] = (r << 16) | (g << 8) | b;

                    } catch (Exception e) {
                        // Hata durumunda varsayılan renk
                        pixelBuffer[index] = 0x808080;
                    }
                }
            }

            img.setRGB(0, 0, width, height, pixelBuffer, 0, width);
            return img;

        } catch (Exception e) {
            log.error("createImageFromBytes hatası: width={}, height={}, channels={}, bytesLength={}",
                     width, height, channels, bytes.length, e);

            // Fallback: Boş görüntü oluştur
            BufferedImage fallbackImg = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
            int[] fallbackPixels = new int[width * height];
            for (int i = 0; i < fallbackPixels.length; i++) {
                fallbackPixels[i] = 0x808080; // Gri renk
            }
            fallbackImg.setRGB(0, 0, width, height, fallbackPixels, 0, width);
            return fallbackImg;
        }
    }

    private BufferedImage readRegionInBlocks(
            ImageReader reader,
            int startX, int startY,
            int srcWidth, int srcHeight,
            int targetWidth, int targetHeight,
            int pixelType, int channels
    ) throws Exception {
        BufferedImage result = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
        double xScale = (double) targetWidth / srcWidth;
        double yScale = (double) targetHeight / srcHeight;

        for (int y = 0; y < srcHeight; y += blockSize) {
            for (int x = 0; x < srcWidth; x += blockSize) {
                int blockWidth = Math.min(blockSize, srcWidth - x);
                int blockHeight = Math.min(blockSize, srcHeight - y);
                int fileX = startX + x;
                int fileY = startY + y;

                byte[] blockBytes = reader.openBytes(0, fileX, fileY, blockWidth, blockHeight);
                BufferedImage blockImage = createImageFromBytes(blockBytes, blockWidth, blockHeight, pixelType, channels);

                int destX = (int) (x * xScale);
                int destY = (int) (y * yScale);
                int destW = (int) (blockWidth * xScale);
                int destH = (int) (blockHeight * yScale);

                result.getGraphics().drawImage(blockImage, destX, destY, destW, destH, null);
            }
        }
        return result;
    }
}
