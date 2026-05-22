import { useState, useEffect } from 'react';
import { CertificateBuilder } from './components/CertificateBuilder';
import { AdminPanel } from './components/AdminPanel';
import { Settings, PenTool } from 'lucide-react';
import { FONT_OPTIONS } from './lib/constants';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [tab, setTab] = useState<'build' | 'admin'>('build');
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    document.fonts.ready.then(() => {
      setFontsLoaded(true);
    });
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Invisible font loader to ensure canvas has access to all custom fonts immediately */}
      <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -100 }}>
         {FONT_OPTIONS.map(font => (
            <span key={font.value} style={{ fontFamily: font.value }}>{font.label} abc 123 á à ả ã ạ</span>
         ))}
      </div>

      <header className="h-14 sm:h-16 shrink-0 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center px-4 sm:px-6 shadow-sm z-20 justify-between relative">
        <div className="flex items-center gap-2 sm:gap-3">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md"
          >
            C
          </motion.div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight flex items-center gap-1">
            VinhDanh <span className="text-slate-500 font-medium hidden sm:inline">- ThayDat.Edu.Vn</span>
          </h1>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200/60">
          <button 
            onClick={() => setTab('build')}
            className={`relative flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-colors z-10 ${tab === 'build' ? 'text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
          >
            {tab === 'build' && (
              <motion.div layoutId="nav-pill" className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200" style={{ zIndex: -1 }} />
            )}
            <PenTool size={16} /> <span className="hidden sm:inline">Tạo Chứng Nhận</span>
          </button>
          <button 
            onClick={() => setTab('admin')}
            className={`relative flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-colors z-10 ${tab === 'admin' ? 'text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
          >
            {tab === 'admin' && (
              <motion.div layoutId="nav-pill" className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200" style={{ zIndex: -1 }} />
            )}
            <Settings size={16} /> <span className="hidden sm:inline">Quản lý Mẫu</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full w-full"
          >
            {tab === 'build' ? <CertificateBuilder /> : <AdminPanel />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
