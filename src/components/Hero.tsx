import { Button } from "@/components/ui/button";
import { ArrowRight, Mic, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

const Hero = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [userCount, setUserCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      setUserCount(count ?? 0);
    };
    fetchCount();

    const channel = supabase
      .channel("profiles-count")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, () => {
        setUserCount((prev) => (prev ?? 0) + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-20" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/20 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-primary/30 mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">
              {t("hero.badge")}
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight animate-slide-up">
            {t("hero.title1")}{" "}
            <span className="gradient-text">{t("hero.title2")}</span>
            <br />
            {t("hero.title3")}
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {t("hero.description")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Button variant="hero" size="xl" className="group" onClick={() => navigate("/auth")}>
              {t("hero.cta")}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="glass" size="xl" className="group">
              <Mic className="w-5 h-5 text-primary" />
              {t("hero.voiceAssistant")}
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-8 mt-16 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold gradient-text">
                {userCount !== null ? userCount.toLocaleString() : "..."}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{t("hero.activeUsers")}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold gradient-text">99.9%</div>
              <div className="text-sm text-muted-foreground mt-1">{t("hero.accuracy")}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold gradient-text">24/7</div>
              <div className="text-sm text-muted-foreground mt-1">{t("hero.uptime")}</div>
            </div>
          </div>
        </div>

        <div className="absolute right-10 top-1/3 hidden xl:block animate-float">
          <div className="relative w-32 h-32">
            <div className="absolute inset-0 rounded-full bg-gradient-primary opacity-60 blur-xl" />
            <div className="absolute inset-4 rounded-full bg-gradient-primary" />
            <div className="absolute inset-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
