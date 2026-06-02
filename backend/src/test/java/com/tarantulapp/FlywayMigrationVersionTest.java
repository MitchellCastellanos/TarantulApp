package com.tarantulapp;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.net.URISyntaxException;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

class FlywayMigrationVersionTest {

    private static final Pattern MIGRATION_VERSION = Pattern.compile("^V([^_]+)__.+\\.sql$");

    @Test
    void flywayMigrationVersionsAreUnique() throws IOException, URISyntaxException {
        URL migrationResource = getClass().getClassLoader().getResource("db/migration");
        assertThat(migrationResource).isNotNull();
        Path migrationDirectory = Path.of(migrationResource.toURI());

        try (Stream<Path> files = Files.list(migrationDirectory)) {
            Map<String, List<String>> migrationsByVersion = files
                .map(path -> path.getFileName().toString())
                .map(FlywayMigrationVersionTest::migrationVersion)
                .filter(MigrationFile::isVersionedMigration)
                .collect(Collectors.groupingBy(MigrationFile::version,
                    Collectors.mapping(MigrationFile::fileName, Collectors.toList())));

            Map<String, List<String>> duplicates = migrationsByVersion.entrySet().stream()
                .filter(entry -> entry.getValue().size() > 1)
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

            assertThat(duplicates).isEmpty();
        }
    }

    private static MigrationFile migrationVersion(String fileName) {
        Matcher matcher = MIGRATION_VERSION.matcher(fileName);
        if (!matcher.matches()) {
            return new MigrationFile(fileName, null);
        }
        return new MigrationFile(fileName, matcher.group(1));
    }

    private record MigrationFile(String fileName, String version) {
        private boolean isVersionedMigration() {
            return version != null;
        }
    }
}
