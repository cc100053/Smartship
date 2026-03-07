import { createElement, useEffect, useMemo, useRef } from 'react';
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform } from 'framer-motion';
import { Plus } from 'lucide-react';
import { CATEGORY_COLORS } from '../utils/colors';
import { getIconForProduct } from '../utils/productIcons';

const lerp = (start, end, progress) => start + (end - start) * progress;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeProgress = (value, start, end) => {
  if (value <= start) return 0;
  if (value >= end) return 1;
  return (value - start) / (end - start);
};

const easeOutCubic = (value) => 1 - (1 - value) ** 3;

const quadraticBezier = (start, control, end, progress) => {
  const inverse = 1 - progress;
  return inverse * inverse * start
    + 2 * inverse * progress * control
    + progress * progress * end;
};

export default function FlyToCartOverlay({ flights, onFlightArrive, onFlightComplete }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      {flights.map((flight) => (
        <FlightGhost
          key={flight.id}
          flight={flight}
          onArrive={() => onFlightArrive(flight.id)}
          onComplete={() => onFlightComplete(flight.id)}
        />
      ))}
    </div>
  );
}

function FlightGhost({ flight, onArrive, onComplete }) {
  const { product, sourceRect, targetRect } = flight;
  const categoryColor = CATEGORY_COLORS[product.category] || CATEGORY_COLORS.Other;
  const Icon = getIconForProduct(product);
  const didArriveRef = useRef(false);
  const didCompleteRef = useRef(false);
  const progress = useMotionValue(0);

  const geometry = useMemo(() => {
    const baseSize = Math.max(48, Math.min(68, Math.min(sourceRect.width, sourceRect.height) || 56));
    const startX = sourceRect.left + sourceRect.width / 2 - baseSize / 2;
    const startY = sourceRect.top + sourceRect.height / 2 - baseSize / 2;
    const endX = targetRect.left + targetRect.width / 2 - baseSize / 2;
    const endY = targetRect.top + targetRect.height / 2 - baseSize / 2;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const distance = Math.hypot(deltaX, deltaY);
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
    const duration = clamp(0.42 + distance / 2600, 0.58, 0.82);
    const endScale = clamp(Math.min(targetRect.width, targetRect.height) / baseSize, 0.4, 0.58);
    const mobileLift = clamp(distance * 0.075, 22, 40);

    return {
      startX,
      startY,
      endX,
      endY,
      baseSize,
      endScale,
      duration,
      isDesktop,
      controlX: isDesktop ? lerp(startX, endX, 0.46) : lerp(startX, endX, 0.18),
      controlY: isDesktop ? lerp(startY, endY, 0.46) : startY - mobileLift,
    };
  }, [sourceRect, targetRect]);

  const x = useTransform(progress, (value) => (
    geometry.isDesktop
      ? lerp(geometry.startX, geometry.endX, value)
      : quadraticBezier(geometry.startX, geometry.controlX, geometry.endX, value)
  ));

  const y = useTransform(progress, (value) => (
    geometry.isDesktop
      ? lerp(geometry.startY, geometry.endY, value)
      : quadraticBezier(geometry.startY, geometry.controlY, geometry.endY, value)
  ));

  const scale = useTransform(progress, (value) => {
    const normalized = normalizeProgress(value, 0.08, 1);
    return lerp(1, geometry.endScale, easeOutCubic(normalized));
  });

  const rotate = useTransform(progress, (value) => {
    if (geometry.isDesktop) return 0;
    return lerp(-2.5, 0, easeOutCubic(value));
  });

  const opacity = useTransform(progress, (value) => {
    if (value < 0.9) {
      return lerp(0.96, 0.99, normalizeProgress(value, 0, 0.14));
    }

    if (value < 0.975) {
      return lerp(0.99, 0.32, normalizeProgress(value, 0.9, 0.975));
    }

    return lerp(0.32, 0, normalizeProgress(value, 0.975, 1));
  });

  useMotionValueEvent(progress, 'change', (value) => {
    if (didArriveRef.current || value < 0.84) return;
    didArriveRef.current = true;
    onArrive();
  });

  useEffect(() => {
    const controls = animate(progress, 1, {
      duration: geometry.duration,
      ease: [0.16, 1, 0.3, 1],
      onComplete: () => {
        if (didCompleteRef.current) return;
        didCompleteRef.current = true;
        onComplete();
      },
    });

    return () => controls.stop();
  }, [geometry.duration, onComplete, progress]);

  return (
    <motion.div
      className="absolute left-0 top-0 will-change-transform"
      style={{
        x,
        y,
        scale,
        rotate,
        opacity,
        width: geometry.baseSize,
        height: geometry.baseSize,
      }}
    >
      <div className="relative flex h-full w-full items-center justify-center rounded-2xl border border-white/75 bg-white/90 shadow-[0_18px_42px_-26px_rgba(15,23,42,0.34)] backdrop-blur-lg">
        <div
          className={`flex h-[68%] w-[68%] items-center justify-center rounded-[1rem] ${categoryColor.bg}`}
        >
          {createElement(Icon, { className: 'h-[42%] w-[42%] text-slate-800' })}
        </div>
        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/92 text-white shadow-[0_10px_18px_-12px_rgba(15,23,42,0.7)]">
          <Plus className="h-3 w-3" />
        </div>
      </div>
    </motion.div>
  );
}
