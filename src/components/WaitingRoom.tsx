import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api, WaitingItem, User, Appointment, Clinic, MedicalService } from '../services/api';
import { 
  Clock, 
  User as UserIcon, 
  Calendar, 
  ArrowRight, 
  RefreshCw, 
  LogOut, 
  Loader2, 
  ClipboardList, 
  ArrowLeft, 
  Phone, 
  Info,
  Building2,
  Activity,
  Plus,
  X,
  Edit,
  Trash2,
  Languages
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { translations, Language } from '../lib/translations';
import ExportDropdown from './ExportDropdown';
import { ExportPayload } from '../lib/exportUtils';

interface WaitingRoomProps {
  user: User;
  onLogout: () => void;
  onCallPatient: (waitingItem: WaitingItem) => void;
  onCallAppointment: (appointment: Appointment) => void;
  onNewPatient: () => void;
  onLanguageChange?: (lang: Language) => void;
  hideHeader?: boolean;
  lang?: Language;
}

export function WaitingRoom({ user, onLogout, onCallPatient, onCallAppointment, onNewPatient, onLanguageChange, hideHeader, lang = 'ar' }: WaitingRoomProps) {
  const [waitingList, setWaitingList] = useState<WaitingItem[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [services, setServices] = useState<MedicalService[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Appointment Modal State
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Partial<Appointment> | null>(null);
  const [isSavingAppt, setIsSavingAppt] = useState(false);

  const t = translations[lang];

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [waitingData, apptData, clinicData, serviceData] = await Promise.all([
        api.getWaitingList(),
        api.getAppointments(),
        api.getClinics(),
        api.getServices()
      ]);
      setWaitingList(waitingData);
      setAppointments(apptData);
      setClinics(clinicData);
      setServices(serviceData);
    } catch (error) {
      toast.error(lang === 'ar' ? "فشل تحميل البيانات" : "Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, []);

  const handleDeleteAppointment = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا الموعد؟' : 'Are you sure you want to delete this appointment?')) return;
    try {
      await api.deleteAppointment(id);
      setAppointments(prev => prev.filter(a => a.id !== id));
      toast.success(t.appointment_deleted);
    } catch (err) {
      toast.error(lang === 'ar' ? 'فشل الحذف' : 'Deletion failed');
    }
  };

  const handleOpenApptModal = (appt?: Appointment) => {
    if (appt) {
      setEditingAppt(appt);
    } else {
      setEditingAppt({
        patientName: '',
        phone: '',
        birthDate: '',
        clinicId: clinics[0]?.id || '',
        serviceId: services[0]?.id || '',
        appointmentDay: new Date().toISOString().split('T')[0],
        appointmentTime: '10:00',
        status: 'pending'
      });
    }
    setIsApptModalOpen(true);
  };

  const handleSaveAppt = async () => {
    if (!editingAppt?.patientName || !editingAppt?.phone || !editingAppt?.clinicId || !editingAppt?.serviceId) {
      toast.warning(lang === 'ar' ? 'يرجى إكمال البيانات المطلوبة' : 'Please complete required fields');
      return;
    }

    try {
      setIsSavingAppt(true);
      if (editingAppt.id) {
        await api.updateAppointment(editingAppt.id, editingAppt);
        toast.success(t.appointment_updated);
      } else {
        await api.createAppointment(editingAppt);
        toast.success(t.booked_successfully);
      }
      setIsApptModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(lang === 'ar' ? 'فشل الحفظ' : 'Failed to save');
    } finally {
      setIsSavingAppt(false);
    }
  };

  const handleCheckIn = async (appt: Appointment, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.checkInAppointment(appt.id!);
      toast.success(lang === 'ar' ? 'تم تسجيل حضور المريض' : 'Patient checked in successfully');
      fetchData();
    } catch (err) {
      toast.error(lang === 'ar' ? 'فشل تسجيل الحضور' : 'Check-in failed');
    }
  };

  const getWaitingRoomExportPayload = (): ExportPayload => {
    const waitingHeaders = [
      lang === 'ar' ? 'الترتيب' : 'No.',
      lang === 'ar' ? 'اسم الطفل' : 'Patient Name',
      lang === 'ar' ? 'رقم الهاتف' : 'Phone Number',
      lang === 'ar' ? 'طريقة المتابعة' : 'Check-In Type',
      lang === 'ar' ? 'وقت الدخول للانتظار' : 'Checked-In Time'
    ];

    const waitingRows = waitingList.map((item, idx) => [
      idx + 1,
      item.patient_name,
      item.patient_phone || '-',
      item.revisit_method || '-',
      new Date(item.createdAt).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    ]);

    const apptHeaders = [
      lang === 'ar' ? 'الاسم' : 'Patient Name',
      lang === 'ar' ? 'رقم الهاتف' : 'Phone Number',
      lang === 'ar' ? 'العيادة التخصصية' : 'Clinic Specialty',
      lang === 'ar' ? 'الخدمة' : 'Service',
      lang === 'ar' ? 'تاريخ الموعد' : 'Date',
      lang === 'ar' ? 'الموعد والوقت' : 'Time',
      lang === 'ar' ? 'الحالة' : 'Status'
    ];

    const apptRows = appointments.map(item => [
      item.patientName,
      item.phone || '-',
      item.clinicName || '-',
      item.serviceName || '-',
      item.appointmentDay,
      item.appointmentTime,
      item.status === 'confirmed' ? (lang === 'ar' ? 'مؤكد' : 'Confirmed') : item.status === 'cancelled' ? (lang === 'ar' ? 'ملغي' : 'Cancelled') : (lang === 'ar' ? 'قيد الانتظار' : 'Pending')
    ]);

    return {
      title: lang === 'ar' ? 'تقرير حركة صالة الانتظار والجدولة الكلية بالعيادة' : 'Clinic Patient Flow & Appointment Directory',
      subtitle: lang === 'ar' ? 'ملخص إحصائي كامل للحجوزات والأطفال المنتظرين باليوم' : 'Overview of current clinic waiting lines and booked calendars',
      sections: [
        {
          title: lang === 'ar' ? 'قائمة المرضى الحاليين بصالة الانتظار' : 'Queue - Checked-In waiting children list',
          table: {
            headers: waitingHeaders,
            rows: waitingRows
          }
        },
        {
          title: lang === 'ar' ? 'المواعيد والحجوزات المسجلة للعيادات' : 'Log of Scheduled Appointments',
          table: {
            headers: apptHeaders,
            rows: apptRows
          }
        }
      ],
      filename: `clinic_queue_status`
    };
  };

  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(a => a.appointmentDay === today && a.status !== 'confirmed');
  const futureAppointments = appointments.filter(a => a.appointmentDay > today);

  const dateLocale = lang === 'ar' ? ar : enUS;

  return (
    <>
      {/* Appointment Modal Overlay */}
      <AnimatePresence>
        {isApptModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg"
            >
              <Card className="shadow-2xl border-none">
                <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                  <div>
                    <CardTitle className="font-black text-xl">
                      {editingAppt?.id ? t.edit_appointment : t.new_appointment}
                    </CardTitle>
                    <CardDescription>{lang === 'ar' ? 'أدخل تفاصيل الحجز' : 'Enter booking details'}</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsApptModalOpen(false)} className="rounded-full">
                    <X className="h-5 w-5" />
                  </Button>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="col-span-full space-y-2">
                      <Label>{t.patient_name}</Label>
                      <Input 
                        value={editingAppt?.patientName} 
                        onChange={e => setEditingAppt(prev => ({ ...prev!, patientName: e.target.value }))}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.phone}</Label>
                      <Input 
                        value={editingAppt?.phone} 
                        onChange={e => setEditingAppt(prev => ({ ...prev!, phone: e.target.value }))}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.birth_date}</Label>
                      <Input 
                        type="date"
                        value={editingAppt?.birthDate} 
                        onChange={e => setEditingAppt(prev => ({ ...prev!, birthDate: e.target.value }))}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.clinic}</Label>
                      <Select 
                      value={editingAppt?.clinicId?.toString() || ''} 
                      onValueChange={val => {
                        const filteredServices = services.filter(s => s.clinic_id?.toString() === val?.toString());
                        setEditingAppt(prev => ({ 
                          ...prev!, 
                          clinicId: val, 
                          serviceId: filteredServices[0]?.id?.toString() || '' 
                        }));
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder={t.clinic}>
                          {clinics.find(c => c.id?.toString() === editingAppt?.clinicId?.toString())?.name || t.clinic}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {clinics.map(c => (
                          <SelectItem key={c.id || (c as any)._id || ''} value={c.id?.toString() || (c as any)._id?.toString() || ''}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.service}</Label>
                    <Select 
                      value={editingAppt?.serviceId?.toString() || ''} 
                      onValueChange={val => setEditingAppt(prev => ({ ...prev!, serviceId: val }))}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder={t.service}>
                          {services.find(s => s.id?.toString() === editingAppt?.serviceId?.toString())?.name || t.service}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {services.filter(s => s.clinic_id?.toString() === editingAppt?.clinicId?.toString()).map(s => (
                          <SelectItem key={s.id || (s as any)._id || ''} value={s.id?.toString() || (s as any)._id?.toString() || ''}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{lang === 'ar' ? 'تاريخ الموعد' : 'Appointment Date'}</Label>
                      <Input 
                        type="date"
                        value={editingAppt?.appointmentDay} 
                        onChange={e => setEditingAppt(prev => ({ ...prev!, appointmentDay: e.target.value }))}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{lang === 'ar' ? 'وقت الموعد' : 'Time'}</Label>
                      <Input 
                        type="time"
                        value={editingAppt?.appointmentTime} 
                        onChange={e => setEditingAppt(prev => ({ ...prev!, appointmentTime: e.target.value }))}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="col-span-full space-y-2">
                      <Label>{t.status}</Label>
                      <Select 
                        value={editingAppt?.status} 
                        onValueChange={(val: any) => setEditingAppt(prev => ({ ...prev!, status: val }))}
                      >
                        <SelectTrigger className="h-11 rounded-xl">
                          <SelectValue placeholder={t.status}>
                            {editingAppt?.status ? ((t as any)[editingAppt.status] || editingAppt.status) : t.status}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">{t.pending}</SelectItem>
                          <SelectItem value="confirmed">{t.confirmed}</SelectItem>
                          <SelectItem value="cancelled">{t.cancelled}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setIsApptModalOpen(false)}>
                      {t.cancel}
                    </Button>
                    <Button className="flex-1 bg-sky-600 hover:bg-sky-700 h-12 rounded-xl font-bold" onClick={handleSaveAppt} disabled={isSavingAppt}>
                      {isSavingAppt ? <Loader2 className="animate-spin mr-2" /> : null}
                      {t.save}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className={`min-h-screen ${hideHeader ? '' : 'bg-slate-50 dark:bg-slate-950'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Top Navigation */}
      {!hideHeader && (
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center text-sky-600 shadow-sm">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-black text-xl text-slate-900 dark:text-white tracking-tight">{t.waiting_room}</h1>
                <p className="text-[10px] text-sky-500 font-extrabold uppercase tracking-[0.2em] -mt-1">
                  {user.role === 'doctor' ? t.doctor_role : t.assistant_role}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {onLanguageChange && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onLanguageChange(lang === 'ar' ? 'en' : 'ar')}
                  className="hidden sm:flex items-center gap-2 text-slate-500 font-bold px-3 hover:bg-slate-100/50 rounded-xl"
                >
                  <Languages className="h-4 w-4" />
                  <span className="text-[10px] uppercase font-black">{lang === 'ar' ? 'EN' : 'AR'}</span>
                </Button>
              )}
              <div className="hidden sm:flex flex-col items-end mx-2">
                <span className="text-sm font-black text-slate-800 dark:text-slate-100">{user.name}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{t.logged_in_as}</span>
              </div>
              <Button 
                variant="ghost" 
                onClick={onLogout} 
                className="text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-2 font-bold px-3 py-1.5 h-auto rounded-xl transition-all"
              >
                <span className="hidden sm:inline text-xs">{lang === 'ar' ? 'خروج' : 'Logout'}</span>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>
      )}

      <main className={`${hideHeader ? 'py-4' : 'max-w-5xl mx-auto p-4 sm:p-6 lg:p-8'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{t.active_queue}</h2>
            </div>
            <p className="text-slate-400 font-bold text-xs sm:text-sm uppercase tracking-wider">{t.manage_waiting}</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {(waitingList.length > 0 || appointments.length > 0) && (
              <ExportDropdown 
                lang={lang} 
                getPayload={getWaitingRoomExportPayload}
                buttonText={lang === 'ar' ? 'تصدير القائمة' : 'Export Queue'}
              />
            )}
            <Button variant="outline" size="sm" onClick={fetchData} disabled={refreshing} className="h-10 rounded-xl px-4 border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 bg-transparent text-slate-600 font-bold">
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t.refresh}</span>
            </Button>
            {user.role === 'assistant' && (
              <>
                <Button variant="outline" size="sm" onClick={() => handleOpenApptModal()} className="h-10 rounded-xl px-4 text-amber-600 border-amber-200 hover:bg-amber-50 dark:border-amber-900/50 dark:hover:bg-amber-950/20 font-bold">
                  <Plus className="h-4 w-4 mr-2" />
                  <span>{t.new_appointment}</span>
                </Button>
                <Button onClick={onNewPatient} className="h-10 rounded-xl px-4 bg-sky-600 hover:bg-sky-700 font-black shadow-lg shadow-sky-500/20 gap-2">
                  {t.new_entry}
                  {lang === 'ar' ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                </Button>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
             <Loader2 className="h-12 w-12 animate-spin text-sky-500" />
             <p className="text-slate-400 font-bold animate-pulse uppercase text-xs tracking-widest">{lang === 'ar' ? 'جاري التحميل...' : 'Loading Data...'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Waiting List */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-col gap-1 w-full bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-sky-100 dark:bg-sky-900/40 rounded-lg flex items-center justify-center text-sky-600 shrink-0">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wide text-base">{lang === 'ar' ? 'المرضى الحاليين بالعيادة' : 'Current Clinic Patients'}</h3>
                  <span className="bg-sky-100 dark:bg-sky-900/30 text-sky-600 px-2.5 py-0.5 rounded-full text-[10px] font-black">{waitingList.length}</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium leading-normal mt-1">
                  {lang === 'ar' 
                    ? 'المرضى الذين حضروا بالفعل للعيادة وتم تسجيل دخولهم وهم ينتظرون الآن في صالة الانتظار للدخول للطبيب.' 
                    : 'Patients who physically arrived at the clinic, checked in, and are currently in the queue waiting to see the doctor.'}
                </p>
              </div>

              {waitingList.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800 py-20 text-center">
                   <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 opacity-50">
                      <UserIcon className="h-8 w-8 text-slate-300" />
                   </div>
                   <h4 className="text-xl font-black text-slate-300 uppercase tracking-tight">{t.empty_queue}</h4>
                </div>
              ) : (
                <div className="grid gap-4">
                  {waitingList.map((item, index) => (
                    <div
                      key={item.id}
                      className="animate-fade-in"
                    >
                      <Card className="hover:shadow-2xl hover:shadow-sky-500/5 transition-all duration-300 border-none bg-white dark:bg-slate-900 overflow-hidden relative group">
                          <div className={`absolute ${lang === 'ar' ? 'right-0' : 'left-0'} top-0 bottom-0 w-1 bg-sky-500 transition-all`} />
                          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-4 w-full">
                              <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 font-black text-lg shrink-0">
                                {index + 1}
                              </div>
                              <div className="flex-grow min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-lg font-black text-slate-900 dark:text-white truncate">
                                    {item.patient_name}
                                  </h4>
                                  {item.appointment_id && (
                                    <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 px-2 py-0.5 rounded-full text-[8px] font-black uppercase transition-all whitespace-nowrap">
                                      {lang === 'ar' ? 'موعد مسبق' : 'Booked'}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold text-slate-400 items-center uppercase tracking-wider">
                                  {item.patient_phone && item.patient_phone.trim() !== "" && (
                                    <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {item.patient_phone}</span>
                                  )}
                                  <span className="flex items-center gap-1.5"><Activity className="h-3 w-3" /> {item.revisit_method}</span>
                                  <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {item.createdAt && !isNaN(new Date(item.createdAt).getTime()) ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: dateLocale }) : '---'}</span>
                                </div>
                              </div>
                            </div>
                            
                            {user.role === 'doctor' ? (
                              <Button 
                                onClick={() => onCallPatient(item)}
                                className="bg-sky-600 hover:bg-sky-700 text-white font-black w-full sm:w-auto h-10 px-6 rounded-xl shadow-lg shadow-sky-500/20 group/btn"
                              >
                                {t.start_visit}
                                {lang === 'ar' ? <ArrowLeft className="h-4 w-4 mr-2" /> : <ArrowRight className="h-4 w-4 ml-2" />}
                              </Button>
                            ) : (
                              <div className="flex items-center gap-1.5 text-emerald-500 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                                <span className="flex h-1.5 w-1.5 gap-2 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                </span>
                                {lang === 'ar' ? 'في الانتظار' : 'Waiting'}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Right Column: Appointments */}
            <div className="lg:col-span-5 space-y-8">
              {/* Today's Appointments */}
              <div className="space-y-4">
                <div className="flex flex-col gap-1 w-full bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center text-amber-600 shrink-0">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <h3 className="font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wide text-base">{t.today_schedule}</h3>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 bg-slate-50 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">{today}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium leading-normal mt-1">
                    {lang === 'ar' 
                      ? 'جدول الحجوزات والمواعيد المقررة ليومنا هذا بانتظار حضور المرضى والضغط على زر "تسجيل الحضور".' 
                      : 'Scheduled bookings for today. Click "Check In" to register them in the queue upon physical arrival.'}
                  </p>
                </div>

                {todayAppointments.length === 0 ? (
                  <div className="bg-amber-50/30 dark:bg-amber-950/10 rounded-2xl p-6 text-center border border-amber-100 dark:border-amber-900/20">
                     <p className="text-[10px] font-black text-amber-600/50 uppercase tracking-widest">{t.no_schedules_today}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayAppointments.map((appt) => (
                      <motion.div key={appt.id!} whileHover={{ y: -2 }}>
                        <Card className="border-none bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/40 rounded-xl flex items-center justify-center text-amber-600 font-black shrink-0">
                                   <Clock className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                   <div className="flex items-center gap-2">
                                      <h4 className="font-black text-sm text-slate-800 dark:text-slate-100 truncate">{appt.patientName}</h4>
                                      <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase ${
                                        appt.status === 'pending' ? 'bg-slate-100 text-slate-400' :
                                        appt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-600' :
                                        'bg-rose-100 text-rose-600'
                                      }`}>
                                        {(t as any)[appt.status]}
                                      </span>
                                   </div>
                                   <p className="text-[10px] font-bold text-amber-600">{appt.appointmentTime}</p>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenApptModal(appt)} className="h-8 w-8 text-slate-400 hover:text-sky-500 rounded-lg">
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={(e) => handleDeleteAppointment(appt.id!, e)} className="h-8 w-8 text-slate-400 hover:text-rose-500 rounded-lg">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 mb-4">
                               <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                                  <Phone className="h-3 w-3" /> {appt.phone}
                               </div>
                               <div className="flex items-center gap-2 text-[10px] font-bold text-sky-500">
                                  <Building2 className="h-3 w-3" /> {appt.clinicName}
                               </div>
                            </div>

                            <Button 
                              onClick={(e) => handleCheckIn(appt, e)}
                              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-9 rounded-lg font-black text-[10px] uppercase tracking-widest gap-2"
                            >
                              <Plus className="h-3 w-3" />
                              {t.check_in}
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Future Appointments */}
              <div className="space-y-4 pt-4 border-t dark:border-slate-800">
                <div className="flex flex-col gap-1 w-full bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <h3 className="font-extrabold text-slate-500 uppercase text-xs">{t.upcoming_appointments}</h3>
                    <span className="ml-auto bg-slate-100 dark:bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold">{futureAppointments.length}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium leading-normal mt-1">
                    {lang === 'ar' 
                      ? 'المواعيد والحجوزات التي تم حجزها لتواريخ مستقبلية قادمة.' 
                      : 'Future scheduled bookings registered for the upcoming days.'}
                  </p>
                </div>

                 {futureAppointments.slice(0, 5).map(appt => (
                   <div key={appt.id!} className="flex items-center justify-between p-3 bg-white/40 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 group hover:border-sky-500/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                         <div className="text-[10px] font-black text-slate-400 w-12 shrink-0">{appt.appointmentDay.split('-').slice(1).join('/')}</div>
                         <div className="min-w-0">
                            <div className="flex items-center gap-2">
                               <div className="text-xs font-black text-slate-700 dark:text-slate-200 truncate">{appt.patientName}</div>
                               <span className="text-[8px] font-black text-amber-500 bg-amber-50 px-1 rounded uppercase tracking-tighter">
                                 {(t as any)[appt.status]}
                               </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] font-bold text-slate-400">
                               <span>{appt.appointmentTime} · {appt.clinicName}</span>
                               <span className="flex items-center gap-0.5 text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[8px] font-extrabold font-mono">
                                 <Phone className="h-2.5 w-2.5 text-sky-500" />
                                 {appt.phone}
                               </span>
                            </div>
                         </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenApptModal(appt)} className="h-7 w-7 text-slate-300 hover:text-sky-500 rounded-lg group-hover:bg-sky-50 dark:group-hover:bg-sky-950/30">
                        <Edit className="h-3 w-3" />
                      </Button>
                   </div>
                 ))}
              </div>

              {/* Appointment Status Guide/Legend */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm transition-all duration-300">
                <div className="flex items-center gap-2 border-b dark:border-slate-800 pb-2">
                  <Info className="h-4 w-4 text-sky-500" />
                  <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                    {lang === 'ar' ? 'دليل حالة المواعيد والحجوزات' : 'Appointment Status Guide'}
                  </h4>
                </div>
                <div className="grid gap-3.5 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="text-[8px] font-black tracking-widest uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded shrink-0 w-16 text-center">
                      {t.pending}
                    </span>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                      {lang === 'ar' 
                        ? 'الموعد محجوز مسبقاً، وفي انتظار حضور المريض للعيادة للقيام بتسجيل الدخول.' 
                        : 'Scheduled booking. Patient has not yet checked in at the clinic.'}
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-[8px] font-black tracking-widest uppercase bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 px-2 py-0.5 rounded shrink-0 w-16 text-center">
                      {t.confirmed}
                    </span>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                      {lang === 'ar' 
                        ? 'حضر المريض بالفعل، وتم تحويله/تسجيل دخوله بنجاح إلى قائمة الانتظار الحالية.' 
                        : 'Patient arrived, check-in is complete, and they are in the active waiting queue.'}
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-[8px] font-black tracking-widest uppercase bg-rose-100 dark:bg-rose-950/40 text-rose-600 px-2 py-0.5 rounded shrink-0 w-16 text-center">
                      {t.cancelled}
                    </span>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                      {lang === 'ar' 
                        ? 'إلغاء الموعد. يؤدي تحديد هذه الحالة وحفظها إلى حذف الموعد الملغي تلقائياً.' 
                        : 'Cancelled status. Selecting and saving this state automatically deletes the appointment.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  </>
);
}
