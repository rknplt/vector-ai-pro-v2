import { Button } from "@/components/ui/button";
import { Check, X, Zap, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLemonSqueezy } from "@/hooks/useLemonSqueezy";
import { useLanguage } from "@/contexts/LanguageContext";

const Pricing = () => {
  const navigate = useNavigate();
  const { user, userPlan } = useAuth();
  const { redirectToCheckout } = useLemonSqueezy();
  const { t } = useLanguage();

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: t("pricing.forever"),
      description: t("pricing.freeDesc"),
      icon: Zap,
      features: [
        { text: t("feature.codeWriting"), included: true },
        { text: t("feature.chatAssistant"), included: true },
        { text: t("feature.imageAnalysis"), included: true },
        { text: t("feature.vehicleDiag"), included: true },
        { text: t("feature.accounting"), included: true },
        { text: t("feature.multiAI"), included: true },
        { text: t("feature.academic"), included: true },
        { text: t("feature.translator"), included: true },
        { text: t("feature.codeDebug"), included: true },
        { text: t("feature.templates"), included: true },
        { text: t("feature.sharing"), included: true },
        { text: t("feature.web"), included: true },
        { text: `${t("feature.pdf")} (${t("feature.freeLimit")})`, included: true },
        { text: `${t("feature.excel")} (${t("feature.freeLimit")})`, included: true },
        { text: `${t("feature.imageGen")} (${t("feature.freeLimit")})`, included: true },
        { text: t("feature.legal"), included: false },
        { text: t("feature.voice"), included: false },
        { text: t("feature.video"), included: false },
        { text: t("feature.pcControl"), included: false },
        { text: t("feature.phoneControl"), included: false },
      ],
      cta: t("pricing.freeStart"),
      variant: "glass" as const,
      popular: false,
    },
    {
      name: "Plus",
      price: "$15",
      period: t("pricing.monthly"),
      description: t("pricing.plusDesc"),
      icon: Crown,
      features: [
        { text: t("feature.codeWriting"), included: true },
        { text: t("feature.chatAssistant"), included: true },
        { text: t("feature.imageAnalysis"), included: true },
        { text: t("feature.vehicleDiag"), included: true },
        { text: t("feature.accounting"), included: true },
        { text: t("feature.multiAI"), included: true },
        { text: t("feature.academic"), included: true },
        { text: t("feature.translator"), included: true },
        { text: t("feature.codeDebug"), included: true },
        { text: t("feature.templates"), included: true },
        { text: t("feature.sharing"), included: true },
        { text: t("feature.web"), included: true },
        { text: `${t("pricing.unlimited")} ${t("feature.pdf")}`, included: true },
        { text: `${t("pricing.unlimited")} ${t("feature.excel")}`, included: true },
        { text: `${t("pricing.unlimited")} ${t("feature.imageGen")}`, included: true },
        { text: t("feature.legal"), included: true },
        { text: t("feature.voice"), included: true },
        { text: t("feature.video"), included: true },
        { text: t("feature.pcControl"), included: true },
        { text: t("feature.phoneControl"), included: true },
      ],
      cta: t("pricing.upgradePlus"),
      variant: "hero" as const,
      popular: true,
    },
  ];

  const handlePlanAction = (planName: string) => {
    if (planName === "Free") {
      if (!user) navigate("/auth");
      else navigate("/dashboard");
    } else {
      if (!user) navigate("/auth");
      else if (userPlan === "plus") navigate("/dashboard");
      else redirectToCheckout();
    }
  };

  const getButtonText = (plan: typeof plans[0]) => {
    if (plan.name === "Free") {
      return user ? t("pricing.goToDashboard") : t("pricing.freeStart");
    }
    if (!user) return t("nav.login");
    if (userPlan === "plus") return t("pricing.alreadyPlus");
    return plan.cta;
  };

  return (
    <section id="pricing" className="py-24 relative">
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[120px]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            {t("pricing.title")} <span className="gradient-text">{t("pricing.titleHighlight")}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t("pricing.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative glass-card rounded-3xl p-8 transition-all duration-300 hover:-translate-y-2
                ${plan.popular ? 'border-primary/50 glow-primary' : 'border-border/30'}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="px-4 py-1 rounded-full bg-gradient-primary text-primary-foreground text-sm font-semibold">
                    {t("pricing.mostPopular")}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center
                  ${plan.popular ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>
                  <plan.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-black">{plan.price}</span>
                <span className="text-muted-foreground">/{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    {feature.included ? (
                      <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-success" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                        <X className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                    <span className={feature.included ? 'text-foreground' : 'text-muted-foreground'}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Button 
                variant={plan.variant} 
                size="lg" 
                className="w-full"
                onClick={() => handlePlanAction(plan.name)}
                disabled={plan.name === "Plus" && user && userPlan === "plus"}
              >
                {getButtonText(plan)}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
