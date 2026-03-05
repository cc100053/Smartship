package com.smartship.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, WindowCounter> counters = new ConcurrentHashMap<>();

    @Value("${app.rate-limit.enabled:true}")
    private boolean enabled;

    @Value("${app.rate-limit.max-requests:120}")
    private int maxRequestsPerWindow;

    @Value("${app.rate-limit.window-ms:60000}")
    private long windowMs;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!enabled) {
            return true;
        }
        String uri = request.getRequestURI();
        return uri == null || !uri.startsWith("/api/shipping/calculate");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        long now = System.currentTimeMillis();
        String key = clientKey(request);

        WindowCounter counter = counters.compute(key, (k, current) -> {
            if (current == null || now - current.windowStartMs > windowMs) {
                return new WindowCounter(now, new AtomicInteger(1));
            }
            current.requestCount.incrementAndGet();
            return current;
        });

        if (counter.requestCount.get() > maxRequestsPerWindow) {
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"Too many requests. Please retry later.\"}");
            return;
        }

        if (counters.size() > 2000) {
            counters.entrySet().removeIf((entry) -> now - entry.getValue().windowStartMs > (windowMs * 2));
        }

        filterChain.doFilter(request, response);
    }

    private String clientKey(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        String ip = (forwardedFor == null || forwardedFor.isBlank())
                ? request.getRemoteAddr()
                : forwardedFor.split(",")[0].trim();
        String path = request.getRequestURI() == null ? "" : request.getRequestURI();
        return ip + "|" + path;
    }

    private static final class WindowCounter {
        private final long windowStartMs;
        private final AtomicInteger requestCount;

        private WindowCounter(long windowStartMs, AtomicInteger requestCount) {
            this.windowStartMs = windowStartMs;
            this.requestCount = requestCount;
        }
    }
}
