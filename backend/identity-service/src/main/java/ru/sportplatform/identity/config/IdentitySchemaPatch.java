package ru.sportplatform.identity.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/** Добавляет колонки в существующую файловую H2, если ddl-auto не успел обновить схему. */
@Slf4j
@Component
@RequiredArgsConstructor
public class IdentitySchemaPatch implements ApplicationRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(ApplicationArguments args) {
        addColumnIfMissing("user_accounts", "free_event_entry", "boolean default true not null");
        addColumnIfMissing("user_accounts", "last_active_at", "timestamp");
        addColumnIfMissing("families", "pending_spouse_user_id", "bigint");
        backfillReputation();
        relaxFamilyColumns();
    }

    /** У старых демо-аккаунтов reputation мог остаться NULL — тогда дельты репутации падали. */
    private void backfillReputation() {
        try {
            int updated = jdbc.update("UPDATE user_accounts SET reputation = 100 WHERE reputation IS NULL");
            if (updated > 0) {
                log.info("Identity schema: backfilled reputation for {} accounts", updated);
            }
        } catch (Exception e) {
            log.warn("Identity schema: reputation backfill failed — {}", e.getMessage());
        }
    }

    private void addColumnIfMissing(String table, String column, String ddlType) {
        if (columnExists(table, column)) {
            return;
        }
        try {
            jdbc.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " " + ddlType);
            log.info("Identity schema: added {}.{}", table, column);
        } catch (Exception e) {
            log.warn("Identity schema: could not add {}.{} — {}", table, column, e.getMessage());
        }
    }

    private void relaxFamilyColumns() {
        try {
            jdbc.execute("ALTER TABLE families ALTER COLUMN male_user_id SET NULL");
            jdbc.execute("ALTER TABLE families ALTER COLUMN female_user_id SET NULL");
        } catch (Exception e) {
            log.debug("Identity schema: family columns already nullable or alter skipped ({})", e.getMessage());
        }
    }

    private boolean columnExists(String table, String column) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE UPPER(table_name) = UPPER(?) AND UPPER(column_name) = UPPER(?)",
                Integer.class,
                table,
                column);
        return count != null && count > 0;
    }
}
