import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLemonSqueezy } from "@/hooks/useLemonSqueezy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Crown, MessageSquare, Image, Mic, Code, Zap, TrendingUp, Clock, Sparkles, Lock, CreditCard } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, userPlan, isLoading } = useAuth();
  const { t } = useLanguage();
  const { redirectToCheckout } = useLemonSqueezy();

  const freeFeatures = [
    { name: t("dashboard.textChat"), icon: MessageSquare, used: 45, limit: 50, available: true },
    { name: t("dashboard.imageAnalysis"), icon: Image, used: 8, limit: 10, available: true },
    { name: t("dashboard.voiceCommands"), icon: Mic, used: 3, limit: 5, available: true },
  ];

  const plusFeatures = [
    { name: t("dashboard.unlimitedChat"), icon: MessageSquare, available: userPlan === "plus" },
    { name: t("dashboard.advancedImage"), icon: Image, available: userPlan === "plus" },
    { name: t("dashboard.unlimitedVoice"), icon: Mic, available: userPlan === "plus" },
    { name: t("dashboard.codeGenDebug"), icon: Code, available: userPlan === "plus" },
    { name: t("dashboard.priority"), icon: Zap, available: userPlan === "plus" },
    { name: t("dashboard.advancedAI"), icon: Sparkles, available: userPlan === "plus" },
  ];

  const recentActivity = [
    { action: t("dashboard.imageAnalyzed"), time: t("dashboard.5minsAgo"), type: "image" },
    { action: t("dashboard.codeGenerated"), time: t("dashboard.1hourAgo"), type: "code" },
    { action: t("dashboard.voiceProcessed"), time: t("dashboard.3hoursAgo"), type: "voice" },
    { action: t("dashboard.textChatDone"), time: t("dashboard.5hoursAgo"), type: "chat" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) { navigate("/auth"); return null; }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">{t("dashboard.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
              </div>
            </div>
            <Badge variant={userPlan === "plus" ? "default" : "secondary"} className={userPlan === "plus" ? "bg-gradient-to-r from-primary to-accent" : ""}>
              <Crown className="w-3 h-3 mr-1" />
              {userPlan === "plus" ? "Plus" : t("nav.free")}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {userPlan === "free" && freeFeatures.map((feature) => (
            <Card key={feature.name} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <feature.icon className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base">{feature.name}</CardTitle>
                  </div>
                  <span className="text-sm text-muted-foreground">{feature.used}/{feature.limit}</span>
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={(feature.used / feature.limit) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">{feature.limit - feature.used} {t("dashboard.usageLeft")}</p>
              </CardContent>
            </Card>
          ))}

          {plusFeatures.map((feature) => (
            <Card key={feature.name} className={`relative overflow-hidden ${!feature.available ? 'opacity-60' : 'border-primary/30'}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <feature.icon className={`w-5 h-5 ${feature.available ? 'text-primary' : 'text-muted-foreground'}`} />
                    <CardTitle className="text-base">{feature.name}</CardTitle>
                  </div>
                  {!feature.available ? <Lock className="w-4 h-4 text-muted-foreground" /> : (
                    <Badge variant="outline" className="text-xs border-primary/50 text-primary">{t("dashboard.active")}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.available ? t("dashboard.unlimitedAccess") : t("dashboard.plusRequired")}</p>
              </CardContent>
              {!feature.available && <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />}
            </Card>
          ))}
        </div>

        {userPlan === "free" && (
          <Card className="mt-8 border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Crown className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle>{t("dashboard.upgradeTitle")}</CardTitle>
                  <CardDescription>{t("dashboard.upgradeDesc")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Button variant="hero" onClick={redirectToCheckout}>
                <CreditCard className="w-4 h-4 mr-2" />
                {t("dashboard.upgradeBtn")}
              </Button>
              <Button variant="outline" onClick={() => navigate("/redeem-code")}>{t("dashboard.redeemCode")}</Button>
            </CardContent>
          </Card>
        )}

        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <CardTitle>{t("dashboard.recentActivity")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                      {activity.type === "image" && <Image className="w-4 h-4 text-primary" />}
                      {activity.type === "code" && <Code className="w-4 h-4 text-primary" />}
                      {activity.type === "voice" && <Mic className="w-4 h-4 text-primary" />}
                      {activity.type === "chat" && <MessageSquare className="w-4 h-4 text-primary" />}
                    </div>
                    <span className="text-sm">{activity.action}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
