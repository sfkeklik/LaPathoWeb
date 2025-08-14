package com.cvlab.spring.LaPatho;

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


@Service
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

        // 1) Reader’ı aç
        ImageReader reader = new ImageReader();
        reader.setId(inputPath);

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

        // 4) Bu tile’ın koordinatları ve boyutu (scaled düzlemde)
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

        // 7) Kaynakları kapat ve geri dön
        reader.close();
        return CompletableFuture.completedFuture(null);
    }






    /**
     * Ana generateTiles metodu artık sadece inputPath ve imageId ister,
     * outputBasePath config’ten gelir.
     */

    public void generateTiles(String inputPath, String imageId) throws Exception {
        ImageReader reader = new ImageReader();
        reader.setId(inputPath);

        int seriesCount = reader.getSeriesCount();

        if (seriesCount > 1) {
            for (int series = 0; series < seriesCount; series++) {
                reader.setSeries(series);
                generateTilesWithDownscaling(reader, imageId, outputBasePath);
            }
        } else {
            reader.setSeries(0);
            generateTilesWithDownscaling(reader, imageId, outputBasePath);
        }

        reader.close();
    }



    private void generateTilesWithDownscaling(ImageReader reader, String imageId, String outputBasePath) throws Exception {
        int originalWidth = reader.getSizeX();
        int originalHeight = reader.getSizeY();
        int pixelType = reader.getPixelType();
        int channels = reader.getSizeC();

        int maxLevel = (int) Math.ceil(Math.log(Math.max(originalWidth, originalHeight) / (double) tileSize) / Math.log(2));

        for (int level = 0; level <= maxLevel; level++) {
            double scale = 1.0 / Math.pow(2, maxLevel - level);
            int scaledWidth = (int) (originalWidth * scale);
            int scaledHeight = (int) (originalHeight * scale);

            Path levelDir = Paths.get(outputBasePath, imageId, String.valueOf(level));
            Files.createDirectories(levelDir);

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
        }
    }

    private BufferedImage createImageFromBytes(byte[] bytes, int width, int height, int pixelType, int channels) {
        int bpp = FormatTools.getBytesPerPixel(pixelType);
        BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        int[] pixelBuffer = new int[width * height];
        boolean interleaved = channels <= 1;

        int planeSize = width * height;
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                int index = y * width + x;
                int offset = interleaved
                        ? index * channels * bpp
                        : index * bpp;
                int r = bytes[offset] & 0xFF;
                int g = bytes[interleaved ? offset + 1 : offset + planeSize] & 0xFF;
                int b = bytes[interleaved ? offset + 2 : offset + 2*planeSize] & 0xFF;
                pixelBuffer[index] = (r << 16) | (g << 8) | b;
            }
        }
        img.setRGB(0, 0, width, height, pixelBuffer, 0, width);
        return img;
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

