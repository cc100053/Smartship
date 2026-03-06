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
    const endScale = Math.max(0.34, Math.min(0.62, Math.min(targetRect.width, targetRect.height) / baseSize));
    const duration = Math.max(0.34, Math.min(0.44, 0.3 + distance / 1800));
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

    const kickX = isDesktop ? startX + deltaX * 0.18 : startX + deltaX * 0.12;
    const kickY = isDesktop
      ? startY + deltaY * 0.12
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
        opacity: 0.96,
      }}
      animate={{
        x: [geometry.startX, geometry.kickX, geometry.endX],
        y: [geometry.startY, geometry.kickY, geometry.endY],
        scale: [1, 1.02, geometry.endScale],
        rotate: [0, -6, 0],
        opacity: [0.96, 1, 0.18],
      }}
      exit={{ opacity: 0 }}
      transition={{
        duration: geometry.duration,
        ease: [0.22, 1, 0.36, 1],
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
      <div className="relative flex h-full w-full items-center justify-center rounded-2xl border border-white/70 bg-white/92 shadow-[0_18px_35px_-22px_rgba(15,23,42,0.45)] backdrop-blur-md">
        <div
          className={`flex h-[70%] w-[70%] items-center justify-center rounded-[1.1rem] ${categoryColor.bg}`}
        >
          {createElement(Icon, { className: 'h-[42%] w-[42%] text-slate-800' })}
        </div>
        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg">
          <Plus className="h-3 w-3" />
        </div>
      </div>
    </motion.div>
  );
}
