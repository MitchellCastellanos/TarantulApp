package com.tarantulapp.util;

import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/** Classpath one-pagers for official partner outreach emails. */
public final class PartnerOutreachDocuments {

    private PartnerOutreachDocuments() {
    }

    public static byte[] loadOnePagerMarkdown(String locale) {
        String loc = BetaMailBodies.normalizeLocale(locale);
        String path = switch (loc) {
            case "fr" -> "outreach/official-partner-onepager-fr.md";
            case "es" -> "outreach/official-partner-onepager-es.md";
            default -> "outreach/official-partner-onepager-en.md";
        };
        try {
            return new ClassPathResource(path).getContentAsString(StandardCharsets.UTF_8).getBytes(StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException("Missing outreach one-pager: " + path, e);
        }
    }

    public static String onePagerAttachmentFilename(String locale) {
        return "TarantulApp-Official-Partner-" + BetaMailBodies.normalizeLocale(locale) + ".md";
    }
}
