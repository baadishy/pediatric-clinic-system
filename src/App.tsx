/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Stethoscope, FileText, Pill, Settings as SettingsIcon, Sun, Moon, Database, Languages, UserPlus, ClipboardList, Syringe, History, LineChart, LogOut, FileSpreadsheet, Menu, ChevronLeft, ChevronRight, X } from 'lucide-react';
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
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-all duration-300 ${user && user.role === 'doctor' ? (sidebarExpanded ? 'lg:ps-72' : 'lg:ps-20') : ''}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {/* Dynamic Sidebar for Desktop Screens */}
        {user.role === 'doctor' && (
          <aside className={`fixed inset-y-0 start-0 z-40 bg-white dark:bg-slate-900 border-e border-slate-200 dark:border-slate-800 hidden lg:flex flex-col justify-between shadow-xl print:hidden transition-all duration-300 ${sidebarExpanded ? 'w-72' : 'w-20'}`}>
            {/* Collapse/Expand Toggle Handle Button */}
            <button 
              onClick={() => setSidebarExpanded(!sidebarExpanded)} 
              className={`absolute top-6 ${lang === 'ar' ? 'left-[-14px]' : 'right-[-14px]'} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full p-1 shadow-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-all hover:scale-110 z-50 text-slate-500 hover:text-sky-500`}
              title={sidebarExpanded ? (lang === 'ar' ? 'تصغير القائمة' : 'Collapse Sidebar') : (lang === 'ar' ? 'توسيع القائمة' : 'Expand Sidebar')}
            >
              {sidebarExpanded ? (
                lang === 'ar' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />
              ) : (
                lang === 'ar' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {/* Top Side: Brand Header & Tabs Navigation List */}
            <div className={`flex-1 flex flex-col min-h-0 overflow-y-auto p-4 space-y-6 ${!sidebarExpanded ? 'items-center px-2' : ''}`}>
              <div className={`flex items-center gap-2.5 text-sky-600 dark:text-sky-400 px-2 py-1 select-none cursor-pointer w-full ${!sidebarExpanded ? 'justify-center' : ''}`} onClick={() => setActiveTab('waiting')}>
                <Stethoscope className="h-8 w-8 shrink-0 text-sky-500" />
                {sidebarExpanded && (
                  <h1 className="text-xl font-black truncate tracking-tight">{clinicName}</h1>
                )}
              </div>

              <nav className="flex flex-col gap-1.5 w-full">
                <TabButton lang={lang} vertical collapsed={!sidebarExpanded} active={activeTab === 'waiting'} onClick={() => setActiveTab('waiting')} icon={<ClipboardList className="h-4 w-4" />} label={t.waiting_room} />
                <TabButton lang={lang} vertical collapsed={!sidebarExpanded} active={activeTab === 'patient'} onClick={() => { setActiveTab('patient'); setEditPrescriptionId(null); setSelectedWaitingItem(null); }} icon={<UserPlus className="h-4 w-4" />} label={t.new_visit} />
                <TabButton lang={lang} vertical collapsed={!sidebarExpanded} active={activeTab === 'prescription'} onClick={() => setActiveTab('prescription')} icon={<FileText className="h-4 w-4" />} label={t.prescription} />
                <TabButton lang={lang} vertical collapsed={!sidebarExpanded} active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History className="h-4 w-4" />} label={t.history} />
                <TabButton lang={lang} vertical collapsed={!sidebarExpanded} active={activeTab === 'growth'} onClick={() => setActiveTab('growth')} icon={<LineChart className="h-4 w-4" />} label={t.growth_curve} />
                <TabButton lang={lang} vertical collapsed={!sidebarExpanded} active={activeTab === 'rules'} onClick={() => setActiveTab('rules')} icon={<Syringe className="h-4 w-4" />} label={t.medications_settings} />
                <TabButton lang={lang} vertical collapsed={!sidebarExpanded} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon className="h-4 w-4" />} label={t.settings} />
              </nav>
            </div>

            {/* Bottom Side: Profile Card & Utilities */}
            <div className={`p-4 border-t border-slate-100 dark:border-slate-800 space-y-4 bg-slate-50/50 dark:bg-slate-950/20 ${!sidebarExpanded ? 'px-2' : ''}`}>
              <div className={`flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-xl shadow-sm ${!sidebarExpanded ? 'justify-center p-2' : ''}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-sky-500 text-white flex items-center justify-center text-xs font-black shrink-0" title={user.name}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  {sidebarExpanded && (
                    <div className="min-w-0 text-start">
                      <div className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{user.name}</div>
                      <div className="text-[10px] text-sky-500 font-bold uppercase">{user.role === 'doctor' ? t.doctor_role : t.assistant_role}</div>
                    </div>
                  )}
                </div>
                {sidebarExpanded && (
                  <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 hover:text-rose-500 transition-colors h-7 w-7 rounded-md shrink-0">
                    <LogOut className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className={`flex items-center justify-between pt-1 gap-1 ${!sidebarExpanded ? 'flex-col gap-3 justify-center' : ''}`}>
                <LanguageToggle lang={lang} setLang={setLang} />
                <ThemeToggle />
              </div>
            </div>
          </aside>
        )}

        {/* Mobile Sidebar Backdrop Drawer Overlay */}
        {user.role === 'doctor' && mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300" 
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside 
              initial={{ x: lang === 'ar' ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: lang === 'ar' ? '100%' : '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative z-50 w-72 h-full bg-white dark:bg-slate-900 border-e border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-2xl" dir={lang === 'ar' ? 'rtl' : 'ltr'}
            >
              {/* Close Button top edge */}
              <div className={`absolute top-4 ${lang === 'ar' ? 'left-4' : 'right-4'} z-50`}>
                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full h-8 w-8">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Drawer Top Side */}
              <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 space-y-6">
                <div className="flex items-center gap-2.5 text-sky-600 dark:text-sky-400 px-2 py-1 select-none cursor-pointer" onClick={() => { setActiveTab('waiting'); setMobileMenuOpen(false); }}>
                  <Stethoscope className="h-8 w-8 shrink-0 text-sky-500" />
                  <h1 className="text-xl font-black truncate tracking-tight">{clinicName}</h1>
                </div>

                <nav className="flex flex-col gap-1.5">
                  <TabButton lang={lang} vertical active={activeTab === 'waiting'} onClick={() => { setActiveTab('waiting'); setMobileMenuOpen(false); }} icon={<ClipboardList className="h-4 w-4" />} label={t.waiting_room} />
                  <TabButton lang={lang} vertical active={activeTab === 'patient'} onClick={() => { setActiveTab('patient'); setEditPrescriptionId(null); setSelectedWaitingItem(null); setMobileMenuOpen(false); }} icon={<UserPlus className="h-4 w-4" />} label={t.new_visit} />
                  <TabButton lang={lang} vertical active={activeTab === 'prescription'} onClick={() => { setActiveTab('prescription'); setMobileMenuOpen(false); }} icon={<FileText className="h-4 w-4" />} label={t.prescription} />
                  <TabButton lang={lang} vertical active={activeTab === 'history'} onClick={() => { setActiveTab('history'); setMobileMenuOpen(false); }} icon={<History className="h-4 w-4" />} label={t.history} />
                  <TabButton lang={lang} vertical active={activeTab === 'growth'} onClick={() => { setActiveTab('growth'); setMobileMenuOpen(false); }} icon={<LineChart className="h-4 w-4" />} label={t.growth_curve} />
                  <TabButton lang={lang} vertical active={activeTab === 'rules'} onClick={() => { setActiveTab('rules'); setMobileMenuOpen(false); }} icon={<Syringe className="h-4 w-4" />} label={t.medications_settings} />
                  <TabButton lang={lang} vertical active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }} icon={<SettingsIcon className="h-4 w-4" />} label={t.settings} />
                </nav>
              </div>

              {/* Drawer User block */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-4 bg-slate-50/50 dark:bg-slate-950/20">
                <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-xl shadow-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-sky-500 text-white flex items-center justify-center text-xs font-black shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 text-start">
                      <div className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{user.name}</div>
                      <div className="text-[10px] text-sky-500 font-bold uppercase">{user.role === 'doctor' ? t.doctor_role : t.assistant_role}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="text-slate-400 hover:text-rose-500 transition-colors h-7 w-7 rounded-md shrink-0">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between pt-1 gap-1">
                  <LanguageToggle lang={lang} setLang={setLang} />
                  <ThemeToggle />
                </div>
              </div>
            </motion.aside>
          </div>
        )}

        {/* Compact Mobile Top Header */}
        {user.role === 'doctor' && (
          <header className="lg:hidden bg-white/95 dark:bg-slate-900/95 shadow-sm border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 print:hidden backdrop-blur">
            <div className="px-4">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center gap-3 min-w-0">
                  <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)} className="text-slate-600 dark:text-slate-300 h-9 w-9 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg shrink-0">
                    <Menu className="h-5 w-5" />
                  </Button>
                  <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 min-w-0" onClick={() => setActiveTab('waiting')}>
                    <Stethoscope className="h-7 w-7 shrink-0 cursor-pointer text-sky-500" />
                    <h1 className="text-lg font-extrabold truncate cursor-pointer">{clinicName}</h1>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <LanguageToggle lang={lang} setLang={setLang} />
                  <ThemeToggle />
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

function TabButton({ active, onClick, icon, label, lang, vertical = false, collapsed = false }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, lang: Language, vertical?: boolean, collapsed?: boolean }) {
  if (vertical) {
    return (
      <button
        onClick={onClick}
        title={collapsed ? label : undefined}
        className={`w-full py-3 rounded-xl flex items-center transition-all text-start relative whitespace-nowrap ${
          collapsed ? 'justify-center px-0' : 'px-4 gap-3'
        } ${
          active 
            ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 font-extrabold' 
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
        }`}
      >
        <span className={`${active ? 'scale-110 text-sky-600 dark:text-sky-400' : 'text-slate-400'} transition-transform shrink-0`}>{icon}</span>
        {!collapsed && <span className="text-sm truncate select-none">{label}</span>}
        {active && (
          <motion.div
            layoutId="activeTabIndicatorVertical"
            className="absolute top-2.5 bottom-2.5 start-0 w-1 bg-sky-500 rounded-full"
          />
        )}
      </button>
    );
  }

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
