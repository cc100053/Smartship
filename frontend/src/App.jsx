import { motion } from 'framer-motion';
import { useRef } from 'react';
import { Package, ShoppingBag, Calculator } from 'lucide-react';
import ShippingCalculator from './pages/ShippingCalculator';
import ScrollToTopButton from './components/ScrollToTopButton';
import { cn } from './utils/cn';

export default function App() {
  const mainRef = useRef(null);
  return (
    <div className="h-[100dvh] bg-neutral-50 text-neutral-900 selection:bg-rose-500/30 overflow-hidden flex flex-col">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] h-[70vh] w-[70vw] rounded-full bg-blue-400 mix-blend-multiply blur-[128px] animate-blob" />
        <div className="absolute top-[-20%] right-[-10%] h-[70vh] w-[70vw] rounded-full bg-purple-400 mix-blend-multiply blur-[128px] animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-20%] left-[20%] h-[70vh] w-[70vw] rounded-full bg-pink-400 mix-blend-multiply blur-[128px] animate-blob animation-delay-4000" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1400px] px-3 py-3 sm:px-6 sm:py-4 lg:px-8 h-full flex flex-col w-full">
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex-none mb-3 sm:mb-4 flex items-center justify-between rounded-xl sm:rounded-2xl border border-white/40 bg-white/60 px-3 py-2 sm:px-4 sm:py-3 shadow-md backdrop-blur-md"
        >
          <a href="/" className="flex items-center gap-2 transition-transform hover:scale-[1.02]">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-slate-900 to-slate-800 text-white shadow-md">
              <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <div>
              <p className="font-display text-sm sm:text-base font-bold leading-none tracking-tight text-slate-900">
                SmartShip
              </p>
              <p className="text-[0.56rem] sm:text-[0.625rem] font-medium text-slate-500">
                メルカリ特化型配送アシスタント
              </p>
            </div>
          </a>

          <h1 className="hidden sm:block text-sm font-medium text-slate-500">
            メルカリ便・郵便の送料比較を、もっとスマートに。
          </h1>
        </motion.header>

        <motion.main
          ref={mainRef}
          className="flex-1 min-h-0 overflow-y-auto min-[1170px]:overflow-visible"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <ShippingCalculator />
        </motion.main>

        <ScrollToTopButton scrollContainerRef={mainRef} />
      </div>
    </div>
  );
}

