package com.tarantulapp.util;

import jakarta.servlet.http.HttpServletRequest;

public final class RequestPaths {

    private RequestPaths() {
    }

    public static String stripContextPath(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (uri == null) {
            return "";
        }
        String ctx = request.getContextPath();
        if (ctx != null && !ctx.isEmpty() && uri.startsWith(ctx)) {
            uri = uri.substring(ctx.length());
        }
        return uri;
    }
}
