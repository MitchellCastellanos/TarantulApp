package com.tarantulapp.entity.converters;

import com.tarantulapp.entity.PartnerListingSyncTriggerSource;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Locale;

@Converter(autoApply = false)
public class PartnerListingSyncTriggerSourceConverter implements AttributeConverter<PartnerListingSyncTriggerSource, String> {

    @Override
    public String convertToDatabaseColumn(PartnerListingSyncTriggerSource attribute) {
        if (attribute == null) {
            return null;
        }
        return attribute.name().toLowerCase(Locale.ROOT);
    }

    @Override
    public PartnerListingSyncTriggerSource convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }
        return PartnerListingSyncTriggerSource.valueOf(dbData.trim().toUpperCase(Locale.ROOT));
    }
}
