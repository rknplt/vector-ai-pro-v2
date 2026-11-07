import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Crown, Mail, Calendar, Save, Ticket } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const { user, userPlan, isLoading } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  
  const [fullName, setFullName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useState(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
      if (data) setFullName(data.full_name || "");
      setProfileLoaded(true);
    };
    fetchProfile();
  });

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: t("common.error"), description: t("profile.updateError"), variant: "destructive" });
    } else {
      toast({ title: t("common.success"), description: t("profile.updateSuccess") });
    }
  };

  const handleRedeemCode = async () => {
    if (!inviteCode.trim()) {
      toast({ title: t("common.error"), description: t("profile.invalidCode"), variant: "destructive" });
      return;
    }
    setRedeeming(true);
    const { data, error } = await supabase.functions.invoke("redeem-invite-code", {
      body: { code: inviteCode.trim().toUpperCase() },
    });
    setRedeeming(false);
    if (error || !data?.success) {
      toast({ title: t("common.error"), description: t("profile.invalidCode"), variant: "destructive" });
    } else {
      toast({ title: t("profile.congrats"), description: t("profile.upgradedToPlus") });
      setInviteCode("");
      window.location.reload();
    }
  };

  if (isLoading || !profileLoaded) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 animate-spin rounded-full border-b-2 border-primary"></div></div>;
  }
  if (!user) { navigate("/auth"); return null; }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{t("profile.title")}</h1>
              <p className="text-sm text-muted-foreground">{t("profile.subtitle")}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle>{t("profile.currentPlan")}</CardTitle>
                    <CardDescription>{t("profile.subscriptionStatus")}</CardDescription>
                  </div>
                </div>
                <Badge variant={userPlan === "plus" ? "default" : "secondary"} className={userPlan === "plus" ? "bg-gradient-to-r from-primary to-primary/80" : ""}>
                  {userPlan === "plus" ? "Plus" : t("nav.free")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {userPlan === "free" ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">{t("profile.plusUpgradeHint")}</p>
                  <Separator />
                  <div className="space-y-3">
                    <Label htmlFor="inviteCode" className="flex items-center gap-2">
                      <Ticket className="w-4 h-4" />
                      {t("profile.redeemCode")}
                    </Label>
                    <div className="flex gap-2">
                      <Input id="inviteCode" placeholder={t("profile.enterCode")} value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
                      <Button onClick={handleRedeemCode} disabled={redeeming}>{redeeming ? t("profile.checking") : t("profile.use")}</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("profile.plusActive")}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <User className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <CardTitle>{t("profile.info")}</CardTitle>
                  <CardDescription>{t("profile.editInfo")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t("profile.fullName")}</Label>
                <Input id="fullName" placeholder={t("profile.fullNamePlaceholder")} value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {saving ? t("profile.saving") : t("profile.saveChanges")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <Mail className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <CardTitle>{t("profile.accountInfo")}</CardTitle>
                  <CardDescription>{t("profile.accountDetails")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("profile.emailAddress")}</Label>
                <Input value={user.email || ""} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">{t("profile.emailNotChangeable")}</p>
              </div>
              <Separator />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  {t("profile.registrationDate")}: {new Date(user.created_at).toLocaleDateString(language === "tr" ? "tr-TR" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Profile;
