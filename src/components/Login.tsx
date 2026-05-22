import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { api, User } from '../services/api';
import { toast } from 'sonner';
import { Stethoscope, User as UserIcon, Lock, Loader2, Globe } from 'lucide-react';
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

  const t = translations[lang];

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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-500" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
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
              <CardContent className="space-y-5 px-8 pb-8">
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
              <CardFooter className="px-8 pb-10">
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
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-10 text-center text-xs text-slate-500 space-y-3"
          >
            <p className="font-bold tracking-wider uppercase opacity-60">© 2026 Dr. Mina Pediatric Clinic</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
               <span className="bg-white/40 dark:bg-slate-900/40 backdrop-blur px-3 py-1.5 rounded-full border border-slate-200/50 dark:border-slate-800/50 font-mono">doctor / assistant</span>
               <span className="bg-white/40 dark:bg-slate-900/40 backdrop-blur px-3 py-1.5 rounded-full border border-slate-200/50 dark:border-slate-800/50 font-mono">doctor123 / assistant123</span>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
