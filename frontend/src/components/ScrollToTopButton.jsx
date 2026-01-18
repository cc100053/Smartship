import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '../utils/cn';

export default function ScrollToTopButton({
    scrollContainerRef,
    threshold = 300,
    className = "fixed bottom-4 right-4"
}) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const toggleVisibility = () => {
            if (container.scrollTop > threshold) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        container.addEventListener('scroll', toggleVisibility);
        return () => container.removeEventListener('scroll', toggleVisibility);
    }, [scrollContainerRef, threshold]);

    const scrollToTop = () => {
        scrollContainerRef.current?.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={scrollToTop}
                    className={cn(
                        "z-50 flex items-center justify-center rounded-full border border-white/50 bg-slate-900/80 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-slate-800",
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
