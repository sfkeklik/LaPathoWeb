package com.cvlab.spring.LaPatho;


import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class LaPathoApplication {


	public static void main(String[] args) {
		SpringApplication.run(LaPathoApplication.class, args);
	}

}

/*
@GetMapping("/helloworld")
	public String sayHello(){

		return "Hello World";
	}

	@GetMapping("/openslide")
	public String openWholeSlideImage() throws IOException{
		File wsiFile = new File("C:\\Users\\user\\Desktop\\openslide\\wsi\\Ventana-1.bif");
        OpenSlide wsi = new OpenSlide(wsiFile);

        return "level count :" + wsi.getLevelCount();
	}

	@GetMapping("/bioformats")
	public String openWholeSlideImageWithBioFormats() throws IOException, FormatException {

		ImageReader reader = new ImageReader();
		reader.setId("C:\\Users\\user\\Desktop\\openslide\\wsi\\Ventana-1.bif");
		int numSeries = reader.getSeriesCount();
		System.out.println("Number of series: " + numSeries);
		reader.close();
		return "series count :" +numSeries;
	}

	@GetMapping("/maketiles")
	public String makeTiles(){
		String inputFile = "C:\\Users\\user\\Desktop\\openslide\\wsi\\Philips-1.tiff";
		String outputDir = "C:\\Users\\user\\Desktop\\openslide\\wsi\\tiles\\";
		int tileSize = 1024; // Tile boyutu (512x512)

		try {
			ImageReader reader = new ImageReader();
			reader.setId(inputFile);

			int width = reader.getSizeX();
			int height = reader.getSizeY();
			int pixelType = reader.getPixelType();
			int bpp = FormatTools.getBytesPerPixel(pixelType);
			int channels = reader.getSizeC();

			System.out.printf(
					"Image: %dx%d, PixelType: %s, %d channels, %d bpp%n",
					width, height, FormatTools.getPixelTypeString(pixelType), channels, bpp * 8
			);

			for (int y = 0; y < height; y += tileSize) {
				for (int x = 0; x < width; x += tileSize) {
					int tileWidth = Math.min(tileSize, width - x);
					int tileHeight = Math.min(tileSize, height - y);

					// Ham piksel verisini oku
					byte[] tileBytes = reader.openBytes(0, x, y, tileWidth, tileHeight);

					// BufferedImage oluştur
					BufferedImage tileImage = createImageFromBytes(
							tileBytes, tileWidth, tileHeight, pixelType, channels
					);

					// Kaydet
					String outputPath = outputDir + String.format("tile_%05d_%05d.tif", x, y);
					ImageIO.write(tileImage, "TIFF", new File(outputPath));
					System.out.println("Saved: " + outputPath);
				}
			}

			reader.close();
		} catch (Exception e) {
			e.printStackTrace();
		}
        return inputFile;
    }

	private static BufferedImage createImageFromBytes(
			byte[] bytes, int width, int height, int pixelType, int channels
	) {
		int bpp = FormatTools.getBytesPerPixel(pixelType);
		int imageType = BufferedImage.TYPE_INT_RGB;
		BufferedImage img = new BufferedImage(width, height, imageType);
		int[] pixelBuffer = new int[width * height];

		boolean interleaved = true; // varsayılan olarak true

		if (channels > 1) {
			// Eğer interleaved değilse, veriyi planar olarak çöz
			interleaved = false; // bunu test edip istersen reader.isInterleaved() ile değiştir
		}

		for (int y = 0; y < height; y++) {
			for (int x = 0; x < width; x++) {
				int index = y * width + x;
				int offset;

				int r, g, b;

				if (interleaved) {
					offset = index * channels * bpp;
					r = bytes[offset] & 0xFF;
					g = (channels > 1) ? bytes[offset + 1] & 0xFF : r;
					b = (channels > 2) ? bytes[offset + 2] & 0xFF : g;
				} else {
					int planeSize = width * height;
					offset = index * bpp;
					r = bytes[offset] & 0xFF;
					g = (channels > 1) ? bytes[offset + planeSize] & 0xFF : r;
					b = (channels > 2) ? bytes[offset + 2 * planeSize] & 0xFF : g;
				}

				pixelBuffer[index] = (r << 16) | (g << 8) | b;
			}
		}

		img.setRGB(0, 0, width, height, pixelBuffer, 0, width);
		return img;
	}

	private static int getBufferedImageType(int pixelType, int channels) {
		if (channels == 1) return BufferedImage.TYPE_BYTE_GRAY;
		if (FormatTools.isFloatingPoint(pixelType)) return BufferedImage.TYPE_INT_RGB;
		return BufferedImage.TYPE_INT_RGB;
	}
*/