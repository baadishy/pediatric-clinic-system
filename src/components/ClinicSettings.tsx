import * as React from 'react';
import { useState, useEffect } from 'react';
import { api, ClinicSettings as ClinicSettingsType, MedicalService, Clinic } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Building2, MapPin, Phone, Trash2, Plus, Save, Loader2, AlertCircle, Edit, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations, Language } from '../lib/translations';

export default function ClinicSettings({ lang = 'ar' }: { lang?: Language }) {
  const [settings, setSettings] = useState<ClinicSettingsType>({
    name: '',
    address: '',
    phone: ''
  });
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [services, setServices] = useState<MedicalService[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string>('');
  const [editingClinicId, setEditingClinicId] = useState<string | null>(null);
  const [editingClinicName, setEditingClinicName] = useState('');
  const [newClinicName, setNewClinicName] = useState('');
  
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<Partial<MedicalService>>({});
  
  const [newService, setNewService] = useState<any>({ 
    name: '', 
    price: '0', 
    assistant_fees: '0', 
    clinic_id: '' 
  });
  
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; error?: string } | null>(null);

  const t = translations[lang];

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [s, cls, serv] = await Promise.all([
        api.getClinicSettings(), 
        api.getClinics(), 
        api.getServices()
      ]);
      
      if (s && !('error' in s)) {
        setSettings(s);
        setDbStatus({ connected: true });
      }
      
      if (cls && Array.isArray(cls)) {
        setClinics(cls);
        if (cls.length > 0 && !selectedClinicId) {
          setSelectedClinicId(cls[0].id);
        }
      }
      
      if (serv && Array.isArray(serv)) {
        setServices(serv);
      }
    } catch (error: any) {
      setDbStatus({ connected: false, error: error.message });
      toast.error(t.db_error);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updateClinicSettings(settings);
      toast.success((t as any).settings_updated);
    } catch (error) {
      toast.error((t as any).settings_error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClinic = async () => {
    if (!newClinicName.trim()) return;
    try {
      await api.addClinic({ name: newClinicName });
      setNewClinicName('');
      loadAll();
      toast.success((t as any).clinic_added);
    } catch (error) {
       toast.error((t as any).clinic_add_error);
    }
  };

  const handleUpdateClinicName = async (id: string) => {
    if (!editingClinicName.trim()) return;
    try {
      await api.updateClinic(id, { name: editingClinicName });
      setEditingClinicId(null);
      loadAll();
      toast.success(lang === 'ar' ? 'تم تحديث اسم العيادة' : 'Clinic name updated');
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل التحديث' : 'Update failed');
    }
  };

  const handleDeleteClinic = async (id: string) => {
    if (!confirm(lang === 'ar' ? 'بط حذف هذه العيادة سيؤدي لحذف جميع الخدمات المرتبطة بها. هل أنت متأكد؟' : 'Deleting this clinic will delete all associated services. Are you sure?')) return;
    try {
      await api.deleteClinic(id);
      if (selectedClinicId === id) setSelectedClinicId('');
      loadAll();
      toast.success(lang === 'ar' ? 'تم حذف العيادة' : 'Clinic deleted');
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل حذف العيادة' : 'Failed to delete clinic');
    }
  };

  const handleAddService = async () => {
    if (!newService.name || !selectedClinicId) {
      toast.warning(lang === 'ar' ? 'يرجى إكمال بيانات الخدمة' : 'Please complete service details');
      return;
    }
    try {
      await api.addService({ 
        ...newService, 
        price: Number(newService.price || 0),
        assistant_fees: Number(newService.assistant_fees || 0),
        clinic_id: selectedClinicId 
      } as MedicalService);
      setNewService({ name: '', price: '0', assistant_fees: '0', clinic_id: '' });
      loadAll();
      toast.success(lang === 'ar' ? 'تم إضافة الخدمة' : 'Service added');
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل إضافة الخدمة' : 'Failed to add service');
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm(t.delete_confirm)) return;
    try {
      await api.deleteService(id);
      loadAll();
      toast.success(lang === 'ar' ? 'تم حذف الخدمة' : 'Service deleted');
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل حذف الخدمة' : 'Failed to delete service');
    }
  };

  const handleUpdateService = async () => {
    if (!editingServiceId || !editingService.name) return;
    try {
      const serviceToSave = {
        ...editingService,
        price: Number(editingService.price || 0),
        assistant_fees: Number(editingService.assistant_fees || 0)
      };
      await api.updateService(editingServiceId, serviceToSave as MedicalService);
      setEditingServiceId(null);
      loadAll();
      toast.success(lang === 'ar' ? 'تم تحديث الخدمة' : 'Service updated');
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل التحديث' : 'Update failed');
    }
  };

  const filteredServices = services.filter(s => s.clinic_id === selectedClinicId);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* DB Connection Status Section remains similar or can be simplified */}
      
      {/* Clinic & Methods Management Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-none shadow-xl bg-white dark:bg-slate-900">
          <div className="h-2 bg-emerald-500 w-full" />
          <CardHeader>
            <CardTitle className="text-2xl text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Plus className="h-6 w-6 text-emerald-500" />
              {(t as any).manage_clinics}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Clinics List & Add Clinic */}
            <div className="space-y-4">
              <Label className="text-lg font-bold text-slate-700 dark:text-slate-300">{(t as any).clinic}</Label>
              <div className="flex flex-wrap gap-4">
                {clinics.map(clinic => (
                  <div 
                    key={clinic.id} 
                    className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer min-w-[180px] ${
                      selectedClinicId === clinic.id 
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' 
                        : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                    }`}
                    onClick={() => setSelectedClinicId(clinic.id)}
                  >
                    {editingClinicId === clinic.id ? (
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <Input 
                          value={editingClinicName} 
                          onChange={e => setEditingClinicName(e.target.value)} 
                          className="h-8 text-xs bg-white dark:bg-slate-900 border-emerald-300"
                        />
                        <button onClick={() => handleUpdateClinicName(clinic.id)} className="text-emerald-600"><Check className="h-4 w-4" /></button>
                        <button onClick={() => setEditingClinicId(null)} className="text-rose-500"><X className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-700 dark:text-slate-200">{clinic.name}</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingClinicId(clinic.id);
                            setEditingClinicName(clinic.name);
                          }}
                          className="text-slate-400 hover:text-sky-500"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClinic(clinic.id);
                          }}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                
                <div className="p-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-2">
                  <Input 
                    placeholder={(t as any).clinic_name} 
                    value={newClinicName}
                    onChange={(e) => setNewClinicName(e.target.value)}
                    className="h-9 w-40 text-xs border-none bg-transparent"
                  />
                  <Button size="sm" onClick={handleAddClinic} className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 px-2">
                    <Plus className="h-4 w-4 mr-1" />
                    {(t as any).add_clinic}
                  </Button>
                </div>
              </div>
            </div>

            {/* Services Management for Selected Clinic */}
            <AnimatePresence mode="wait">
              <motion.div 
                key={selectedClinicId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 pt-6 border-t dark:border-slate-800"
              >
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                      {clinics.find(c => c.id === selectedClinicId)?.name}
                    </h3>
                    <p className="text-sm text-slate-500">{(t as any).manage_clinics}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                  <div className="space-y-2">
                    <Label className="text-xs">{t.service_name}</Label>
                    <Input 
                      placeholder={lang === 'ar' ? "مثل: كشف" : "e.g. Visit"} 
                      value={newService.name} 
                      onChange={e => setNewService({...newService, name: e.target.value})}
                      className="bg-white dark:bg-slate-900 border-none h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{(t as any).price} ({t.egp})</Label>
                    <Input 
                      type="number" 
                      step="any"
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      value={newService.price} 
                      onChange={e => setNewService({...newService, price: e.target.value})}
                      className="bg-white dark:bg-slate-900 border-none h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{(t as any).assistant_fees} ({t.egp})</Label>
                    <Input 
                      type="number" 
                      step="any"
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      value={newService.assistant_fees} 
                      onChange={e => setNewService({...newService, assistant_fees: e.target.value})}
                      className="bg-white dark:bg-slate-900 border-none h-10"
                    />
                  </div>
                  <Button onClick={handleAddService} className="bg-emerald-600 hover:bg-emerald-700 text-white h-10">
                    <Plus className="h-4 w-4 mr-2" />
                    {(t as any).add_service}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredServices.map((service, index) => {
                    const isEditing = editingServiceId === service.id;
                    return (
                      <motion.div 
                        key={service.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-4 bg-white dark:bg-slate-800 rounded-xl border transition-all relative group ${
                          isEditing ? 'border-emerald-500 ring-2 ring-emerald-50 dark:ring-emerald-950/30' : 'border-slate-100 dark:border-slate-800 shadow-sm'
                        }`}
                      >
                        {isEditing ? (
                          <div className="space-y-3">
                            <Input 
                              value={editingService.name} 
                              onChange={e => setEditingService({...editingService, name: e.target.value})}
                              className="h-8 text-xs font-bold"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[10px]">{(t as any).price}</Label>
                                <Input 
                                  type="number"
                                  step="any"
                                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                  value={editingService.price as any} 
                                  onChange={e => setEditingService({...editingService, price: e.target.value as any})}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px]">{(t as any).assistant_fees}</Label>
                                <Input 
                                  type="number"
                                  step="any"
                                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                  value={editingService.assistant_fees as any} 
                                  onChange={e => setEditingService({...editingService, assistant_fees: e.target.value as any})}
                                  className="h-8 text-xs"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                              <Button size="sm" variant="ghost" onClick={() => setEditingServiceId(null)} className="h-7 text-xs text-rose-500">
                                <X className="h-3 w-3 mr-1" /> {t.cancel || (lang === 'ar' ? 'إلغاء' : 'Cancel')}
                              </Button>
                              <Button size="sm" onClick={handleUpdateService} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                                <Check className="h-3 w-3 mr-1" /> {t.save}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-slate-800 dark:text-slate-100">{service.name}</h4>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => {
                                    setEditingServiceId(service.id!);
                                    setEditingService(service);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-colors"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteService(service.id!)}
                                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">{(t as any).price}:</span>
                                <span className="font-bold">{service.price} {t.egp}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">{(t as any).assistant_fees}:</span>
                                <span className="font-bold text-rose-500">{service.assistant_fees} {t.egp}</span>
                              </div>
                              <div className="mt-2 pt-2 border-t border-dashed border-slate-100 dark:border-slate-700 flex justify-between text-xs">
                                <span className="text-emerald-600 font-bold">{(t as any).doctor_net}:</span>
                                <span className="font-bold text-emerald-600">{service.price - service.assistant_fees} {t.egp}</span>
                              </div>
                            </div>
                          </>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* General Clinic Settings (Header/Footer info) */}
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="border-none shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
          <div className="h-2 bg-sky-500 w-full" />
          <CardHeader>
            <CardTitle className="text-xl text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Building2 className="h-6 w-6 text-sky-500" />
              {t.clinic_settings}
            </CardTitle>
            <CardDescription>{lang === 'ar' ? 'بيانات تظهر في ترويسة الروشتة المطبوعة للعيادة' : 'Information for printed prescription header'}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateSettings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="cname" className="text-slate-600 dark:text-slate-400">{t.clinic_name}</Label>
                  <div className="relative">
                    <Building2 className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-slate-400`} />
                    <Input 
                      id="cname" 
                      className={`${lang === 'ar' ? 'pr-10' : 'pl-10'} bg-slate-50 dark:bg-slate-800 border-none`}
                      value={settings.name} 
                      onChange={e => setSettings({...settings, name: e.target.value})} 
                      required 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-600 dark:text-slate-400">{t.phone}</Label>
                  <div className="relative">
                    <Phone className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-slate-400`} />
                    <Input 
                      id="phone" 
                      className={`${lang === 'ar' ? 'pr-10' : 'pl-10'} bg-slate-50 dark:bg-slate-800 border-none`}
                      value={settings.phone} 
                      onChange={e => setSettings({...settings, phone: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="addr" className="text-slate-600 dark:text-slate-400">{t.address}</Label>
                  <div className="relative">
                    <MapPin className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-slate-400`} />
                    <Input 
                      id="addr" 
                      className={`${lang === 'ar' ? 'pr-10' : 'pl-10'} bg-slate-50 dark:bg-slate-800 border-none`}
                      value={settings.address} 
                      onChange={e => setSettings({...settings, address: e.target.value})} 
                    />
                  </div>
                </div>
              </div>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white min-w-[150px]" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin gap-2" /> : <Save className="h-4 w-4 gap-2" />}
                {t.save}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
