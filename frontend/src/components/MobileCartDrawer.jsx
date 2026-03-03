import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X } from 'lucide-react';
import CartPanel from './CartPanel';
import { useEffect } from 'react';

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
                        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm min-[1170px]:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Floating Card & Drawer Container */}
            <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-safe min-[1170px]:hidden">
                <AnimatePresence mode="wait">
                    {!isExpanded ? (
                        // Option C: Floating Card with Badge (Collapsed)
                        <motion.div
                            layoutId="mobile-drawer-container"
                            key="collapsed-pill"
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="mx-4 mb-4 md:mb-6 pointer-events-auto cursor-pointer rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 shadow-2xl p-3 flex items-center justify-between"
                            onClick={() => onToggle(true)}
                        >
                            <div className="flex items-center gap-3 pl-2">
                                <div className="relative">
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
                                <span className="text-white font-medium text-sm">カート</span>
                            </div>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCalculate();
                                }}
                                disabled={!items.length || loading}
                                className="text-xs font-semibold px-4 py-2.5 bg-white text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:bg-white/50 rounded-xl"
                            >
                                {loading ? '計算中...' : '計算 ▶'}
                            </button>
                        </motion.div>
                    ) : (
                        // Expanded Drawer
                        <motion.div
                            layoutId="mobile-drawer-container"
                            key="expanded-drawer"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="pointer-events-auto bg-slate-50 rounded-t-3xl shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.2)] flex flex-col max-h-[85vh]"
                        >
                            {/* Drawer Header handle */}
                            <div
                                className="flex justify-center pt-3 pb-2 cursor-pointer touch-none"
                                onClick={() => onToggle(false)}
                            >
                                <div className="w-12 h-1.5 rounded-full bg-slate-300" />
                            </div>

                            <div className="flex justify-end px-4 pb-2">
                                <button
                                    onClick={() => onToggle(false)}
                                    className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/50 transition"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Scrollable Cart Content */}
                            <div className="overflow-y-auto px-4 pb-6 custom-scrollbar shrink">
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
