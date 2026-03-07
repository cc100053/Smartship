import { createElement, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { CATEGORY_COLORS } from '../utils/colors';
import { getIconForProduct } from '../utils/productIcons';

export default function FlyToCartOverlay({ flights, onFlightComplete }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      <AnimatePresence>
        {flights.map((flight) => (
          <FlightGhost
            key={flight.id}
            flight={flight}
            onComplete={() => onFlightComplete(flight.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function FlightGhost({ flight, onComplete }) {
  const {
    product,
    sourceRect,
    targetRect,
  } = flight;

  const categoryColor = CATEGORY_COLORS[product.category] || CATEGORY_COLORS.Other;
  const Icon = getIconForProduct(product);
  const didCompleteRef = useRef(false);

  const geometry = useMemo(() => {
    const baseSize = Math.max(48, Math.min(68, Math.min(sourceRect.width, sourceRect.height) || 56));
    const startX = sourceRect.left + sourceRect.width / 2 - baseSize / 2;
    const startY = sourceRect.top + sourceRect.height / 2 - baseSize / 2;
    const endX = targetRect.left + targetRect.width / 2 - baseSize / 2;
    const endY = targetRect.top + targetRect.height / 2 - baseSize / 2;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const distance = Math.hypot(deltaX, deltaY);
    const endScale = Math.max(0.4, Math.min(0.58, Math.min(targetRect.width, targetRect.height) / baseSize));
    const duration = Math.max(0.68, Math.min(0.82, (0.28 + distance / 2200) * 1.95));
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

    const kickX = isDesktop ? startX + deltaX * 0.2 : startX + deltaX * 0.14;
    const kickY = isDesktop
      ? startY + deltaY * 0.1
      : startY - Math.max(18, Math.min(34, distance * 0.06));

    return {
      baseSize,
      startX,
      startY,
      endX,
      endY,
      kickX,
      kickY,
      endScale,
      duration,
    };
  }, [sourceRect, targetRect]);

  return (
    <motion.div
      className="absolute left-0 top-0 will-change-transform"
      initial={{
        x: geometry.startX,
        y: geometry.startY,
        scale: 1,
        rotate: 0,
      }}
      animate={{
        x: [geometry.startX, geometry.kickX, geometry.endX],
        y: [geometry.startY, geometry.kickY, geometry.endY],
        scale: [1, 0.995, geometry.endScale],
        rotate: [0, -3, 0],
      }}
      transition={{
        duration: geometry.duration,
        ease: [0.16, 1, 0.3, 1],
        times: [0, 0.14, 1],
      }}
      onAnimationComplete={() => {
        if (didCompleteRef.current) return;
        didCompleteRef.current = true;
        onComplete();
      }}
      style={{
        width: geometry.baseSize,
        height: geometry.baseSize,
      }}
    >
      <motion.div
        initial={{ opacity: 0.96 }}
        animate={{ opacity: [0.96, 0.98, 0.98, 0.42, 0] }}
        transition={{
          duration: geometry.duration,
          ease: 'linear',
          times: [0, 0.14, 0.95, 0.985, 1],
        }}
        className="relative flex h-full w-full items-center justify-center rounded-2xl border border-white/75 bg-white/90 shadow-[0_18px_42px_-26px_rgba(15,23,42,0.34)] backdrop-blur-lg"
      >
        <div
          className={`flex h-[68%] w-[68%] items-center justify-center rounded-[1rem] ${categoryColor.bg}`}
        >
          {createElement(Icon, { className: 'h-[42%] w-[42%] text-slate-800' })}
        </div>
        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/92 text-white shadow-[0_10px_18px_-12px_rgba(15,23,42,0.7)]">
          <Plus className="h-3 w-3" />
        </div>
      </motion.div>
    </motion.div>
  );
}
