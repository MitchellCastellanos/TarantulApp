package com.tarantulapp.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class PartnerOutreachDocumentsTest {

    @Test
    void loadsOnePagersForAllLocales() {
        for (String loc : new String[] { "es", "en", "fr" }) {
            byte[] bytes = PartnerOutreachDocuments.loadOnePagerMarkdown(loc);
            String text = new String(bytes);
            assertTrue(text.contains("TarantulApp"));
            assertTrue(text.contains("Official") || text.contains("Oficial") || text.contains("Officiel"));
        }
    }
}
