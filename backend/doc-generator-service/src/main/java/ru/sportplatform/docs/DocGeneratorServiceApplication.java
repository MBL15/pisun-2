package ru.sportplatform.docs;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"ru.sportplatform.docs", "ru.sportplatform.common"})
public class DocGeneratorServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(DocGeneratorServiceApplication.class, args);
    }
}
