import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Settings, 
  Volume2, 
  Check, 
  Globe,
  Gauge
} from "lucide-react";
import { 
  VoiceOption, 
  LANGUAGE_VOICES, 
  TEST_PHRASES 
} from "@/hooks/useTextToSpeech";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

interface VoiceSettingsDialogProps {
  selectedVoiceId: string;
  onSelectVoice: (voiceId: string) => void;
  onTestVoice: (text: string, voiceId?: string, speed?: string) => void;
  speakingSpeed?: string;
  onChangeSpeed?: (speed: string) => void;
  isLoading?: boolean;
}

const VoiceSettingsDialog = ({
  selectedVoiceId,
  onSelectVoice,
  onTestVoice,
  speakingSpeed = "+20%",
  onChangeSpeed,
  isLoading,
}: VoiceSettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const [activeLang, setActiveLang] = useState<string>(language || "tr");

  useEffect(() => {
    if (language && LANGUAGE_VOICES[language]) {
      setActiveLang(language);
    }
  }, [language]);

  const languagesList = [
    { code: "tr", label: "Türkçe", flag: "🇹🇷" },
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "de", label: "Deutsch", flag: "🇩🇪" },
    { code: "fr", label: "Français", flag: "🇫🇷" },
    { code: "es", label: "Español", flag: "🇪🇸" },
    { code: "ar", label: "العربية", flag: "🇸🇦" },
    { code: "ru", label: "Русский", flag: "🇷🇺" },
    { code: "pt", label: "Português", flag: "🇵🇹" },
    { code: "ja", label: "日本語", flag: "🇯🇵" },
    { code: "zh", label: "中文", flag: "🇨🇳" },
    { code: "ko", label: "한국어", flag: "🇰🇷" },
    { code: "tl", label: "Filipino", flag: "🇵🇭" },
    { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  ];

  const speedOptions = [
    { label: t("voice.speedNormal") || "1.0x Normal", value: "+0%" },
    { label: t("voice.speedFluent") || "⚡ 1.2x Akıcı (Önerilen)", value: "+20%" },
    { label: t("voice.speedFast") || "🚀 1.35x Hızlı", value: "+35%" },
  ];

  const currentVoices: VoiceOption[] = LANGUAGE_VOICES[activeLang] || LANGUAGE_VOICES.tr;

  const handleTest = (voice: VoiceOption) => {
    onSelectVoice(voice.id);
    const phrase = TEST_PHRASES[voice.lang] || TEST_PHRASES.tr;
    onTestVoice(phrase, voice.id, speakingSpeed);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
          title={t("voice.settingsTitle")}
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">{t("voice.button")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Volume2 className="w-5 h-5 text-primary" />
            {t("voice.settingsTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("voice.settingsDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 space-y-3.5 pt-2">
          {/* Language Selection Pills */}
          <div className="space-y-1.5 shrink-0">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-primary" /> {t("voice.langSelect")}
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
              {languagesList.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setActiveLang(l.code);
                    setLanguage(l.code as any);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-full shrink-0 border transition-all flex items-center gap-1.5 ${
                    activeLang === l.code
                      ? "bg-primary text-white border-primary font-semibold shadow-sm"
                      : "bg-secondary/50 text-muted-foreground border-border/60 hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <span>{l.flag}</span>
                  <span>{l.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Speaking Speed Controls */}
          <div className="space-y-1.5 shrink-0 bg-secondary/30 p-2.5 rounded-xl border border-border/50">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5 text-foreground">
                <Gauge className="w-3.5 h-3.5 text-primary" /> {t("voice.speed")}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              {speedOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onChangeSpeed && onChangeSpeed(opt.value)}
                  className={`text-xs py-1.5 px-2 rounded-lg border transition-all font-medium truncate ${
                    speakingSpeed === opt.value
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-background/80 text-muted-foreground border-border hover:bg-secondary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Voices for Selected Language */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>{t("voice.availableVoices")} ({languagesList.find(l => l.code === activeLang)?.label}):</span>
            <span className="text-green-400 font-medium">{t("voice.studioQuality")}</span>
          </div>

          <ScrollArea className="flex-1 h-[240px] pr-2 border border-border/50 rounded-2xl p-2 bg-background/50">
            <div className="space-y-2">
              {currentVoices.map((voice) => {
                const isSelected = selectedVoiceId === voice.id;
                const isFemale = voice.gender === "female";
                return (
                  <div
                    key={voice.id}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border/60 hover:bg-secondary/40"
                    }`}
                    onClick={() => onSelectVoice(voice.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg border shrink-0 ${
                        isFemale 
                          ? "bg-pink-500/10 text-pink-400 border-pink-500/30" 
                          : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                      }`}>
                        {isFemale ? "👩" : "👨"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{voice.name}</span>
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] px-1.5 py-0 ${
                              isFemale 
                                ? "text-pink-400 border-pink-500/40 bg-pink-500/5" 
                                : "text-blue-400 border-blue-500/40 bg-blue-500/5"
                            }`}
                          >
                            {isFemale ? t("voice.female") : t("voice.male")}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{voice.desc}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                      <Button
                        variant={isSelected ? "default" : "secondary"}
                        size="sm"
                        className="h-8 gap-1 text-xs shrink-0 font-medium"
                        disabled={isLoading}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTest(voice);
                        }}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        {t("voice.listen")}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceSettingsDialog;
