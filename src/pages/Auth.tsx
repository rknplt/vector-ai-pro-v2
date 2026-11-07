import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { Zap, Mail, Lock, User, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const { signIn, signUp, user, isLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();

  const emailSchema = z.string().email(t("auth.invalidEmail"));
  const passwordSchema = z.string().min(6, t("auth.passwordMin"));

  useEffect(() => {
    if (!isLoading && user) navigate("/");
  }, [user, isLoading, navigate]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) newErrors.email = emailResult.error.errors[0].message;
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) newErrors.password = passwordResult.error.errors[0].message;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Check lockout
    if (lockedUntil && Date.now() < lockedUntil) {
      const remainingMin = Math.ceil((lockedUntil - Date.now()) / 60000);
      toast({
        title: "Hesap Kilitlendi",
        description: `Çok fazla başarısız giriş denemesi. ${remainingMin} dakika sonra tekrar deneyin.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (isLogin) {
        // Log login attempt
        await supabase.from("login_attempts").insert({
          email,
          success: false,
        } as any);

        const { error } = await signIn(email, password);
        if (error) {
          const newAttempts = loginAttempts + 1;
          setLoginAttempts(newAttempts);

          if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
            const lockTime = Date.now() + LOCKOUT_DURATION_MS;
            setLockedUntil(lockTime);
            setLoginAttempts(0);
            toast({
              title: "Hesap Kilitlendi",
              description: "Çok fazla başarısız deneme. 15 dakika boyunca giriş yapamazsınız.",
              variant: "destructive",
            });
          } else {
            toast({
              title: t("auth.loginFailed"),
              description: `${error.message.includes("Invalid login credentials") ? t("auth.wrongCredentials") : error.message} (${MAX_LOGIN_ATTEMPTS - newAttempts} deneme hakkınız kaldı)`,
              variant: "destructive",
            });
          }
        } else {
          // Update login attempt as successful
          await supabase.from("login_attempts").insert({
            email,
            success: true,
          } as any);
          setLoginAttempts(0);
          setLockedUntil(null);
          logActivity("login", { method: "email" });
          toast({ title: t("auth.welcomeBack"), description: t("auth.loginSuccess") });
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast({
            title: t("common.error"),
            description: error.message.includes("User already registered") ? t("auth.alreadyRegistered") : error.message,
            variant: "destructive",
          });
        } else {
          logActivity("signup", { method: "email" });
          toast({ title: t("auth.signupSuccess"), description: t("auth.signupSuccessDesc") });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden px-4">
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-accent/20 rounded-full blur-[120px]" />

      <div className="w-full max-w-md relative z-10">
        <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("auth.backHome")}
        </Button>

        <div className="glass-card rounded-3xl p-8 border border-border/30">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary to-accent flex items-center justify-center glow-primary">
                <Zap className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <span className="text-2xl font-bold gradient-text">Vector AI Pro</span>
          </div>

          <h1 className="text-2xl font-bold text-center mb-2">
            {isLogin ? t("auth.welcome") : t("auth.createAccount")}
          </h1>
          <p className="text-muted-foreground text-center mb-8">
            {isLogin ? t("auth.loginToAccount") : t("auth.createNew")}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">{t("auth.fullName")}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="fullName" type="text" placeholder={t("auth.fullName")} value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10 bg-secondary/50 border-border/50" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="ornek@email.com" value={email} onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: undefined })); }} className={`pl-10 bg-secondary/50 border-border/50 ${errors.email ? "border-destructive" : ""}`} />
              </div>
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: undefined })); }} className={`pl-10 pr-10 bg-secondary/50 border-border/50 ${errors.password ? "border-destructive" : ""}`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></div> : isLogin ? t("auth.loginBtn") : t("auth.signupBtn")}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/50" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">{t("auth.or")}</span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={async () => {
            const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
            if (error) toast({ title: t("common.error"), variant: "destructive" });
          }}>
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {t("auth.googleContinue")}
          </Button>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              {isLogin ? t("auth.noAccount") : t("auth.hasAccount")}{" "}
              <button type="button" onClick={() => { setIsLogin(!isLogin); setErrors({}); }} className="text-primary hover:underline font-medium">
                {isLogin ? t("auth.signupBtn") : t("auth.loginBtn")}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
