package ru.sportplatform.moderation;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"ru.sportplatform.moderation", "ru.sportplatform.common"})
public class AiModerationServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AiModerationServiceApplication.class, args);
    }
}
