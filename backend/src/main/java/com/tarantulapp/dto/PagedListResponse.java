package com.tarantulapp.dto;

import java.util.List;

/**
 * Generic page wrapper for timeline/photos (and similar) list endpoints when {@code page}/{@code size} are sent.
 */
public class PagedListResponse<T> {

    private List<T> content;
    private long totalElements;
    private int page;
    private int size;
    private boolean hasNext;

    public PagedListResponse() {
    }

    public PagedListResponse(List<T> content, long totalElements, int page, int size, boolean hasNext) {
        this.content = content;
        this.totalElements = totalElements;
        this.page = page;
        this.size = size;
        this.hasNext = hasNext;
    }

    public List<T> getContent() {
        return content;
    }

    public void setContent(List<T> content) {
        this.content = content;
    }

    public long getTotalElements() {
        return totalElements;
    }

    public void setTotalElements(long totalElements) {
        this.totalElements = totalElements;
    }

    public int getPage() {
        return page;
    }

    public void setPage(int page) {
        this.page = page;
    }

    public int getSize() {
        return size;
    }

    public void setSize(int size) {
        this.size = size;
    }

    public boolean isHasNext() {
        return hasNext;
    }

    public void setHasNext(boolean hasNext) {
        this.hasNext = hasNext;
    }
}
