import { useState, useEffect, useMemo } from 'react';
import { api, Prescription } from '../services/api';
import { translations, Language } from '../lib/translations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FileText, Search, Calendar, User, Eye, Loader2, Trash2, ChevronRight, ChevronDown, Clock, History as HistoryIcon, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'motion/react';
import ExportDropdown from './ExportDropdown';
import { ExportPayload } from '../lib/exportUtils';

interface GroupedHistory {
  patientId: string;
  patientName: string;
  patientNumber: string;
  prescriptions: Prescription[];
  lastVisit: string;
}

export default function PrescriptionHistory({ lang = 'ar', onViewPrescription, onEditPrescription }: { lang?: Language, onViewPrescription: (id: string) => void, onEditPrescription: (id: string) => void }) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeletePatientId, setConfirmDeletePatientId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const t = translations[lang];

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getPrescriptions();
      if (Array.isArray(data)) {
        setPrescriptions(data);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    
    setIsDeleting(true);
    try {
      await api.deletePrescription(confirmDeleteId);
      toast.success(lang === 'ar' ? 'تم حذف الروشتة بنجاح' : 'Prescription deleted successfully');
      setPrescriptions(prev => prev.filter(p => p.id !== confirmDeleteId));
      setConfirmDeleteId(null);
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل حذف الروشتة' : 'Failed to delete prescription');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeletePatient = async () => {
    if (!confirmDeletePatientId) return;
    
    setIsDeleting(true);
    try {
      await api.deletePatient(confirmDeletePatientId);
      toast.success(lang === 'ar' ? 'تم حذف المريض وجميع سجلاته بنجاح' : 'Patient and all records deleted successfully');
      setPrescriptions(prev => prev.filter(p => p.patient_id !== confirmDeletePatientId));
      setConfirmDeletePatientId(null);
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل حذف المريض' : 'Failed to delete patient');
    } finally {
      setIsDeleting(false);
    }
  };

  const grouped = useMemo(() => {
    const groups: Record<string, GroupedHistory> = {};
    
    prescriptions.forEach(p => {
      const pid = p.patient_id;
      if (!groups[pid]) {
        groups[pid] = {
          patientId: pid,
          patientName: p.patient_name || 'N/A',
          patientNumber: p.patient_number || '',
          prescriptions: [],
          lastVisit: p.createdAt || ''
        };
      }
      groups[pid].prescriptions.push(p);
      // Keep last visit updated
      if (p.createdAt && (!groups[pid].lastVisit || new Date(p.createdAt) > new Date(groups[pid].lastVisit))) {
        groups[pid].lastVisit = p.createdAt;
      }
    });

    return Object.values(groups)
      .sort((a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime())
      .filter(g => 
        g.patientName.toLowerCase().includes(search.toLowerCase()) || 
        g.patientNumber.toLowerCase().includes(search.toLowerCase()) ||
        g.prescriptions.some(p => p.diagnosis.toLowerCase().includes(search.toLowerCase()))
      );
  }, [prescriptions, search]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPatientHistoryPayload = (group: GroupedHistory): ExportPayload => {
    const patientProfile = [
      { label: lang === 'ar' ? 'اسم المريض' : 'Patient Name', value: group.patientName },
      { label: lang === 'ar' ? 'رقم المريض المميز' : 'Unique Patient ID', value: group.patientNumber ? (group.patientNumber.startsWith('#') ? group.patientNumber : `#${group.patientNumber}`) : '-' },
      { label: lang === 'ar' ? 'أخر زيارة' : 'Last Visit Date', value: formatDate(group.lastVisit) },
      { label: lang === 'ar' ? 'إجمالي عدد الزيارات' : 'Total Visits', value: group.prescriptions.length }
    ];

    const sections = group.prescriptions.map((p, idx) => {
      const fields = [
        { label: lang === 'ar' ? 'تاريخ الزيارة' : 'Visit Date', value: formatDateTime(p.createdAt) },
        { label: lang === 'ar' ? 'نوع الخدمة / الكشف' : 'Service Type', value: p.service_name || (lang === 'ar' ? 'كشف' : 'Visit') },
        { label: lang === 'ar' ? 'الوزن (كجم)' : 'Weight (kg)', value: p.weight ? `${p.weight} ${lang === 'ar' ? 'كجم' : 'kg'}` : '-' },
        { label: lang === 'ar' ? 'درجة الحرارة (م)' : 'Temperature (°C)', value: p.temperature ? `${p.temperature} °C` : '-' },
        { label: lang === 'ar' ? 'الشكوى الرئيسية' : 'Chief Complaint', value: p.complaint || '-' },
        { label: lang === 'ar' ? 'التشخيص الطبي' : 'Medical Diagnosis', value: p.diagnosis || '-' },
        { label: lang === 'ar' ? 'موعد الإعادة' : 'Follow-up Revisit', value: p.revisit_date ? `${formatDate(p.revisit_date)} (${p.revisit_method || ''})` : '-' }
      ];

      const headers = [
        lang === 'ar' ? 'اسم الدواء' : 'Medication',
        lang === 'ar' ? 'الجرعة المقررة' : 'Dosage',
        lang === 'ar' ? 'التكرار' : 'Frequency',
        lang === 'ar' ? 'المدة (أيام)' : 'Duration (Days)',
        lang === 'ar' ? 'ملاحظات' : 'Notes'
      ];

      const rows = p.items ? p.items.map(item => [
        item.medication_name,
        item.dose_description,
        item.frequency_description,
        item.duration_days,
        item.notes || '-'
      ]) : [];

      return {
        title: `${lang === 'ar' ? 'الزيارة رقم' : 'Visit #'}${group.prescriptions.length - idx}: ${formatDateTime(p.createdAt)}`,
        fields,
        table: rows.length > 0 ? { headers, rows } : undefined
      };
    });

    return {
      title: lang === 'ar' ? `الملف الطبي للطفل: ${group.patientName}` : `Child Medical File - ${group.patientName}`,
      subtitle: lang === 'ar' ? 'التوجيهات والزيارات الطبية الكاملة' : 'Complete visits sequence and recommendations',
      metadata: patientProfile,
      sections,
      filename: `${group.patientName.replace(/\s+/g, '_')}_history`
    };
  };

  const getGlobalHistoryPayload = (): ExportPayload => {
    const headers = [
      lang === 'ar' ? 'اسم الطفل' : 'Patient Name',
      lang === 'ar' ? 'رقم المريض المميز' : 'Unique Patient ID',
      lang === 'ar' ? 'عدد الزيارات' : 'Visits Count',
      lang === 'ar' ? 'تاريخ آخر زيارة' : 'Last Visit Date'
    ];

    const rows = grouped.map(g => [
      g.patientName,
      g.patientNumber ? (g.patientNumber.startsWith('#') ? g.patientNumber : `#${g.patientNumber}`) : '-',
      g.prescriptions.length,
      formatDate(g.lastVisit)
    ]);

    return {
      title: lang === 'ar' ? 'سجل المرضى الكلي بالعيادة' : 'Pediatric Patient Registry Summary',
      subtitle: lang === 'ar' ? 'جميع الأطفال المسجلين بالمنصة وتاريخ زياراتهم' : 'Register of all children in database with visit frequency',
      sections: [
        {
          title: lang === 'ar' ? 'جدول سجلات العيادة للأطفال' : 'Clinic Children Database Table',
          table: {
            headers,
            rows
          }
        }
      ],
      filename: `clinic_patient_directory`
    };
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 px-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <Card className="border-none shadow-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-sky-50 to-white dark:from-sky-950/20 dark:to-slate-900 pb-8 border-b dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-sky-500 rounded-2xl shadow-lg shadow-sky-500/20">
                <HistoryIcon className="h-7 w-7 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                  {t.history}
                </CardTitle>
                <CardDescription className="font-medium">{lang === 'ar' ? 'إجمالي المرضى: ' : 'Total Patients: '}{grouped.length}</CardDescription>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:max-w-md">
              {grouped.length > 0 && (
                <ExportDropdown 
                  lang={lang} 
                  getPayload={getGlobalHistoryPayload}
                  buttonText={lang === 'ar' ? 'تصدير السجل الكلي' : 'Export Directory'}
                />
              )}
              <div className="relative flex-1 group">
                <Search className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-sky-500 transition-colors`} />
                <Input 
                  placeholder={lang === 'ar' ? 'ابحث باسم الطفل...' : 'Search for a patient...'} 
                  className={`${lang === 'ar' ? 'pr-12' : 'pl-12'} bg-white dark:bg-slate-800 border-none h-12 rounded-2xl shadow-sm focus-visible:ring-2 focus-visible:ring-sky-500 transition-all text-lg w-full`}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative">
                <Loader2 className="h-12 w-12 text-sky-500 animate-spin" />
                <div className="absolute inset-0 bg-sky-500/10 blur-xl rounded-full" />
              </div>
              <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">{t.loading_data}</p>
            </div>
          ) : grouped.length === 0 ? (
            <div className="text-center py-20 p-8">
              <div className="h-24 w-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <User className="h-12 w-12 text-slate-200" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">{t.no_history}</h3>
              <p className="text-slate-400">{lang === 'ar' ? 'ابدأ بإضافة مرضى جدد من القائمة الرئيسية' : 'Start by adding new patients from the main menu'}</p>
            </div>
          ) : (
            <div className="divide-y dark:divide-slate-800">
              {grouped.map((group, idx) => (
                <div key={group.patientId} className="group/patient">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedPatientId(expandedPatientId === group.patientId ? null : group.patientId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setExpandedPatientId(expandedPatientId === group.patientId ? null : group.patientId);
                      }
                    }}
                    className="w-full text-start p-4 sm:p-6 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer outline-none focus-within:bg-slate-50 dark:focus-within:bg-slate-800/40 border-b border-transparent"
                  >
                    <div className="flex items-center gap-4 min-w-0 md:flex-1">
                      <div className="h-12 w-12 rounded-2xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 dark:text-sky-400 font-black text-xl shadow-inner shrink-0">
                        {group.patientName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 truncate">{group.patientName}</h4>
                          {group.patientNumber && (
                            <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                              #{group.patientNumber}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-500">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {lang === 'ar' ? 'آخر زيارة: ' : 'Last visit: '} {formatDate(group.lastVisit)}</span>
                          <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-300" />
                          <span className="font-bold text-sky-600 dark:text-sky-400">{group.prescriptions.length} {lang === 'ar' ? 'روشتة' : 'Prescriptions'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800 shrink-0">
                       <div onClick={(e) => e.stopPropagation()}>
                         <ExportDropdown
                           lang={lang}
                           getPayload={() => getPatientHistoryPayload(group)}
                           buttonText={lang === 'ar' ? 'تصدير' : 'Export'}
                           size="sm"
                         />
                       </div>
                       <div className="flex items-center gap-1.5">
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className="h-10 w-10 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all shrink-0"
                           onClick={(e) => {
                             e.stopPropagation();
                             setConfirmDeletePatientId(group.patientId);
                           }}
                         >
                           <Trash2 className="h-5 w-5" />
                         </Button>
                         {expandedPatientId === group.patientId ? <ChevronDown className="h-6 w-6 text-slate-300 shrink-0" /> : <ChevronRight className={`h-6 w-6 text-slate-300 shrink-0 ${lang === 'ar' ? 'rotate-180' : ''}`} />}
                       </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedPatientId === group.patientId && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-slate-50/50 dark:bg-slate-950/20"
                      >
                        <div className="p-4 sm:p-6 space-y-4 pb-8">
                          {group.prescriptions.map((p) => (
                            <motion.div
                              key={p.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-sm border border-slate-150/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 group/item hover:border-sky-200 dark:hover:border-sky-900/50 transition-all ring-offset-2 ring-sky-500 focus-within:ring-2"
                            >
                              <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 group-hover/item:text-sky-500 transition-colors shrink-0">
                                  <FileText className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{formatDateTime(p.createdAt)}</span>
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-black">
                                      {p.service_name || (lang === 'ar' ? 'كشف' : 'Visit')}
                                    </span>
                                  </div>
                                  <h5 className="font-extrabold text-slate-800 dark:text-slate-100 max-w-full text-sm sm:text-base break-words">
                                    {p.diagnosis || (lang === 'ar' ? 'زيارة بدون تشخيص مسجل' : 'Visit without recorded diagnosis')}
                                  </h5>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800/60 shrink-0">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => onViewPrescription(p.id!)}
                                  className="rounded-xl font-bold bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 hover:bg-sky-500 hover:text-white transition-all shadow-sm"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  {t.view}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => onEditPrescription(p.id!)}
                                  className="rounded-xl font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  {lang === 'ar' ? 'تعديل' : 'Edit'}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => setConfirmDeleteId(p.id!)}
                                  className="rounded-xl font-bold text-rose-500 hover:bg-rose-500 hover:text-white dark:text-rose-400 dark:hover:bg-rose-500 transition-all"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDeleteId(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 text-center"
            >
              <div className="h-20 w-20 bg-rose-50 dark:bg-rose-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-rose-500">
                <AlertCircle className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-3">{t.delete_confirm}</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                {lang === 'ar' ? 'هذا سيمحي جميع بيانات هذه الروشتة نهائياً من سجلات العيادة.' : 'This will permanently remove all data for this prescription from the clinic records.'}
              </p>
              <div className="flex gap-4">
                <Button 
                  variant="ghost" 
                  className="flex-1 rounded-2xl h-14 font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  onClick={() => setConfirmDeleteId(null)}
                >
                  {t.cancel}
                </Button>
                <Button 
                  className="flex-1 rounded-2xl h-14 font-black bg-rose-500 hover:bg-rose-600 shadow-xl shadow-rose-500/30"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : t.delete}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {confirmDeletePatientId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDeletePatientId(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 text-center"
            >
              <div className="h-20 w-20 bg-rose-100 dark:bg-rose-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 text-rose-600">
                <Trash2 className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-3">{lang === 'ar' ? 'حذف ملف المريض بالكامل؟' : 'Delete Entire Patient Profile?'}</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                {lang === 'ar' 
                  ? 'تحذير: سيتم حذف بيانات المريض وجميع الزيارات والروشتات ومنحنيات النمو نهائياً. لا يمكن التراجع عن هذا الإجراء.' 
                  : 'Warning: This will permanently delete the patient, all their visits, prescriptions, and growth data. This action cannot be undone.'}
              </p>
              <div className="flex gap-4">
                <Button 
                  variant="ghost" 
                  className="flex-1 rounded-2xl h-14 font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  onClick={() => setConfirmDeletePatientId(null)}
                >
                  {t.cancel}
                </Button>
                <Button 
                  className="flex-1 rounded-2xl h-14 font-black bg-rose-600 hover:bg-rose-700 shadow-xl shadow-rose-600/30"
                  onClick={handleDeletePatient}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : t.delete}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
