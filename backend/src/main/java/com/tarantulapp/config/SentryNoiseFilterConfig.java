package com.tarantulapp.config;

import io.sentry.Hint;
import io.sentry.SentryEvent;
import io.sentry.SentryOptions;
import org.apache.catalina.connector.ClientAbortException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
/**
 * Drops benign client-disconnect errors (browser tab closed, navigation, preview reload)
 * so they are not reported as production fatals.
 */
@Configuration
public class SentryNoiseFilterConfig {

    @Bean
    public SentryOptions.BeforeSendCallback sentryBeforeSendCallback() {
        return (SentryEvent event, Hint hint) -> isClientDisconnect(event) ? null : event;
    }

    private static boolean isClientDisconnect(SentryEvent event) {
        if (event == null) {
            return false;
        }
        Throwable ex = event.getThrowable();
        while (ex != null) {
            if (ex instanceof ClientAbortException) {
                return true;
            }
            String type = ex.getClass().getName();
            if (type.endsWith("AsyncRequestNotUsableException")) {
                return true;
            }
            String msg = ex.getMessage();
            if (msg != null) {
                String lower = msg.toLowerCase();
                if (lower.contains("broken pipe")
                        || lower.contains("connection reset by peer")
                        || lower.contains("connection aborted")) {
                    return true;
                }
            }
            ex = ex.getCause();
        }
        return false;
    }
}
