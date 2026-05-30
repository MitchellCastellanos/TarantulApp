package com.tarantulapp.util;

import java.util.Locale;
import java.util.Map;

/**
 * Privacy-friendly, self-contained geo resolution. We do NOT store IPs or call any
 * external GeoIP service. When an edge/CDN geo header is present we prefer it; otherwise
 * we derive an approximate country (and a representative city) from the client's IANA
 * timezone — e.g. {@code America/Mexico_City} → Mexico / "Mexico City".
 *
 * The zone→country table covers the countries our users realistically come from; unknown
 * zones still yield a humanized city from the zone's last path segment.
 */
public final class TimezoneGeo {

    private TimezoneGeo() {}

    /** IANA timezone → ISO 3166-1 alpha-2 country code (curated, common zones). */
    private static final Map<String, String> ZONE_COUNTRY = Map.ofEntries(
            // North & Central America
            Map.entry("America/New_York", "US"),
            Map.entry("America/Detroit", "US"),
            Map.entry("America/Chicago", "US"),
            Map.entry("America/Denver", "US"),
            Map.entry("America/Phoenix", "US"),
            Map.entry("America/Los_Angeles", "US"),
            Map.entry("America/Anchorage", "US"),
            Map.entry("America/Adak", "US"),
            Map.entry("Pacific/Honolulu", "US"),
            Map.entry("America/Boise", "US"),
            Map.entry("America/Indiana/Indianapolis", "US"),
            Map.entry("America/Toronto", "CA"),
            Map.entry("America/Vancouver", "CA"),
            Map.entry("America/Edmonton", "CA"),
            Map.entry("America/Winnipeg", "CA"),
            Map.entry("America/Halifax", "CA"),
            Map.entry("America/St_Johns", "CA"),
            Map.entry("America/Mexico_City", "MX"),
            Map.entry("America/Tijuana", "MX"),
            Map.entry("America/Monterrey", "MX"),
            Map.entry("America/Merida", "MX"),
            Map.entry("America/Cancun", "MX"),
            Map.entry("America/Chihuahua", "MX"),
            Map.entry("America/Guatemala", "GT"),
            Map.entry("America/Costa_Rica", "CR"),
            Map.entry("America/Panama", "PA"),
            Map.entry("America/El_Salvador", "SV"),
            Map.entry("America/Tegucigalpa", "HN"),
            Map.entry("America/Managua", "NI"),
            // South America
            Map.entry("America/Bogota", "CO"),
            Map.entry("America/Lima", "PE"),
            Map.entry("America/Caracas", "VE"),
            Map.entry("America/Santiago", "CL"),
            Map.entry("America/Argentina/Buenos_Aires", "AR"),
            Map.entry("America/Sao_Paulo", "BR"),
            Map.entry("America/Bahia", "BR"),
            Map.entry("America/Fortaleza", "BR"),
            Map.entry("America/Manaus", "BR"),
            Map.entry("America/Montevideo", "UY"),
            Map.entry("America/Asuncion", "PY"),
            Map.entry("America/La_Paz", "BO"),
            Map.entry("America/Guayaquil", "EC"),
            // Europe
            Map.entry("Europe/London", "GB"),
            Map.entry("Europe/Dublin", "IE"),
            Map.entry("Europe/Lisbon", "PT"),
            Map.entry("Europe/Madrid", "ES"),
            Map.entry("Atlantic/Canary", "ES"),
            Map.entry("Europe/Paris", "FR"),
            Map.entry("Europe/Brussels", "BE"),
            Map.entry("Europe/Amsterdam", "NL"),
            Map.entry("Europe/Berlin", "DE"),
            Map.entry("Europe/Zurich", "CH"),
            Map.entry("Europe/Vienna", "AT"),
            Map.entry("Europe/Rome", "IT"),
            Map.entry("Europe/Warsaw", "PL"),
            Map.entry("Europe/Prague", "CZ"),
            Map.entry("Europe/Stockholm", "SE"),
            Map.entry("Europe/Oslo", "NO"),
            Map.entry("Europe/Copenhagen", "DK"),
            Map.entry("Europe/Helsinki", "FI"),
            Map.entry("Europe/Athens", "GR"),
            Map.entry("Europe/Bucharest", "RO"),
            Map.entry("Europe/Budapest", "HU"),
            Map.entry("Europe/Kyiv", "UA"),
            Map.entry("Europe/Kiev", "UA"),
            Map.entry("Europe/Moscow", "RU"),
            Map.entry("Europe/Istanbul", "TR"),
            // Asia, Middle East, Oceania, Africa (common)
            Map.entry("Asia/Jerusalem", "IL"),
            Map.entry("Asia/Dubai", "AE"),
            Map.entry("Asia/Karachi", "PK"),
            Map.entry("Asia/Kolkata", "IN"),
            Map.entry("Asia/Calcutta", "IN"),
            Map.entry("Asia/Bangkok", "TH"),
            Map.entry("Asia/Singapore", "SG"),
            Map.entry("Asia/Jakarta", "ID"),
            Map.entry("Asia/Manila", "PH"),
            Map.entry("Asia/Hong_Kong", "HK"),
            Map.entry("Asia/Shanghai", "CN"),
            Map.entry("Asia/Tokyo", "JP"),
            Map.entry("Asia/Seoul", "KR"),
            Map.entry("Australia/Sydney", "AU"),
            Map.entry("Australia/Melbourne", "AU"),
            Map.entry("Australia/Perth", "AU"),
            Map.entry("Pacific/Auckland", "NZ"),
            Map.entry("Africa/Johannesburg", "ZA"),
            Map.entry("Africa/Cairo", "EG"),
            Map.entry("Africa/Lagos", "NG"),
            Map.entry("Africa/Nairobi", "KE"),
            Map.entry("Africa/Casablanca", "MA")
    );

    /** ISO 3166-1 alpha-2 → English country name (covers codes we emit + common edge-header codes). */
    private static final Map<String, String> COUNTRY_NAMES = Map.ofEntries(
            Map.entry("US", "United States"), Map.entry("CA", "Canada"), Map.entry("MX", "Mexico"),
            Map.entry("GT", "Guatemala"), Map.entry("CR", "Costa Rica"), Map.entry("PA", "Panama"),
            Map.entry("SV", "El Salvador"), Map.entry("HN", "Honduras"), Map.entry("NI", "Nicaragua"),
            Map.entry("CO", "Colombia"), Map.entry("PE", "Peru"), Map.entry("VE", "Venezuela"),
            Map.entry("CL", "Chile"), Map.entry("AR", "Argentina"), Map.entry("BR", "Brazil"),
            Map.entry("UY", "Uruguay"), Map.entry("PY", "Paraguay"), Map.entry("BO", "Bolivia"),
            Map.entry("EC", "Ecuador"), Map.entry("GB", "United Kingdom"), Map.entry("IE", "Ireland"),
            Map.entry("PT", "Portugal"), Map.entry("ES", "Spain"), Map.entry("FR", "France"),
            Map.entry("BE", "Belgium"), Map.entry("NL", "Netherlands"), Map.entry("DE", "Germany"),
            Map.entry("CH", "Switzerland"), Map.entry("AT", "Austria"), Map.entry("IT", "Italy"),
            Map.entry("PL", "Poland"), Map.entry("CZ", "Czechia"), Map.entry("SE", "Sweden"),
            Map.entry("NO", "Norway"), Map.entry("DK", "Denmark"), Map.entry("FI", "Finland"),
            Map.entry("GR", "Greece"), Map.entry("RO", "Romania"), Map.entry("HU", "Hungary"),
            Map.entry("UA", "Ukraine"), Map.entry("RU", "Russia"), Map.entry("TR", "Turkey"),
            Map.entry("IL", "Israel"), Map.entry("AE", "United Arab Emirates"), Map.entry("PK", "Pakistan"),
            Map.entry("IN", "India"), Map.entry("TH", "Thailand"), Map.entry("SG", "Singapore"),
            Map.entry("ID", "Indonesia"), Map.entry("PH", "Philippines"), Map.entry("HK", "Hong Kong"),
            Map.entry("CN", "China"), Map.entry("JP", "Japan"), Map.entry("KR", "South Korea"),
            Map.entry("AU", "Australia"), Map.entry("NZ", "New Zealand"), Map.entry("ZA", "South Africa"),
            Map.entry("EG", "Egypt"), Map.entry("NG", "Nigeria"), Map.entry("KE", "Kenya"),
            Map.entry("MA", "Morocco")
    );

    /** ISO alpha-2 country code for an IANA timezone, or {@code null} when unknown. */
    public static String countryCodeForZone(String timezone) {
        if (timezone == null) {
            return null;
        }
        return ZONE_COUNTRY.get(timezone.trim());
    }

    /** English country name for an ISO alpha-2 code, or {@code null} when unknown. */
    public static String countryName(String countryCode) {
        if (countryCode == null) {
            return null;
        }
        return COUNTRY_NAMES.get(countryCode.trim().toUpperCase(Locale.ROOT));
    }

    /**
     * Representative city from a timezone's last path segment, e.g.
     * {@code America/Argentina/Buenos_Aires} → "Buenos Aires". Returns {@code null}
     * for region-less or unusable zones (e.g. "UTC", "GMT").
     */
    public static String cityForZone(String timezone) {
        if (timezone == null) {
            return null;
        }
        String tz = timezone.trim();
        int slash = tz.lastIndexOf('/');
        if (slash < 0 || slash == tz.length() - 1) {
            return null;
        }
        String segment = tz.substring(slash + 1).replace('_', ' ').trim();
        if (segment.isEmpty() || segment.equalsIgnoreCase("GMT") || segment.equalsIgnoreCase("UTC")) {
            return null;
        }
        return segment;
    }
}
