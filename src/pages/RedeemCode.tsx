import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLemonSqueezy } from "@/hooks/useLemonSqueezy";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Ticket, Gift, Sparkles, Check, Crown, CreditCard } from "lucide-react";

const RedeemCode = () => {
  const navigate = useNavigate();
  const { user, userPlan, isLoading } = useAuth();
  const { redirectToCheckout } = useLemonSqueezy();
  const { toast } = useToast();
  
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRedeem = async () => {
    if (!code.trim()) {
      toast({
        title: "Hata",
        description: "Lütfen bir davet kodu girin.",
        variant: "destructive",
      });
      return;
    }
    
    setRedeeming(true);
    
    const { data, error } = await supabase.functions.invoke("redeem-invite-code", {
      body: { code: code.trim().toUpperCase() },
    });
    
    setRedeeming(false);
    
    if (error || !data?.success) {
      toast({
        title: "Geçersiz Kod",
        description: "Bu davet kodu geçersiz, kullanılmış veya süresi dolmuş.",
        variant: "destructive",
      });
    } else {
      setSuccess(true);
      toast({
        title: "Tebrikler! 🎉",
        description: "Plus plan'a başarıyla yükseltildiniz!",
      });
      // Refresh after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Davet Kodu</h1>
              <p className="text-sm text-muted-foreground">Plus plan'a yükseltin</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-lg relative z-10">
        {userPlan === "plus" ? (
          <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                <Crown className="w-8 h-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Zaten Plus Üyesisiniz!</CardTitle>
              <CardDescription>
                Tüm premium özelliklere erişiminiz var.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="hero" onClick={() => navigate("/dashboard")}>
                Dashboard'a Git
              </Button>
            </CardContent>
          </Card>
        ) : success ? (
          <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 animate-pulse">
                <Check className="w-8 h-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl gradient-text">Tebrikler!</CardTitle>
              <CardDescription className="text-lg">
                Plus plan'a başarıyla yükseltildiniz!
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                Sayfa yenileniyor...
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-primary/30">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
                  <Ticket className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Davet Kodu Girin</CardTitle>
                <CardDescription>
                  Davet kodunuz varsa aşağıya girerek Plus plan'a yükselin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Input
                    placeholder="Örn: VECTORAI2024"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="text-center text-lg font-mono tracking-wider h-14"
                    maxLength={20}
                  />
                </div>
                <Button 
                  variant="hero" 
                  className="w-full h-12"
                  onClick={handleRedeem}
                  disabled={redeeming || !code.trim()}
                >
                  {redeeming ? (
                    <>
                      <div className="w-4 h-4 animate-spin rounded-full border-b-2 border-primary-foreground mr-2" />
                      Kontrol Ediliyor...
                    </>
                  ) : (
                    <>
                      <Gift className="w-5 h-5 mr-2" />
                      Kodu Kullan
                    </>
                  )}
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">veya</span>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full h-12 border-primary/50"
                  onClick={redirectToCheckout}
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Ödeme ile Yükselt - $15/ay
                </Button>
              </CardContent>
            </Card>

            {/* Benefits */}
            <Card className="mt-6 bg-card/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Plus ile Kazanacaklarınız
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    "Sınırsız AI sohbet",
                    "Gelişmiş görüntü analizi",
                    "Kod üretimi ve debug",
                    "Öncelikli işlem sırası",
                    "Özel AI modelleri",
                    "7/24 premium destek",
                  ].map((benefit, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default RedeemCode;
