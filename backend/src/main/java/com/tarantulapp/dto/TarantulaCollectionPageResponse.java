package com.tarantulapp.dto;

import java.util.List;

/**
 * Paginated collection response for {@code GET /api/tarantulas?page=&size=}.
 * Unpaginated calls continue to return a raw JSON array for backward compatibility.
 */
public class TarantulaCollectionPageResponse {

    private List<TarantulaResponse> content;
    private long totalElements;
    private int page;
    private int size;
    private boolean hasNext;

    public TarantulaCollectionPageResponse() {
    }

    public TarantulaCollectionPageResponse(List<TarantulaResponse> content,
                                           long totalElements,
                                           int page,
                                           int size,
                                           boolean hasNext) {
        this.content = content;
        this.totalElements = totalElements;
        this.page = page;
        this.size = size;
        this.hasNext = hasNext;
    }

    public List<TarantulaResponse> getContent() {
        return content;
    }

    public void setContent(List<TarantulaResponse> content) {
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
