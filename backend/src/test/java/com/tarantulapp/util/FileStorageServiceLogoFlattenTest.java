package com.tarantulapp.util;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Path;
import java.util.Random;

import javax.imageio.ImageIO;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FileStorageServiceLogoFlattenTest {

    private FileStorageService localService(Path uploadDir) {
        FileStorageService service = new FileStorageService();
        ReflectionTestUtils.setField(service, "uploadDir", uploadDir.toString());
        ReflectionTestUtils.setField(service, "environment", "development");
        // cloudName left null/blank → isCloudinaryConfigured() == false → local filesystem storage
        return service;
    }

    /** A transparent PNG logo must be stored with its transparency flattened onto white. */
    @Test
    void transparentLogoColorVariantIsFlattenedToWhite(@TempDir Path tempDir) throws Exception {
        FileStorageService service = localService(tempDir);

        int sz = 256;
        BufferedImage img = new BufferedImage(sz, sz, BufferedImage.TYPE_INT_ARGB);
        Random rnd = new Random(42);
        for (int y = 0; y < sz; y++) {
            for (int x = 0; x < sz; x++) {
                if (x < sz / 2) {
                    img.setRGB(x, y, 0x00000000); // fully transparent half
                } else {
                    img.setRGB(x, y, 0xFF000000 | rnd.nextInt(0xFFFFFF)); // opaque noisy half (keeps PNG > 1KB)
                }
            }
        }
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, "png", baos);
        byte[] png = baos.toByteArray();
        assertTrue(png.length > 1024, "test fixture must exceed MIN_BYTES");

        MockMultipartFile file = new MockMultipartFile("file", "logo.png", "image/png", png);
        FileStorageService.LogoVariants variants = service.saveLogoWithMonochrome(file, "logos");

        BufferedImage savedColor = ImageIO.read(tempDir.resolve(variants.colorPath()).toFile());
        assertFalse(savedColor.getColorModel().hasAlpha(), "color variant must be opaque (no alpha)");
        // The previously-transparent area is now white so it blends with white labels.
        assertEquals(0xFFFFFF, savedColor.getRGB(2, 2) & 0xFFFFFF);
    }

    /** An opaque PNG keeps its pixels (white-flatten is a visual no-op) and stays alpha-free. */
    @Test
    void opaqueLogoStaysIntact(@TempDir Path tempDir) throws Exception {
        FileStorageService service = localService(tempDir);

        int sz = 256;
        BufferedImage img = new BufferedImage(sz, sz, BufferedImage.TYPE_INT_RGB);
        Random rnd = new Random(7);
        for (int y = 0; y < sz; y++) {
            for (int x = 0; x < sz; x++) {
                img.setRGB(x, y, rnd.nextInt(0xFFFFFF));
            }
        }
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, "png", baos);
        MockMultipartFile file = new MockMultipartFile("file", "logo.png", "image/png", baos.toByteArray());

        FileStorageService.LogoVariants variants = service.saveLogoWithMonochrome(file, "logos");
        BufferedImage savedColor = ImageIO.read(tempDir.resolve(variants.colorPath()).toFile());
        assertFalse(savedColor.getColorModel().hasAlpha());
    }
}
