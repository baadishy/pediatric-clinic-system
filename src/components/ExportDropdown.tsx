import React, { useState, useRef, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  FileDown, 
  Loader2, 
  CheckCircle, 
  ChevronDown, 
  AlertCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { exportToWord, exportToExcel, exportToPdf, ExportPayload } from '../lib/exportUtils';
import { Language } from '../lib/translations';

interface ExportDropdownProps {
  lang: Language;
  getPayload: () => ExportPayload | Promise<ExportPayload>;
  buttonText?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export default function ExportDropdown({
  lang,
  getPayload,
  buttonText,
  className = '',
  variant = 'outline',
  size = 'default'
}: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingType, setLoadingType] = useState<'word' | 'excel' | 'pdf' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const t = {
    export: lang === 'ar' ? 'تصدير التقارير' : 'Export Reports',
    waiting: lang === 'ar' ? 'جاري تجهيز الملف...' : 'Preparing file...',
    success: lang === 'ar' ? 'تم تصدير الملف بنجاح!' : 'File exported successfully!',
    error: lang === 'ar' ? 'فشل تصدير الملف.' : 'Failed to export file.',
    word: lang === 'ar' ? 'مستند Word (.doc)' : 'Word Document (.doc)',
    excel: lang === 'ar' ? 'جدول Excel (.xls)' : 'Excel Spreadsheet (.xls)',
    pdf: lang === 'ar' ? 'ملف PDF جاهز للطباعة' : 'Printable PDF File'
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = async (format: 'word' | 'excel' | 'pdf') => {
    setLoadingType(format);
    setIsOpen(false);
    
    // Create simulated visual load so user knows work is being processed securely
    toast.loading(t.waiting, { id: 'export-toast' });
    
    try {
      // Lazily resolve payload
      const payload = await getPayload();
      
      // Artificial delay (800ms) to ensure smooth loading transitions
      await new Promise(resolve => setTimeout(resolve, 800));

      if (format === 'word') {
        exportToWord(payload, lang);
      } else if (format === 'excel') {
        exportToExcel(payload, lang);
      } else if (format === 'pdf') {
        exportToPdf(payload, lang);
      }
      
      toast.success(t.success, {
        id: 'export-toast',
        description: payload.filename,
        duration: 3000
      });
    } catch (err) {
      console.error('Export error: ', err);
      toast.error(t.error, {
        id: 'export-toast',
        duration: 4000
      });
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className={`relative inline-block w-full sm:w-auto ${className}`} ref={dropdownRef} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <Button
        variant={variant}
        size={size}
        disabled={loadingType !== null}
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-[1.25rem] border-2 border-slate-200 hover:border-sky-500 dark:border-slate-800 dark:hover:border-sky-500 font-extrabold flex items-center justify-between sm:justify-center gap-2 h-11 px-4 transition-all !text-slate-800 dark:!text-slate-200 select-none shadow-sm focus:ring-2 focus:ring-sky-500/20 active:scale-95 bg-white dark:bg-slate-900 w-full sm:w-auto"
      >
        <span className="flex items-center gap-2">
          {loadingType ? (
            <Loader2 className="h-4 w-4 animate-spin text-sky-500 shrink-0" />
          ) : (
            <FileDown className="h-4 w-4 text-sky-500 shrink-0" />
          )}
          <span>{buttonText || t.export}</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-sky-500' : ''}`} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className={`absolute z-50 mt-2 w-full sm:w-64 bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800/80 shadow-2xl p-2 cursor-default ${
              lang === 'ar' ? 'left-0 origin-top-left' : 'right-0 origin-top-right'
            }`}
          >
            <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-wider select-none border-b dark:border-slate-800 border-slate-100 mb-1">
              {lang === 'ar' ? 'اختر صيغة التصدير' : 'Choose Export Format'}
            </div>

            {/* Word Button */}
            <button
              onClick={() => handleExport('word')}
              className="w-full rounded-2xl p-3 flex items-center gap-3 hover:bg-sky-50/60 dark:hover:bg-sky-950/25 transition-all text-start"
            >
              <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center text-indigo-500 dark:text-indigo-400 shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black text-slate-800 dark:text-slate-100">{t.word}</div>
                <div className="text-[10px] text-slate-400 capitalize">{lang === 'ar' ? 'للتعديل والطباعة على Word' : 'Editable Word processing document'}</div>
              </div>
            </button>

            {/* Excel Button */}
            <button
              onClick={() => handleExport('excel')}
              className="w-full rounded-2xl p-3 flex items-center gap-3 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/25 transition-all text-start"
            >
              <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black text-slate-800 dark:text-slate-100">{t.excel}</div>
                <div className="text-[10px] text-slate-400 capitalize">{lang === 'ar' ? 'لفتح الجداول على Excel مباشرة' : 'Direct structured spreadsheet loading'}</div>
              </div>
            </button>

            {/* PDF Button */}
            <button
              onClick={() => handleExport('pdf')}
              className="w-full rounded-2xl p-3 flex items-center gap-3 hover:bg-sky-50/60 dark:hover:bg-sky-950/25 transition-all text-start"
            >
              <div className="h-10 w-10 bg-sky-50 dark:bg-sky-950/40 rounded-xl flex items-center justify-center text-sky-500 dark:text-sky-400 shrink-0">
                <FileDown className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black text-slate-800 dark:text-slate-100">{t.pdf}</div>
                <div className="text-[10px] text-slate-400 capitalize">{lang === 'ar' ? 'تقرير منسق جاهز للحفظ والطباعة' : 'Pre-styled printer report layout'}</div>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
