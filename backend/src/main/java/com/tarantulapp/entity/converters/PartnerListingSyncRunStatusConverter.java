package com.tarantulapp.entity.converters;

import com.tarantulapp.entity.PartnerListingSyncRunStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Locale;

@Converter(autoApply = false)
public class PartnerListingSyncRunStatusConverter implements AttributeConverter<PartnerListingSyncRunStatus, String> {

    @Override
    public String convertToDatabaseColumn(PartnerListingSyncRunStatus attribute) {
        if (attribute == null) {
            return null;
        }
        return attribute.name().toLowerCase(Locale.ROOT);
    }

    @Override
    public PartnerListingSyncRunStatus convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }
        return PartnerListingSyncRunStatus.valueOf(dbData.trim().toUpperCase(Locale.ROOT));
    }
}
