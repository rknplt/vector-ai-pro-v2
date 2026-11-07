import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useLemonSqueezy } from "@/hooks/useLemonSqueezy";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Crown, Sparkles, CreditCard } from "lucide-react";

interface PlusFeatureGateProps {
  children: ReactNode;
  featureName?: string;
  showPreview?: boolean;
}

const PlusFeatureGate = ({ 
  children, 
  featureName,
  showPreview = false 
}: PlusFeatureGateProps) => {
  const { userPlan, user } = useAuth();
  const navigate = useNavigate();
  const { redirectToCheckout } = useLemonSqueezy();
  const { t } = useLanguage();

  const effectiveFeatureName = featureName || t("gate.plusOnly");

  // If user is Plus, show the feature
  if (userPlan === "plus") {
    return <>{children}</>;
  }

  // If not logged in, prompt to login
  if (!user) {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-2">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-lg">{t("gate.loginRequired")}</CardTitle>
          <CardDescription>
            {effectiveFeatureName} - {t("gate.loginDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button variant="hero" onClick={() => navigate("/auth")}>
            {t("gate.loginBtn")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show locked state for free users
  return (
    <div className="relative">
      {showPreview && (
        <div className="opacity-30 pointer-events-none blur-sm">
          {children}
        </div>
      )}
      <div className={`${showPreview ? 'absolute inset-0 flex items-center justify-center' : ''}`}>
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 backdrop-blur-sm max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-2">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">{t("gate.plusOnly")}</CardTitle>
            <CardDescription>
              {effectiveFeatureName} - {t("gate.plusDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-center">
            <div className="flex flex-wrap gap-2 justify-center pt-2">
              <Button variant="hero" size="sm" onClick={redirectToCheckout}>
                <CreditCard className="w-3 h-3 mr-1" />
                {t("gate.upgradeBtn")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/pricing")}>
                {t("gate.explorePlans")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlusFeatureGate;
