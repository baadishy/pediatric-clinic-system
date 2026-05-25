import * as React from 'react';
import { useState, useEffect } from 'react';
import { api, MedicationRule } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { toast } from 'sonner';
import { Sparkles, Search, Plus, Loader2, Trash2, Pill, Syringe, Pencil } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { translations, Language } from '../lib/translations';
import ExportDropdown from './ExportDropdown';
import { ExportPayload } from '../lib/exportUtils';

export default function MedicationRules({ lang = 'ar' }: { lang?: Language }) {
  const [rules, setRules] = useState<MedicationRule[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [newRule, setNewRule] = useState<any>({
    name: '',
    type: 'liquid',
    mg_per_kg: '0',
    doses_per_day: '3',
    duration_days: '5',
    concentration_mg_per_ml: '50'
  });

  const t = translations[lang];

  const loadRules = () => {
    api.getMedicationRules()
      .then(res => {
        if (Array.isArray(res)) {
          setRules(res);
        } else {
          setRules([]);
          if (res && (res as any).status === 'db_disconnected') {
            toast.error(t.db_disconnected);
          }
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleAiSearch = async () => {
    if (!newRule.name) {
      toast.error(lang === 'ar' ? 'يرجى إدخال اسم الدواء للبحث عنه' : 'Please enter medication name to search');
      return;
    }

    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Find medical settings for pediatric use of the drug: "${newRule.name}" in Egypt. 
        Provide mg_per_kg (daily dose), doses_per_day, duration_days, concentration_mg_per_ml (for liquids), and type ("liquid" or "pill").
        Note: If it has multiple concentrations, choose the most common one.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mg_per_kg: { type: Type.NUMBER },
              doses_per_day: { type: Type.NUMBER },
              duration_days: { type: Type.NUMBER },
              concentration_mg_per_ml: { type: Type.NUMBER },
              type: { type: Type.STRING, enum: ["liquid", "pill"] },
              notes: { type: Type.STRING }
            },
            required: ["mg_per_kg", "doses_per_day", "duration_days", "type"]
          }
        },
      });

      const data = JSON.parse(response.text);
      setNewRule(prev => ({
        ...prev,
        ...data
      }));
      toast.success(lang === 'ar' ? 'تم جلب البيانات بنجاح من الذكاء الاصطناعي' : 'Data fetched successfully from AI');
    } catch (error) {
      console.error(error);
      toast.error((t as any).ai_search_error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSaveRule = async () => {
    if (!newRule.name) return;
    const ruleToSave = {
      ...newRule,
      mg_per_kg: Number(newRule.mg_per_kg),
      doses_per_day: Number(newRule.doses_per_day),
      duration_days: Number(newRule.duration_days),
      concentration_mg_per_ml: Number(newRule.concentration_mg_per_ml)
    };
    try {
      if (editingRuleId) {
        await api.updateMedicationRule(editingRuleId, ruleToSave as MedicationRule);
        toast.success(lang === 'ar' ? 'تم تحديث بيانات الدواء بنجاح' : 'Medication updated successfully');
      } else {
        await api.createMedicationRule(ruleToSave as MedicationRule);
        toast.success(lang === 'ar' ? 'تمت إضافة الدواء بنجاح' : 'Medication added successfully');
      }
      setEditingRuleId(null);
      resetForm();
      loadRules();
    } catch (error) {
      toast.error((t as any).med_save_error);
    }
  };

  const resetForm = () => {
    setNewRule({
      name: '',
      type: 'liquid',
      mg_per_kg: '0',
      doses_per_day: '3',
      duration_days: '5',
      concentration_mg_per_ml: '50',
      notes: ''
    });
    setEditingRuleId(null);
  };

  const handleEdit = (rule: MedicationRule) => {
    setNewRule({
      ...rule,
      mg_per_kg: rule.mg_per_kg.toString(),
      doses_per_day: rule.doses_per_day.toString(),
      duration_days: rule.duration_days.toString(),
      concentration_mg_per_ml: (rule.concentration_mg_per_ml || 0).toString()
    });
    setEditingRuleId(rule.id!);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewRule(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t.delete_confirm)) return;
    try {
      await api.deleteMedicationRule(id);
      toast.success(lang === 'ar' ? 'تم حذف الدواء بنجاح' : 'Medication deleted successfully');
      loadRules();
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل حذف الدواء' : 'Failed to delete medication');
    }
  };

  const filteredRules = rules.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (r.notes && r.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getRulesExportPayload = (): ExportPayload => {
    const headers = [
      lang === 'ar' ? 'اسم الدواء' : 'Medication Name',
      lang === 'ar' ? 'النوع' : 'Type',
      lang === 'ar' ? 'الجرعة (ملجم/كجم)' : 'Dose (mg/kg)',
      lang === 'ar' ? 'الجرعات باليوم' : 'Doses per Day',
      lang === 'ar' ? 'التركيز (ملجم/مل)' : 'Concentration (mg/ml)',
      lang === 'ar' ? 'المدة باليوم' : 'Duration (Days)',
      lang === 'ar' ? 'توجيهات وملاحظات' : 'Special Instructions'
    ];

    const rows = filteredRules.map(r => [
      r.name,
      r.type === 'liquid' ? (lang === 'ar' ? 'دواء شراب' : 'Liquid') : (lang === 'ar' ? 'أقراص/كبسولات' : 'Pill/Tablet'),
      r.mg_per_kg,
      r.doses_per_day,
      r.type === 'liquid' ? r.concentration_mg_per_ml || '-' : '-',
      r.duration_days,
      r.notes || '-'
    ]);

    return {
      title: lang === 'ar' ? 'جدول ومعايير جرعات أدوية الأطفال للعيادة' : 'Pediatric Medications Dosing Directory',
      subtitle: lang === 'ar' ? 'قائمة حساب الجرعات والمواصفات المقررة من الطبيب' : 'Pre-defined pediatric drug equations and references',
      sections: [
        {
          title: lang === 'ar' ? 'قائمة الأدوية النشطة' : 'Active Drugs Directory List',
          table: {
            headers,
            rows
          }
        }
      ],
      filename: `clinic_pediatric_medications`
    };
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-none shadow-xl bg-white dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              {editingRuleId ? <Plus className="h-6 w-6 text-amber-500 rotate-45" /> : <Plus className="h-6 w-6 text-sky-500" />}
              {editingRuleId ? t.edit_med : t.add_med}
            </CardTitle>
            <CardDescription>{editingRuleId ? (lang === 'ar'?'قم بتحديث بيانات الدواء الحالية':'Update current medication info') : (lang === 'ar'?'قم بتعريف الأدوية ليتمكن النظام من حساب الجرعة تلقائياً':'Define medications for automatic dose calculation')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-8">
              <div className="bg-sky-50 dark:bg-sky-900/20 p-6 rounded-2xl border border-sky-100 dark:border-sky-800">
                <Label htmlFor="search_name" className="text-sky-800 dark:text-sky-300 font-bold mb-2 block">
                   {lang === 'ar' ? 'البحث الذكي (اكتب الاسم واضغط زر النجمة)' : 'Smart Search (Enter name and click star)'}
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-sky-400`} />
                    <Input 
                      id="search_name" 
                      placeholder={lang === 'ar' ? "اكتب اسم الدواء هنا بالإنجليزية (مثال: Augmentin)" : "Type medication name in English (e.g. Augmentin)"} 
                      value={newRule.name} 
                      onChange={(e) => setNewRule(p => ({ ...p, name: e.target.value }))}
                      className={`${lang === 'ar' ? 'pr-10' : 'pl-10'} bg-white dark:bg-slate-900 border-sky-200 dark:border-sky-800 focus:ring-sky-500`}
                    />
                  </div>
                  <Button 
                    type="button" 
                    className="gap-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-lg shadow-sky-500/20 border-none"
                    onClick={handleAiSearch}
                    disabled={isAiLoading}
                  >
                    {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {t.ai_search}
                  </Button>
                </div>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveRule();
                }} 
                className="space-y-6 pt-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="final_name">{t.med_name}</Label>
                    <Input id="final_name" name="name" value={newRule.name} onChange={handleChange} required className="bg-slate-50 dark:bg-slate-800 border-none" />
                  </div>
                
                  <div className="space-y-2">
                    <Label>{t.med_type}</Label>
                    <Select value={newRule.type} onValueChange={(val: any) => setNewRule(prev => ({ ...prev, type: val }))}>
                      <SelectTrigger dir={lang === 'ar' ? 'rtl' : 'ltr'} className="bg-slate-50 dark:bg-slate-800 border-none">
                        <SelectValue placeholder={lang === 'ar' ? "اختر النوع" : "Select type"} />
                      </SelectTrigger>
                      <SelectContent dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                        <SelectItem value="liquid">{t.liquid} (Liquid)</SelectItem>
                        <SelectItem value="pill">{t.pill} (Pill)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mg_per_kg">{t.mg_kg} ({lang === 'ar' ? 'يومياً' : 'daily'})</Label>
                    <Input id="mg_per_kg" name="mg_per_kg" type="number" min="0" step="any" onWheel={(e) => (e.target as HTMLInputElement).blur()} value={newRule.mg_per_kg} onChange={handleChange} required className="bg-slate-50 dark:bg-slate-800 border-none" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="doses_per_day">{t.doses_day}</Label>
                    <Input id="doses_per_day" name="doses_per_day" type="number" min="1" step="any" onWheel={(e) => (e.target as HTMLInputElement).blur()} value={newRule.doses_per_day} onChange={handleChange} required className="bg-slate-50 dark:bg-slate-800 border-none" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration_days">{t.duration_days}</Label>
                    <Input id="duration_days" name="duration_days" type="number" min="1" step="any" onWheel={(e) => (e.target as HTMLInputElement).blur()} value={newRule.duration_days} onChange={handleChange} required className="bg-slate-50 dark:bg-slate-800 border-none" />
                  </div>

                  {newRule.type === 'liquid' && (
                    <div className="space-y-2">
                      <Label htmlFor="concentration_mg_per_ml">{t.concentration}</Label>
                      <Input id="concentration_mg_per_ml" name="concentration_mg_per_ml" type="number" min="0" step="any" onWheel={(e) => (e.target as HTMLInputElement).blur()} value={newRule.concentration_mg_per_ml} onChange={handleChange} className="bg-slate-50 dark:bg-slate-800 border-none" />
                    </div>
                  )}
                  
                  <div className="space-y-2 lg:col-span-3">
                    <Label htmlFor="notes">{t.notes}</Label>
                    <Input id="notes" name="notes" value={newRule.notes || ''} onChange={handleChange} placeholder={lang === 'ar' ? "مثال: كل ١٢ ساعة بعد الأكل" : "e.g. Every 12 hours after meals"} className="bg-slate-50 dark:bg-slate-800 border-none" />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button type="submit" className={`${editingRuleId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-sky-600 hover:bg-sky-700'} h-12 w-full lg:w-48 text-lg font-bold`}>
                    {editingRuleId ? t.update : t.save}
                  </Button>
                  {editingRuleId && (
                    <Button type="button" variant="outline" onClick={resetForm} className="h-12 w-full lg:w-48 text-lg">
                      {t.cancel}
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Card className="border-none shadow-xl bg-white dark:bg-slate-900 border-t-4 border-sky-500">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-xl">{lang === 'ar' ? 'دليل الأدوية المسجل' : 'Registered Medications'}</CardTitle>
            <CardDescription>{lang === 'ar' ? 'قائمة بجميع الأدوية وقواعد الحساب الخاصة بها' : 'List of all medications and their dosing rules'}</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {filteredRules.length > 0 && (
              <ExportDropdown 
                lang={lang} 
                getPayload={getRulesExportPayload}
                buttonText={lang === 'ar' ? 'تصدير الدليل' : 'Export Guidelines'}
              />
            )}
            <div className="relative w-full sm:w-64">
              <Search className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-3.5 h-4 w-4 text-muted-foreground`} />
              <Input
                placeholder={lang === 'ar' ? "ابحث في قائمة الأدوية..." : "Search medications..."}
                className={`${lang === 'ar' ? 'pr-9' : 'pl-9'} bg-slate-50 dark:bg-slate-800 border-none h-11`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <Table dir={lang === 'ar' ? 'rtl' : 'ltr'}>
              <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                <TableRow>
                  <TableHead className={lang === 'ar' ? 'text-right' : 'text-left'}>{t.medication}</TableHead>
                  <TableHead className={lang === 'ar' ? 'text-right' : 'text-left'}>{t.med_type}</TableHead>
                  <TableHead className={lang === 'ar' ? 'text-right' : 'text-left'}>{t.dose}</TableHead>
                  <TableHead className={lang === 'ar' ? 'text-right' : 'text-left'}>{lang === 'ar' ? 'التكرار' : 'Frequency'}</TableHead>
                  <TableHead className={lang === 'ar' ? 'text-right' : 'text-left'}>{t.concentration}</TableHead>
                   <TableHead className={lang === 'ar' ? 'text-right' : 'text-left'}>{t.duration}</TableHead>
                  <TableHead className={`${lang === 'ar' ? 'text-right' : 'text-left'} w-24`}>{lang === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredRules.map((rule) => (
                    <TableRow key={rule.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                      <TableCell className="font-bold text-sky-700 dark:text-sky-400">
                        <div className="flex items-center gap-2">
                           {rule.type === 'liquid' ? <Syringe className="h-4 w-4 opacity-50" /> : <Pill className="h-4 w-4 opacity-50" />}
                           {rule.name}
                        </div>
                      </TableCell>
                      <TableCell>{rule.type === 'liquid' ? t.liquid : t.pill}</TableCell>
                      <TableCell>{rule.mg_per_kg} {t.mg_kg}</TableCell>
                      <TableCell>{rule.doses_per_day} {t.doses_day}</TableCell>
                      <TableCell>{rule.type === 'liquid' ? `${rule.concentration_mg_per_ml} ${t.concentration}` : '-'}</TableCell>
                      <TableCell>{rule.duration_days} {t.days}</TableCell>
                      <TableCell>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(rule)} className="h-8 w-8 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-900/20">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id!)} className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </AnimatePresence>
                {filteredRules.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-500 py-12">
                       <div className="flex flex-col items-center gap-2 opacity-50">
                          <Search className="h-10 w-10 mb-2" />
                          <p className="text-lg">{searchTerm ? (lang === 'ar'?'لا توجد نتائج تطابق بحثك':'No results match your search') : (lang === 'ar'?'لا يوجد أدوية مسجلة بعد':'No medications registered yet')}</p>
                       </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
