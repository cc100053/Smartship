import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '../utils/cn';

export default function ScrollToTopButton({
    scrollContainerRef,
    threshold = 300,
    hidden = false,
    className = "fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-3 sm:bottom-4 sm:right-4"
}) {
    const [isVisible, setIsVisible] = useState(false);

    const collectScrollTargets = () => {
        if (typeof window === 'undefined') return [];
        const unique = new Set();
        const targets = [];

        const pushTarget = (target) => {
            if (!target || unique.has(target)) return;
            unique.add(target);
            targets.push(target);
        };

        pushTarget(scrollContainerRef.current);
        document.querySelectorAll('[data-scroll-container="true"]').forEach((node) => pushTarget(node));
        pushTarget(window);

        return targets;
    };

    const getScrollTop = (target) => {
        if (target === window) return window.scrollY || document.documentElement.scrollTop || 0;
        return target?.scrollTop || 0;
    };

    useEffect(() => {
        const toggleVisibility = () => {
            const visible = collectScrollTargets().some((target) => getScrollTop(target) > threshold);
            setIsVisible(visible);
        };

        const targets = collectScrollTargets();
        if (!targets.length) return;

        targets.forEach((target) => {
            if (target === window) {
                window.addEventListener('scroll', toggleVisibility);
                return;
            }
            target.addEventListener('scroll', toggleVisibility);
        });
        window.addEventListener('resize', toggleVisibility);
        toggleVisibility();

        return () => {
            targets.forEach((target) => {
                if (target === window) {
                    window.removeEventListener('scroll', toggleVisibility);
                    return;
                }
                target.removeEventListener('scroll', toggleVisibility);
            });
            window.removeEventListener('resize', toggleVisibility);
        };
    }, [scrollContainerRef, threshold, hidden]);

    const scrollToTop = () => {
        const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
        const behavior = prefersReducedMotion ? 'auto' : 'smooth';

        collectScrollTargets().forEach((target) => {
            if (target === window) {
                window.scrollTo({ top: 0, behavior });
                return;
            }
            target.scrollTo({
                top: 0,
                behavior,
            });
        });
    };

    return (
        <AnimatePresence initial={false}>
            {isVisible && !hidden && (
                <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    onClick={scrollToTop}
                    className={cn(
                        "z-50 flex items-center justify-center rounded-full border border-white/50 bg-slate-900/80 text-white shadow-lg backdrop-blur-md transition-all opacity-50 hover:opacity-100 hover:bg-slate-800",
                        "h-10 w-10 sm:h-12 sm:w-12",
                        className
                    )}
                    aria-label="Back to top"
                >
                    <ArrowUp className="h-5 w-5 sm:h-6 sm:w-6" />
                </motion.button>
            )}
        </AnimatePresence>
    );
}
