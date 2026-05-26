package com.tarantulapp.util;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PartnerOutreachDocumentsTest {

    static boolean pdfsPresent() {
        return Files.isRegularFile(Path.of("src/main/resources/outreach/official-partner-onepager-es.pdf"));
    }

    @Test
    void attachmentFilenamesByLocale() {
        assertEquals("TarantulApp-Official-Partner-es.pdf", PartnerOutreachDocuments.onePagerAttachmentFilename("es"));
        assertEquals("TarantulApp-Official-Partner-en.pdf", PartnerOutreachDocuments.onePagerAttachmentFilename("en"));
        assertEquals("TarantulApp-Official-Partner-fr.pdf", PartnerOutreachDocuments.onePagerAttachmentFilename("fr"));
    }

    @Test
    @EnabledIf("pdfsPresent")
    void loadsPdfForAllLocales() {
        for (String loc : new String[] { "es", "en", "fr" }) {
            byte[] bytes = PartnerOutreachDocuments.loadOnePagerPdf(loc);
            assertTrue(bytes.length > 100, "PDF should not be empty: " + loc);
            assertEquals('%', (char) bytes[0]);
            assertEquals('P', (char) bytes[1]);
            assertEquals('D', (char) bytes[2]);
            assertEquals('F', (char) bytes[3]);
        }
    }
}
