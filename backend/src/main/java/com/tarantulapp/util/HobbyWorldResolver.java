package com.tarantulapp.util;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Set;

/**
 * Classifies tarantula hobby "New World" vs "Old World" from free-text native range
 * ({@code origin_region}) using geography keywords. This is a best-effort heuristic;
 * ambiguous strings return null.
 */
public final class HobbyWorldResolver {

    public static final String NEW_WORLD = "new_world";
    public static final String OLD_WORLD = "old_world";

    private HobbyWorldResolver() {}

    /**
     * @return {@link #NEW_WORLD}, {@link #OLD_WORLD}, or null if unknown / conflicting signals
     */
    public static String fromOriginRegion(String originRegion) {
        if (originRegion == null || originRegion.isBlank()) {
            return null;
        }
        String n = stripDiacritics(originRegion).toLowerCase(Locale.ROOT).replace('\u00a0', ' ');
        if (n.isBlank()) return null;

        boolean oldHit = containsAny(n, OLD_PHRASES);
        boolean newHit = containsAny(n, NEW_PHRASES);
        if (oldHit && newHit) {
            return null;
        }
        if (oldHit) return OLD_WORLD;
        if (newHit) return NEW_WORLD;
        return null;
    }

    private static boolean containsAny(String normalizedLowerAscii, String[] phrases) {
        for (String p : phrases) {
            String pn = stripDiacritics(p).toLowerCase(Locale.ROOT);
            if (normalizedLowerAscii.contains(pn)) {
                return true;
            }
        }
        return false;
    }

    private static String stripDiacritics(String s) {
        String normalized = Normalizer.normalize(s, Normalizer.Form.NFD);
        StringBuilder sb = new StringBuilder(normalized.length());
        for (int i = 0; i < normalized.length(); i++) {
            char c = normalized.charAt(i);
            if (Character.getType(c) != Character.NON_SPACING_MARK) {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    /** ISO 3166-1 alpha-2 codes for independent states and common territories in the Americas. */
    private static final Set<String> NEW_WORLD_ISO2 = Set.of(
            "AG", "AI", "AR", "AW", "BB", "BL", "BM", "BO", "BQ", "BR", "BS", "BZ", "CA", "CL", "CO", "CR", "CU",
            "CW", "DM", "DO", "EC", "FK", "GD", "GF", "GL", "GP", "GT", "GY", "HN", "HT", "JM", "KN", "KY", "LC",
            "MF", "MQ", "MS", "MX", "NI", "PA", "PE", "PM", "PR", "PY", "SR", "SX", "TC", "TT", "US", "UY", "VC",
            "VE", "VG", "VI"
    );

    private static final Set<String> OLD_WORLD_ISO2 = Set.of(
            "AD", "AE", "AF", "AL", "AM", "AO", "AQ", "AT", "AU", "AZ", "BA", "BD", "BE", "BF", "BG", "BH", "BI",
            "BJ", "BN", "BT", "BW", "BY", "CD", "CF", "CG", "CH", "CI", "CM", "CN", "CV", "CY", "CZ", "DE", "DJ",
            "DK", "DZ", "EE", "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FM", "FR", "GA", "GB", "GE", "GH", "GI",
            "GM", "GN", "GQ", "GR", "GW", "HK", "HR", "HU", "ID", "IE", "IL", "IN", "IQ", "IR", "IS", "IT", "JO",
            "JP", "KE", "KG", "KH", "KI", "KM", "KP", "KR", "KW", "KZ", "LA", "LB", "LI", "LK", "LR", "LS", "LT",
            "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MR", "MT", "MU",
            "MV", "MW", "MY", "MZ", "NA", "NC", "NE", "NF", "NG", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PG",
            "PH", "PK", "PL", "PN", "PS", "PT", "PW", "QA", "RO", "RS", "RU", "RW", "SA", "SB", "SC", "SD", "SE",
            "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SS", "ST", "SY", "SZ", "TD", "TF", "TG",
            "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TV", "TW", "TZ", "UA", "UG", "UZ", "VA", "VN", "VU",
            "WS", "YE", "YT", "ZA", "ZM", "ZW"
    );

    /**
     * Resolves using GBIF distribution country codes and locality strings.
     * @return new_world, old_world, or null
     */
    public static String fromGbifDistributionHints(String countryIso2, String locality) {
        boolean newHit = false;
        boolean oldHit = false;

        if (countryIso2 != null) {
            String t = countryIso2.trim().toUpperCase(Locale.ROOT);
            if (t.length() >= 2) {
                String iso = t.substring(0, 2);
                if (NEW_WORLD_ISO2.contains(iso)) {
                    newHit = true;
                } else if (OLD_WORLD_ISO2.contains(iso)) {
                    oldHit = true;
                }
            }
        }

        if (locality != null && !locality.isBlank()) {
            String n = stripDiacritics(locality).toLowerCase(Locale.ROOT);
            if (containsAny(n, DISTRIBUTION_OLD_HINTS)) {
                oldHit = true;
            }
            if (containsAny(n, DISTRIBUTION_NEW_HINTS)) {
                newHit = true;
            }
        }

        if (oldHit && newHit) {
            return null;
        }
        if (oldHit) return OLD_WORLD;
        if (newHit) return NEW_WORLD;
        return null;
    }

    private static final String[] DISTRIBUTION_OLD_HINTS = {
            "africa", "asia", "europe", "oceania", "australasia", "middle east", "western asia", "eastern asia",
            "southern asia", "southeast asia", "south asia", "central asia", "northern africa", "eastern africa",
            "western africa", "southern africa", "central africa", "madagascar", "indian ocean", "arabian",
            "palearctic", "afrotropical", "oriental region"
    };

    private static final String[] DISTRIBUTION_NEW_HINTS = {
            "south america", "north america", "central america", "caribbean", "neotropical", "nearctic",
            "mesoamerica", "west indies", "greater antilles", "lesser antilles"
    };

    /** Multi-word and specific Old-World phrases first (avoid matching "America" inside "South America" wrongly). */
    private static final String[] OLD_PHRASES = {
            "south africa", "central african", "costa de marfil", "cote d'ivoire", "cote d ivoire",
            "africa occidental", "africa oriental", "africa central", "africa del sur", "africa subsahariana",
            "southeast asia", "south asia", "south-east asia", "middle east", "medio oriente", "arabia saudita",
            "arabia", "socotra", "yemen", "oman", "emiratos", "israel", "jordan", "jordania", "libano", "lebanon",
            "siria", "syria", "irak", "iraq", "iran", "pakistan", "afganistan", "afghanistan", "nepal", "butan",
            "bhutan", "bangladesh", "sri lanka", "myanmar", "birmania", "tailandia", "thailand", "camboya", "cambodia",
            "laos", "vietnam", "viet nam", "malasia", "malaysia", "indonesia", "filipinas", "philippines", "brunei",
            "china", "japon", "japan", "korea", "taiwan", "hong kong", "india", "indian ", "tamil", "andhra",
            "andhra pradesh", "karnataka", "kerala", "orissa", "goa", "gujarat", "maharashtra",
            "africa", "afrika", "europa", "europe", "asia", "oceania", "australia", "new zealand", "nueva zelanda",
            "papua", "melanesia", "micronesia", "polinesia", "madagascar", "mauritius", "mauricio", "seychelles",
            "comores", "comoros", "zanzibar", "tanzania", "kenya", "uganda", "ruanda", "rwanda", "burundi",
            "ethiopia", "etiopia", "somalia", "sudan", "south sudan", "chad", "camerun", "cameroon", "nigeria",
            "niger", "mali", "burkina", "senegal", "gambia", "ghana", "togo", "benin", "ivory", "liberia",
            "sierra leone", "guinea", "guinea ecuatorial", "gabon", "congo", "angola", "namibia", "botswana",
            "zimbabwe", "zambia", "malawi", "mozambique", "eswatini", "swaziland", "lesotho", "south africa",
            "algeria", "argelia", "tunisia", "tunez", "libya", "libia", "morocco", "marruecos", "egypto", "egypt",
            "turquia", "turkey", "russia", "rusia", "ukraine", "ucrania", "greece", "grecia", "italy", "italia",
            "spain", "espana", "portugal", "france", "francia", "germany", "alemania", "united kingdom", "reino unido",
            "poland", "polonia", "romania", "rumania", "bulgaria", "hungary", "hungria", "serbia", "croatia",
            "bosnia", "montenegro", "albania", "macedonia", "slovenia", "slovakia", "czech", "chequia", "austria",
            "belgium", "belgica", "netherlands", "holanda", "switzerland", "suiza", "sweden", "suecia", "norway",
            "noruega", "finland", "finlandia", "denmark", "dinamarca", "iceland", "islandia", "ireland", "irlanda"
    };

    private static final String[] NEW_PHRASES = {
            "south america", "north america", "central america", "latin america", "mesoamerica", "meso america",
            "caribbean", "caribe", "antillas", "west indies", "greater antilles", "lesser antilles",
            "trinidad", "tobago", "martinica", "martinique", "guadalupe", "guadeloupe", "barbados", "jamaica",
            "cuba", "haiti", "dominicana", "republica dominicana", "puerto rico", "bahamas", "bermudas",
            "mexico", "méxico", "guatemala", "belice", "belize", "honduras", "salvador", "el salvador", "nicaragua",
            "costa rica", "panama", "panamá", "colombia", "venezuela", "ecuador", "peru", "perú", "bolivia",
            "brasil", "brazil", "paraguay", "uruguay", "argentina", "chile", "guyana", "surinam", "suriname",
            "guayana", "french guiana", "guayana francesa", "amazonas", "paraiba", "jalisco", "michoacan", "michoacán",
            "guerrero", "sonora", "arizona", "usa", "u.s.", "u.s.a", "united states", "estados unidos", "ee.uu",
            "eeuu", "texas", "florida", "california", "nuevo mexico", "new mexico", "paraguana", "paraguaná",
            "etats-unis", "etats unis",
            "hawai", "hawaii", "galapagos", "falklands", "malvinas"
    };
}
