package com.tarantulapp.entity.converters;

import com.tarantulapp.entity.PartnerListingSyncRunStatus;
import com.tarantulapp.entity.PartnerListingSyncTriggerSource;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class PartnerListingSyncRunConvertersTest {

    private final PartnerListingSyncRunStatusConverter statusConverter = new PartnerListingSyncRunStatusConverter();
    private final PartnerListingSyncTriggerSourceConverter triggerConverter = new PartnerListingSyncTriggerSourceConverter();

    @Test
    void statusRoundTripsLowercaseDbValues() {
        assertEquals("running", statusConverter.convertToDatabaseColumn(PartnerListingSyncRunStatus.RUNNING));
        assertEquals(PartnerListingSyncRunStatus.RUNNING, statusConverter.convertToEntityAttribute("running"));
        assertEquals(PartnerListingSyncRunStatus.PARTIAL, statusConverter.convertToEntityAttribute("partial"));
    }

    @Test
    void triggerRoundTripsLowercaseDbValues() {
        assertEquals("manual", triggerConverter.convertToDatabaseColumn(PartnerListingSyncTriggerSource.MANUAL));
        assertEquals(PartnerListingSyncTriggerSource.MANUAL, triggerConverter.convertToEntityAttribute("manual"));
        assertEquals(PartnerListingSyncTriggerSource.SCHEDULER, triggerConverter.convertToEntityAttribute("scheduler"));
    }

    @Test
    void nullMapsToNull() {
        assertNull(statusConverter.convertToDatabaseColumn(null));
        assertNull(statusConverter.convertToEntityAttribute(null));
        assertNull(triggerConverter.convertToDatabaseColumn(null));
        assertNull(triggerConverter.convertToEntityAttribute(null));
    }
}
