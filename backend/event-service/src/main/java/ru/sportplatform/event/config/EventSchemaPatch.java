package ru.sportplatform.event.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class EventSchemaPatch implements ApplicationRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(ApplicationArguments args) {
        addColumnIfMissing("event_registrations", "awaiting_parent_approval", "boolean default false not null");
    }

    private void addColumnIfMissing(String table, String column, String ddlType) {
        if (columnExists(table, column)) {
            return;
        }
        try {
            jdbc.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " " + ddlType);
            log.info("Event schema: added {}.{}", table, column);
        } catch (Exception e) {
            log.warn("Event schema: could not add {}.{} — {}", table, column, e.getMessage());
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
