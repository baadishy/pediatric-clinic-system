import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { api, User } from '../services/api';
import { toast } from 'sonner';
import { Stethoscope, User as UserIcon, Lock, Loader2, Globe, Database, Wifi, AlertTriangle, Cloud, HelpCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations, Language } from '../lib/translations';

interface LoginProps {
  onLogin: (user: User, token: string) => void;
  lang: Language;
  setLang: (l: Language) => void;
}

export function Login({ onLogin, lang, setLang }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<{
    type: 'sqlite' | 'mongodb';
    attempted: boolean;
    connected: boolean;
    error: string | null;
    uriFound: boolean;
    uriMasked: string;
  } | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const t = translations[lang];

  useEffect(() => {
    let active = true;
    api.getDbStatus()
      .then((res) => {
        if (active && res && res.db) {
          setDbStatus(res.db);
        }
      })
      .catch((err) => {
        console.error('Failed to query dbStatus:', err);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setLoading(true);
    try {
      const { token, user } = await api.login(username, password);
      onLogin(user, token);
      toast.success(lang === 'ar' ? `${t.welcome_back}, ${user.name}` : `Welcome back, ${user.name}`);
    } catch (error) {
      toast.error(t.invalid_login);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-500" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Language Switcher */}
      <div className="absolute top-4 inset-inline-end-4 sm:top-8 sm:inset-inline-end-8 z-50">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            const newLang = lang === 'ar' ? 'en' : 'ar';
            setLang(newLang);
          }}
          className="gap-2 font-bold backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 shadow-sm hover:bg-white dark:hover:bg-slate-800 transition-all h-9 sm:h-10 px-3 sm:px-4 rounded-full"
        >
          <Globe className="h-4 w-4 text-sky-500" />
          <span className="hidden sm:inline">{lang === 'ar' ? 'English' : 'العربية'}</span>
          <span className="sm:hidden font-black">{lang === 'ar' ? 'EN' : 'AR'}</span>
        </Button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={lang}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <Card className="border-none shadow-2xl overflow-hidden backdrop-blur-md bg-white/90 dark:bg-slate-900/90">
            <div className="h-2 bg-gradient-to-r from-sky-400 to-sky-600" />
            <CardHeader className="text-center space-y-2 pt-8 pb-6">
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 bg-sky-100 dark:bg-sky-900/30 rounded-3xl flex items-center justify-center text-sky-600 mx-auto mb-2 shadow-inner"
              >
                <Stethoscope className="h-10 w-10" />
              </motion.div>
              <CardTitle className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t.login_title}</CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400 font-medium px-4">{t.login_subtitle}</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-5 px-8 pb-6">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <Label htmlFor="username" className="text-slate-700 dark:text-slate-300 font-bold">{t.username}</Label>
                  <div className="relative">
                    <UserIcon className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-slate-400`} />
                    <Input 
                      id="username" 
                      placeholder={lang === 'ar' ? 'مثل: doctor' : 'e.g. doctor'} 
                      className={`${lang === 'ar' ? 'pr-10' : 'pl-10'} h-11 bg-slate-100/50 dark:bg-slate-800/50 border-none focus-visible:ring-sky-500 transition-all font-medium`} 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-2"
                >
                  <Label htmlFor="password" dir="auto" className="text-slate-700 dark:text-slate-300 font-bold">{t.password}</Label>
                  <div className="relative">
                    <Lock className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-slate-400`} />
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••" 
                      className={`${lang === 'ar' ? 'pr-10' : 'pl-10'} h-11 bg-slate-100/50 dark:bg-slate-800/50 border-none focus-visible:ring-sky-500 transition-all font-medium`} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </motion.div>
              </CardContent>
              <CardFooter className="px-8 pb-8 flex flex-col gap-4">
                <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.5 }}
                   className="w-full"
                >
                  <Button type="submit" className="w-full h-12 bg-sky-600 hover:bg-sky-700 font-black text-lg transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-sky-500/20" disabled={loading}>
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : t.login_btn}
                  </Button>
                </motion.div>
              </CardFooter>
            </form>
          </Card>
          
          {/* Database & Cloud Connection Status Badge */}
          {dbStatus && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45 }}
              className="mt-6 flex justify-center"
            >
              <button
                type="button"
                onClick={() => setShowDiagnostics(true)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold shadow-sm transition-all border outline-none duration-200 select-none hover:scale-[1.03] active:scale-[0.97] ${
                  dbStatus.connected
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                    : dbStatus.attempted
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40 hover:bg-amber-100 dark:hover:bg-amber-900/30 animate-pulse'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {dbStatus.connected ? (
                  <>
                    <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                    <span>
                      {lang === 'ar' ? 'سحابة أطلس نشطة ومزامنة' : 'MongoDB Atlas Connected & Synced'}
                    </span>
                  </>
                ) : dbStatus.attempted ? (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    <span>
                      {lang === 'ar' ? 'فشل اتصال السحابة (اضغط للتفاصيل)' : 'Cloud Sync Failed (Click for details)'}
                    </span>
                  </>
                ) : (
                  <>
                    <Database className="h-3.5 w-3.5 text-sky-500" />
                    <span>
                      {lang === 'ar' ? 'مساحة الحفظ محلية (SQLite) - إعداد السحابة' : 'Local Storage Active (SQLite) - Setup Cloud'}
                    </span>
                  </>
                )}
                <HelpCircle className="h-3 w-3 opacity-60 ml-0.5" />
              </button>
            </motion.div>
          )}

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-center text-xs text-slate-500 space-y-3"
          >
            <p className="font-bold tracking-wider uppercase opacity-60">© 2026 Dr. Mina Pediatric Clinic</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
               <span className="bg-white/40 dark:bg-slate-900/40 backdrop-blur px-3 py-1.5 rounded-full border border-slate-200/50 dark:border-slate-800/50 font-mono">doctor / assistant</span>
               <span className="bg-white/40 dark:bg-slate-900/40 backdrop-blur px-3 py-1.5 rounded-full border border-slate-200/50 dark:border-slate-800/50 font-mono">doctor123 / assistant123</span>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Cloud & DB Setup Diagnostics Modal */}
      <AnimatePresence>
        {showDiagnostics && dbStatus && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 overflow-hidden max-h-[90vh] overflow-y-auto"
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-2xl ${dbStatus.connected ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' : 'bg-sky-50 dark:bg-sky-950/20 text-sky-600'}`}>
                    <Database className="h-5 w-5" />
                  </div>
                  <div className="text-start">
                    <h3 className="font-black text-lg text-slate-900 dark:text-white">
                      {lang === 'ar' ? 'ربط السحابة وقاعدة البيانات' : 'Cloud Sync & Database Status'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Dr. Mina Pediatric Clinic</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowDiagnostics(false)}
                  className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 h-8 w-8 text-slate-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Connected State */}
              {dbStatus.connected && (
                <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-800/30 rounded-2xl p-4 space-y-2 text-start">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-bold text-sm">
                    <Wifi className="h-4 w-4" />
                    <span>{lang === 'ar' ? 'نظام العيادة متصل بنجاح بالسحابة أطلس!' : 'System is successfully connected to Cloud Atlas!'}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
                    {lang === 'ar' 
                      ? 'جميع بيانات المرضى، الروشتات، الحجوزات، والملفات يتم حفظها وتزامنها بشكل فوري وآمن عبر خوادم MongoDB Atlas المشفرة، مما يتيح لك تشغيل البرنامج على عدة أجهزة وعيادات في نفس الوقت دون تعارض.'
                      : 'All records of patients, prescriptions, and settings are securely stored and synced in real-time. This allows running the clinic system on multiple devices simultaneously without any conflicts.'
                    }
                  </p>
                  <div className="mt-2 pt-2 border-t border-emerald-200/20 dark:border-emerald-800/20 font-mono text-[10px] text-slate-500 break-all select-all text-left">
                    URI: {dbStatus.uriMasked}
                  </div>
                </div>
              )}

              {/* Failed Attempt State */}
              {!dbStatus.connected && dbStatus.attempted && (
                <div className="space-y-4 text-start">
                  <div className="bg-rose-50/70 dark:bg-rose-950/10 border border-rose-200/50 dark:border-rose-800/30 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-rose-800 dark:text-rose-400 font-bold text-sm">
                      <AlertTriangle className="h-4 w-4 text-rose-500" />
                      <span>{lang === 'ar' ? 'فشل الاتصال بـ MongoDB Cloud' : 'Failed to Connect to MongoDB Cloud'}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      {lang === 'ar'
                        ? 'تمت قراءة مفتاح المزامنة وتفعيله من ملف .env ولكننا لم نتمكن من الاتصال بخوادم أطلس.'
                        : 'We parsed the cluster connection URI from your .env but failed to build a handshake.'}
                    </p>
                    <div className="bg-rose-100/40 dark:bg-rose-950/20 p-2.5 rounded-xl text-[11px] font-mono text-rose-700 dark:text-rose-300 break-words max-h-32 overflow-y-auto select-all border border-rose-200/20 text-start leading-relaxed" dir="ltr">
                      Error: {dbStatus.error}
                    </div>
                  </div>

                  <div className="bg-amber-50/50 dark:bg-amber-950/5 border border-amber-200/40 dark:border-amber-800/10 rounded-2xl p-4 space-y-2">
                    <div className="font-bold text-amber-900 dark:text-amber-400 text-xs sm:text-sm">{lang === 'ar' ? 'كيفية حل المشكلة؟' : 'How to resolve this?'}</div>
                    <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold space-y-1.5 px-1">
                      {lang === 'ar' ? (
                        <>
                          <li>تأكد من <strong>سماح الوصول لجميع الشبكات (IP Whitelist)</strong> في حساب MongoDB Atlas الخاص بك، واجعلها تقبل جميع الاتصالات <code>0.0.0.0/0</code> لسهولة الحركة والمزامنة.</li>
                          <li>تحقق من كتابة كلمة المرور واسم المستخدم بشكل صحيح وخلوها من الرموز الخاصة غير المشفرة.</li>
                          <li>تم تشغيل <strong>قاعدة البيانات المحلية الفائقة (SQLite) تلقائياً</strong> لحفظ عملك وتجنب التوقف مؤقتاً.</li>
                        </>
                      ) : (
                        <>
                          <li>Make sure to register <strong>IP Whitelist (0.0.0.0/0)</strong> in your MongoDB Atlas Dashboard settings to allow secure external node handshakes.</li>
                          <li>Double check the database username and password entered in the URI connection string.</li>
                          <li>The fail-safe <strong>Local Engine (SQLite)</strong> loaded automatically to guarantee no clinic downtime.</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {/* SQLite Static Active State (No env file mapped) */}
              {!dbStatus.connected && !dbStatus.attempted && (
                <div className="space-y-4 text-start">
                  <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/40 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm">
                      <Database className="h-4 w-4 text-sky-500" />
                      <span>{lang === 'ar' ? 'مساحة الحفظ محصورة محلياً على هذا الجهاز' : 'Storage restricted locally onto this computer'}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                      {lang === 'ar'
                        ? 'التطبيق يعمل الآن بواسطة قاعدة بيانات بصرية سريعة ومحلية بالكامل (SQLite). جميع الكشوفات والملاحظات محفوظة بشكل كامل وآمن على قرصك الصلب.'
                        : 'The clinic is running with our high-speed localized data storage engine (SQLite). All records are safely preserved.'}
                    </p>
                  </div>

                  <div className="p-5 border border-sky-100 dark:border-sky-950/30 rounded-2xl space-y-2 bg-sky-50/20 dark:bg-sky-950/5">
                    <div className="flex items-center gap-1 text-sky-900 dark:text-sky-300 font-black text-sm">
                      <Cloud className="h-4 w-4 text-sky-500 animate-pulse" />
                      <span>{lang === 'ar' ? 'تفعيل مزامنة السحابة (MongoDB Atlas)' : 'Activate Cloud Sync (MongoDB Atlas)'}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      {lang === 'ar'
                        ? 'لكي تقوم بمزامنة عياداتك وتشغيل النظام على أكثر من جهاز بالتوازي ومشاركة البيانات في الوقت الفعلي:'
                        : 'To backup, synchronize across multiple clinics simultaneously, and view records in real-time from other computers:'}
                    </p>
                    
                    <div className="space-y-2 pt-2 text-xs">
                      <div className="flex items-start gap-1.5">
                        <span className="bg-sky-500 text-white font-black text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <div className="text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
                          {lang === 'ar' 
                            ? 'أنشئ ملفاً نصياً جديداً باسم ' 
                            : 'Create a plain text file named '}
                          <code className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded text-[11px] font-mono select-all text-sky-600 dark:text-sky-400 font-bold">.env</code>
                          {lang === 'ar' ? ' بجانب ملف البرنامج المشغل ' : ' directly next to your executable '}
                          <code className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold">Pediatric Clinic.exe</code>.
                        </div>
                      </div>

                      <div className="flex items-start gap-1.5">
                        <span className="bg-sky-500 text-white font-black text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <div className="text-slate-700 dark:text-slate-300 font-semibold leading-relaxed w-full">
                          {lang === 'ar' 
                            ? 'اكتب داخل الملف سطر المزامنة بالشكل التالي:' 
                            : 'Write the MongoDB connection line inside:'}
                          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl font-mono text-[10px] sm:text-xs select-all text-sky-600 dark:text-sky-400 break-all select-all mt-1 shadow-sm font-bold text-left" dir="ltr">
                            MONGODB_URI=mongodb+srv://username:password@cluster0.abcde.mongodb.net/clinic_db?retryWrites=true&w=majority
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-1.5">
                        <span className="bg-sky-500 text-white font-black text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <div className="text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
                          {lang === 'ar' 
                            ? 'أغلق نافذة البرنامج بالكامل وافتحه مجدداً لتفعيل المزامنة الفورية بنجاح!' 
                            : 'Restart the Pediatric Clinic app entirely to load Cloud Sync and begin transmitting!'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <Button 
                  onClick={() => setShowDiagnostics(false)}
                  className="rounded-full bg-slate-950 hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 shadow-md font-bold text-xs px-6"
                >
                  {lang === 'ar' ? 'فهمت وموافق' : 'Dismiss'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
