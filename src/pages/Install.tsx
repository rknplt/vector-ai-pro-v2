import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  Smartphone, 
  Check, 
  Share, 
  Plus, 
  Monitor, 
  Terminal, 
  Laptop, 
  ShieldCheck, 
  Cpu, 
  Sparkles, 
  ArrowLeft,
  Info
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// GitHub Releases download links (Direct to latest release assets)
const GITHUB_REPO_URL = "https://github.com/rknplt/ai-sirket-ajanlari";
const LATEST_RELEASE_URL = `${GITHUB_REPO_URL}/releases/latest/download`;

const DOWNLOAD_LINKS = {
  android: `${LATEST_RELEASE_URL}/vector-ai-pro.apk`,
  windows: `${LATEST_RELEASE_URL}/vector-ai-pro-windows-setup.exe`,
  windowsLegacy: `${LATEST_RELEASE_URL}/vector-ai-pro-win7-8.exe`,
  linuxAppImage: `${LATEST_RELEASE_URL}/vector-ai-pro-linux.AppImage`,
  linuxDeb: `${LATEST_RELEASE_URL}/vector-ai-pro-linux.deb`,
  macAppleSilicon: `${LATEST_RELEASE_URL}/vector-ai-pro-mac-arm64.dmg`,
  macIntel: `${LATEST_RELEASE_URL}/vector-ai-pro-mac-x64.dmg`,
  iosIpa: `${LATEST_RELEASE_URL}/vector-ai-pro-ios.ipa`,
};

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("android");
  const { t } = useLanguage();

  useEffect(() => {
    // Detect OS for default tab
    const ua = navigator.userAgent.toLowerCase();
    if (/android/.test(ua)) {
      setActiveTab("android");
    } else if (/iphone|ipad|ipod/.test(ua)) {
      setActiveTab("ios");
    } else if (/win/.test(ua)) {
      setActiveTab("windows");
    } else if (/linux/.test(ua) && !/android/.test(ua)) {
      setActiveTab("linux");
    } else if (/mac/.test(ua)) {
      setActiveTab("macos");
    }

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast({
        title: "Kurulum Tamamlandı! 🎉",
        description: "Vector AI Pro artık cihazınızda hazır.",
      });
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handlePwaInstall = async () => {
    if (!deferredPrompt) {
      toast({
        title: "Hızlı Kurulum",
        description: "Tarayıcı menünüzden 'Ana Ekrana Ekle' seçeneğini kullanarak doğrudan kurabilirsiniz.",
      });
      return;
    }
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md glass-card p-8 rounded-3xl border border-primary/20">
          <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold">{t("install.installed")}</h1>
          <p className="text-muted-foreground">
            {t("install.installedDesc")}
          </p>
          <Button onClick={() => window.location.href = "/"} className="w-full h-12 text-base font-semibold">
            {t("install.open")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* Top Bar */}
      <div className="border-b border-border/40 bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => window.location.href = "/"} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t("install.backToChat")}
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/40 text-primary gap-1">
              <Sparkles className="w-3 h-3" /> v2.5 Universal
            </Badge>
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <div className="relative overflow-hidden py-12 md:py-16 bg-gradient-to-b from-primary/15 via-background to-background">
        <div className="container mx-auto px-4 text-center max-w-3xl space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-primary via-purple-600 to-indigo-500 text-white shadow-2xl shadow-primary/30 mb-2">
            <Smartphone className="w-10 h-10" />
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            {t("install.title")}
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("install.subtitle")}
          </p>
        </div>
      </div>

      {/* OS Download Tabs */}
      <div className="container mx-auto px-4 max-w-4xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-5 w-full h-auto p-1.5 bg-secondary/60 backdrop-blur border border-border/50 rounded-2xl mb-8">
            <TabsTrigger value="android" className="flex flex-col sm:flex-row items-center gap-1.5 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
              <Smartphone className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-medium">Android</span>
            </TabsTrigger>
            <TabsTrigger value="windows" className="flex flex-col sm:flex-row items-center gap-1.5 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
              <Monitor className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-medium">Windows</span>
            </TabsTrigger>
            <TabsTrigger value="linux" className="flex flex-col sm:flex-row items-center gap-1.5 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
              <Terminal className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-medium">Linux</span>
            </TabsTrigger>
            <TabsTrigger value="macos" className="flex flex-col sm:flex-row items-center gap-1.5 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
              <Laptop className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-medium">macOS</span>
            </TabsTrigger>
            <TabsTrigger value="ios" className="flex flex-col sm:flex-row items-center gap-1.5 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
              <Share className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-medium">iOS</span>
            </TabsTrigger>
          </TabsList>

          {/* ANDROID TAB */}
          <TabsContent value="android" className="space-y-6">
            <div className="border border-green-500/30 bg-gradient-to-br from-green-500/10 via-secondary/40 to-background p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-green-500/20 text-green-500 flex items-center justify-center font-bold text-2xl border border-green-500/30 shrink-0">
                    🤖
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold">Android APK Paketi</h2>
                      <Badge className="bg-green-500 text-black font-semibold">Resmi APK</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Android 8.0 (Oreo), 9, 10, 11, 12, 13, 14 ve 15 uyumlu
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right text-xs text-muted-foreground">
                  <div>Mimari: ARM64 / Universal</div>
                  <div className="text-green-400 font-medium mt-0.5">✓ Virüssüz & İmzalı</div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                <Button 
                  asChild 
                  size="lg" 
                  className="bg-green-600 hover:bg-green-500 text-white font-semibold h-13 shadow-lg shadow-green-600/20 gap-2"
                >
                  <a href={DOWNLOAD_LINKS.android} download>
                    <Download className="w-5 h-5" />
                    Android APK İndir (.apk)
                  </a>
                </Button>
                {deferredPrompt ? (
                  <Button 
                    variant="outline" 
                    size="lg" 
                    onClick={handlePwaInstall}
                    className="border-green-500/40 hover:bg-green-500/10 h-13 gap-2"
                  >
                    <Smartphone className="w-5 h-5 text-green-500" />
                    Tek Tıkla Telefona Kur (PWA)
                  </Button>
                ) : (
                  <Button 
                    asChild 
                    variant="outline" 
                    size="lg" 
                    className="border-border/60 hover:bg-secondary h-13 gap-2"
                  >
                    <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
                      <ShieldCheck className="w-5 h-5 text-green-400" />
                      GitHub Releases İncele
                    </a>
                  </Button>
                )}
              </div>

              {/* Install steps */}
              <div className="bg-background/60 border border-border/50 rounded-2xl p-5 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Info className="w-4 h-4 text-primary" /> Android Kurulum Adımları
                </h4>
                <ol className="text-xs sm:text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Yukarıdaki butona basarak <strong>vector-ai-pro.apk</strong> dosyasını indirin.</li>
                  <li>İndirme tamamlandığında bildirime veya İndirilenler klasörüne tıklayın.</li>
                  <li>İlk kez yüklüyorsanız <em>"Bilinmeyen kaynaklardan uygulama yüklemeye izin ver"</em> seçeneğini onaylayın.</li>
                  <li>"Yükle" butonuna dokunarak kurulumu tamamlayın. Hey Vector ses komutları ve tüm modlar aktif olacaktır!</li>
                </ol>
              </div>
            </div>
          </TabsContent>

          {/* WINDOWS TAB */}
          <TabsContent value="windows" className="space-y-6">
            <div className="border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-secondary/40 to-background p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-2xl border border-blue-500/30 shrink-0">
                    🪟
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold">Windows Masaüstü Programı</h2>
                      <Badge className="bg-blue-500 text-white font-semibold">Windows .exe</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Windows 11, 10 ve eski sistemler (Windows 7 / 8 / 8.1) tam destek
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right text-xs text-muted-foreground">
                  <div>Mimari: x64 / x86</div>
                  <div className="text-blue-400 font-medium mt-0.5">✓ PC Kontrol Entegre</div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                <Button 
                  asChild 
                  size="lg" 
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold h-13 shadow-lg shadow-blue-600/20 gap-2"
                >
                  <a href={DOWNLOAD_LINKS.windows} download>
                    <Download className="w-5 h-5" />
                    Windows 10 / 11 İndir (.exe)
                  </a>
                </Button>
                <Button 
                  asChild 
                  variant="outline" 
                  size="lg" 
                  className="border-blue-500/40 hover:bg-blue-500/10 h-13 gap-2"
                >
                  <a href={DOWNLOAD_LINKS.windowsLegacy} download>
                    <Cpu className="w-5 h-5 text-blue-400" />
                    Eski Windows 7 / 8.1 Sürümü
                  </a>
                </Button>
              </div>

              <div className="bg-background/60 border border-border/50 rounded-2xl p-5 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Info className="w-4 h-4 text-blue-400" /> Windows Özellikleri
                </h4>
                <ul className="text-xs sm:text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                    <span><strong>PC Ajanı & Uzaktan Kontrol:</strong> Ekran görüntüsü alma, program çalıştırma ve sistem istatistikleri.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                    <span><strong>Masaüstü Bildirimleri:</strong> Görevler bittiğinde Windows bildirim merkezinden anında uyarı.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                    <span><strong>Hızlı Kısayol:</strong> Başlat menüsü ve masaüstü simgesiyle tek tıkla doğrudan açılır.</span>
                  </li>
                </ul>
              </div>
            </div>
          </TabsContent>

          {/* LINUX / UBUNTU TAB */}
          <TabsContent value="linux" className="space-y-6">
            <div className="border border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-secondary/40 to-background p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-2xl border border-orange-500/30 shrink-0">
                    🐧
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold">Linux / Ubuntu Dağıtımları</h2>
                      <Badge className="bg-orange-500 text-white font-semibold">Geliştirici Paketi</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Ubuntu 18.04+, Debian, Fedora, Arch, Manjaro ve Linux Mint
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right text-xs text-muted-foreground">
                  <div>Format: AppImage / DEB</div>
                  <div className="text-orange-400 font-medium mt-0.5">✓ Kurulumsuz Çalışır</div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                <Button 
                  asChild 
                  size="lg" 
                  className="bg-orange-600 hover:bg-orange-500 text-white font-semibold h-13 shadow-lg shadow-orange-600/20 gap-2"
                >
                  <a href={DOWNLOAD_LINKS.linuxAppImage} download>
                    <Download className="w-5 h-5" />
                    Linux AppImage İndir
                  </a>
                </Button>
                <Button 
                  asChild 
                  variant="outline" 
                  size="lg" 
                  className="border-orange-500/40 hover:bg-orange-500/10 h-13 gap-2"
                >
                  <a href={DOWNLOAD_LINKS.linuxDeb} download>
                    <Terminal className="w-5 h-5 text-orange-400" />
                    Debian / Ubuntu (.deb) İndir
                  </a>
                </Button>
              </div>

              <div className="bg-background/60 border border-border/50 rounded-2xl p-5 space-y-3 font-mono text-xs">
                <div className="text-muted-foreground font-sans text-sm font-semibold mb-1">
                  Terminalden Hızlı Başlatma (AppImage):
                </div>
                <div className="bg-black/60 p-3 rounded-lg text-green-400 border border-white/10 select-all">
                  chmod +x vector-ai-pro-linux.AppImage<br />
                  ./vector-ai-pro-linux.AppImage
                </div>
              </div>
            </div>
          </TabsContent>

          {/* MACOS TAB */}
          <TabsContent value="macos" className="space-y-6">
            <div className="border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-secondary/40 to-background p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-2xl border border-purple-500/30 shrink-0">
                    🍏
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold">macOS Masaüstü</h2>
                      <Badge className="bg-purple-600 text-white font-semibold">Universal DMG</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Apple Silicon (M1/M2/M3/M4) ve Intel Mac modelleri
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right text-xs text-muted-foreground">
                  <div>macOS 11 (Big Sur) ve üstü</div>
                  <div className="text-purple-400 font-medium mt-0.5">✓ Retina Optimize</div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                <Button 
                  asChild 
                  size="lg" 
                  className="bg-purple-600 hover:bg-purple-500 text-white font-semibold h-13 shadow-lg shadow-purple-600/20 gap-2"
                >
                  <a href={DOWNLOAD_LINKS.macAppleSilicon} download>
                    <Download className="w-5 h-5" />
                    Apple Silicon İndir (M1/M2/M3/M4)
                  </a>
                </Button>
                <Button 
                  asChild 
                  variant="outline" 
                  size="lg" 
                  className="border-purple-500/40 hover:bg-purple-500/10 h-13 gap-2"
                >
                  <a href={DOWNLOAD_LINKS.macIntel} download>
                    <Laptop className="w-5 h-5 text-purple-400" />
                    Intel Mac Sürümü (.dmg)
                  </a>
                </Button>
              </div>

              <div className="bg-background/60 border border-border/50 rounded-2xl p-5 space-y-2 text-xs sm:text-sm text-muted-foreground">
                <p>İndirilen <strong>.dmg</strong> dosyasını açıp Vector AI Pro simgesini <em>Applications (Uygulamalar)</em> klasörüne sürüklemeniz yeterlidir.</p>
              </div>
            </div>
          </TabsContent>

          {/* IOS TAB */}
          <TabsContent value="ios" className="space-y-6">
            <div className="border border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-secondary/40 to-background p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-2xl border border-sky-500/30 shrink-0">
                    📱
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold">iPhone & iPad</h2>
                      <Badge className="bg-sky-500 text-white font-semibold">iOS 13+ Destekli</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      iPhone 6s, 7, 8, X, 11, 12, 13, 14, 15, 16 ve tüm iPad modelleri
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right text-xs text-muted-foreground">
                  <div>Safari WebApp & IPA</div>
                  <div className="text-sky-400 font-medium mt-0.5">✓ 0 MB Yer Kaplar</div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                <Button 
                  asChild 
                  variant="outline" 
                  size="lg" 
                  className="border-sky-500/40 hover:bg-sky-500/10 h-13 gap-2"
                >
                  <a href={DOWNLOAD_LINKS.iosIpa} download>
                    <Download className="w-5 h-5 text-sky-400" />
                    iOS Paketi İndir (.ipa)
                  </a>
                </Button>
                <Button 
                  size="lg" 
                  onClick={() => {
                    toast({
                      title: "Safari'den Ana Ekrana Ekle",
                      description: "Ekranın altındaki Paylaş (kare ve yukarı ok) simgesine basıp 'Ana Ekrana Ekle' deyin.",
                    });
                  }}
                  className="bg-sky-600 hover:bg-sky-500 text-white font-semibold h-13 gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Safari ile Ana Ekrana Kur
                </Button>
              </div>

              <div className="bg-background/60 border border-border/50 rounded-2xl p-5 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Info className="w-4 h-4 text-sky-400" /> iPhone'a 10 Saniyede Kurulum (Safari):
                </h4>
                <ol className="text-xs sm:text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Bu sayfayı iPhone'unuzda <strong>Safari</strong> tarayıcısında açın.</li>
                  <li>Alt menüdeki <strong>Paylaş</strong> (<Share className="w-3.5 h-3.5 inline mx-1" />) simgesine dokunun.</li>
                  <li>Menüyü aşağı kaydırıp <strong>"Ana Ekrana Ekle"</strong> (<Plus className="w-3.5 h-3.5 inline mx-1" />) seçeneğine basın.</li>
                  <li>Sağ üstteki <strong>"Ekle"</strong> butonuna basın. Vector AI Pro artık ana ekranınızda tam ekran bir uygulama olarak açılacaktır!</li>
                </ol>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Feature Highlights Grid */}
        <div className="mt-12 pt-8 border-t border-border/40 space-y-6">
          <h3 className="text-xl font-bold text-center">Neden Yerel Uygulama?</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-4 rounded-2xl border border-border/50 text-center space-y-2">
              <div className="w-10 h-10 mx-auto rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl">
                ⚡
              </div>
              <h4 className="font-semibold text-sm">Sıfır Gecikme</h4>
              <p className="text-xs text-muted-foreground">Doğrudan donanım hızlandırma ve anında açılış.</p>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-border/50 text-center space-y-2">
              <div className="w-10 h-10 mx-auto rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl">
                🎙️
              </div>
              <h4 className="font-semibold text-sm">Sesli Uyanma</h4>
              <p className="text-xs text-muted-foreground">"Hey Vector" ile ekran kapalıyken bile sesle uyanma.</p>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-border/50 text-center space-y-2">
              <div className="w-10 h-10 mx-auto rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl">
                🖥️
              </div>
              <h4 className="font-semibold text-sm">PC & Cihaz Kontrolü</h4>
              <p className="text-xs text-muted-foreground">Kamera, fener, bildirimler ve evdeki bilgisayarı uzaktan yönetim.</p>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-border/50 text-center space-y-2">
              <div className="w-10 h-10 mx-auto rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl">
                🔒
              </div>
              <h4 className="font-semibold text-sm">Gizli & Güvenli</h4>
              <p className="text-xs text-muted-foreground">Uçtan uca şifreli oturum ve yerel hafıza yönetimi.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Install;
