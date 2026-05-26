package com.tarantulapp.util;

import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.InputStream;

/** Classpath one-pager PDFs for official partner outreach emails. */
public final class PartnerOutreachDocuments {

    private PartnerOutreachDocuments() {
    }

    public static byte[] loadOnePagerPdf(String locale) {
        String loc = BetaMailBodies.normalizeLocale(locale);
        String path = switch (loc) {
            case "fr" -> "outreach/official-partner-onepager-fr.pdf";
            case "es" -> "outreach/official-partner-onepager-es.pdf";
            default -> "outreach/official-partner-onepager-en.pdf";
        };
        try (InputStream in = new ClassPathResource(path).getInputStream()) {
            return in.readAllBytes();
        } catch (IOException e) {
            throw new IllegalStateException("Missing outreach one-pager PDF: " + path, e);
        }
    }

    public static String onePagerAttachmentFilename(String locale) {
        return "TarantulApp-Official-Partner-" + BetaMailBodies.normalizeLocale(locale) + ".pdf";
    }

    public static String onePagerContentType() {
        return "application/pdf";
    }
}
