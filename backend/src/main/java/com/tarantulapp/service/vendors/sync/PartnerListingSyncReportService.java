package com.tarantulapp.service.vendors.sync;

import com.tarantulapp.entity.PartnerListingSyncRun;
import com.tarantulapp.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class PartnerListingSyncReportService {

    private static final Logger log = LoggerFactory.getLogger(PartnerListingSyncReportService.class);
    private static final DateTimeFormatter RUN_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm 'UTC'")
            .withZone(ZoneOffset.UTC);
    private static final int MAX_LINES_PER_SECTION = 25;

    private final EmailService emailService;

    @Value("${app.partner-sync.report-enabled:true}")
    private boolean reportEnabled;

    @Value("${app.base-url:http://localhost:5173}")
    private String baseUrl;

    public PartnerListingSyncReportService(EmailService emailService) {
        this.emailService = emailService;
    }

    public void sendIfNotable(List<PartnerListingSyncVendorReport> vendorReports) {
        if (!reportEnabled || vendorReports == null || vendorReports.isEmpty()) {
            return;
        }
        List<PartnerListingSyncVendorReport> notable = vendorReports.stream()
                .filter(PartnerListingSyncVendorReport::hasNotableChanges)
                .toList();
        if (notable.isEmpty()) {
            log.debug("Partner sync report skipped: no notable changes across {} vendors", vendorReports.size());
            return;
        }
        String body = buildBody(notable);
        String subject = "[TarantulApp] Partner sync — cambios en "
                + notable.size()
                + (notable.size() == 1 ? " vendedor" : " vendedores");
        emailService.sendAdminPartnerSyncReport(subject, body);
    }

    private String buildBody(List<PartnerListingSyncVendorReport> reports) {
        StringBuilder body = new StringBuilder();
        body.append("Partner inventory sync — ").append(RUN_FMT.format(Instant.now())).append('\n');
        body.append("Vendedores con cambios: ").append(reports.size()).append("\n\n");
        for (PartnerListingSyncVendorReport report : reports) {
            appendVendorSection(body, report);
            body.append('\n');
        }
        String adminUrl = (baseUrl == null || baseUrl.isBlank() ? "http://localhost:5173" : baseUrl.trim())
                + "/admin/marketplace";
        body.append("Admin: ").append(adminUrl).append(" (Partner sync runs)\n");
        return body.toString();
    }

    private void appendVendorSection(StringBuilder body, PartnerListingSyncVendorReport report) {
        body.append("=== ").append(safe(report.vendorName()))
                .append(" (").append(safe(report.vendorSlug())).append(") ===\n");
        if (report.syncError() != null && !report.syncError().isBlank()) {
            body.append("ERROR: ").append(report.syncError()).append('\n');
            return;
        }
        PartnerListingSyncRun run = report.run();
        if (run != null) {
            body.append("Estado: ").append(run.getStatus())
                    .append(" | Procesados: ").append(run.getProcessedCount())
                    .append(" | Upserted: ").append(run.getUpsertedCount())
                    .append(" | Stale: ").append(run.getStaleCount())
                    .append(" | Fallidos: ").append(run.getFailedCount())
                    .append('\n');
            if (run.getErrorMessage() != null && !run.getErrorMessage().isBlank()) {
                body.append("Detalle error: ").append(run.getErrorMessage()).append('\n');
            }
        }
        appendSection(body, "+ NUEVOS", report.newItems());
        appendSection(body, "~ ACTUALIZADOS", report.updatedItems());
        appendSection(body, "- REMOVIDOS (stale)", report.removedItems());
        if (report.failedCount() > 0) {
            body.append("Items con error en este run: ").append(report.failedCount()).append('\n');
        }
        if (report.skippedCount() > 0) {
            body.append("Items omitidos (reglas de catalogo): ").append(report.skippedCount()).append('\n');
        }
    }

    private void appendSection(StringBuilder body, String heading, List<PartnerListingSyncChangeLine> lines) {
        if (lines == null || lines.isEmpty()) {
            return;
        }
        body.append('\n').append(heading).append(" (").append(lines.size()).append(")\n");
        int shown = 0;
        for (PartnerListingSyncChangeLine line : lines) {
            if (shown >= MAX_LINES_PER_SECTION) {
                body.append("  ... y ").append(lines.size() - shown).append(" mas\n");
                break;
            }
            body.append("  • ").append(safe(line.title()));
            String price = formatLinePrice(line.detail());
            if (price != null) {
                body.append(" — ").append(price);
            } else if (line.detail() != null && !line.detail().isBlank()) {
                body.append(" — ").append(line.detail());
            }
            body.append('\n');
            shown++;
        }
    }

    private String formatLinePrice(String detail) {
        if (detail == null || detail.isBlank()) {
            return null;
        }
        return detail.startsWith("precio ") ? detail.substring("precio ".length()) : null;
    }

    static PartnerListingSyncChangeLine toLine(PartnerListingUpsertResult result) {
        String title = result.listing().getTitle();
        String externalId = result.listing().getExternalId();
        String detail = result.changeDetail();
        if (result.change() == PartnerListingUpsertChange.CREATED || result.change() == PartnerListingUpsertChange.RESTORED) {
            BigDecimal price = result.listing().getPriceAmount();
            String currency = result.listing().getPriceAmount() == null ? null : result.listing().getCurrency();
            if (price != null) {
                detail = (currency == null ? "USD" : currency) + " " + price;
            } else if (result.change() == PartnerListingUpsertChange.RESTORED) {
                detail = "reactivado";
            }
        }
        return new PartnerListingSyncChangeLine(title, externalId, detail);
    }

    static PartnerListingSyncChangeLine staleLine(StaleListingRef ref) {
        return new PartnerListingSyncChangeLine(ref.title(), ref.externalId(), "ya no en feed");
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "—" : value.trim();
    }
}
