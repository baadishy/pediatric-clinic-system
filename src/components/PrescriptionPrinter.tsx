import * as React from 'react';
import { useEffect, useState, useRef } from 'react';
import { api, ClinicSettings } from '../services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Printer, 
  Calendar, 
  MapPin, 
  Phone, 
  Sliders, 
  Move, 
  Save, 
  RotateCcw, 
  Upload, 
  Eye, 
  EyeOff, 
  Check, 
  Activity, 
  Settings2,
  Trash2,
  HelpCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { motion } from 'motion/react';
import { QRCodeCanvas } from 'qrcode.react';
import { translations, Language } from '../lib/translations';

const FACEBOOK_URL = "https://www.facebook.com/DrMinaPediatricClinic/";

interface FieldConfig {
  top: number;       // in cm
  left: number;      // in cm
  fontSize: number;  // in px/pt
  width?: number;    // in cm
}

interface MedicationsConfig extends FieldConfig {
  gap: number;       // in px
}

interface QRConfig extends FieldConfig {
  size: number;      // in px
}

interface LayoutConfig {
  patient_name: FieldConfig;
  date: FieldConfig;
  age: FieldConfig;
  weight: FieldConfig;
  temperature: FieldConfig;
  height: FieldConfig;
  head_circumference: FieldConfig;
  diagnosis: FieldConfig;
  rx: FieldConfig;
  medications: MedicationsConfig;
  qr: QRConfig;
  revisit: FieldConfig;
}

// Dr. Mina's physical layout presets in cm
const DEFAULT_LAYOUT: LayoutConfig = {
  patient_name: { top: 4.35, left: 1.9, fontSize: 15, width: 6.5 },
  date: { top: 5.05, left: 1.9, fontSize: 13, width: 6.5 },
  age: { top: 5.75, left: 1.9, fontSize: 13, width: 6.5 },
  weight: { top: 4.35, left: 9.6, fontSize: 13, width: 5.5 },
  temperature: { top: 5.05, left: 10.2, fontSize: 13, width: 4.5 },
  height: { top: 5.75, left: 9.3, fontSize: 12, width: 2.5 },
  head_circumference: { top: 5.75, left: 13.0, fontSize: 12, width: 2.5 },
  diagnosis: { top: 7.0, left: 1.2, fontSize: 14, width: 14.1 },
  rx: { top: 7.6, left: 1.2, fontSize: 32 },
  medications: { top: 8.6, left: 1.2, fontSize: 14, width: 14.1, gap: 15 },
  qr: { top: 18.2, left: 1.2, fontSize: 12, size: 68 },
  revisit: { top: 18.2, left: 9.3, fontSize: 13, width: 6.0 },
};

const FIELD_LABELS: Record<keyof LayoutConfig, { ar: string; en: string }> = {
  patient_name: { ar: 'اسم المريض', en: 'Patient Name' },
  date: { ar: 'التاريخ', en: 'Date' },
  age: { ar: 'السن / العمر', en: 'Age' },
  weight: { ar: 'الوزن (Wt)', en: 'Weight' },
  temperature: { ar: 'الحرارة (Temp)', en: 'Temperature' },
  height: { ar: 'الطول (HT)', en: 'Height (HT)' },
  head_circumference: { ar: 'محيط الرأس (HC)', en: 'Head Circumference (HC)' },
  diagnosis: { ar: 'التشخيص', en: 'Diagnosis' },
  rx: { ar: 'رمز الروشتة (Rx)', en: 'Rx Symbol' },
  medications: { ar: 'قائمة الأدوية والجرعات', en: 'Medications List' },
  qr: { ar: 'موقع الفيسبوك (QR Code)', en: 'Facebook QR Code' },
  revisit: { ar: 'موعد إعادة الاستشارة', en: 'Revisit Date' },
};

export default function PrescriptionPrinter({ prescriptionId, lang = 'ar' }: { prescriptionId: string | null, lang?: Language }) {
  const [data, setData] = useState<any>(null);
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const t = translations[lang];
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [printMode, setPrintMode] = useState<'standard' | 'preprinted'>(() => {
    const saved = localStorage.getItem('prescription_print_mode');
    return (saved === 'standard' || saved === 'preprinted') ? saved : 'preprinted';
  });

  // Calibration and layout configuration States
  const [calibrationMode, setCalibrationMode] = useState<boolean>(false);
  const [selectedField, setSelectedField] = useState<keyof LayoutConfig | null>('patient_name');
  const [showNotification, setShowNotification] = useState<string | null>(null);

  const [layout, setLayout] = useState<LayoutConfig>(() => {
    const saved = localStorage.getItem('prescription_layout_config');
    if (saved) {
      try {
        return { ...DEFAULT_LAYOUT, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_LAYOUT;
      }
    }
    return DEFAULT_LAYOUT;
  });

  // Scanned custom background image
  const [bgImage, setBgImage] = useState<string | null>(() => {
    return localStorage.getItem('prescription_bg_image');
  });

  const [showDesignGuide, setShowDesignGuide] = useState<boolean>(true);

  // Auto-fetch data
  useEffect(() => {
    if (prescriptionId) {
      api.getPrescription(prescriptionId).then(setData).catch(console.error);
    }
    // Load and synchronize clinic settings, layout dimensions, and preprinted background scans
    api.getClinicSettings().then(settingsResult => {
      setSettings(settingsResult);
      if (settingsResult) {
        if (settingsResult.layout) {
          try {
            setLayout(settingsResult.layout);
            localStorage.setItem('prescription_layout_config', JSON.stringify(settingsResult.layout));
          } catch (e) {
            console.error("Failed to parse settings.layout from network:", e);
          }
        }
        if (settingsResult.bg_image) {
          setBgImage(settingsResult.bg_image);
          localStorage.setItem('prescription_bg_image', settingsResult.bg_image);
        }
      }
    }).catch(console.error);
  }, [prescriptionId]);

  const handleModeChange = (mode: 'standard' | 'preprinted') => {
    setPrintMode(mode);
    localStorage.setItem('prescription_print_mode', mode);
  };

  const handleSaveLayout = async () => {
    try {
      localStorage.setItem('prescription_layout_config', JSON.stringify(layout));
      
      const updatedSettings = {
        ...(settings || { name: "Dr. Mina Pediatric Clinic", address: "6th of October City", phone: "0123456789" }),
        layout
      };
      
      await api.updateClinicSettings(updatedSettings as any);
      setSettings(updatedSettings as any);
      
      triggerNotification(
        lang === 'ar' 
          ? 'تم حفظ أبعاد الروشتة ومقاساتها في قاعدة البيانات السحابية بنجاح!' 
          : 'Prescription size and offset configs saved to cloud database successfully!'
      );
    } catch (err: any) {
      console.error("Error saving layout configs to database:", err);
      triggerNotification(
        lang === 'ar'
          ? 'تم الحفظ محلياً! تعذر الاتصال بقاعدة البيانات لحفظ الأبعاد'
          : 'Saved locally inside client! Error synchronizing with the cloud database.'
      );
    }
  };

  const handleResetLayout = async () => {
    if (window.confirm(lang === 'ar' ? 'هل أنت متأكد من استعادة المقاسات الافتراضية؟' : 'Reset all coordinates to factory defaults?')) {
      try {
        setLayout(DEFAULT_LAYOUT);
        localStorage.setItem('prescription_layout_config', JSON.stringify(DEFAULT_LAYOUT));
        
        const updatedSettings = {
          ...(settings || { name: "Dr. Mina Pediatric Clinic", address: "6th of October City", phone: "0123456789" }),
          layout: DEFAULT_LAYOUT
        };
        await api.updateClinicSettings(updatedSettings as any);
        setSettings(updatedSettings as any);
        
        triggerNotification(
          lang === 'ar' 
            ? 'تمت استعادة المقاسات الافتراضية وحفظها بقاعدة البيانات السحابية' 
            : 'Factory settings restored and updated in the cloud database'
        );
      } catch (err: any) {
        console.error("Error resetting layout:", err);
        triggerNotification(
          lang === 'ar'
            ? 'تمت إعادة الضبط محلياً فقط! فشل تحديث قاعدة البيانات'
            : 'Restored locally! Failed to update the cloud database coordinates'
        );
      }
    }
  };

  const triggerNotification = (message: string) => {
    setShowNotification(message);
    setTimeout(() => setShowNotification(null), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Image upload, compress (within 1200 max dim), upload to Cloudinary with secure proxy, fallback to MongoDB
  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerNotification(lang === 'ar' ? 'جاري ضغط ومعالجة الصورة في الخلفية...' : 'Optimizing and compressing image baseline...');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        // Standard A5 aspect representation with high density printable resolution (safeguards MongoDB index limits < 16MB)
        const maxDim = 1200;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          try {
            const base64 = canvas.toDataURL('image/jpeg', 0.85);
            triggerNotification(lang === 'ar' ? 'جاري رفع الملف إلى مساحة التخزين السحابية...' : 'Deploying preprinted template to secure cloud storage...');
            
            try {
              // 1. Send base64 package to server for Cloudinary signing & upload
              const response = await api.uploadToCloudinary(base64);
              const cloudUrl = response.url;
              
              localStorage.setItem('prescription_bg_image', cloudUrl);
              setBgImage(cloudUrl);
              
              // 2. Persist settings
              const updatedSettings = {
                ...(settings || { name: "Dr. Mina Pediatric Clinic", address: "6th of October City", phone: "0123456789" }),
                bg_image: cloudUrl
              };
              await api.updateClinicSettings(updatedSettings as any);
              setSettings(updatedSettings as any);
              
              triggerNotification(
                lang === 'ar' 
                  ? 'تم حفظ ورفع صورة الروشتة الحقيقية بنجاح على جميع الأجهزة!' 
                  : 'Scanned prescription template hosted on Cloudinary & synchronized across all devices!'
              );
            } catch (cloudErr: any) {
              console.warn("Cloudinary upload failed, using robust direct MongoDB fallback syncing:", cloudErr);
              
              // 3. Fallback: Store compressed JPEG base64 directly in MongoDB settings
              localStorage.setItem('prescription_bg_image', base64);
              setBgImage(base64);
              
              const updatedSettings = {
                ...(settings || { name: "Dr. Mina Pediatric Clinic", address: "6th of October City", phone: "0123456789" }),
                bg_image: base64
              };
              await api.updateClinicSettings(updatedSettings as any);
              setSettings(updatedSettings as any);
              
              triggerNotification(
                lang === 'ar'
                  ? 'تم حفظ خلفية الروشتة مباشرة بقاعدة بيانات MongoDB بنجاح للفصل عبر الأجهزة!'
                  : 'Saved and synchronized preprinted background directly inside MongoDB database!'
              );
            }
          } catch (err: any) {
            console.error("Failed to generate file payload:", err);
            alert(lang === 'ar' ? 'فشل ضغط ومعالجة الصورة.' : 'Failed to compress or build base64 payload.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleClearBgImage = async () => {
    try {
      localStorage.removeItem('prescription_bg_image');
      setBgImage(null);
      
      const updatedSettings = {
        ...(settings || { name: "Dr. Mina Pediatric Clinic", address: "6th of October City", phone: "0123456789" })
      };
      delete (updatedSettings as any).bg_image;
      
      await api.updateClinicSettings(updatedSettings as any);
      setSettings(updatedSettings as any);
      
      triggerNotification(
        lang === 'ar' 
          ? 'تم مسح صورة الخلفية من الذاكرة ومن قاعدة البيانات بنجاح' 
          : 'Scanned template image purged from memory and database storage!'
      );
    } catch (err: any) {
      console.error("Error clearing context background image:", err);
      triggerNotification(
        lang === 'ar' ? 'حدث خطأ أثناء إلغاء صورة الروشتة' : 'Error clearing background image from database'
      );
    }
  };

  // Custom coordinate nudge helper
  const adjustField = (key: keyof LayoutConfig, prop: keyof FieldConfig | 'gap' | 'size', delta: number) => {
    setLayout(prev => {
      const field = prev[key];
      let value = (field as any)[prop] || 0;
      value = Math.max(0, Math.round((value + delta) * 100) / 100);
      return {
        ...prev,
        [key]: {
          ...field,
          [prop]: value
        }
      };
    });
  };

  // Drag and drop event handlers
  const handlePointerDown = (fieldKey: keyof LayoutConfig, e: React.MouseEvent | React.TouchEvent) => {
    if (!calibrationMode) return;
    
    // Select this field on click
    setSelectedField(fieldKey);

    const isTouch = e.type === 'touchstart';
    const clientX = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;

    const initialLeft = layout[fieldKey].left;
    const initialTop = layout[fieldKey].top;

    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    // A5 dimensions are physically 16.5cm width
    const pxPerCm = containerRect.width / 16.5;

    const handlePointerMove = (moveEvent: MouseEvent | TouchEvent) => {
      const curX = moveEvent.type === 'touchmove' 
        ? (moveEvent as TouchEvent).touches[0].clientX 
        : (moveEvent as MouseEvent).clientX;
      const curY = moveEvent.type === 'touchmove' 
        ? (moveEvent as TouchEvent).touches[0].clientY 
        : (moveEvent as MouseEvent).clientY;

      const deltaX = (curX - clientX) / pxPerCm;
      const deltaY = (curY - clientY) / pxPerCm;

      setLayout(prev => {
        // Round to nearest 0.05cm (half milimeter steps) for perfect printing layout grid alignment
        const calculatedLeft = Math.max(0, Math.min(16.5, Math.round((initialLeft + deltaX) * 20) / 20));
        const calculatedTop = Math.max(0, Math.min(24, Math.round((initialTop + deltaY) * 20) / 20));
        
        return {
          ...prev,
          [fieldKey]: {
            ...prev[fieldKey],
            left: calculatedLeft,
            top: calculatedTop
          }
        };
      });
    };

    const handlePointerUp = () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('touchend', handlePointerUp);
  };

  if (!prescriptionId) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Card className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 border-dashed border-2">
          {t.no_prescription}
        </Card>
      </motion.div>
    );
  }

  if (!data || !settings) return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-500">
      <div className="h-8 w-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
      {t.loading_data}
    </div>
  );

  const formatAge = (months?: number, days?: number) => {
    if (months === undefined) return '';
    const y = Math.floor(months / 12);
    const m = months % 12;
    const d = days || 0;
    
    if (lang === 'ar') {
      let result = '';
      if (y > 0) result += `${y} ${t.years}`;
      if (y > 0 && (m > 0 || d > 0)) result += ' و ';
      if (m > 0) result += `${m} ${t.months}`;
      if (m > 0 && d > 0) result += ' و ';
      if (d > 0 || (y === 0 && m === 0)) result += `${d} ${t.days}`;
      return result;
    } else {
      let result = '';
      if (y > 0) result += `${y} ${y === 1 ? 'Year' : 'Years'}`;
      if (y > 0 && (m > 0 || d > 0)) result += ', ';
      if (m > 0) result += `${m} ${m === 1 ? 'Month' : 'Months'}`;
      if (m > 0 && d > 0) result += ', ';
      if (d > 0 || (y === 0 && m === 0)) result += `${d} ${d === 1 ? 'Day' : 'Days'}`;
      return result;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Dynamically injected print styles containing target CSS overrides and page margins */}
      {printMode === 'preprinted' ? (
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: 16.5cm 24cm;
              margin: 0 !important;
            }
            body {
              visibility: hidden !important;
              background: transparent !important;
              margin: 0 !important;
              padding: 0 !important;
              height: 24cm !important;
              overflow: hidden !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            /* Reset offset and position properties of all ancestor container items during print */
            #root, [dir], .min-h-screen, main, section, .space-y-6, .grid, .col-span-1, div {
              display: block !important;
              position: static !important;
              transform: none !important;
              filter: none !important;
              opacity: 1 !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
              background: transparent !important;
              height: auto !important;
              width: auto !important;
              min-height: 0 !important;
              max-height: none !important;
              min-width: 0 !important;
              max-width: none !important;
            }
            /* Explicitly set only the target container visible */
            #print-section, #print-section * {
              visibility: visible !important;
            }
            #print-section {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 16.5cm !important;
              height: 24cm !important;
              min-height: 24cm !important;
              max-height: 24cm !important;
              overflow: hidden !important;
              background: transparent !important;
              z-index: 99999 !important;
            }
            .no-print, .print-bg-mockup, .print-only-visual, .calibration-badge {
              display: none !important;
            }
          }
        ` }} />
      ) : (
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 15mm !important;
            }
            body {
              visibility: hidden !important;
              background: #ffffff !important;
              margin: 0 !important;
              padding: 0 !important;
              height: auto !important;
              overflow: visible !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            /* Reset offset and position properties of all ancestor container items during print */
            #root, [dir], .min-h-screen, main, section, .space-y-6, .grid, .col-span-1, div {
              display: block !important;
              position: static !important;
              transform: none !important;
              filter: none !important;
              opacity: 1 !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
              background: transparent !important;
              height: auto !important;
              width: auto !important;
              min-height: 0 !important;
              max-height: none !important;
              min-width: 0 !important;
              max-width: none !important;
            }
            /* Explicitly set only the target container visible */
            #print-section, #print-section * {
              visibility: visible !important;
            }
            #print-section {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              min-height: 25cm !important;
              background: #ffffff !important;
              z-index: 99999 !important;
              box-shadow: none !important;
              border: none !important;
            }
            .no-print, .print-bg-mockup, .print-only-visual {
              display: none !important;
            }
          }
        ` }} />
      )}

      {/* Mode Controls & Header Container */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center no-print px-4 sm:px-0 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2 mb-1">
            <Activity className="h-5 w-5 text-sky-600 animate-pulse" />
            {t.prescription_preview}
          </h2>
          <p className="text-xs text-slate-400">
            {lang === 'ar' 
              ? 'تخصيص كامل وتحكم متقدم في أبعاد الورق الجاهز أو الأبيض' 
              : 'Customize prescription printing layout & align to real preprinted papers'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Custom persist mode toggler */}
          <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-2xl border border-slate-300/40 dark:border-slate-700/60">
            <button
              onClick={() => handleModeChange('preprinted')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                printMode === 'preprinted' 
                  ? 'bg-sky-600 text-white shadow-md' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {lang === 'ar' ? 'روشتة جاهزة مطبوعة' : 'Pre-printed Paper'}
            </button>
            <button
              onClick={() => handleModeChange('standard')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                printMode === 'standard' 
                  ? 'bg-sky-600 text-white shadow-md' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {lang === 'ar' ? 'ورق أبيض فارغ' : 'Plain Blank Paper'}
            </button>
          </div>

          {printMode === 'preprinted' && (
            <Button 
              onClick={() => setCalibrationMode(!calibrationMode)} 
              variant={calibrationMode ? "default" : "outline"}
              className={`flex gap-2 rounded-2xl h-10 px-4 font-black text-xs ${
                calibrationMode ? "bg-amber-600 text-white hover:bg-amber-700" : "border-slate-300 dark:border-slate-700"
              }`}
            >
              <Sliders className="h-4 w-4" />
              {calibrationMode 
                ? (lang === 'ar' ? 'أغلق لوحة الضبط' : 'Stop Calibration') 
                : (lang === 'ar' ? 'ضبط المسافات (بالمسطرة)' : 'Adjust Spacing (Ruler)')
              }
            </Button>
          )}

          <Button 
            onClick={handlePrint} 
            className="bg-sky-600 hover:bg-sky-700 text-white flex gap-2 shadow-lg shadow-sky-500/20 rounded-2xl h-10 px-5 font-black text-sm ml-auto md:ml-0"
          >
            <Printer className="h-4 w-4" />
            {t.print_prescription}
          </Button>
        </div>
      </div>

      {/* Interactive Calibration Guide Notification Warning banner */}
      {calibrationMode && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-start gap-3 no-print mx-4 sm:mx-0">
          <HelpCircle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
          <div className="space-y-1">
            <p className="font-extrabold text-amber-950 dark:text-amber-100">
              {lang === 'ar' ? 'بوابة المعايرة وضبط المحاذاة الفيزيائية' : 'Physical Realignment Portal'}
            </p>
            <p className="text-xs leading-relaxed opacity-90">
              {lang === 'ar' 
                ? 'يمكنك سحب وإفلات العناصر مباشرة على الروشتة لتعديل أماكنها، أو استخدام لوحة التحكم الجانبية لتعديل الحجم والمسافات والمقاسات بدقة السنتيمتر والمليمتر. لا تقلق، لن يتم طباعة الخلفية الملونة إطلاقاً على الورق الجاهز للعيادة.'
                : 'Drag and drop labels directly on the model, or use the sliders in the sidebar for millimeter-precise offsets. Background graphics will auto-hide completely when printing on your real prescription paper.'
              }
            </p>
          </div>
        </div>
      )}

      {/* Main Splitted Grid Layout (Calibrator Left Side, Prescription Preview Right Side) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start px-4 sm:px-0">
        
        {/* LEFT COMPONENT: Interactive Calibrator Panel (Visible only in Calibration Mode) */}
        {printMode === 'preprinted' && calibrationMode && (
          <div className="lg:col-span-4 space-y-4 no-print bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-xl">
            <div className="flex items-center justify-between border-b pb-3 border-slate-150">
              <h3 className="font-extrabold text-[#111827] dark:text-slate-100 text-sm sm:text-base flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-sky-600" />
                {lang === 'ar' ? 'لوحة المقاسات والمسافات' : 'Layout Calibration'}
              </h3>
              <Button 
                onClick={handleSaveLayout}
                size="sm" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs flex gap-1 font-bold h-8 px-3"
              >
                <Save className="h-3.5 w-3.5" />
                {lang === 'ar' ? 'حفظ الأبعاد' : 'Save Sizes'}
              </Button>
            </div>

            {/* Field Selection dropdown */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 block">
                {lang === 'ar' ? 'اختر الجزء المراد سحبه وضبطه:' : 'Select element to adjust:'}
              </label>
              <select
                value={selectedField || ''}
                onChange={(e) => setSelectedField(e.target.value as keyof LayoutConfig)}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs py-2 px-3 font-semibold dark:text-white"
              >
                {Object.keys(DEFAULT_LAYOUT).map((k) => (
                  <option key={k} value={k}>
                    {lang === 'ar' ? FIELD_LABELS[k as keyof LayoutConfig].ar : FIELD_LABELS[k as keyof LayoutConfig].en}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected segment offset controllers */}
            {selectedField && (
              <div className="space-y-4 pt-2 bg-slate-50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-sky-800 dark:text-sky-300">
                    {lang === 'ar' ? FIELD_LABELS[selectedField].ar : FIELD_LABELS[selectedField].en}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                    cm coords
                  </span>
                </div>

                {/* Coordinate Top Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500">{lang === 'ar' ? 'الارتفاع من الأعلى (Top):' : 'Vertical offset (Top):'}</span>
                    <span className="text-sky-600">{layout[selectedField].top.toFixed(2)} cm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="24"
                      step="0.05"
                      value={layout[selectedField].top}
                      onChange={(e) => setLayout(prev => ({
                        ...prev,
                        [selectedField]: { ...prev[selectedField], top: parseFloat(e.target.value) }
                      }))}
                      className="flex-grow accent-sky-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex shrink-0">
                      <button onClick={() => adjustField(selectedField, 'top', -0.05)} className="w-6 h-6 rounded-l bg-slate-200 dark:bg-slate-800 text-xs font-bold font-mono">-</button>
                      <button onClick={() => adjustField(selectedField, 'top', 0.05)} className="w-6 h-6 rounded-r bg-slate-200 dark:bg-slate-800 text-xs font-bold font-mono">+</button>
                    </div>
                  </div>
                </div>

                {/* Coordinate Left Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500">{lang === 'ar' ? 'المسافة من اليسار (Left):' : 'Horizontal offset (Left):'}</span>
                    <span className="text-sky-600">{layout[selectedField].left.toFixed(2)} cm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="16.5"
                      step="0.05"
                      value={layout[selectedField].left}
                      onChange={(e) => setLayout(prev => ({
                        ...prev,
                        [selectedField]: { ...prev[selectedField], left: parseFloat(e.target.value) }
                      }))}
                      className="flex-grow accent-sky-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex shrink-0">
                      <button onClick={() => adjustField(selectedField, 'left', -0.05)} className="w-6 h-6 rounded-l bg-slate-200 dark:bg-slate-800 text-xs font-bold font-mono">-</button>
                      <button onClick={() => adjustField(selectedField, 'left', 0.05)} className="w-6 h-6 rounded-r bg-slate-200 dark:bg-slate-800 text-xs font-bold font-mono">+</button>
                    </div>
                  </div>
                </div>

                {/* Font Size Selector */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500">{lang === 'ar' ? 'حجم الخط (Font Size):' : 'Font size:'}</span>
                    <span className="text-sky-600">{layout[selectedField].fontSize} px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="8"
                      max="48"
                      step="1"
                      value={layout[selectedField].fontSize}
                      onChange={(e) => setLayout(prev => ({
                        ...prev,
                        [selectedField]: { ...prev[selectedField], fontSize: parseInt(e.target.value) }
                      }))}
                      className="flex-grow accent-sky-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex shrink-0">
                      <button onClick={() => adjustField(selectedField, 'fontSize', -1)} className="w-6 h-6 rounded-l bg-slate-200 dark:bg-slate-800 text-xs font-bold font-mono">-</button>
                      <button onClick={() => adjustField(selectedField, 'fontSize', 1)} className="w-6 h-6 rounded-r bg-slate-200 dark:bg-slate-800 text-xs font-bold font-mono">+</button>
                    </div>
                  </div>
                </div>

                {/* Width Controller (if applicable) */}
                {'width' in layout[selectedField] && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">{lang === 'ar' ? 'عرض مربع النص (Width):' : 'Container width:'}</span>
                      <span className="text-sky-600">{layout[selectedField].width?.toFixed(2)} cm</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="1"
                        max="16.5"
                        step="0.05"
                        value={layout[selectedField].width || 10}
                        onChange={(e) => setLayout(prev => ({
                          ...prev,
                          [selectedField]: { ...prev[selectedField], width: parseFloat(e.target.value) }
                        }))}
                        className="flex-grow accent-sky-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex shrink-0">
                        <button onClick={() => adjustField(selectedField, 'width', -0.05)} className="w-6 h-6 rounded-l bg-slate-200 dark:bg-slate-800 text-xs font-bold font-mono">-</button>
                        <button onClick={() => adjustField(selectedField, 'width', 0.05)} className="w-6 h-6 rounded-r bg-slate-200 dark:bg-slate-800 text-xs font-bold font-mono">+</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Medications gap controller */}
                {selectedField === 'medications' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">{lang === 'ar' ? 'التباعد والمسافة بين الأدوية:' : 'Medications spacing gap:'}</span>
                      <span className="text-sky-600">{layout.medications.gap} px</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="2"
                        max="40"
                        step="1"
                        value={layout.medications.gap}
                        onChange={(e) => setLayout(prev => ({
                          ...prev,
                          medications: { ...prev.medications, gap: parseInt(e.target.value) }
                        }))}
                        className="flex-grow accent-sky-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex shrink-0">
                        <button onClick={() => adjustField('medications', 'gap', -1)} className="w-6 h-6 rounded-l bg-slate-200 dark:bg-slate-800 text-xs font-bold font-mono">-</button>
                        <button onClick={() => adjustField('medications', 'gap', 1)} className="w-6 h-6 rounded-r bg-slate-200 dark:bg-slate-800 text-xs font-bold font-mono">+</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* QR code size controller */}
                {selectedField === 'qr' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">{lang === 'ar' ? 'حجم كود QR بالبكسل:' : 'QR Code size:'}</span>
                      <span className="text-sky-600">{layout.qr.size} px</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="30"
                        max="150"
                        step="2"
                        value={layout.qr.size}
                        onChange={(e) => setLayout(prev => ({
                          ...prev,
                          qr: { ...prev.qr, size: parseInt(e.target.value) }
                        }))}
                        className="flex-grow accent-sky-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex shrink-0">
                        <button onClick={() => adjustField('qr', 'size', -2)} className="w-6 h-6 rounded-l bg-slate-200 dark:bg-slate-800 text-xs font-bold font-mono">-</button>
                        <button onClick={() => adjustField('qr', 'size', 2)} className="w-6 h-6 rounded-r bg-slate-200 dark:bg-slate-800 text-xs font-bold font-mono">+</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Background alignment image uploader controls */}
            <div className="pt-2 border-t border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-500 block">
                {lang === 'ar' ? 'صورة الخلفية الفيزيائية للروشتة:' : 'Scanned alignment backdrop:'}
              </span>
              
              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => setShowDesignGuide(!showDesignGuide)} 
                  variant="outline"
                  size="sm"
                  className="rounded-xl flex-grow h-10 border-slate-200 text-xs gap-1.5"
                >
                  {showDesignGuide ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showDesignGuide 
                    ? (lang === 'ar' ? 'إخفاء الدليل اللوني' : 'Hide Colored Mockup') 
                    : (lang === 'ar' ? 'إظهار الدليل اللوني' : 'Show Colored Mockup')
                  }
                </Button>

                {bgImage && (
                  <Button 
                    onClick={handleClearBgImage} 
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-100 text-xs h-10 px-3 shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-center" />
                  </Button>
                )}
              </div>

              {/* Upload image input container */}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBgImageUpload}
                  id="layout-bg-upload"
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
                <div className="border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-4 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all">
                  <Upload className="h-5 w-5 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-[11px] font-black text-slate-600 dark:text-slate-300">
                    {lang === 'ar' ? 'تحميل صورة الروشتة الحقيقية كخلفية' : 'Upload actual scan watermark background'}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-1">
                    {lang === 'ar' ? 'حدد صورتك المرفوعة لتطابق البيانات تماما' : 'Enables pixel-perfect positioning of layouts'}
                  </p>
                </div>
              </div>
            </div>

            {/* General Settings Controls Footer */}
            <div className="flex gap-2 pt-2 border-t text-xs">
              <Button 
                onClick={handleResetLayout} 
                variant="outline" 
                className="rounded-xl flex-1 text-[11px] font-bold border-slate-200 gap-1.5 h-10 text-slate-600"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {lang === 'ar' ? 'استعادة الافتراضي' : 'Reset Factory'}
              </Button>

              <Button 
                onClick={handleSaveLayout} 
                className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl flex-1 text-[11px] font-bold gap-1.5 h-10"
              >
                <Save className="h-3.5 w-3.5" />
                {lang === 'ar' ? 'حفظ وحماية' : 'Save Layout'}
              </Button>
            </div>
          </div>
        )}

        {/* RIGHT COMPONENT: Physical 16.5cm x 24cm Layout Render */}
        <div className={`col-span-1 ${calibrationMode && printMode === 'preprinted' ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
          {printMode === 'preprinted' ? (
            <div className="relative overflow-visible p-0 sm:p-6 sm:rounded-3xl bg-slate-100/40 dark:bg-slate-900/30 border-0 sm:border border-slate-200/50 dark:border-slate-800/40 select-none shadow-inner flex justify-center print:p-0 print:border-none print:shadow-none print:bg-transparent">
              
              {/* Scale reference ruler overlay for real-word measurement verification */}
              <div className="absolute top-1 left-1.5 text-[9px] font-black text-slate-400 flex items-center gap-1 opacity-70 shrink-0 no-print">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                <span>{lang === 'ar' ? 'معامل أبعاد الطباعة الحقيقي A5 (عرض 16.5سم وارتفاع 24سم)' : '16.5cm x 24cm (A5 physical paper scale)'}</span>
              </div>

              {/* Physical A5 preview canvas boundaries representation */}
              <motion.div 
                ref={containerRef}
                id="print-section" 
                className={`bg-white shadow-2xl mx-auto relative overflow-hidden transition-all duration-200 border border-slate-300/60 print:border-none print:shadow-none print-preprinted ${
                  calibrationMode ? 'ring-4 ring-sky-500/20' : ''
                }`}
                style={{ 
                  width: '16.5cm', 
                  height: '24cm', 
                  minWidth: '16.5cm', 
                  maxWidth: '16.5cm', 
                  minHeight: '24cm', 
                  maxHeight: '24cm' 
                }}
              >
                
                {/* 1. LAYER 1: SCANNED REAL CUSTOM BACKGROUND IMAGE (Persisted in localStorage, hidden during actual print) */}
                {bgImage && (
                  <img 
                    src={bgImage} 
                    alt="Prescription Scan Mockup" 
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none print-bg-mockup opacity-75 z-0"
                    style={{ 
                      width: '16.5cm', 
                      height: '24cm',
                      display: showDesignGuide ? 'block' : 'none' 
                    }}
                  />
                )}

                {/* 2. LAYER 2: HIGH FIDELITY SIMULATED SVG PREPRINTED HEADER & FOOTER DESIGN (Shown if no bg is active and design is enabled) */}
                {!bgImage && showDesignGuide && (
                  <div className="absolute inset-0 pointer-events-none select-none flex flex-col print-bg-mockup bg-white" style={{ width: '16.5cm', height: '24cm' }}>
                    {/* Top Graphic Shapes (Blue/Cyan/Yellow diagonal shapes from top left) */}
                    <svg className="absolute top-0 left-0 w-[55%] h-[90px]" viewBox="0 0 350 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M-50 -20 H300 L250 90 H-50 Z" fill="url(#blueGrad)" opacity="0.95" />
                      <path d="M-50 -20 H250 L210 90 H-50 Z" fill="url(#tealGrad)" opacity="0.95" />
                      <path d="M-50 -20 H180 L150 90 H-50 Z" fill="url(#cyanGrad)" opacity="0.95" />
                      <path d="M-50 -20 H120 L95 90 H-50 Z" fill="#eab308" opacity="0.95" />
                      <defs>
                        <linearGradient id="blueGrad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#1e3a8a" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                        <linearGradient id="tealGrad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#0f766e" />
                          <stop offset="100%" stopColor="#0d9488" />
                        </linearGradient>
                        <linearGradient id="cyanGrad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#0891b2" />
                          <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                      </defs>
                    </svg>
                    
                    {/* Clinic Header Texts */}
                    <div className="px-6 pt-[12px] pb-2 flex justify-between items-start z-10">
                      <div className="text-right flex-grow pr-28">
                        <h1 className="text-[20px] font-black text-sky-950 block leading-tight" style={{ fontFamily: 'Cairo, sans-serif' }}>د/ مينا سمير فرج الله</h1>
                        <p className="text-[9px] font-extrabold text-[#c22d2d] leading-normal" style={{ fontFamily: 'Cairo, sans-serif' }}>استشاري الأطفال وحديثي الولادة - الزمالة المصرية لطب الأطفال</p>
                        <p className="text-[8px] font-bold text-sky-900 leading-none mt-0.5" style={{ fontFamily: 'Cairo, sans-serif' }}>دراسات عليا كلية الطب بجامعة هارفارد</p>
                      </div>
                      <div className="text-left flex flex-col items-center shrink-0">
                        {/* Circle logo */}
                        <div className="relative w-[65px] h-[65px] rounded-full border border-teal-500/30 flex items-center justify-center bg-white p-1">
                          <svg viewBox="0 0 100 100" className="w-full h-full">
                            <circle cx="50" cy="50" r="46" stroke="#1d4ed8" strokeWidth="2.5" fill="none" />
                            <path d="M50,75 C25,55 25,35 50,18 C75,35 75,55 50,75 Z" fill="#eb4899" opacity="0.1" />
                            <path d="M30,50 C32,65 42,72 50,75 C41,71 34,58 35,46 C35,43 32,45 30,50 Z" fill="#eb4899" />
                            <path d="M70,50 C68,65 58,72 50,75 C59,71 66,58 65,46 C65,43 68,45 70,50 Z" fill="#3b82f6" />
                            <circle cx="50" cy="40" r="8" fill="#a5f3fc" />
                            <path d="M50,48 C43,48 38,55 45,63 C49,67 51,67 55,63 C62,55 57,48 50,48 Z" fill="#38bdf8" />
                          </svg>
                          <div className="absolute -bottom-1 text-center bg-white px-1 leading-none">
                            <span className="text-[7.5px] font-black text-[#1d4ed8] uppercase block scale-90">dr. mina</span>
                            <span className="text-[5.5px] text-teal-600 font-extrabold uppercase block scale-75 -mt-0.5">pediatric</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Top Teal Horizontal layout Bar */}
                    <div className="h-[4px] bg-[#00828a] w-full" />

                    {/* Dotted outlines and preprinted physical lines */}
                    <div className="px-6 py-3 grid grid-cols-2 gap-x-12 gap-y-[9px] text-right text-slate-700">
                      <div className="space-y-[9px]">
                        <div className="text-[11px] font-bold text-[#b91c1c] flex items-center justify-between pointer-events-none select-none">
                          <span className="font-extrabold pb-0.5">Name:</span>
                          <div className="flex-grow mx-1 border-b border-dotted border-slate-300 h-3" />
                        </div>
                        <div className="text-[11px] font-bold text-[#b91c1c] flex items-center justify-between pointer-events-none select-none">
                          <span className="font-extrabold pb-0.5">Date:</span>
                          <div className="flex-grow mx-1 border-b border-dotted border-slate-300 h-3" />
                        </div>
                        <div className="text-[11px] font-bold text-[#b91c1c] flex items-center justify-between pointer-events-none select-none">
                          <span className="font-extrabold pb-0.5">Age:</span>
                          <div className="flex-grow mx-1 border-b border-dotted border-slate-300 h-3" />
                        </div>
                      </div>
                      
                      <div className="space-y-[9px]">
                        <div className="text-[11px] font-bold text-[#b91c1c] flex items-center justify-between pointer-events-none select-none">
                          <span className="font-extrabold pb-0.5">Wt:</span>
                          <div className="flex-grow mx-1 border-b border-dotted border-slate-300 h-3" />
                        </div>
                        <div className="text-[11px] font-bold text-[#b91c1c] flex items-center justify-between pointer-events-none select-none">
                          <span className="font-extrabold pb-0.5">Temp:</span>
                          <div className="flex-grow mx-1 border-b border-dotted border-slate-300 h-3" />
                        </div>
                        <div className="text-[11px] font-bold text-[#b91c1c] flex gap-4 w-full justify-between select-none">
                          <div className="flex items-center w-[48%]">
                            <span className="font-extrabold pb-0.5">HT:</span>
                            <div className="flex-grow mx-1 border-b border-dotted border-slate-300 h-3" />
                          </div>
                          <div className="flex items-center w-[48%]">
                            <span className="font-extrabold pb-0.5">HC:</span>
                            <div className="flex-grow mx-1 border-b border-dotted border-slate-300 h-3" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Intermediate medical border */}
                    <div className="h-[4px] bg-[#00828a] w-full" />

                    {/* Watermark Logo positioned exactly in center background */}
                    <div className="flex-grow flex items-center justify-center opacity-[0.05] relative">
                      <svg viewBox="0 0 100 100" className="w-[280px] h-[280px]">
                        <path d="M50,75 C25,55 25,35 50,18 C75,35 75,55 50,75 Z" fill="#eb4899" />
                        <path d="M30,50 C32,65 42,72 50,75 C41,71 34,58 35,46" stroke="#eb4899" strokeWidth="1" fill="none" />
                        <path d="M70,50 C68,65 58,72 50,75 C59,71 66,58 65,46" stroke="#3b82f6" strokeWidth="1" fill="none" />
                        <circle cx="50" cy="40" r="7" fill="#22d3ee" />
                      </svg>
                      <div className="absolute text-center select-none" style={{ bottom: '20px' }}>
                        <span className="text-[28px] font-black text-blue-900/15 uppercase block tracking-wider">DR. MINA</span>
                        <span className="text-[11px] text-teal-600/15 font-black uppercase block tracking-[5px] -mt-1">pediatric clinic</span>
                      </div>
                    </div>

                    {/* Preprinted footer bar with details */}
                    <div className="relative mt-auto w-full flex flex-col px-6 pb-[24px]">
                      {/* consultation re-booking banner */}
                      <div className="flex justify-end mb-2">
                        <div className="bg-[#113254] text-white px-4 py-1.5 rounded-xl text-[9px] font-black" style={{ fontFamily: 'Cairo, sans-serif' }}>
                          الاستشارة خلال أسبوع
                        </div>
                      </div>
                      
                      {/* Thick teal bar */}
                      <div className="h-[2px] bg-[#00828a] w-full mb-2" />
                      
                      <div className="flex justify-between items-center text-[8.5px] font-black text-sky-950 mt-1" style={{ fontFamily: 'Cairo, sans-serif' }}>
                        <div className="text-right">العنوان: المنيا - شارع الحسيني شرق مطعم المحمدي للمشويات</div>
                        <div className="text-left" dir="ltr">للحجز والاستعلام: 01064646319</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. LAYER 3: THE DYNAMIC ALIGNABLE INK OVERLAYS (DRAGGABLE & RESIZABLE VIA CALIBRATION) */}
                
                {/* Patient Name */}
                <div 
                  onMouseDown={(e) => handlePointerDown('patient_name', e)}
                  onTouchStart={(e) => handlePointerDown('patient_name', e)}
                  className={`absolute group pr-1 ${
                    calibrationMode ? 'cursor-move ring-2 ring-sky-500 ring-dashed hover:bg-sky-50/20' : ''
                  } ${selectedField === 'patient_name' && calibrationMode ? 'ring-2 ring-sky-500 bg-sky-50/50 outline-none z-20' : ''}`}
                  style={{ 
                    left: `${layout.patient_name.left}cm`, 
                    top: `${layout.patient_name.top}cm`, 
                    width: `${layout.patient_name.width}cm`, 
                    fontSize: `${layout.patient_name.fontSize}px`,
                    direction: 'rtl',
                    textAlign: 'right'
                  }}
                >
                  <span className="font-extrabold text-[#111827]">{data.patient_name}</span>
                  {calibrationMode && (
                    <span className="absolute -top-3.5 right-0 bg-sky-600 text-white font-mono text-[7px] px-1 py-0.2 rounded-t font-bold leading-none select-none z-30 opacity-80 pointer-events-none uppercase">name</span>
                  )}
                </div>

                {/* Date overlay */}
                <div 
                  onMouseDown={(e) => handlePointerDown('date', e)}
                  onTouchStart={(e) => handlePointerDown('date', e)}
                  className={`absolute group pr-1 ${
                    calibrationMode ? 'cursor-move ring-2 ring-sky-500 ring-dashed hover:bg-sky-50/20' : ''
                  } ${selectedField === 'date' && calibrationMode ? 'ring-2 ring-sky-500 bg-sky-50/50 outline-none z-20' : ''}`}
                  style={{ 
                    left: `${layout.date.left}cm`, 
                    top: `${layout.date.top}cm`, 
                    width: `${layout.date.width}cm`, 
                    fontSize: `${layout.date.fontSize}px`,
                    textAlign: 'left'
                  }}
                >
                  <span className="font-extrabold text-[#111827]">
                    {format(new Date(data.createdAt), 'dd / MM / yyyy')}
                  </span>
                  {calibrationMode && (
                    <span className="absolute -top-3.5 left-0 bg-sky-600 text-white font-mono text-[7px] px-1 py-0.2 rounded-t font-bold leading-none select-none z-30 opacity-80 pointer-events-none uppercase">date</span>
                  )}
                </div>

                {/* Patient Estimated Age */}
                <div 
                  onMouseDown={(e) => handlePointerDown('age', e)}
                  onTouchStart={(e) => handlePointerDown('age', e)}
                  className={`absolute group pr-1 ${
                    calibrationMode ? 'cursor-move ring-2 ring-sky-500 ring-dashed hover:bg-sky-50/20' : ''
                  } ${selectedField === 'age' && calibrationMode ? 'ring-2 ring-sky-500 bg-sky-50/50 outline-none z-20' : ''}`}
                  style={{ 
                    left: `${layout.age.left}cm`, 
                    top: `${layout.age.top}cm`, 
                    width: `${layout.age.width}cm`, 
                    fontSize: `${layout.age.fontSize}px`,
                    direction: 'rtl',
                    textAlign: 'right'
                  }}
                >
                  <span className="font-extrabold text-[#111827]">{formatAge(data.age_months, data.age_days)}</span>
                  {calibrationMode && (
                    <span className="absolute -top-3.5 right-0 bg-sky-600 text-white font-mono text-[7px] px-1 py-0.2 rounded-t font-bold leading-none select-none z-30 opacity-80 pointer-events-none uppercase">age</span>
                  )}
                </div>

                {/* Weight (Wt) */}
                <div 
                  onMouseDown={(e) => handlePointerDown('weight', e)}
                  onTouchStart={(e) => handlePointerDown('weight', e)}
                  className={`absolute group pr-1 ${
                    calibrationMode ? 'cursor-move ring-2 ring-sky-500 ring-dashed hover:bg-sky-50/20' : ''
                  } ${selectedField === 'weight' && calibrationMode ? 'ring-2 ring-sky-500 bg-sky-50/50 outline-none z-20' : ''}`}
                  style={{ 
                    left: `${layout.weight.left}cm`, 
                    top: `${layout.weight.top}cm`, 
                    width: `${layout.weight.width}cm`, 
                    fontSize: `${layout.weight.fontSize}px`,
                    textAlign: 'left'
                  }}
                >
                  <span className="font-extrabold text-[#111827]">{data.weight} {t.kg}</span>
                  {calibrationMode && (
                    <span className="absolute -top-3.5 left-0 bg-sky-600 text-white font-mono text-[7px] px-1 py-0.2 rounded-t font-bold leading-none select-none z-30 opacity-80 pointer-events-none uppercase">weight</span>
                  )}
                </div>

                {/* Temperature (Temp) */}
                <div 
                  onMouseDown={(e) => handlePointerDown('temperature', e)}
                  onTouchStart={(e) => handlePointerDown('temperature', e)}
                  className={`absolute group pr-1 ${
                    calibrationMode ? 'cursor-move ring-2 ring-sky-500 ring-dashed hover:bg-sky-50/20' : ''
                  } ${selectedField === 'temperature' && calibrationMode ? 'ring-2 ring-sky-500 bg-sky-50/50 outline-none z-20' : ''}`}
                  style={{ 
                    left: `${layout.temperature.left}cm`, 
                    top: `${layout.temperature.top}cm`, 
                    width: `${layout.temperature.width}cm`, 
                    fontSize: `${layout.temperature.fontSize}px`,
                    textAlign: 'left'
                  }}
                >
                  <span className="font-extrabold text-[#111827]">{data.temperature ? `${data.temperature} °C` : '---'}</span>
                  {calibrationMode && (
                    <span className="absolute -top-3.5 left-0 bg-sky-600 text-white font-mono text-[7px] px-1 py-0.2 rounded-t font-bold leading-none select-none z-30 opacity-80 pointer-events-none uppercase">temp</span>
                  )}
                </div>

                {/* Height (HT) */}
                <div 
                  onMouseDown={(e) => handlePointerDown('height', e)}
                  onTouchStart={(e) => handlePointerDown('height', e)}
                  className={`absolute group pr-1 ${
                    calibrationMode ? 'cursor-move ring-2 ring-sky-500 ring-dashed hover:bg-sky-50/20' : ''
                  } ${selectedField === 'height' && calibrationMode ? 'ring-2 ring-sky-500 bg-sky-50/50 outline-none z-20' : ''}`}
                  style={{ 
                    left: `${layout.height.left}cm`, 
                    top: `${layout.height.top}cm`, 
                    width: `${layout.height.width}cm`, 
                    fontSize: `${layout.height.fontSize}px`,
                    textAlign: 'left'
                  }}
                >
                  <span className="font-extrabold text-[#111827]">{data.height ? `${data.height} ${t.cm}` : '---'}</span>
                  {calibrationMode && (
                    <span className="absolute -top-3.5 left-0 bg-sky-600 text-white font-mono text-[7px] px-1 py-0.2 rounded-t font-bold leading-none select-none z-30 opacity-80 pointer-events-none uppercase">height</span>
                  )}
                </div>

                {/* Head Circumference (HC) */}
                <div 
                  onMouseDown={(e) => handlePointerDown('head_circumference', e)}
                  onTouchStart={(e) => handlePointerDown('head_circumference', e)}
                  className={`absolute group pr-1 ${
                    calibrationMode ? 'cursor-move ring-2 ring-sky-500 ring-dashed hover:bg-sky-50/20' : ''
                  } ${selectedField === 'head_circumference' && calibrationMode ? 'ring-2 ring-sky-500 bg-sky-50/50 outline-none z-20' : ''}`}
                  style={{ 
                    left: `${layout.head_circumference.left}cm`, 
                    top: `${layout.head_circumference.top}cm`, 
                    width: `${layout.head_circumference.width}cm`, 
                    fontSize: `${layout.head_circumference.fontSize}px`,
                    textAlign: 'left'
                  }}
                >
                  <span className="font-extrabold text-[#111827]">{data.head_circumference ? `${data.head_circumference} ${t.cm}` : '---'}</span>
                  {calibrationMode && (
                    <span className="absolute -top-3.5 left-0 bg-sky-600 text-white font-mono text-[7px] px-1 py-0.2 rounded-t font-bold leading-none select-none z-30 opacity-80 pointer-events-none uppercase">hc</span>
                  )}
                </div>

                {/* Diagnosis Header and Text overlay */}
                <div 
                  onMouseDown={(e) => handlePointerDown('diagnosis', e)}
                  onTouchStart={(e) => handlePointerDown('diagnosis', e)}
                  className={`absolute text-left flex gap-1 items-baseline group ${
                    calibrationMode ? 'cursor-move ring-2 ring-sky-500 ring-dashed hover:bg-sky-50/20' : ''
                  } ${selectedField === 'diagnosis' && calibrationMode ? 'ring-2 ring-sky-500 bg-sky-50/50 outline-none z-20' : ''}`}
                  style={{ 
                    left: `${layout.diagnosis.left}cm`, 
                    top: `${layout.diagnosis.top}cm`, 
                    width: `${layout.diagnosis.width}cm`,
                    fontSize: `${layout.diagnosis.fontSize}px`
                  }}
                >
                  <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider">Diagnosis:</span>
                  <span className="font-black text-slate-900 ml-1.5 leading-tight">{data.diagnosis || '---'}</span>
                  {calibrationMode && (
                    <span className="absolute -top-3.5 left-0 bg-sky-600 text-white font-mono text-[7px] px-1 py-0.2 rounded-t font-bold leading-none select-none z-30 opacity-80 pointer-events-none uppercase">diagnosis</span>
                  )}
                </div>

                {/* Standard Prescription RX script indicator */}
                <div 
                  onMouseDown={(e) => handlePointerDown('rx', e)}
                  onTouchStart={(e) => handlePointerDown('rx', e)}
                  className={`absolute group leading-none ${
                    calibrationMode ? 'cursor-move ring-2 ring-sky-500 ring-dashed hover:bg-sky-50/20' : ''
                  } ${selectedField === 'rx' && calibrationMode ? 'ring-2 ring-sky-500 bg-sky-50/50 outline-none z-20' : ''}`}
                  style={{ 
                    left: `${layout.rx.left}cm`, 
                    top: `${layout.rx.top}cm`,
                    fontSize: `${layout.rx.fontSize}px`,
                  }}
                >
                  <span className="font-serif font-black italic text-zinc-950">Rx</span>
                  {calibrationMode && (
                    <span className="absolute -top-3.5 left-0 bg-sky-600 text-white font-mono text-[7px] px-1 py-0.2 rounded-t font-bold leading-none select-none z-30 opacity-80 pointer-events-none uppercase">rx symbol</span>
                  )}
                </div>

                {/* Custom structured medications list overlay */}
                <div 
                  onMouseDown={(e) => handlePointerDown('medications', e)}
                  onTouchStart={(e) => handlePointerDown('medications', e)}
                  className={`absolute flex flex-col text-left group overflow-hidden ${
                    calibrationMode ? 'cursor-move ring-2 ring-sky-500 ring-dashed hover:bg-sky-50/20' : ''
                  } ${selectedField === 'medications' && calibrationMode ? 'ring-2 ring-sky-500 bg-sky-50/50 outline-none z-20' : ''}`}
                  style={{ 
                    left: `${layout.medications.left}cm`, 
                    top: `${layout.medications.top}cm`, 
                    width: `${layout.medications.width}cm`, 
                    gap: `${layout.medications.gap}px`,
                    height: '9.3cm', 
                  }}
                >
                  {data.items.map((item: any, i: number) => (
                    <div key={i} className="flex items-start gap-3" dir="ltr" style={{ fontSize: `${layout.medications.fontSize}px` }}>
                      <div className="h-[21px] w-[21px] rounded-full bg-slate-900 text-white font-extrabold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div className="flex-grow">
                        <div className="flex justify-between items-baseline">
                          <h3 className="font-black text-slate-950 leading-none">
                            {item.medication_name}
                          </h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-700 mt-0.5" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                          <span className="font-extrabold text-sky-900">{item.dose_description}</span>
                          <span className="font-bold text-slate-800">{item.frequency_description}</span>
                          <span className="text-slate-500 font-semibold italic">
                            {lang === 'ar' ? 'لمدة' : 'for'} <span className="font-black text-slate-900 not-italic">{item.duration_days}</span> {t.days}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {calibrationMode && (
                    <span className="absolute -top-3.5 left-0 bg-sky-600 text-white font-mono text-[7px] px-1 py-0.2 rounded-t font-bold leading-none select-none z-30 opacity-80 pointer-events-none uppercase">medication items</span>
                  )}
                </div>

                {/* High resolution QR Code layout alignment */}
                <div 
                  onMouseDown={(e) => handlePointerDown('qr', e)}
                  onTouchStart={(e) => handlePointerDown('qr', e)}
                  className={`absolute flex items-end gap-2.5 group ${
                    calibrationMode ? 'cursor-move ring-2 ring-sky-500 ring-dashed hover:bg-sky-50/20' : ''
                  } ${selectedField === 'qr' && calibrationMode ? 'ring-2 ring-sky-500 bg-sky-50/50 outline-none z-20' : ''}`}
                  style={{ 
                    left: `${layout.qr.left}cm`, 
                    top: `${layout.qr.top}cm` 
                  }}
                >
                  <QRCodeCanvas value={FACEBOOK_URL} size={layout.qr.size} />
                  <div className="text-[7.5px] text-stone-500 font-mono flex flex-col justify-end leading-tight shrink-0 select-none pointer-events-none">
                    <span>P-ID: {data.patient_number}</span>
                    <span>REF: {data.id?.slice(-6).toUpperCase()}</span>
                  </div>
                  {calibrationMode && (
                    <span className="absolute -top-3.5 left-0 bg-sky-600 text-white font-mono text-[7px] px-1 py-0.2 rounded-t font-bold leading-none select-none z-30 opacity-80 pointer-events-none uppercase">qr code</span>
                  )}
                </div>

                {/* Scheduled Revisit alignment overlay */}
                {data.revisit_date && (
                  <div 
                    onMouseDown={(e) => handlePointerDown('revisit', e)}
                    onTouchStart={(e) => handlePointerDown('revisit', e)}
                    className={`absolute text-right group pr-1 ${
                      calibrationMode ? 'cursor-move ring-2 ring-sky-500 ring-dashed hover:bg-sky-50/20' : ''
                    } ${selectedField === 'revisit' && calibrationMode ? 'ring-2 ring-sky-500 bg-sky-50/50 outline-none z-20' : ''}`}
                    style={{ 
                      left: `${layout.revisit.left}cm`, 
                      top: `${layout.revisit.top}cm`, 
                      width: `${layout.revisit.width}cm` 
                    }}
                  >
                    <div className="text-sky-900 font-extrabold text-[9px] uppercase tracking-wider leading-none">
                      {lang === 'ar' ? 'موعد الاستشارة المجدول:' : 'Scheduled Revisit Date:'}
                    </div>
                    <div className="text-[12px] font-black text-slate-900 mt-1 pointer-events-none select-none">
                      {format(new Date(data.revisit_date), 'dd / MM / yyyy')}
                    </div>
                    {calibrationMode && (
                      <span className="absolute -top-3.5 right-0 bg-sky-600 text-white font-mono text-[7px] px-1 py-0.2 rounded-t font-bold leading-none select-none z-30 opacity-80 pointer-events-none uppercase">revisit</span>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          ) : (
            /* STANDARD BLANK PAPER LAYOUT (PREVIOUS BEAUTIFUL SLATE TEMPLATE WITH HEADERS, LOGOS & BORDERS) */
            <motion.div 
              id="print-section" 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 sm:p-12 shadow-2xl border border-slate-200 rounded-3xl min-h-[1100px] print:border-none print:shadow-none print:p-0 print:m-0 flex flex-col relative max-w-4xl mx-auto print-standard"
              dir="rtl"
            >
              {/* Background Watermark/Logo - Simulated */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5 select-none print:block">
                 <Activity className="w-[500px] h-[500px]" />
              </div>

              {/* Prescription Header */}
              <div className="flex justify-between items-start mb-6 border-b-2 border-sky-600 pb-4">
                <div className="text-right">
                  <h1 className="text-3xl font-black text-sky-900 mb-1">{settings.name || 'د/ مينا سمير فرج الله'}</h1>
                  <p className="text-rose-600 font-extrabold text-lg">{t.specialist}</p>
                  <p className="text-sky-900 font-bold text-sm">دراسات عليا كلية الطب بجامعة هارفارد</p>
                </div>
                <div className="w-24 h-24 flex items-center justify-center z-10 shrink-0">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sky-400 via-rose-400 to-yellow-400 p-1 shadow-md">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                       <Activity className="h-10 w-10 text-sky-600 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient Info Grid */}
              <div className="grid grid-cols-2 gap-x-12 gap-y-2 mb-6 text-slate-800 bg-slate-50 dark:bg-transparent p-4 rounded-2xl border border-slate-100 dark:border-none">
                {/* Column 1 (Left Area) */}
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2 border-b border-dotted border-slate-300 pb-1">
                    <span className="text-sky-900 font-black text-xs whitespace-nowrap min-w-[50px]">Name:</span>
                    <span className="font-black text-base text-slate-900">{data.patient_name}</span>
                  </div>
                  <div className="flex items-baseline gap-2 border-b border-dotted border-slate-300 pb-1">
                    <span className="text-sky-900 font-black text-xs whitespace-nowrap min-w-[50px]">Date:</span>
                    <span className="font-extrabold text-base text-slate-800">
                      {format(new Date(data.createdAt), 'dd / MM / yyyy')}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 border-b border-dotted border-slate-300 pb-1">
                    <span className="text-sky-900 font-black text-xs whitespace-nowrap min-w-[50px]">Age:</span>
                    <span className="font-extrabold text-base text-slate-805">{formatAge(data.age_months, data.age_days)}</span>
                  </div>
                </div>

                {/* Column 2 (Right Area) */}
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2 border-b border-dotted border-slate-300 pb-1">
                    <span className="text-sky-900 font-black text-xs whitespace-nowrap min-w-[50px]">Wt:</span>
                    <span className="font-black text-base text-slate-900">{data.weight} {t.kg}</span>
                  </div>
                  <div className="flex items-baseline gap-2 border-b border-dotted border-slate-300 pb-1">
                    <span className="text-sky-900 font-black text-xs whitespace-nowrap min-w-[50px]">Temp:</span>
                    <span className="font-black text-base text-slate-900">{data.temperature || '---'} °C</span>
                  </div>
                  <div className="flex gap-4 border-b border-dotted border-slate-300 pb-1">
                    <div className="flex items-baseline gap-2 flex-1">
                      <span className="text-sky-900 font-black text-[10px] whitespace-nowrap">HT:</span>
                      <span className="font-black text-base text-slate-905">{data.height || '---'} {t.cm}</span>
                    </div>
                    <div className="flex items-baseline gap-2 flex-1">
                      <span className="text-sky-900 font-black text-[10px] whitespace-nowrap">HC:</span>
                      <span className="font-black text-base text-slate-905">{data.head_circumference || '---'} {t.cm}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Diagnosis Header */}
              <div className="mb-6 flex items-center gap-3 bg-sky-50 p-3 rounded-2xl print:bg-transparent print:p-0">
                 <span className="text-rose-600 font-black text-sm whitespace-nowrap">Diagnosis:</span>
                 <span className="font-black text-lg text-slate-900 leading-tight">
                   {data.diagnosis || '---'}
                 </span>
              </div>

              {/* Rx Symbol Area */}
              <div className="mb-4" dir="ltr">
                <span className="text-5xl font-serif font-black text-sky-950 italic opacity-80">Rx</span>
              </div>

              {/* Medications List Area */}
              <div className="flex-grow space-y-4 pr-4 mb-8">
                {data.items.map((item: any, i: number) => (
                  <div key={i} className="group" dir="ltr">
                    <div className="flex items-start gap-4">
                      <div className="h-6 w-6 rounded-full bg-sky-900 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div className="flex-grow text-left">
                        <div className="mb-1">
                          <h3 className="text-lg font-black text-slate-900 leading-none">
                            {item.medication_name}
                          </h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 text-sm text-slate-700" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                          <span className="font-black text-sky-900">{item.dose_description}</span>
                          <span className="font-extrabold text-slate-800">{item.frequency_description}</span>
                          <span className="text-slate-500 font-medium italic">
                            {lang === 'ar' ? 'لمدة' : 'for'} <span className="font-black text-slate-900 not-italic">{item.duration_days}</span> {t.days}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Section */}
              <div className="mt-auto pt-6 flex flex-col">
                {/* Revisit Box */}
                <div className="flex justify-end mb-4">
                  <div className="bg-sky-900 text-white px-6 py-2.5 rounded-2xl flex items-center gap-3 shadow-md print:shadow-none">
                     <span className="font-black text-sm">
                       {lang === 'ar' ? 'الاستشارة خلال أسبوع' : 'Revisit within 1 week'}
                     </span>
                     <Calendar className="h-4 w-4 opacity-50" />
                  </div>
                </div>

                <div className="flex justify-between items-end mb-4 pt-4 border-t border-slate-100">
                   <div className="pb-1 shrink-0 bg-white p-1 rounded-xl shadow-sm">
                      <QRCodeCanvas value={FACEBOOK_URL} size={70} />
                   </div>
                   <div className="text-[10px] text-slate-400 font-mono text-right opacity-70">
                      P-ID: {data.patient_number} / REF: {data.id?.slice(-6).toUpperCase()}
                   </div>
                </div>

                {/* Footer Line with Metadata */}
                <div className="pt-4 border-t-2 border-sky-600 flex justify-between items-end gap-8 pb-2">
                  <div className="flex-1" />

                  {/* Right part: Address and Phone */}
                  <div className="text-right space-y-1">
                    <div className="flex justify-end items-center gap-2">
                      <span className="font-black text-sky-900 text-sm">{settings.address || 'المنيا - شارع الحسيني شرق مطعم المحمدي للمشويات'}</span>
                      <MapPin className="h-4 w-4 text-rose-600" />
                    </div>
                    <div className="flex justify-end items-center gap-2">
                      <span className="font-black text-sky-900 text-xl" dir="ltr">{settings.phone || '01064646319'}</span>
                      <Phone className="h-4 w-4 text-rose-600" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Floating notifications for layout saves/actions */}
      {showNotification && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-xs sm:text-sm font-black px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 z-50 animate-bounce cursor-pointer" onClick={() => setShowNotification(null)}>
          <Check className="h-4 w-4 text-emerald-400" />
          {showNotification}
        </div>
      )}
    </div>
  );
}
