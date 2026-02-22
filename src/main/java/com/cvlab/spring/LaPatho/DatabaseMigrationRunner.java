package com.cvlab.spring.LaPatho;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Uygulama başlatılırken veritabanı migration işlemlerini çalıştırır.
 * NOT_STARTED durumundaki kayıtları IN_PROGRESS olarak günceller
 * (NOT_STARTED enum değeri kaldırıldı).
 */
@Component
@Slf4j
public class DatabaseMigrationRunner implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseMigrationRunner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        migrateNotStartedStatus();
    }

    private void migrateNotStartedStatus() {
        try {
            int updated = jdbcTemplate.update(
                "UPDATE image_labeling_status SET status = 'IN_PROGRESS' WHERE status = 'NOT_STARTED'"
            );
            if (updated > 0) {
                log.info("Veritabanı migration: {} adet NOT_STARTED kaydı IN_PROGRESS olarak güncellendi", updated);
            } else {
                log.debug("Veritabanı migration: NOT_STARTED kaydı bulunamadı, güncelleme gerekmedi");
            }
        } catch (Exception e) {
            log.warn("NOT_STARTED migration hatası (tablo henüz oluşmamış olabilir): {}", e.getMessage());
        }
    }
}

