import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import { ShoppingBag, Trash2, Truck } from 'lucide-react';
import CartPanel from './CartPanel';
import { useEffect, useRef } from 'react';

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
}) {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const drawerRef = useRef(null);
    const scrollRef = useRef(null);
    const y = useMotionValue(0);

    // Lock body scroll when expanded
    useEffect(() => {
        if (isExpanded) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isExpanded]);

    // Reset y when drawer opens/closes
    useEffect(() => {
        if (isExpanded) {
            y.set(0);
        }
    }, [isExpanded, y]);

    // Attach native touch handlers (passive: false required for preventDefault)
    useEffect(() => {
        if (!isExpanded) return;
        const drawer = drawerRef.current;
        if (!drawer) return;

        let startY = 0;
        let startScrollTop = 0;
        let isDraggingDrawer = false;
        let velocityY = 0;
        let lastY = 0;
        let lastTime = 0;

        const onTouchStart = (e) => {
            startY = e.touches[0].clientY;
            startScrollTop = scrollRef.current?.scrollTop ?? 0;
            isDraggingDrawer = false;
            lastY = startY;
            lastTime = Date.now();
            velocityY = 0;
        };

        const onTouchMove = (e) => {
            const currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;
            const scrollTop = scrollRef.current?.scrollTop ?? 0;
            const now = Date.now();
            const dt = now - lastTime || 1;
            velocityY = (currentY - lastY) / dt * 1000;
            lastY = currentY;
            lastTime = now;

            // Start drawer drag only when at scroll top AND moving downward
            if (!isDraggingDrawer && deltaY > 6 && scrollTop <= 0) {
                isDraggingDrawer = true;
            }

            if (isDraggingDrawer) {
                // Block page scroll / background scroll
                e.preventDefault();
                e.stopPropagation();
                const clamped = Math.max(0, deltaY);
                y.set(clamped);
            }
            // If not a drawer drag, let native scroll happen inside scrollRef
        };

        const onTouchEnd = (e) => {
            if (!isDraggingDrawer) return;
            const currentDragY = y.get();

            if (currentDragY > 80 || velocityY > 500) {
                // Close: animate out then toggle
                animate(y, window.innerHeight, {
                    type: 'spring',
                    damping: 28,
                    stiffness: 180,
                    onComplete: () => {
                        onToggle(false);
                        y.set(0);
                    },
                });
            } else {
                // Snap back
                animate(y, 0, { type: 'spring', damping: 28, stiffness: 300 });
            }
            isDraggingDrawer = false;
        };

        // Use non-passive so we can call preventDefault inside onTouchMove
        drawer.addEventListener('touchstart', onTouchStart, { passive: true });
        drawer.addEventListener('touchmove', onTouchMove, { passive: false });
        drawer.addEventListener('touchend', onTouchEnd, { passive: true });

        return () => {
            drawer.removeEventListener('touchstart', onTouchStart);
            drawer.removeEventListener('touchmove', onTouchMove);
            drawer.removeEventListener('touchend', onTouchEnd);
        };
    }, [isExpanded, onToggle, y]);

    return (
        <>
            {/* Backdrop */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => onToggle(false)}
                        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Floating Card & Drawer Container */}
            <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-safe lg:hidden">
                <AnimatePresence mode="wait">
                    {!isExpanded ? (
                        /* ── COLLAPSED PILL ── */
                        <motion.div
                            key="collapsed-pill"
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="mx-4 mb-4 md:mb-6 pointer-events-auto cursor-pointer rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 shadow-2xl p-3 flex items-center justify-between gap-2"
                            onClick={() => onToggle(true)}
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
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClear();
                                    }}
                                    disabled={!items.length}
                                    title="カートをクリア"
                                    className="p-2.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-white/10 transition disabled:opacity-30"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onCalculate();
                                    }}
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
                    ) : (
                        /* ── EXPANDED DRAWER ── */
                        <motion.div
                            ref={drawerRef}
                            key="expanded-drawer"
                            style={{ y }}
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                            className="pointer-events-auto bg-white rounded-t-3xl shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.25)] flex flex-col max-h-[85vh]"
                        >
                            {/* Drag handle (visual only) */}
                            <div className="flex justify-center pt-3 pb-1 select-none">
                                <div className="w-12 h-1.5 rounded-full bg-slate-200" />
                            </div>

                            {/* Header: title + clear button */}
                            <div className="flex items-center justify-between px-5 pt-2 pb-3 select-none">
                                <p className="text-base font-semibold text-slate-800">選択中の商品</p>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClear();
                                    }}
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
