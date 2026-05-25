import { useState, useEffect } from 'react';
import { api, Patient, GrowthData, Prescription } from '../services/api';
import { translations, Language } from '../lib/translations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { LineChart as ChartIcon, Plus, User, Loader2, ClipboardList, Trash2, Search, Pill } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const WHO_DATA = {
  boy: {
    weight: [[0, 3.3], [1, 4.5], [3, 6.4], [6, 7.9], [9, 8.9], [12, 9.6], [18, 10.9], [24, 12.2], [36, 14.3], [48, 16.3], [60, 18.3]],
    height: [[0, 49.9], [1, 54.7], [3, 61.4], [6, 67.6], [9, 72.0], [12, 75.7], [18, 82.3], [24, 87.8], [36, 96.1], [48, 103.3], [60, 110.0]],
    head: [[0, 34.5], [1, 37.3], [3, 40.5], [6, 43.3], [9, 45.0], [12, 46.1], [18, 47.4], [24, 48.3], [36, 49.5], [48, 50.3], [60, 50.7]],
  },
  girl: {
    weight: [[0, 3.2], [1, 4.2], [3, 5.8], [6, 7.3], [9, 8.2], [12, 8.9], [18, 10.2], [24, 11.5], [36, 13.9], [48, 16.1], [60, 18.2]],
    height: [[0, 49.1], [1, 53.7], [3, 59.8], [6, 65.7], [9, 70.1], [12, 74.0], [18, 80.7], [24, 86.4], [36, 95.1], [48, 102.7], [60, 109.4]],
    head: [[0, 33.9], [1, 36.5], [3, 39.5], [6, 42.1], [9, 43.8], [12, 45.0], [18, 46.2], [24, 47.2], [36, 48.5], [48, 49.3], [60, 49.9]],
  }
};

function getInterpolatedValue(age: number, points: number[][]) {
  if (age <= points[0][0]) return points[0][1];
  if (age >= points[points.length - 1][0]) return points[points.length - 1][1];
  
  for (let i = 0; i < points.length - 1; i++) {
    if (age >= points[i][0] && age <= points[i+1][0]) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[i+1];
      return y1 + (y2 - y1) * (age - x1) / (x2 - x1);
    }
  }
  return points[0][1];
}

export default function GrowthCharts({ lang = 'ar' }: { lang?: Language }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    weight: '',
    height: '',
    head_circumference: '',
    ageYears: '',
    ageMonths: '',
    ageDays: '0'
  });

  const t = translations[lang];
  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      loadGrowthData(selectedPatientId);
      const patient = patients.find(p => p.id === selectedPatientId);
      if (patient) {
        let total = patient.age_months;
        let days = patient.age_days || 0;
        
        if (patient.birth_date) {
          const birth = new Date(patient.birth_date);
          if (!isNaN(birth.getTime())) {
            const now = new Date();
            let y = now.getFullYear() - birth.getFullYear();
            let m = now.getMonth() - birth.getMonth();
            let d = now.getDate() - birth.getDate();
            if (d < 0) { m--; d += 30; }
            if (m < 0) { y--; m += 12; }
            total = (y * 12) + m;
            days = d;
          }
        }

        setFormData(prev => ({ 
          ...prev, 
          ageYears: Math.floor(total / 12).toString(),
          ageMonths: (total % 12).toString(),
          ageDays: days.toString(),
          weight: (patient.weight ?? '').toString(),
          height: (patient.height ?? '').toString(),
          head_circumference: (patient.head_circumference ?? '').toString()
        }));
      }
    } else {
      setGrowthData([]);
    }
  }, [selectedPatientId]);

  const loadPatients = async () => {
    try {
      const data = await api.getPatients();
      setPatients(data);
    } catch (error) {
      console.error('Failed to load patients:', error);
    }
  };

  const loadGrowthData = async (id: string) => {
    setLoading(true);
    try {
      const [growthRes, prescriptionRes] = await Promise.all([
        api.getGrowthData(id),
        api.getPrescriptions()
      ]);
      setGrowthData(growthRes);
      // Filter prescriptions for this patient
      setPrescriptions(prescriptionRes.filter(p => p.patient_id === id));
    } catch (error) {
      console.error('Failed to load growth data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    setSubmitting(true);
    try {
      const totalMonths = (Number(formData.ageYears) * 12) + Number(formData.ageMonths);
      await api.addGrowthData(selectedPatientId, {
        weight: Number(formData.weight),
        height: Number(formData.height),
        head_circumference: Number(formData.head_circumference),
        age_months: totalMonths,
        age_days: Number(formData.ageDays),
        diagnosis: '',
        complaint: ''
      });
      toast.success(lang === 'ar' ? 'تمت إضافة البيانات بنجاح' : 'Data added successfully');
      loadGrowthData(selectedPatientId);
      // Reset some fields but keep age
      setFormData(prev => ({ ...prev, weight: '', height: '', head_circumference: '' }));
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل إضافة البيانات' : 'Failed to add data');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGrowthData = async (id: string) => {
    if (!confirm(t.delete_confirm)) return;

    try {
      await api.deleteGrowthData(id);
      toast.success(lang === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully');
      if (selectedPatientId) loadGrowthData(selectedPatientId);
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل الحذف' : 'Delete failed');
    }
  };

  const [patientSearch, setPatientSearch] = useState('');

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const formatAgeShort = (months: number, days: number = 0) => {
    const y = Math.floor(months / 12);
    const m = months % 12;
    const d = days;
    
    if (y > 0) return `${y}${lang === 'ar' ? 'س' : 'y'} ${m}${lang === 'ar' ? 'ش' : 'm'}`;
    if (m > 0) return `${m}${lang === 'ar' ? 'ش' : 'm'} ${d}${lang === 'ar' ? 'ي' : 'd'}`;
    return `${d}${lang === 'ar' ? 'ي' : 'd'}`;
  };

  const combinedActivities = [
    ...growthData.map(d => ({ ...d, type: 'measurement' as const })),
    ...prescriptions.map(p => ({ 
      id: p.id, 
      createdAt: p.createdAt, 
      age_months: p.age_months || 0,
      diagnosis: p.diagnosis,
      complaint: p.complaint,
      items: p.items,
      type: 'prescription' as const 
    }))
  ].sort((a, b) => {
    // Primary sort by age, secondary by date
    const ageA = a.age_months;
    const ageB = b.age_months;
    if (ageA !== ageB) return ageB - ageA;
    const timeA = a.createdAt && !isNaN(new Date(a.createdAt).getTime()) ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt && !isNaN(new Date(b.createdAt).getTime()) ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 px-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Patient Selection sidebar */}
        <Card className="lg:col-span-1 border-none shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md h-fit sticky top-20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-sky-500" />
              {lang === 'ar' ? 'اختر الطفل' : 'Select Patient'}
            </CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input 
                placeholder={lang === 'ar' ? 'بحث باسم الطفل...' : 'Search by name...'} 
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className={`${lang === 'ar' ? 'pr-9 pl-3' : 'pl-9 pr-3'} bg-slate-50 dark:bg-slate-800 border-none text-sm h-10`}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto overflow-x-hidden p-2 space-y-1">
              {filteredPatients.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPatientId(p.id!)}
                  className={`w-full text-start p-3 rounded-xl transition-all duration-200 flex flex-col gap-1 ${
                    selectedPatientId === p.id 
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' 
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="font-bold truncate">{p.name}</span>
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-[10px] ${selectedPatientId === p.id ? 'text-sky-100' : 'text-slate-500'}`}>
                      {formatAgeShort(p.age_months)} | {p.weight} {t.kg}
                    </span>
                    {p.birth_date && (
                      <span className={`text-[9px] opacity-70 ${selectedPatientId === p.id ? 'text-white' : 'text-slate-400'}`}>
                        {p.birth_date}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedPatientId === p.id ? 'bg-sky-400/30' : (p.gender === 'girl' ? 'bg-rose-100 text-rose-600' : 'bg-sky-100 text-sky-600')}`}>
                      {p.gender === 'girl' ? (lang === 'ar' ? 'بنت' : 'Girl') : (lang === 'ar' ? 'ولد' : 'Boy')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          <AnimatePresence mode="wait">
            {!selectedPatientId ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="h-[500px] flex flex-col items-center justify-center text-slate-400 bg-white/40 dark:bg-slate-900/40 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800"
              >
                <ChartIcon className="h-16 w-16 mb-4 opacity-20" />
                <p>{lang === 'ar' ? 'يرجى اختيار طفل لعرض منحنيات النمو' : 'Please select a patient to view growth charts'}</p>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Entry Form */}
                <Card className="border-none shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                       <Plus className="h-5 w-5 text-emerald-500" />
                       {t.add_measurement}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                      <div className="space-y-2">
                        <Label>{t.years}</Label>
                        <Input 
                          type="number" 
                          step="any"
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          value={formData.ageYears} 
                          onChange={e => setFormData({...formData, ageYears: e.target.value})} 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.months}</Label>
                        <Input 
                          type="number" 
                          max="11"
                          step="any"
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          value={formData.ageMonths} 
                          onChange={e => setFormData({...formData, ageMonths: e.target.value})} 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.days}</Label>
                        <Input 
                          type="number" 
                          max="30"
                          step="any"
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          value={formData.ageDays} 
                          onChange={e => setFormData({...formData, ageDays: e.target.value})} 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.weight} ({t.kg})</Label>
                        <Input 
                          type="number" 
                          step="any" 
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          value={formData.weight} 
                          onChange={e => setFormData({...formData, weight: e.target.value})} 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.height} ({t.cm})</Label>
                        <Input 
                          type="number" 
                          step="any" 
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          value={formData.height} 
                          onChange={e => setFormData({...formData, height: e.target.value})} 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.head_circum} ({t.cm})</Label>
                        <Input 
                          type="number" 
                          step="any" 
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          value={formData.head_circumference} 
                          onChange={e => setFormData({...formData, head_circumference: e.target.value})} 
                          required 
                        />
                      </div>
                      <div className="col-span-2 lg:col-span-5 pt-2">
                        <Button type="submit" disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-700">
                          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                          {t.add_measurement}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Charts */}
                <div className="grid grid-cols-1 gap-6">
                  {/* Weight Chart */}
                  <GrowthChartCard 
                    title={t.weight} 
                    data={growthData} 
                    dataKey="weight" 
                    yLabel={t.kg} 
                    color="#0ea5e9"
                    lang={lang}
                    gender={selectedPatient?.gender || 'boy'}
                    refType="weight"
                  />
                  {/* Height Chart */}
                  <GrowthChartCard 
                    title={t.height} 
                    data={growthData} 
                    dataKey="height" 
                    yLabel={t.cm} 
                    color="#10b981"
                    lang={lang}
                    gender={selectedPatient?.gender || 'boy'}
                    refType="height"
                  />
                  {/* Head Circumference Chart */}
                  <GrowthChartCard 
                    title={t.head_circum} 
                    data={growthData} 
                    dataKey="head_circumference" 
                    yLabel={t.cm} 
                    color="#f59e0b"
                    lang={lang}
                    gender={selectedPatient?.gender || 'boy'}
                    refType="head"
                  />
                </div>

                {/* Patient Activities & Measurements */}
                <Card className="border-none shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-sky-500" />
                      {lang === 'ar' ? 'الجدول الزمني للنشاط والنمو' : 'Activity & Growth Timeline'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {combinedActivities.map((act, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={`p-4 rounded-2xl border ${
                            act.type === 'measurement' 
                            ? 'bg-sky-50/50 dark:bg-sky-900/10 border-sky-100/50 dark:border-sky-900/20' 
                            : 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100/50 dark:border-emerald-900/20'
                          } flex flex-col md:flex-row md:items-center justify-between gap-4`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              act.type === 'measurement' ? 'bg-sky-500 text-white' : 'bg-emerald-500 text-white'
                            }`}>
                              {act.type === 'measurement' ? <ChartIcon className="h-6 w-6" /> : <Pill className="h-6 w-6" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-900 dark:text-white">
                                  {formatAgeShort(act.age_months, (act as any).age_days || 0)}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  {act.createdAt && !isNaN(new Date(act.createdAt).getTime()) ? (
                                    <>
                                      {new Date(act.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')} - {new Date(act.createdAt).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                    </>
                                  ) : '---'}
                                </span>
                              </div>
                              <div className="mt-1">
                                {act.type === 'measurement' ? (
                                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                      {t.weight}: <span className="text-slate-900 dark:text-white">{act.weight} {t.kg}</span>
                                    </span>
                                    {act.height > 0 && (
                                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                        {t.height}: <span className="text-slate-900 dark:text-white">{act.height} {t.cm}</span>
                                      </span>
                                    )}
                                    {act.head_circumference > 0 && (
                                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                        {t.head_circum}: <span className="text-slate-900 dark:text-white">{act.head_circumference} {t.cm}</span>
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex flex-col">
                                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                      {act.diagnosis || (lang === 'ar' ? 'كشف طبي' : 'Medical Checkup')}
                                    </span>
                                    <span className="text-[10px] text-slate-500 truncate max-w-md">
                                      {act.items?.map((m: any) => m.medication_name).join(', ')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 justify-end">
                            {act.type === 'measurement' && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDeleteGrowthData(act.id!)}
                                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                      
                      {combinedActivities.length === 0 && (
                        <div className="p-8 text-center text-slate-400 italic">
                          {lang === 'ar' ? 'لا يوجد نشاط مسجل بعد' : 'No activity recorded yet'}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function GrowthChartCard({ title, data, dataKey, yLabel, color, lang, gender, refType }: any) {
  const t = translations[lang];
  
  // Create a combined data set with reference values
  const sortedPatientData = [...data].map((d: any) => {
    // Add time precision (hours/mins/secs) to ensure multiple measurements on same day are unique points
    let date = d.createdAt ? new Date(d.createdAt) : new Date();
    if (isNaN(date.getTime())) {
      date = new Date();
    }
    const timeOffset = (date.getHours() / 24 + date.getMinutes() / 1440 + date.getSeconds() / 86400) / 30; // fractional day within the month
    
    return {
      ...d,
      decimalAge: Number(d.age_months) + (Number(d.age_days || 0) / 30) + timeOffset
    };
  }).sort((a: any, b: any) => a.decimalAge - b.decimalAge);
  
  // Calculate the age range to show (at least 60 months or max patient age)
  const lastAge = sortedPatientData.length > 0 ? sortedPatientData[sortedPatientData.length - 1].decimalAge : 0;
  const maxAge = Math.max(60, lastAge + 6);
  
  // Generate reference points every 6 months for the line
  const referenceDataPoints = WHO_DATA[gender as 'boy' | 'girl'][refType as 'weight' | 'height' | 'head'];
  
  // For the chart, we want to combine patient points with the smooth reference curve
  // We'll create a merged data set for Recharts
  const ages = Array.from(new Set([
    ...sortedPatientData.map((d: any) => d.decimalAge),
    ...referenceDataPoints.map((p) => p[0])
  ])).sort((a, b) => a - b);

  const chartData = ages.filter(age => age <= maxAge).map(age => {
    const patientPoint = sortedPatientData.find((d: any) => d.decimalAge === age);
    const normalValue = getInterpolatedValue(age, referenceDataPoints);
    
    return {
      age,
      patient: patientPoint ? patientPoint[dataKey] : null,
      normal: normalValue,
      diagnosis: patientPoint?.diagnosis,
      complaint: patientPoint?.complaint
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const years = Math.floor(label / 12);
      const months = Math.floor(label % 12);
      const days = Math.round((label % 1) * 30);
      
      let ageStr = lang === 'ar' ? `العمر: ` : `Age: `;
      if (years > 0) ageStr += `${years}${lang === 'ar' ? 'س' : 'y'} `;
      if (months > 0) ageStr += `${months}${lang === 'ar' ? 'ش' : 'm'} `;
      if (days > 0) ageStr += `${days}${lang === 'ar' ? 'ي' : 'd'}`;

      const patientDataPoint = payload.find((p: any) => p.name === t.patient_value);

      return (
        <div className="bg-white dark:bg-slate-900 p-5 border-2 border-sky-400/30 dark:border-sky-500/30 shadow-2xl rounded-3xl max-w-sm backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4 border-b dark:border-slate-800 pb-3">
            <div className="flex flex-col">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                {lang === 'ar' ? 'العمر' : 'Patient Age'}
              </p>
              <p className="text-lg font-black text-sky-600 dark:text-sky-400 tracking-tight leading-none">
                {ageStr}
              </p>
            </div>
            <div className="w-10 h-10 bg-sky-50 dark:bg-sky-900/30 rounded-2xl flex items-center justify-center">
              <ChartIcon className="h-5 w-5 text-sky-500" />
            </div>
          </div>

          <div className="space-y-4">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest opacity-80">
                    {entry.name === t.patient_value ? t.patient_value : (lang === 'ar' ? 'المعدل الطبيعي (WHO)' : 'WHO Normal Median')}
                  </span>
                  <span className="text-base font-black text-slate-900 dark:text-white">
                    {entry.value !== null ? `${entry.value.toFixed(1)} ${yLabel}` : (lang === 'ar' ? 'غير مسجل' : 'N/A')}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {patientDataPoint && (patientDataPoint.payload.diagnosis || patientDataPoint.payload.complaint) && (
            <div className="mt-5 pt-4 border-t dark:border-slate-800 space-y-3">
              {patientDataPoint.payload.complaint && (
                <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">{lang === 'ar' ? 'الشكوى' : 'Complaint'}</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-bold italic line-clamp-2">"{patientDataPoint.payload.complaint}"</p>
                </div>
              )}
              {patientDataPoint.payload.diagnosis && (
                <div className="bg-sky-50 dark:bg-sky-900/10 p-3 rounded-xl border border-sky-100/50 dark:border-sky-900/20">
                  <p className="text-[9px] font-black text-sky-500 uppercase tracking-tighter mb-1">{lang === 'ar' ? 'التشخيص' : 'Diagnosis'}</p>
                  <p className="text-xs text-sky-700 dark:text-sky-300 font-black">{patientDataPoint.payload.diagnosis}</p>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-none shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex flex-col">
            <span>{title}</span>
            <span className="text-[10px] text-slate-400 font-normal uppercase tracking-wider">
               {gender === 'boy' ? t.boy : t.girl} - {lang === 'ar' ? 'منظمة الصحة العالمية (المتوسط)' : 'WHO Standard (Median)'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] font-bold text-slate-500 uppercase">{t.patient_value}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-slate-300" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">{t.normal_range}</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="age" 
                type="number"
                domain={[0, maxAge]}
                tick={{ fontSize: 10 }}
                label={{ 
                  value: lang === 'ar' ? 'العمر (بالأشهر)' : 'Age (Months)', 
                  position: 'insideBottom', 
                  offset: -10,
                  fontSize: 11,
                  fontWeight: 'bold',
                  fill: '#94a3b8'
                }} 
              />
              <YAxis 
                domain={['auto', 'auto']}
                tick={{ fontSize: 10 }}
                label={{ 
                  value: yLabel, 
                  angle: -90, 
                  position: 'insideLeft', 
                  offset: 15,
                  fontSize: 11,
                  fontWeight: 'bold',
                  fill: '#94a3b8'
                }} 
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
              
              <Line 
                type="monotone" 
                dataKey="normal" 
                stroke="#cbd5e1" 
                strokeWidth={2} 
                strokeDasharray="5 5"
                dot={false}
                name={t.normal_range}
                connectNulls
              />
              
              <Line 
                type="monotone" 
                dataKey="patient" 
                stroke={color} 
                strokeWidth={4} 
                dot={{ r: 6, fill: color, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 8, strokeWidth: 0 }}
                name={t.patient_value}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
