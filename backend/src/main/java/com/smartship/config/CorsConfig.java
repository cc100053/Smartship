package com.smartship.config;

import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${app.frontend-extra-origins:}")
    private String frontendExtraOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        List<String> originPatterns = new ArrayList<>();
        originPatterns.add(frontendUrl);
        originPatterns.add("http://localhost:3000");
        originPatterns.add("https://*.vercel.app");

        if (frontendExtraOrigins != null && !frontendExtraOrigins.isBlank()) {
            for (String origin : frontendExtraOrigins.split(",")) {
                String trimmed = origin.trim();
                if (!trimmed.isEmpty()) {
                    originPatterns.add(trimmed);
                }
            }
        }

        registry.addMapping("/**")
                .allowedOriginPatterns(originPatterns.toArray(String[]::new))
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*");
    }
}
