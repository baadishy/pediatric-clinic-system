import * as React from 'react';
import { useState, useEffect } from 'react';
import { api, Patient, MedicationRule, PrescriptionItem, MedicalService, Prescription, Clinic, WaitingItem, User, Appointment } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, User as UserIcon, UserPlus, Weight, Calendar, ClipboardList, Pill, Trash2, Plus, Sparkles, Thermometer, MapPin, Phone, Printer, Clock, ChevronRight, ChevronDown, Loader2, Scale, History as HistoryIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations, Language } from '../lib/translations';
import { medicalDatabase, commonSymptoms, BodySystem, Disease } from '../lib/pediatricData';

export default function PatientRegistration({ 
  onPrescriptionCreated, 
  lang = 'ar', 
  editPrescriptionId,
  user,
  onCancel,
  initialWaitingItem,
  initialAppointment
}: { 
  onPrescriptionCreated: (id: string) => void, 
  lang?: Language, 
  editPrescriptionId?: string | null,
  user: User,
  onCancel: () => void,
  initialWaitingItem?: WaitingItem | null,
  initialAppointment?: Appointment | null
}) {
  const [patient, setPatient] = useState<any>({
    patient_number: '',
    name: '',
    age_months: 0,
    age_days: 0,
    weight: '0',
    temperature: '37',
    height: '0',
    head_circumference: '0',
    birth_date: '',
    gender: 'boy',
    complaint: ''
  });

  const [ageState, setAgeState] = useState({
    years: '0',
    months: '0',
    days: '0'
  });
  
  const [existingPatientId, setExistingPatientId] = useState<string | null>(null);
  const [patientSearchResults, setPatientSearchResults] = useState<Patient[]>([]);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);

  const [diagnosis, setDiagnosis] = useState('');
  const [medRules, setMedRules] = useState<MedicationRule[]>([]);
  const [services, setServices] = useState<MedicalService[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  
  const [selectedMeds, setSelectedMeds] = useState<PrescriptionItem[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string>('');
  const [medSearchTerm, setMedSearchTerm] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customMed, setCustomMed] = useState({
    name: '',
    dosage: '',
    frequency: '',
    duration: 3
  });

  const [selectedSystemId, setSelectedSystemId] = useState<string>('');
  const [selectedDiseaseId, setSelectedDiseaseId] = useState<string>('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [revisitDate, setRevisitDate] = useState<string>('');
  const [revisitMethod, setRevisitMethod] = useState<string>(lang === 'ar' ? 'كشف جديد' : 'New Visit');
  const [patientHistory, setPatientHistory] = useState<Prescription[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [confirmDeletePatientId, setConfirmDeletePatientId] = useState<string | null>(null);
  const [isDeletingPatient, setIsDeletingPatient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = translations[lang];

  const sortedSystems = medicalDatabase.slice().sort((a, b) => {
    const categoryOrder: Record<string, number> = { 'Pediatric': 1, 'Adult': 2, 'Common': 3 };
    const orderA = categoryOrder[a.category] || 99;
    const orderB = categoryOrder[b.category] || 99;
    if (orderA !== orderB) return orderA - orderB;
    return (lang === 'ar' ? a.name_ar : a.name_en).localeCompare(lang === 'ar' ? b.name_ar : b.name_en);
  });

  const filteredMedRules = medRules.filter(rule => 
    rule.id === selectedRuleId || rule.name.toLowerCase().includes(medSearchTerm.toLowerCase())
  );

  useEffect(() => {
    if (initialAppointment) {
      const { patientName, phone, birthDate } = initialAppointment;
      const age = calculateAgeFromBirthDate(birthDate);
      
      setPatient((prev: any) => ({
        ...prev,
        name: patientName,
        patient_phone: phone,
        birth_date: birthDate,
        age_months: age ? age.totalMonths : 0,
        age_days: age ? age.days : 0
      }));

      if (age) {
        setAgeState({ 
          years: age.years.toString(), 
          months: age.months.toString(), 
          days: age.days.toString() 
        });
      }
    }
  }, [initialAppointment]);

  useEffect(() => {
    if (editPrescriptionId) {
      api.getPrescription(editPrescriptionId).then(data => {
        const totalMonths = data.age_months || 0;
        setPatient({
          name: data.patient_name || '',
          age_months: totalMonths,
          birth_date: data.birth_date || '',
          weight: data.weight || 0,
          height: data.height || 0,
          head_circumference: data.head_circumference || 0,
          gender: data.gender || 'boy',
          complaint: data.complaint || ''
        });
        setAgeState({
          years: Math.floor(totalMonths / 12).toString(),
          months: (totalMonths % 12).toString(),
          days: (data.age_days || 0).toString()
        });
        setDiagnosis(data.diagnosis || '');
        setSelectedMeds(data.items || []);
        setRevisitDate(data.revisit_date || '');
        setRevisitMethod(data.revisit_method || (lang === 'ar' ? 'استشارة' : 'Consultation'));
        setExistingPatientId(data.patient_id);
      }).catch(console.error);
    }
  }, [editPrescriptionId]);

  useEffect(() => {
    if (initialWaitingItem) {
      api.getPatient(initialWaitingItem.patient_id).then(data => {
        selectExistingPatient(data);
        setRevisitMethod(initialWaitingItem.revisit_method);
      }).catch(console.error);
    }
  }, [initialWaitingItem]);

  // Sync service selection when services or waiting item changes
  useEffect(() => {
    if (initialWaitingItem && services.length > 0) {
      const matchedService = services.find(s => s.name === initialWaitingItem.revisit_method);
      if (matchedService) {
        setSelectedClinicId(matchedService.clinic_id);
        setSelectedServiceId(matchedService.id!);
      }
    }
  }, [initialWaitingItem, services]);

  const calculateAgeFromBirthDate = (birthDateStr: string) => {
    if (!birthDateStr) return null;
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    
    // Check if birthDate is valid and not in the far future
    if (isNaN(birthDate.getTime())) return null;

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();
    
    if (days < 0) {
      months--;
      const prevMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
      days += prevMonthLastDay;
    }

    if (months < 0) {
      years--;
      months += 12;
    }
    
    // Ensure age is at least 0
    years = Math.max(0, years);
    months = Math.max(0, months);
    days = Math.max(0, days);
    
    const totalMonths = (years * 12) + months;
    return { years, months, days, totalMonths };
  };

  useEffect(() => {
    Promise.all([
      api.getMedicationRules(),
      api.getClinics(),
      api.getServices()
    ]).then(([rules, cls, servs]) => {
      if (Array.isArray(rules)) {
        setMedRules(rules);
      } else {
        setMedRules([]);
        if (rules && (rules as any).status === 'db_disconnected') {
           toast.error(lang === 'ar' ? 'لم يتم الاتصال بقاعدة البيانات' : 'Database connection failed');
        }
      }

      if (Array.isArray(cls)) {
        setClinics(cls);
        if (cls.length > 0) setSelectedClinicId(cls[0].id);
      }

      if (Array.isArray(servs)) {
        setServices(servs);
      } else {
        setServices([]);
      }
    }).catch(console.error);
  }, []);

  // Update selected service when clinic changes if current selection is invalid
  useEffect(() => {
    if (selectedClinicId && services.length > 0) {
      const clinicServices = services.filter(s => s.clinic_id === selectedClinicId);
      if (clinicServices.length > 0 && !clinicServices.find(s => s.id === selectedServiceId)) {
        setSelectedServiceId(clinicServices[0].id!);
      }
    }
  }, [selectedClinicId, services]);

  const handlePatientChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'birth_date') {
      const age = calculateAgeFromBirthDate(value);
      if (age) {
        setAgeState({ years: age.years.toString(), months: age.months.toString(), days: age.days.toString() });
        setPatient(prev => ({ ...prev, birth_date: value, age_months: age.totalMonths, age_days: age.days }));
      } else {
        setPatient(prev => ({ ...prev, birth_date: value }));
      }
      return;
    }

    if (name === 'age_years' || name === 'age_months_input' || name === 'age_days_input') {
      const newAgeState = {
        ...ageState,
        [name === 'age_years' ? 'years' : (name === 'age_months_input' ? 'months' : 'days')]: value
      };
      setAgeState(newAgeState);
      const totalMonths = (Number(newAgeState.years || 0) * 12) + Number(newAgeState.months || 0);
      setPatient(prev => ({ ...prev, age_months: totalMonths, age_days: Number(newAgeState.days || 0) }));
      return;
    }

    setPatient(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'name' && value.length > 1) {
      try {
        setIsSearchingPatient(true);
        const results = await api.searchPatients(value);
        setPatientSearchResults(results);
      } catch (error) {
        console.error('Patient search failed:', error);
      } finally {
        setIsSearchingPatient(false);
      }
    } else if (name === 'name') {
      setPatientSearchResults([]);
    }
  };

  const selectExistingPatient = (existing: Patient) => {
    let totalMonths = existing.age_months;
    let days = existing.age_days || 0;
    let years = Math.floor(totalMonths / 12);
    let months = totalMonths % 12;

    if (existing.birth_date) {
      const calculated = calculateAgeFromBirthDate(existing.birth_date);
      if (calculated) {
        totalMonths = calculated.totalMonths;
        years = calculated.years;
        months = calculated.months;
        days = calculated.days;
      }
    }

    setPatient({
      patient_number: existing.patient_number || '',
      name: existing.name,
      age_months: totalMonths,
      age_days: days,
      birth_date: existing.birth_date || '',
      weight: (existing.weight ?? '').toString(),
      height: (existing.height ?? '').toString(),
      head_circumference: (existing.head_circumference ?? '').toString(),
      gender: existing.gender as any,
      complaint: existing.complaint || ''
    });
    setAgeState({
      years: (years ?? 0).toString(),
      months: (months ?? 0).toString(),
      days: (days ?? 0).toString()
    });
    setExistingPatientId(existing.id!);
    setPatientSearchResults([]);
    
    // Fetch history
    api.getPrescriptions().then(all => {
      const history = all.filter(p => p.patient_id === existing.id);
      setPatientHistory(history);
    }).catch(console.error);

    toast.info(lang === 'ar' ? `تم اختيار: ${existing.name}` : `Selected: ${existing.name}`);
  };

  const formatAgeShort = (months: number, days?: number) => {
    const y = Math.floor(months / 12);
    const m = months % 12;
    const d = days || 0;
    
    if (y > 0) return `${y}${lang === 'ar' ? 'س' : 'y'} ${m}${lang === 'ar' ? 'ش' : 'm'}`;
    if (m > 0) return `${m}${lang === 'ar' ? 'ش' : 'm'} ${d}${lang === 'ar' ? 'ي' : 'd'}`;
    return `${d}${lang === 'ar' ? 'ي' : 'd'}`;
  };

  const handleDeletePatient = async () => {
    if (!existingPatientId) return;
    
    setIsDeletingPatient(true);
    try {
      await api.deletePatient(existingPatientId);
      toast.success(lang === 'ar' ? 'تم حذف الملف الطبي بالكامل وكافة الزيارات' : 'Full medical file and all visits deleted successfully');
      setExistingPatientId(null);
      setPatient({
        patient_number: '',
        name: '',
        age_months: 0,
        weight: '0',
        height: '0',
        head_circumference: '0',
        birth_date: '',
        gender: 'boy',
        complaint: ''
      });
      setAgeState({ years: '0', months: '0', days: '0' });
      setConfirmDeletePatientId(null);
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل حذف ملف المريض' : 'Failed to delete patient file');
    } finally {
      setIsDeletingPatient(false);
    }
  };

  const selectedService = services.find(s => s.id === selectedServiceId);

  const calculateDose = (rule: MedicationRule, weight: number): PrescriptionItem => {
    let doseDescription = '';
    let frequencyDescription = '';

    if (rule.mg_per_kg > 0 && weight > 0) {
      const totalMgPerDay = weight * rule.mg_per_kg;
      const mgPerDose = totalMgPerDay / rule.doses_per_day;
      
      if (rule.concentration_mg_per_ml && rule.concentration_mg_per_ml > 0) {
        const mlPerDose = mgPerDose / rule.concentration_mg_per_ml;
        doseDescription = `${mlPerDose.toFixed(1)} ${lang === 'ar' ? 'مل' : 'ml'} (${Math.round(mgPerDose)} ${lang === 'ar' ? 'مجم' : 'mg'})`;
      } else {
        doseDescription = `${Math.round(mgPerDose)} ${lang === 'ar' ? 'مجم' : 'mg'}`;
      }
      
      frequencyDescription = lang === 'ar' 
        ? `كل ${24 / rule.doses_per_day === 24 ? 'يوم' : 24 / rule.doses_per_day + ' ساعات'}` 
        : `Every ${24 / rule.doses_per_day} hours`;
    } else {
      // For drugs with fixed dosages or age-dependent ones
      doseDescription = rule.notes || (lang === 'ar' ? 'حسب العمر' : 'According to age');
      frequencyDescription = rule.doses_per_day > 0 
        ? (lang === 'ar' ? `كل ${24 / rule.doses_per_day} ساعات` : `Every ${24 / rule.doses_per_day} hours`)
        : (lang === 'ar' ? 'عند اللزوم' : 'As needed');
    }
    
    if (rule.mg_per_kg > 0 && weight <= 0) {
      doseDescription = lang === 'ar' ? "تحذير: لا يمكن حساب الجرعة بدون وزن صحيح" : "Warning: Dose cannot be calculated without weight";
    }

    return {
      medication_name: rule.name,
      dose_description: doseDescription,
      frequency_description: frequencyDescription,
      duration_days: rule.duration_days,
      notes: rule.notes
    };
  };

  const handleAddMedication = () => {
    if (!selectedRuleId) return;
    if (patient.weight <= 0) {
      toast.warning(lang === 'ar' ? 'يرجى إدخال وزن الطفل أولاً لحساب الجرعة' : 'Please enter patient weight first');
      return;
    }
    
    const rule = medRules.find(r => r.id === selectedRuleId);
    if (!rule) return;
    
    const calculated = calculateDose(rule, patient.weight);
    setSelectedMeds(prev => [...prev, calculated]);
    setSelectedRuleId('');
    toast.success(lang === 'ar' ? 'تم إضافة الدواء للروشتة' : 'Medication added to prescription');
  };

  const handleAddCustomMedication = () => {
    if (!customMed.name || !customMed.dosage || !customMed.frequency) {
      toast.warning(lang === 'ar' ? 'يرجى إكمال جميع بيانات الدواء' : 'Please fill all medication details');
      return;
    }

    const newItem: PrescriptionItem = {
      medication_name: customMed.name,
      dose_description: customMed.dosage,
      frequency_description: customMed.frequency,
      duration_days: customMed.duration
    };

    setSelectedMeds(prev => [...prev, newItem]);
    setCustomMed({ name: '', dosage: '', frequency: '', duration: 3 });
    setIsAddingCustom(false);
    toast.success(lang === 'ar' ? 'تم إضافة الدواء الخارجي' : 'Custom medication added');
  };

  const removeMedication = (index: number) => {
    setSelectedMeds(prev => prev.filter((_, i) => i !== index));
  };

  const toggleSymptom = (s: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const addSymptomsToComplaint = () => {
    if (selectedSymptoms.length === 0) return;
    const symptomsStr = selectedSymptoms.join(', ');
    setPatient(prev => ({
      ...prev,
      complaint: prev.complaint ? `${prev.complaint}, ${symptomsStr}` : symptomsStr
    }));
    setSelectedSymptoms([]);
    toast.success(lang === 'ar' ? 'تمت إضافة الأعراض للشكوى' : 'Symptoms added to complaint');
  };

  const handleDiseaseSelect = (diseaseId: string) => {
    setSelectedDiseaseId(diseaseId);
    if (!selectedSystemId) return;
    
    const system = sortedSystems.find(s => s.id === selectedSystemId);
    const disease = system?.diseases.find(d => d.id === diseaseId);
    
    if (disease) {
      const diseaseName = lang === 'ar' ? disease.name_ar : disease.name_en;
      setDiagnosis(prev => prev ? `${prev}, ${diseaseName}` : diseaseName);
      
      // Auto-select related symptoms
      if (disease.symptoms && disease.symptoms.length > 0) {
        setSelectedSymptoms(prev => {
          const newSymptoms = [...prev];
          disease.symptoms.forEach(s => {
            if (!newSymptoms.includes(s)) {
              newSymptoms.push(s);
            }
          });
          return newSymptoms;
        });
        toast.info(lang === 'ar' ? `تم تحديد أعراض: ${diseaseName}` : `Symptoms for ${diseaseName} selected`);
      } else {
        toast.info(lang === 'ar' ? `تم اختيار: ${diseaseName}` : `Selected: ${diseaseName}`);
      }
    }
  };

  const handleSubmit = async () => {
    if (!patient.name) {
      toast.error(lang === 'ar' ? 'يرجى إدخال اسم الطفل' : 'Please enter patient name');
      return;
    }

    if (user.role === 'doctor') {
      if (patient.weight <= 0) {
        toast.error(lang === 'ar' ? 'يرجى إدخال الوزن' : 'Please enter weight');
        return;
      }
      if (!diagnosis) {
        toast.error(lang === 'ar' ? 'يرجى إدخال التشخيص' : 'Please enter diagnosis');
        return;
      }
      if (selectedMeds.length === 0) {
        toast.error(lang === 'ar' ? 'يرجى إضافة دواء واحد على الأقل' : 'Please add at least one medication');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      let patientId = existingPatientId;

      if (existingPatientId) {
        // Update existing patient record (weight/age might have changed)
        await api.updatePatient(existingPatientId, {
          age_months: patient.age_months,
          age_days: patient.age_days,
          birth_date: patient.birth_date,
          weight: patient.weight,
          height: patient.height,
          head_circumference: patient.head_circumference,
          complaint: patient.complaint,
          gender: patient.gender,
          temperature: patient.temperature
        });
      } else {
        // Double check if name already exists exactly
        const exactMatches = await api.searchPatients(patient.name);
        const exactMatch = exactMatches.find(p => p.name.toLowerCase() === patient.name.toLowerCase());
        
        if (exactMatch) {
          patientId = exactMatch.id!;
          await api.updatePatient(patientId, {
            age_months: patient.age_months,
            age_days: patient.age_days,
            birth_date: patient.birth_date,
            weight: patient.weight,
            height: patient.height,
            head_circumference: patient.head_circumference,
            complaint: patient.complaint,
            gender: patient.gender,
            temperature: patient.temperature
          });
        } else {
          const patientRes = await api.createPatient(patient);
          if (patientRes.error) throw new Error(patientRes.error);
          patientId = patientRes.id;
        }
      }

      // Add to growth data if measurements are provided and significant
      if (patientId && (Number(patient.weight) > 0 || (Number(patient.height) > 0) || (Number(patient.head_circumference) > 0))) {
        await api.addGrowthData(patientId, {
          weight: Number(patient.weight),
          height: Number(patient.height) || 0,
          head_circumference: Number(patient.head_circumference) || 0,
          age_months: patient.age_months,
          age_days: patient.age_days,
          diagnosis: diagnosis,
          complaint: patient.complaint
        }).catch(err => console.error("Could not save growth data automatically", err));
      }

      if (user.role === 'assistant') {
        // Assistant only adds to waiting list
        await api.addToWaitingList(patientId!, revisitMethod);
        toast.success(lang === 'ar' ? 'تمت إضافة المريض لقائمة الانتظار' : 'Patient added to waiting list');
        onCancel(); // Go back
        return;
      }
      
      if (editPrescriptionId) {
        await api.updatePrescription(editPrescriptionId, {
          diagnosis,
          complaint: patient.complaint,
          items: selectedMeds,
          service_name: selectedService?.name,
          revisit_date: revisitDate,
          revisit_method: revisitMethod,
          temperature: patient.temperature
        });
        toast.success(lang === 'ar' ? 'تم تحديث الروشتة بنجاح' : 'Prescription updated successfully');
        onPrescriptionCreated(editPrescriptionId);
      } else {
        const presRes = await api.createPrescription({
          patient_id: patientId!,
          appointment_id: initialAppointment?.id || initialWaitingItem?.appointment_id,
          diagnosis,
          complaint: patient.complaint,
          items: selectedMeds,
          service_name: selectedService?.name,
          revisit_date: revisitDate,
          revisit_method: revisitMethod,
          temperature: patient.temperature
        });
        if (presRes.error) throw new Error(presRes.error);
        
        // Remove from waiting list if we started from there
        if (initialWaitingItem) {
          await api.removeFromWaitingList(initialWaitingItem.id);
        }

        toast.success(lang === 'ar' ? 'تم إنشاء الروشتة بنجاح' : 'Prescription created successfully');
        onPrescriptionCreated(presRes.id);
      }
    } catch (error: any) {
      toast.error(error.message || (lang === 'ar' ? 'حدث خطأ أثناء الحفظ' : 'Error saving prescription'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header and Back Button */}
      <div className="xl:col-span-12 flex items-center justify-between mb-2">
        <Button variant="ghost" onClick={onCancel} className="gap-2 text-slate-500 font-bold">
          <ChevronRight className={`h-4 w-4 ${lang === 'ar' ? '' : 'rotate-180'}`} />
          {t.back_to_waiting}
        </Button>
        {user.role === 'doctor' && initialWaitingItem && (
          <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-4 py-2 rounded-full text-sm font-black flex items-center gap-2 border border-emerald-200 dark:border-emerald-800/50">
            <UserIcon className="h-4 w-4" />
            {t.active_exam} {patient.name}
          </div>
        )}
      </div>

      {/* Right Column: Patient Data */}
      <div className="xl:col-span-5 space-y-6">
        <motion.div initial={{ opacity: 0, x: lang === 'ar' ? 20 : -20 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="border-none shadow-xl bg-white dark:bg-slate-900">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-xl flex items-center justify-center text-sky-600 shadow-sm border border-sky-100 dark:border-sky-900/50">
                    <UserIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black text-slate-900 dark:text-white leading-none">
                      {t.patient_info}
                    </CardTitle>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{t.personal_details}</p>
                  </div>
                </div>
                {existingPatientId && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                    onClick={() => setConfirmDeletePatientId(existingPatientId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-4 sm:p-6">
                {/* Column 1: Patient Basic Info */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-2 pb-2 border-b dark:border-slate-800">
                    <div className="w-8 h-8 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center text-sky-600">
                      <UserPlus className="h-4 w-4" />
                    </div>
                    <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">{t.personal_details}</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2 relative">
                      <Label htmlFor="name" className="text-slate-700 dark:text-slate-300 font-bold">{t.name}</Label>
                      <div className="relative">
                        <UserIcon className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-slate-400`} />
                        <Input 
                          id="name" 
                          name="name" 
                          value={patient.name} 
                          onChange={handlePatientChange} 
                          placeholder={(t as any).example_name} 
                          className={`${lang === 'ar' ? 'pr-10' : 'pl-10'} bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-12 rounded-xl focus-visible:ring-sky-500`} 
                        />
                      </div>

                      {/* Search Results Dropdown */}
                      <AnimatePresence>
                        {patientSearchResults.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden"
                          >
                            <div className="p-2 bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              {t.previously_registered}
                            </div>
                            {patientSearchResults.map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => selectExistingPatient(p)}
                                className="w-full text-start p-3 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors flex items-center justify-between group"
                              >
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">{p.name}</span>
                                    {p.patient_number && (
                                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                                        #{p.patient_number}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-slate-500">{formatAgeShort(p.age_months, p.age_days)}</span>
                                  <span className="text-[10px] text-slate-400">{t.hc_short} {p.head_circumference || '-'} {t.cm}</span>
                                </div>
                                <Plus className="h-4 w-4 text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="birth_date">{(t as any).birth_date}</Label>
                      <div className="relative">
                        <Calendar className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-slate-400`} />
                        <Input 
                          id="birth_date" 
                          name="birth_date" 
                          type="date" 
                          value={patient.birth_date || ''} 
                          onChange={handlePatientChange} 
                          className={`${lang === 'ar' ? 'pr-10' : 'pl-10'} bg-slate-50 dark:bg-slate-800 border-none`} 
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="age_years">{t.years}</Label>
                        <div className="relative">
                          <Calendar className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-slate-400`} />
                          <Input id="age_years" name="age_years" type="number" min="0" step="any" onWheel={(e) => (e.target as HTMLInputElement).blur()} value={ageState.years ?? ''} onChange={handlePatientChange} placeholder={(t as any).example_age} className={`${lang === 'ar' ? 'pr-10' : 'pl-10'} bg-slate-50 dark:bg-slate-800 border-none h-11 rounded-xl`} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="age_months_input">{t.months}</Label>
                        <div className="relative">
                          <Calendar className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-slate-400`} />
                          <Input id="age_months_input" name="age_months_input" type="number" min="0" step="any" onWheel={(e) => (e.target as HTMLInputElement).blur()} value={ageState.months ?? ''} onChange={handlePatientChange} placeholder={(t as any).example_age} className={`${lang === 'ar' ? 'pr-10' : 'pl-10'} bg-slate-50 dark:bg-slate-800 border-none h-11 rounded-xl`} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="age_days_input">{t.days}</Label>
                        <div className="relative">
                          <Calendar className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-slate-400`} />
                          <Input id="age_days_input" name="age_days_input" type="number" min="0" step="any" onWheel={(e) => (e.target as HTMLInputElement).blur()} value={ageState.days ?? ''} onChange={handlePatientChange} placeholder={(t as any).example_age} className={`${lang === 'ar' ? 'pr-10' : 'pl-10'} bg-slate-50 dark:bg-slate-800 border-none h-11 rounded-xl`} />
                        </div>
                      </div>
                    </div>

                    {user.role === 'doctor' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="weight" className="text-slate-700 dark:text-slate-300 font-bold">{t.weight} ({t.kg})</Label>
                            <div className="relative">
                              <Weight className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-slate-400`} />
                              <Input id="weight" name="weight" type="number" min="0" step="any" onWheel={(e) => (e.target as HTMLInputElement).blur()} value={patient.weight || ''} onChange={handlePatientChange} placeholder={(t as any).example_weight} className={`${lang === 'ar' ? 'pr-10' : 'pl-10'} bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-11 rounded-xl focus-visible:ring-sky-500`} />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="temperature" className="text-slate-700 dark:text-slate-300 font-bold">{(t as any).temp || (lang === 'ar' ? 'الحرارة' : 'Temp')}</Label>
                            <div className="relative">
                              <Thermometer className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-slate-400`} />
                              <Input id="temperature" name="temperature" type="text" value={patient.temperature || ''} onChange={handlePatientChange} placeholder={(t as any).example_temp} className={`${lang === 'ar' ? 'pr-10' : 'pl-10'} bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-11 rounded-xl focus-visible:ring-sky-500`} />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="height" className="text-slate-700 dark:text-slate-300 font-bold">{t.height} ({t.cm})</Label>
                            <div className="relative">
                              <div className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-slate-400 flex items-center justify-center font-bold text-[10px]`}>H</div>
                              <Input id="height" name="height" type="number" min="0" step="any" onWheel={(e) => (e.target as HTMLInputElement).blur()} value={patient.height || ''} onChange={handlePatientChange} placeholder={(t as any).example_height} className={`${lang === 'ar' ? 'pr-10' : 'pl-10'} bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-11 rounded-xl focus-visible:ring-sky-500`} />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="head_circumference" className="text-slate-700 dark:text-slate-300 font-bold">{t.head_circum} ({t.cm})</Label>
                            <div className="relative">
                              <div className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-slate-400 flex items-center justify-center font-bold text-[10px]`}>HC</div>
                              <Input id="head_circumference" name="head_circumference" type="number" min="0" step="any" onWheel={(e) => (e.target as HTMLInputElement).blur()} value={patient.head_circumference || ''} onChange={handlePatientChange} placeholder={(t as any).example_hc} className={`${lang === 'ar' ? 'pr-10' : 'pl-10'} bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-11 rounded-xl focus-visible:ring-sky-500`} />
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="space-y-2">
                      <Label>{t.gender}</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setPatient(prev => ({ ...prev, gender: 'boy' }))}
                          className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                            patient.gender === 'boy' 
                            ? 'bg-sky-500 text-white border-sky-500 shadow-lg shadow-sky-500/20' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span>{t.boy}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPatient(prev => ({ ...prev, gender: 'girl' }))}
                          className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                            patient.gender === 'girl' 
                            ? 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/20' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span>{t.girl}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Column 2: Medical Assessment & Assistant Actions */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  {user.role === 'doctor' ? (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 pb-2 border-b dark:border-slate-800">
                        <div className="w-8 h-8 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center text-sky-600">
                          <ClipboardList className="h-4 w-4" />
                        </div>
                        <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">
                          {lang === 'ar' ? 'البيانات الطبية' : 'Medical Assessment'}
                        </h3>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="clinic" className="text-slate-700 dark:text-slate-300 font-bold">{(t as any).clinic}</Label>
                          <Select value={selectedClinicId} onValueChange={setSelectedClinicId}>
                            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-11 rounded-xl">
                              <SelectValue placeholder={lang === 'ar' ? "اختر العيادة..." : "Select clinic..."}>
                                {clinics.find(c => c.id === selectedClinicId)?.name}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent dir={lang === 'ar' ? 'rtl' : 'ltr'} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                              {clinics.map(c => (
                                <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="service" className="text-slate-700 dark:text-slate-300 font-bold">{(t as any).service}</Label>
                          <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-11 rounded-xl">
                              <SelectValue placeholder={lang === 'ar' ? "اختر الخدمة..." : "Select service..."}>
                                {services.find(s => s.id === selectedServiceId)?.name}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent dir={lang === 'ar' ? 'rtl' : 'ltr'} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                              {services.filter(s => s.clinic_id === selectedClinicId).map(s => (
                                <SelectItem key={s.id} value={s.id!}>{s.name} ({s.price} {t.egp})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="complaint" className="text-slate-700 dark:text-slate-300 font-bold">{t.complaint}</Label>
                          <Textarea 
                            id="complaint" 
                            name="complaint"
                            value={patient.complaint} 
                            onChange={handlePatientChange} 
                            placeholder={(t as any).example_complaint} 
                            className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-24 rounded-xl resize-none" 
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="diagnosis" className="text-slate-700 dark:text-slate-300 font-bold">{t.diagnosis}</Label>
                          <div className="relative">
                            <Sparkles className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-sky-400`} />
                            <Input 
                              id="diagnosis" 
                              value={diagnosis} 
                              onChange={e => setDiagnosis(e.target.value)} 
                              placeholder={(t as any).example_diagnosis} 
                              className={`${lang === 'ar' ? 'pr-10' : 'pl-10'} bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-11 rounded-xl focus-visible:ring-sky-500`} 
                            />
                          </div>
                        </div>

                        {/* Diseases Selector */}
                        <div className="space-y-4 pt-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-sky-500" />
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{t.diseases_selector}</h4>
                          </div>
                          
                          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar" style={{ scrollbarWidth: 'none' }}>
                            {sortedSystems.map(system => (
                              <button
                                key={system.id}
                                onClick={() => setSelectedSystemId(selectedSystemId === system.id ? '' : system.id)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                                  selectedSystemId === system.id 
                                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20' 
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                }`}
                              >
                                {lang === 'ar' ? system.name_ar : system.name_en}
                              </button>
                            ))}
                          </div>

                          <AnimatePresence mode="wait">
                            {selectedSystemId && (
                              <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="grid grid-cols-2 gap-2"
                              >
                                {sortedSystems.find(s => s.id === selectedSystemId)?.diseases.map(disease => (
                                  <button
                                    key={disease.id}
                                    onClick={() => handleDiseaseSelect(disease.id)}
                                    className={`text-start p-2.5 rounded-xl text-xs font-bold transition-all border ${
                                      selectedDiseaseId === disease.id 
                                      ? 'bg-sky-50 dark:bg-sky-900/30 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-400' 
                                      : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-sky-200'
                                    }`}
                                  >
                                    {lang === 'ar' ? disease.name_ar : disease.name_en}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Symptoms Section */}
                        <div className="space-y-4 pt-4 border-t dark:border-slate-800">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ClipboardList className="h-4 w-4 text-amber-500" />
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{t.common_symptoms}</h4>
                            </div>
                            {selectedSymptoms.length > 0 && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={addSymptomsToComplaint} 
                                className="text-sky-600 dark:text-sky-400 h-7 text-[10px] font-black uppercase hover:bg-sky-50 dark:hover:bg-sky-900/20 px-2 rounded-lg"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {t.to_complaint}
                              </Button>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            {commonSymptoms.map((s, idx) => {
                              const name = lang === 'ar' ? s.ar : s.en;
                              const isSelected = selectedSymptoms.includes(name);
                              return (
                                <button
                                  key={idx}
                                  onClick={() => toggleSymptom(name)}
                                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                                    isSelected 
                                    ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20' 
                                    : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-amber-300'
                                  }`}
                                >
                                  {name}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="revisit_date" className="text-slate-700 dark:text-slate-300 font-bold">{(t as any).revisit_date}</Label>
                            <Input 
                              id="revisit_date" 
                              type="date" 
                              value={revisitDate} 
                              onChange={e => setRevisitDate(e.target.value)} 
                              className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-11 rounded-xl" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="revisit_method" className="text-slate-700 dark:text-slate-300 font-bold">{(t as any).revisit_type}</Label>
                            <Select value={revisitMethod} onValueChange={setRevisitMethod}>
                              <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-11 rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent dir={lang === 'ar' ? 'rtl' : 'ltr'} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                {services.filter(s => s.clinic_id === selectedClinicId).map(s => (
                                  <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Assistant Actions */
                    <div className="space-y-6">
                      <div className="space-y-4">
                        {clinics.length > 1 && (
                          <div className="space-y-2">
                            <Label htmlFor="assistant_clinic" className="text-slate-700 dark:text-slate-300 font-bold">{t.clinic}</Label>
                            <Select value={selectedClinicId} onValueChange={setSelectedClinicId}>
                              <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-14 rounded-2xl text-lg font-bold">
                                <SelectValue placeholder={t.select_clinic}>
                                  {clinics.find(c => c.id === selectedClinicId)?.name}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent dir={lang === 'ar' ? 'rtl' : 'ltr'} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                {clinics.map(c => (
                                  <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                         <div className="space-y-2">
                            <Label htmlFor="revisit_method" className="text-slate-700 dark:text-slate-300 font-bold">{(t as any).visit_type}</Label>
                            <Select value={revisitMethod} onValueChange={setRevisitMethod}>
                              <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-14 rounded-2xl text-lg font-bold">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent dir={lang === 'ar' ? 'rtl' : 'ltr'} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                {services.filter(s => s.clinic_id === selectedClinicId).map(service => (
                                  <SelectItem key={service.id} value={service.name}>
                                    {service.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                      </div>

                      <div className="bg-sky-50 dark:bg-sky-900/20 p-6 rounded-[2rem] border border-sky-100 dark:border-sky-900/50 text-center space-y-4">
                        <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center mx-auto text-sky-500 shadow-sm">
                          <Plus className="h-8 w-8" />
                        </div>
                        <h4 className="font-black text-slate-800 dark:text-slate-200 text-lg uppercase tracking-wider">
                          {lang === 'ar' ? 'إضافة المريض لقائمة الانتظار' : 'Queue the Patient'}
                        </h4>
                        <p className="text-sm text-slate-500 font-medium">
                          {lang === 'ar' ? 'سيظهر اسم المريض للطبيب فوراً لبدء الكشف' : 'Patient will appear instantly in the doctor’s queue'}
                        </p>
                      </div>
                      
                      <Button 
                        onClick={handleSubmit} 
                        className="w-full bg-sky-600 hover:bg-sky-700 text-white h-16 text-xl font-black shadow-xl rounded-2xl gap-3 transition-transform active:scale-95"
                        disabled={isSubmitting || !patient.name}
                      >
                        {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <ClipboardList className="h-6 w-6" />}
                        {t.add_to_waiting}
                      </Button>
                    </div>
                  )}
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Patient History View */}
        {existingPatientId && (
          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 mt-6">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-amber-500" />
                  {t.history}
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-sky-600 hover:text-sky-700 font-bold"
                >
                  {showHistory ? (lang === 'ar' ? 'إخفاء' : 'عرض') : (t as any).view_history}
                </Button>
              </div>
            </CardHeader>
            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <CardContent className="space-y-4 pt-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {patientHistory.length > 0 ? (
                      patientHistory.slice().sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).map((p, i) => {
                        const isExpanded = expandedHistoryId === p.id;
                        return (
                          <div 
                            key={i} 
                            className={`p-4 rounded-2xl border transition-all ${isExpanded ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800 shadow-sm' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'}`}
                          >
                            <div 
                              role="button"
                              tabIndex={0}
                              onClick={() => setExpandedHistoryId(isExpanded ? null : (p.id || null))} 
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  setExpandedHistoryId(isExpanded ? null : (p.id || null));
                                }
                              }}
                              className="w-full text-right outline-none cursor-pointer"
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase">
                                  {new Date(p.createdAt || 0).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                                </span>
                                <span className="text-[10px] font-black bg-sky-100 dark:bg-sky-900/40 text-sky-600 px-2 py-0.5 rounded-full uppercase">
                                  {p.service_name || '-'}
                                </span>
                              </div>
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">
                                <span className="text-slate-400 font-medium">{(t as any).past_diagnoses}:</span> {p.diagnosis}
                              </p>
                            </div>
                            {isExpanded && (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4 text-start">
                                <div className="space-y-1">
                                  <p className="text-[10px] font-black text-slate-400 uppercase">{(t as any).past_complaints}</p>
                                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                                    "{p.complaint || (lang === 'ar' ? 'لا يوجد شكوى' : 'No recorded complaint')}"
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[11px] font-bold text-emerald-600 uppercase">{(lang === 'ar' ? 'الأدوية الموصوفة' : 'Medications')}</p>
                                  <div className="grid grid-cols-1 gap-2">
                                    {p.items.map((med, idx) => (
                                      <div key={idx} className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                        <p className="text-xs font-black text-slate-800 dark:text-slate-200" dir="ltr">{med.medication_name}</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">{med.dose_description} | {med.frequency_description}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-12 text-center">
                        <HistoryIcon className="h-12 w-12 text-slate-200 mx-auto mb-2" />
                        <p className="text-slate-400 font-medium text-sm">{t.no_history}</p>
                      </div>
                    )}
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        )}
      </div>

      {/* Column for Medication (Doctor Only) */}
      {user.role === 'doctor' && (
        <div className="xl:col-span-7 space-y-6">
          <motion.div initial={{ opacity: 0, x: lang === 'ar' ? -20 : 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="border-none shadow-xl bg-white dark:bg-slate-900 h-full">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Pill className="h-5 w-5 text-emerald-500" />
                  {lang === 'ar' ? 'خطة العلاج وحساب الجرعات' : 'Treatment Plan & Dosing'}
                </CardTitle>
                <CardDescription>
                  {lang === 'ar' ? `الجرعات تعتمد على وزن الطفل الحالي (${patient.weight} كجم)` : `Doses based on current weight (${patient.weight} kg)`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Unified Medication Selection Logic Here */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl space-y-4">
                  <div className="relative">
                    <Search className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-3.5 h-4 w-4 text-slate-400`} />
                    <Input 
                      placeholder={lang === 'ar' ? "ابحث عن دواء بالاسم..." : "Search medication by name..."}
                      className={`${lang === 'ar' ? 'pr-10' : 'pl-10'} bg-white dark:bg-slate-900 h-11 rounded-xl border-slate-200 dark:border-slate-800 shadow-sm`}
                      value={medSearchTerm}
                      onChange={(e) => setMedSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-grow">
                      <Select value={selectedRuleId} onValueChange={setSelectedRuleId}>
                        <SelectTrigger className="w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-11 rounded-xl shadow-sm" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                          <SelectValue placeholder={filteredMedRules.length > 0 ? (lang === 'ar'?"اختر من النتائج...":"Select from results...") : (lang === 'ar'?"لا شيء":"No results")}>
                            {medRules.find(r => r.id === selectedRuleId)?.name}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent dir={lang === 'ar' ? 'rtl' : 'ltr'} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl">
                          {filteredMedRules.map(rule => (
                            <SelectItem key={rule.id} value={rule.id!} className="focus:bg-sky-50 dark:focus:bg-sky-900/30">
                              <div className="flex items-center justify-between gap-4 w-full">
                                <span className="font-bold" dir="ltr">{rule.name}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-black">
                                  {rule.type === 'liquid' ? t.liquid : t.pill}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" onClick={handleAddMedication} className="bg-sky-600 hover:bg-sky-700 h-11 px-8 rounded-xl font-black gap-2">
                       <Plus className="h-4 w-4" />
                       {lang === 'ar' ? 'إضافة' : 'Add'}
                    </Button>
                  </div>
                </div>

                {/* List of select medications */}
                <div className="space-y-3 min-h-[150px]">
                  <AnimatePresence mode="popLayout">
                    {selectedMeds.length > 0 ? (
                      selectedMeds.map((med, index) => (
                        <motion.div 
                          key={`${med.medication_name}-${index}`}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative group"
                        >
                          <div className={`absolute ${lang === 'ar' ? 'right-0' : 'left-0'} top-2 bottom-2 w-1 bg-emerald-500 rounded-full`} />
                          <div className="space-y-1 pl-3 pr-3">
                            <h4 className="font-black text-slate-800 dark:text-slate-100" dir="ltr">{med.medication_name}</h4>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-bold">
                              <p><span className="text-emerald-600">Dose:</span> {med.dose_description}</p>
                              <p><span className="text-emerald-600">Freq:</span> {med.frequency_description}</p>
                              <p><span className="text-emerald-600">Days:</span> {med.duration_days}</p>
                            </div>
                          </div>
                          <button onClick={() => removeMedication(index)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-full transition-all">
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </motion.div>
                      ))
                    ) : (
                      <div className="py-12 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl text-center space-y-2">
                        <Pill className="h-10 w-10 text-slate-200 mx-auto" />
                        <p className="text-slate-400 font-medium text-sm">{lang === 'ar' ? 'لم يتم إضافة أدوية' : 'No medications prescribed'}</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="pt-6 border-t dark:border-slate-800">
                   <Button onClick={handleSubmit} className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xl rounded-2xl shadow-xl shadow-emerald-600/20 transition-transform active:scale-95 gap-3" disabled={isSubmitting || selectedMeds.length === 0}>
                     {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Printer className="h-6 w-6" />}
                     {editPrescriptionId ? (lang === 'ar' ? 'تحديث الروشتة' : 'Update Prescription') : (lang === 'ar' ? 'حفظ وطباعة الروشتة' : 'Save & Print')}
                   </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmDeletePatientId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmDeletePatientId(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 text-center">
              <div className="h-20 w-20 bg-rose-100 dark:bg-rose-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 text-rose-600">
                <Trash2 className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-3">{lang === 'ar' ? 'حذف ملف المريض؟' : 'Delete Profile?'}</h3>
              <p className="text-slate-500 mb-8">{lang === 'ar' ? 'سيتم حذف جميع البيانات نهائياً' : 'All data will be lost permanently'}</p>
              <div className="flex gap-4">
                <Button variant="ghost" className="flex-1 rounded-2xl h-14 font-black" onClick={() => setConfirmDeletePatientId(null)}>{t.cancel}</Button>
                <Button className="flex-1 rounded-2xl h-14 font-black bg-rose-600 hover:bg-rose-700" onClick={handleDeletePatient} disabled={isDeletingPatient}>{t.delete}</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
