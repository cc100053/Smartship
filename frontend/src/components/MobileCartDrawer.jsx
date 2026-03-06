import { motion, AnimatePresence, useMotionValue, animate, useAnimationControls } from 'framer-motion';
import { ShoppingBag, Trash2, Truck } from 'lucide-react';
import CartPanel from './CartPanel';
import { useEffect, useRef, useCallback } from 'react';

const DRAWER_TRANSITION = {
    type: 'tween',
    duration: 0.3,
    ease: [0.22, 1, 0.36, 1],
};

const PILL_TRANSITION = {
    type: 'tween',
    duration: 0.24,
    ease: [0.22, 1, 0.36, 1],
};

export default function MobileCartDrawer({
    isExpanded,
    onToggle,
    items,
    onIncrement,
    onDecrement,
    onRemove,
    onClear,
    onCalculate,
    loading,
    targetRef,
    bounceToken = 0,
}) {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const scrollRef = useRef(null);
    const touchCleanupRef = useRef(null);
    const y = useMotionValue(typeof window !== 'undefined' ? window.innerHeight : 800);
    const pillControls = useAnimationControls();
    // Keep onToggle stable across re-renders inside the callback ref closure
    const onToggleRef = useRef(onToggle);
    useEffect(() => { onToggleRef.current = onToggle; }, [onToggle]);

    useEffect(() => {
        if (!bounceToken) return;
        pillControls.start({
            y: [0, -6, 0],
            transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
        });
    }, [bounceToken, pillControls]);

    // Lock body scroll when expanded
    useEffect(() => {
        document.body.style.overflow = isExpanded ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isExpanded]);

    // ─── Callback ref: attach native touch handlers the moment the node mounts ───
    const drawerCallbackRef = useCallback((node) => {
        if (touchCleanupRef.current) {
            touchCleanupRef.current();
            touchCleanupRef.current = null;
        }
        if (!node) return;

        let startY = 0;
        let isDraggingDrawer = false;
        let lastY = 0;
        let lastTime = 0;
        let velocityY = 0;

        const onTouchStart = (e) => {
            startY = e.touches[0].clientY;
            lastY = startY;
            lastTime = Date.now();
            velocityY = 0;
            isDraggingDrawer = false;
        };

        const onTouchMove = (e) => {
            const currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;
            const scrollTop = scrollRef.current?.scrollTop ?? 0;

            const now = Date.now();
            const dt = Math.max(now - lastTime, 1);
            velocityY = (currentY - lastY) / dt * 1000;
            lastY = currentY;
            lastTime = now;

            // Engage drawer-drag only when: scroll is at top AND moving downward
            if (!isDraggingDrawer && deltaY > 8 && scrollTop <= 0) {
                isDraggingDrawer = true;
            }

            if (isDraggingDrawer) {
                e.preventDefault();       // stop page from also scrolling
                e.stopPropagation();
                y.set(Math.max(0, deltaY));
            }
        };

        const onTouchEnd = () => {
            if (!isDraggingDrawer) return;
            const currentDragY = y.get();

            if (currentDragY > 80 || velocityY > 500) {
                // When successfully swiped down, we don't animate `y` directly to window height
                // Instead, we just trigger onToggle(false). 
                // AnimatePresence's `exit={{ y: '100%' }}` takes over from the CURRENT position 
                // because Framer Motion is smart enough to interpolate from the dragged `style={{y}}`.
                onToggleRef.current(false);
            } else {
                animate(y, 0, { type: 'spring', damping: 28, stiffness: 300 });
            }
            isDraggingDrawer = false;
        };

        node.addEventListener('touchstart', onTouchStart, { passive: true });
        node.addEventListener('touchmove', onTouchMove, { passive: false }); // passive:false needed to call preventDefault
        node.addEventListener('touchend', onTouchEnd, { passive: true });

        touchCleanupRef.current = () => {
            node.removeEventListener('touchstart', onTouchStart);
            node.removeEventListener('touchmove', onTouchMove);
            node.removeEventListener('touchend', onTouchEnd);
        };
    }, [y]); // y is stable (useMotionValue ref), so this runs only once per mount

    useEffect(() => () => {
        if (touchCleanupRef.current) {
            touchCleanupRef.current();
            touchCleanupRef.current = null;
        }
    }, []);

    return (
        <>
            {/* Backdrop */}
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={DRAWER_TRANSITION}
                        onClick={() => onToggle(false)}
                        className="fixed inset-0 z-40 bg-slate-900/32 lg:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Floating Card & Drawer Container */}
            <div
                className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none lg:hidden"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
                <AnimatePresence initial={false} mode="wait">
                    {!isExpanded ? (
                        /* ── COLLAPSED PILL ── */
                        <motion.div
                            key="collapsed-pill"
                            initial={{ y: 28, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 18, opacity: 0 }}
                            transition={PILL_TRANSITION}
                        >
                            <motion.div
                                ref={targetRef}
                                animate={pillControls}
                                initial={false}
                                className="mx-4 mb-4 md:mb-6 pointer-events-auto cursor-pointer rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 shadow-2xl p-3 flex items-center justify-between gap-2 transform-gpu will-change-transform"
                                style={{ willChange: 'transform, opacity' }}
                                onClick={() => {
                                    y.set(window.innerHeight); // Start at the bottom
                                    onToggle(true);
                                }}
                            >
                                {/* Left: icon + label */}
                                <div className="flex items-center gap-3 pl-2 min-w-0">
                                    <div className="relative shrink-0">
                                        <ShoppingBag className="text-white/90 h-5 w-5" />
                                        {totalItems > 0 && (
                                            <motion.div
                                                key={totalItems}
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center ring-2 ring-slate-800"
                                            >
                                                {totalItems}
                                            </motion.div>
                                        )}
                                    </div>
                                    <span className="text-white font-medium text-sm truncate">カート</span>
                                </div>

                                {/* Right: Clear + Calculate buttons */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onClear(); }}
                                        disabled={!items.length}
                                        title="カートをクリア"
                                        className="p-2.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-white/10 transition disabled:opacity-30"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onCalculate(); }}
                                        disabled={!items.length || loading}
                                        className="text-xs font-semibold px-4 py-2.5 bg-white text-slate-900 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:opacity-50 disabled:bg-white/50 rounded-xl whitespace-nowrap flex items-center gap-1.5"
                                    >
                                        {loading ? '計算中...' : (
                                            <>
                                                <Truck className="h-3.5 w-3.5" />
                                                <span>送料を計算</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    ) : (
                        /* ── EXPANDED DRAWER ── */
                        <motion.div
                            ref={drawerCallbackRef}
                            key="expanded-drawer"
                            style={{ y, maxHeight: 'min(85dvh, 85svh)', willChange: 'transform, opacity' }}
                            initial={{ y: '100%', opacity: 0.98 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0.98 }}
                            transition={DRAWER_TRANSITION}
                            className="pointer-events-auto bg-white rounded-t-3xl shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.25)] flex flex-col transform-gpu will-change-transform"
                        >
                            {/* Drag handle bar */}
                            <div className="flex justify-center pt-3 pb-1 select-none">
                                <div className="w-12 h-1.5 rounded-full bg-slate-200" />
                            </div>

                            {/* Header */}
                            <div className="flex items-center justify-between px-5 pt-2 pb-3 select-none">
                                <p className="text-base font-semibold text-slate-800">選択中の商品</p>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onClear(); }}
                                    disabled={!items.length}
                                    className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-rose-400 hover:text-rose-600 transition disabled:opacity-30"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    クリア
                                </button>
                            </div>

                            {/* Scrollable Cart Content */}
                            <div
                                ref={scrollRef}
                                className="overflow-y-auto px-4 pb-8 custom-scrollbar flex-1"
                                style={{ overscrollBehaviorY: 'contain' }}
                            >
                                <CartPanel
                                    isDrawer={true}
                                    items={items}
                                    onIncrement={onIncrement}
                                    onDecrement={onDecrement}
                                    onRemove={onRemove}
                                    onClear={onClear}
                                    onCalculate={(e) => {
                                        onCalculate(e);
                                        onToggle(false);
                                    }}
                                    loading={loading}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}
