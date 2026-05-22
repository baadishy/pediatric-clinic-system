/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Stethoscope, FileText, Pill, Settings as SettingsIcon, Sun, Moon, Database, Languages, UserPlus, ClipboardList, Syringe, History, LineChart, LogOut } from 'lucide-react';
import PatientRegistration from './components/PatientRegistration';
import PrescriptionPrinter from './components/PrescriptionPrinter';
import MedicationRules from './components/MedicationRules';
import ClinicSettings from './components/ClinicSettings';
import PrescriptionHistory from './components/PrescriptionHistory';
import GrowthCharts from './components/GrowthCharts';
import { Toaster, toast } from 'sonner';
import { ThemeProvider, useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { api, User, WaitingItem, Appointment } from './services/api';
import { translations, Language } from './lib/translations';
import { Login } from './components/Login';
import { WaitingRoom } from './components/WaitingRoom';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="p-2 h-9 w-9" />;
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5 text-slate-600" />}
    </button>
  );
}

function LanguageToggle({ lang, setLang }: { lang: Language, setLang: (l: Language) => void }) {
  return (
    <button
      onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-slate-600 dark:text-slate-400 group"
      aria-label="Toggle language"
    >
      <Languages className="h-4 w-4 transition-transform group-hover:scale-110" />
      <span className="text-[10px] font-bold uppercase tracking-tight">{lang === 'ar' ? 'EN' : 'AR'}</span>
    </button>
  );
}

function MainContent({ 
  activeTab, 
  currentPrescriptionId, 
  editPrescriptionId, 
  onPrescriptionCreated, 
  onViewPrescription, 
  onEditPrescription, 
  lang,
  onLanguageChange,
  user,
  onLogout,
  onCallPatient,
  onCallAppointment,
  onNewPatient,
  onCancelRegistration,
  selectedWaitingItem,
  selectedAppointment
}: any) {
  const t = translations[lang as Language];
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="h-full"
      >
        {activeTab === 'waiting' && (
          <WaitingRoom 
            user={user} 
            onLogout={onLogout} 
            onCallPatient={onCallPatient} 
            onCallAppointment={onCallAppointment}
            onNewPatient={onNewPatient}
            onLanguageChange={onLanguageChange}
            hideHeader={user.role === 'doctor'}
            lang={lang}
          />
        )}
        {activeTab === 'patient' && (
          <PatientRegistration 
            onPrescriptionCreated={onPrescriptionCreated} 
            editPrescriptionId={editPrescriptionId} 
            lang={lang} 
            user={user} 
            onCancel={onCancelRegistration} 
            initialWaitingItem={selectedWaitingItem}
            initialAppointment={selectedAppointment}
          />
        )}
        {activeTab === 'prescription' && <PrescriptionPrinter prescriptionId={currentPrescriptionId} lang={lang} />}
        {activeTab === 'history' && <PrescriptionHistory lang={lang} onViewPrescription={onViewPrescription} onEditPrescription={onEditPrescription} />}
        {activeTab === 'growth' && <GrowthCharts lang={lang} />}
        {activeTab === 'rules' && <MedicationRules lang={lang} />}
        {activeTab === 'settings' && <ClinicSettings lang={lang} />}
      </motion.div>
    </AnimatePresence>
  );
}

export type AppTab = 'waiting' | 'patient' | 'prescription' | 'history' | 'rules' | 'settings' | 'growth';

export default function App() {
  const [lang, setLang] = useState<Language>('ar');
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('waiting');
  const [currentPrescriptionId, setCurrentPrescriptionId] = useState<string | null>(null);
  const [editPrescriptionId, setEditPrescriptionId] = useState<string | null>(null);
  const [selectedWaitingItem, setSelectedWaitingItem] = useState<WaitingItem | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [clinicName, setClinicName] = useState('عيادة الأطفال');
  const [dbStatus, setDbStatus] = useState<'connected' | 'connecting' | 'error'>('connecting');

  useEffect(() => {
    const savedUser = localStorage.getItem('pediatric_user');
    const savedToken = localStorage.getItem('pediatric_token');
    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('pediatric_user');
        localStorage.removeItem('pediatric_token');
      }
    }
  }, []);

  const handleLogin = (user: User, token: string) => {
    setUser(user);
    localStorage.setItem('pediatric_user', JSON.stringify(user));
    localStorage.setItem('pediatric_token', token);
    setActiveTab('waiting');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('pediatric_user');
    localStorage.removeItem('pediatric_token');
  };

  const handleCallPatient = (item: WaitingItem) => {
    setSelectedWaitingItem(item);
    setSelectedAppointment(null);
    setActiveTab('patient');
  };

  const handleCallAppointment = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setSelectedWaitingItem(null);
    setActiveTab('patient');
  };

  const handleNewPatient = () => {
    setSelectedWaitingItem(null);
    setSelectedAppointment(null);
    setEditPrescriptionId(null);
    setActiveTab('patient');
  };

  const handleCancelRegistration = () => {
    setActiveTab('waiting');
    setSelectedWaitingItem(null);
    setSelectedAppointment(null);
  };

  const t = translations[lang];

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/health-check');
        const contentType = res.headers.get('content-type');
        
        if (res.ok && contentType && contentType.includes('application/json')) {
           const text = await res.text();
           try {
             const data = JSON.parse(text);
             if (data.status === 'ok') setDbStatus('connected');
             else setDbStatus('error');
           } catch (e) {
             setDbStatus('connecting');
           }
        } else {
           setDbStatus('connecting');
        }
      } catch (e) {
        setDbStatus('connecting');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (dbStatus === 'connected') {
      // Get clinic name via public API (no token needed)
      api.getPublicClinicName()
        .then(data => {
          if (data && data.name) setClinicName(data.name);
        })
        .catch(console.error);

      // Only get full settings if logged in as doctor
      if (user && user.role === 'doctor') {
        api.getClinicSettings()
          .then(settings => {
            if (settings && 'name' in settings) setClinicName(settings.name);
          })
          .catch(console.error);
      }
    }
  }, [dbStatus, user]);

  const handlePrescriptionCreated = (id: string) => {
    setCurrentPrescriptionId(id);
    setEditPrescriptionId(null);
    setActiveTab('prescription');
  };

  const handleViewPrescription = (id: string) => {
    setCurrentPrescriptionId(id);
    setActiveTab('prescription');
  };

  const handleEditPrescription = async (id: string) => {
    setEditPrescriptionId(id);
    setActiveTab('patient');
    toast.info(lang === 'ar' ? 'يمكنك الآن تعديل بيانات الزيارة' : 'You can now edit the visit data');
  };

  if (!user) {
    return (
      <ThemeProvider attribute="class" defaultTheme="light">
        <Login onLogin={handleLogin} lang={lang} setLang={setLang} />
        <Toaster position="top-center" richColors />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {/* Header - Only for Doctor or when in full view */}
        {user.role === 'doctor' && (
        <header className="bg-white dark:bg-slate-900 shadow-sm border-b dark:border-slate-800 sticky top-0 z-30 print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 min-w-0" onClick={() => setActiveTab('waiting')}>
                <Stethoscope className="h-8 w-8 shrink-0 cursor-pointer" />
                <h1 className="text-xl sm:text-2xl font-bold truncate cursor-pointer">{clinicName}</h1>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <nav className="hidden lg:flex items-center space-x-0.5 space-x-reverse">
                  <TabButton lang={lang} active={activeTab === 'waiting'} onClick={() => setActiveTab('waiting')} icon={<ClipboardList className="h-4 w-4" />} label={t.waiting_room} />
                  <TabButton lang={lang} active={activeTab === 'patient'} onClick={() => { setActiveTab('patient'); setEditPrescriptionId(null); setSelectedWaitingItem(null); }} icon={<UserPlus className="h-4 w-4" />} label={t.new_visit} />
                  <TabButton lang={lang} active={activeTab === 'prescription'} onClick={() => setActiveTab('prescription')} icon={<FileText className="h-4 w-4" />} label={t.prescription} />
                  <TabButton lang={lang} active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History className="h-4 w-4" />} label={t.history} />
                  <TabButton lang={lang} active={activeTab === 'growth'} onClick={() => setActiveTab('growth')} icon={<LineChart className="h-4 w-4" />} label={t.growth_curve} />
                  <TabButton lang={lang} active={activeTab === 'rules'} onClick={() => setActiveTab('rules')} icon={<Syringe className="h-4 w-4" />} label={t.medications_settings} />
                  <TabButton lang={lang} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon className="h-4 w-4" />} label={t.settings} />
                </nav>
                <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-4 h-8">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-xs font-black text-slate-900 dark:text-white capitalize">{user.name}</span>
                    <span className="text-[10px] text-sky-500 font-bold uppercase">{user.role === 'doctor' ? t.doctor_role : t.assistant_role}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 hover:text-rose-500 transition-colors">
                    <LogOut className="h-5 w-5" />
                  </Button>
                </div>
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
                <div className="flex items-center gap-0.5 sm:gap-1">
                  <LanguageToggle lang={lang} setLang={setLang} />
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>
        </header>
        )}

        {user.role === 'doctor' && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-safe shadow-[0_-5px_20px_rgba(0,0,0,0.05)] print:hidden">
          <div className="flex justify-around items-center h-16 px-2">
             <MobileNavButton active={activeTab === 'waiting'} onClick={() => setActiveTab('waiting')} icon={<ClipboardList className="h-6 w-6" />} label={t.waiting} />
             <MobileNavButton active={activeTab === 'patient'} onClick={() => { setActiveTab('patient'); setEditPrescriptionId(null); setSelectedWaitingItem(null); }} icon={<UserPlus className="h-6 w-6" />} label={t.new_visit} />
             <MobileNavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History className="h-6 w-6" />} label={t.history} />
             <MobileNavButton active={activeTab === 'growth'} onClick={() => setActiveTab('growth')} icon={<LineChart className="h-6 w-6" />} label={t.growth_curve} />
             <MobileNavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon className="h-6 w-6" />} label={t.settings} />
          </div>
        </div>
        )}

        {/* Global Alert for DB Status */}
        {dbStatus !== 'connected' && (
          <div className="max-w-7xl mx-auto px-4 mt-4 print:hidden">
            <div className="p-4 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-center gap-2 animate-pulse bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/50">
              <div className="h-8 w-8 text-amber-500">
                <Stethoscope className="h-full w-full animate-bounce" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-bold">
                {dbStatus === 'connecting' ? t.connecting : t.db_error}
              </p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className={(activeTab === 'waiting' && user.role !== 'doctor') ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 mb-20 lg:mb-0'}>
          <MainContent 
            activeTab={activeTab} 
            user={user}
            onLogout={handleLogout}
            onCallPatient={handleCallPatient}
            onCallAppointment={handleCallAppointment}
            onNewPatient={handleNewPatient}
            onCancelRegistration={handleCancelRegistration}
            selectedWaitingItem={selectedWaitingItem}
            selectedAppointment={selectedAppointment}
            currentPrescriptionId={currentPrescriptionId} 
            editPrescriptionId={editPrescriptionId}
            onPrescriptionCreated={handlePrescriptionCreated} 
            onViewPrescription={handleViewPrescription}
            onEditPrescription={handleEditPrescription}
            lang={lang}
            onLanguageChange={setLang}
          />
        </div>
        
        <Toaster position="top-center" richColors />
      </div>
    </ThemeProvider>
  );
}

function TabButton({ active, onClick, icon, label, lang }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, lang: Language }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all relative whitespace-nowrap ${
        active 
          ? 'bg-sky-50 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400 font-bold' 
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
      }`}
    >
      <span className={`${active ? 'scale-110' : ''} transition-transform`}>{icon}</span>
      <span className="text-sm">{label}</span>
      {active && (
        <motion.div
          layoutId="activeTabIndicator"
          className="absolute -bottom-1 left-2 right-2 h-0.5 bg-sky-500 rounded-full"
        />
      )}
    </button>
  );
}

function MobileNavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-all ${
        active 
          ? 'text-sky-600 dark:text-sky-400' 
          : 'text-slate-400 dark:text-slate-500'
      }`}
    >
      <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-sky-50 dark:bg-sky-900/40 scale-110' : ''}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-black uppercase tracking-tighter ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
    </button>
  );
}
