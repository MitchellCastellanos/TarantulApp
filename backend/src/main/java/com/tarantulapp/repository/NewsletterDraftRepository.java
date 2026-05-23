package com.tarantulapp.repository;

import com.tarantulapp.entity.NewsletterDraft;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface NewsletterDraftRepository extends JpaRepository<NewsletterDraft, UUID> {
}
