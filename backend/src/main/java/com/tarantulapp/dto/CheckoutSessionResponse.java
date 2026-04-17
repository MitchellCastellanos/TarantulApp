package com.tarantulapp.dto;

public class CheckoutSessionResponse {
    private String url;

    public CheckoutSessionResponse() {}

    public CheckoutSessionResponse(String url) {
        this.url = url;
    }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
}

