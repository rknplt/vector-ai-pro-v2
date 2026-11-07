import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Settings,
  Save,
  Loader2,
  MessageSquare,
  Image,
  Video,
  Mic,
  Wrench,
  Calculator,
  Brain,
  Shield,
  Ban,
  UserCheck,
  AlertTriangle,
} from "lucide-react";

interface UserSettings {
  id: string;
  user_id: string;
  daily_message_limit: number | null;
  total_message_limit: number | null;
  messages_used_today: number;
  feature_chat: boolean;
  feature_image_analysis: boolean;
  feature_image_generation: boolean;
  feature_video_analysis: boolean;
  feature_voice_commands: boolean;
  feature_vehicle_diagnosis: boolean;
  feature_accounting: boolean;
  ai_model: string;
  account_status: string;
  suspension_reason: string | null;
}

interface UserSettingsModalProps {
  userId: string | null;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const AI_MODELS = [
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (Varsayılan)" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (Hızlı)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (Gelişmiş)" },
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash Preview" },
  { value: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { value: "openai/gpt-5", label: "GPT-5 (Premium)" },
  { value: "openai/gpt-5.2", label: "GPT-5.2 (En Yeni)" },
];

const FEATURES = [
  { key: "feature_chat", label: "Sohbet", icon: MessageSquare, description: "AI ile sohbet" },
  { key: "feature_image_analysis", label: "Görsel Analiz", icon: Image, description: "Görsel yükleme ve analiz" },
  { key: "feature_image_generation", label: "Görsel Oluşturma", icon: Image, description: "AI ile görsel üretme" },
  { key: "feature_video_analysis", label: "Video Analiz", icon: Video, description: "Video yükleme ve analiz" },
  { key: "feature_voice_commands", label: "Sesli Komutlar", icon: Mic, description: "Sesli komut ve etkileşim" },
  { key: "feature_vehicle_diagnosis", label: "Araç Teşhisi", icon: Wrench, description: "Araç arıza teşhisi" },
  { key: "feature_accounting", label: "Muhasebe", icon: Calculator, description: "Muhasebe yardımı" },
] as const;

const UserSettingsModal = ({
  userId,
  userName,
  isOpen,
  onClose,
  onSaved,
}: UserSettingsModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    if (isOpen && userId) {
      loadSettings();
    }
  }, [isOpen, userId]);

  const loadSettings = async () => {
    if (!userId) return;
    setLoading(true);

    const { data, error } = await (supabase as any)
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code === "PGRST116") {
      // No settings found, create default
      const { data: newData } = await (supabase as any)
        .from("user_settings")
        .insert({ user_id: userId })
        .select()
        .single();
      setSettings(newData);
    } else if (data) {
      setSettings(data);
    }

    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings || !userId) return;
    setSaving(true);

    const { error } = await (supabase as any)
      .from("user_settings")
      .update({
        daily_message_limit: settings.daily_message_limit,
        total_message_limit: settings.total_message_limit,
        feature_chat: settings.feature_chat,
        feature_image_analysis: settings.feature_image_analysis,
        feature_image_generation: settings.feature_image_generation,
        feature_video_analysis: settings.feature_video_analysis,
        feature_voice_commands: settings.feature_voice_commands,
        feature_vehicle_diagnosis: settings.feature_vehicle_diagnosis,
        feature_accounting: settings.feature_accounting,
        ai_model: settings.ai_model,
        account_status: settings.account_status,
        suspension_reason: settings.suspension_reason,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Ayarlar kaydedilemedi.",
      });
    } else {
      toast({ title: "Başarılı", description: "Kullanıcı ayarları güncellendi." });
      onSaved();
    }

    setSaving(false);
  };

  const toggleFeature = (key: string) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: !(settings as any)[key] });
  };

  const statusColors: Record<string, string> = {
    active: "bg-success/20 text-success border-success/30",
    suspended: "bg-warning/20 text-warning border-warning/30",
    banned: "bg-destructive/20 text-destructive border-destructive/30",
  };

  const statusLabels: Record<string, string> = {
    active: "Aktif",
    suspended: "Askıda",
    banned: "Engellenmiş",
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass-card border-border/30 max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            {userName} - Kullanıcı Ayarları
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : settings ? (
          <ScrollArea className="max-h-[calc(85vh-120px)]">
            <div className="space-y-6 pr-4">
              {/* Account Status */}
              <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold">Hesap Durumu</h4>
                  <Badge className={statusColors[settings.account_status]}>
                    {statusLabels[settings.account_status]}
                  </Badge>
                </div>
                <Select
                  value={settings.account_status}
                  onValueChange={(val) => setSettings({ ...settings, account_status: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <span className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-success" /> Aktif
                      </span>
                    </SelectItem>
                    <SelectItem value="suspended">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-warning" /> Askıya Al
                      </span>
                    </SelectItem>
                    <SelectItem value="banned">
                      <span className="flex items-center gap-2">
                        <Ban className="w-4 h-4 text-destructive" /> Engelle
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {settings.account_status !== "active" && (
                  <Textarea
                    placeholder="Neden (isteğe bağlı)..."
                    value={settings.suspension_reason || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, suspension_reason: e.target.value })
                    }
                    className="bg-secondary/50"
                  />
                )}
              </div>

              <Separator className="bg-border/30" />

              {/* Message Limits */}
              <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold">Mesaj Limitleri</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Günlük Limit
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={settings.daily_message_limit ?? ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          daily_message_limit: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      placeholder="Sınırsız"
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Toplam Limit
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={settings.total_message_limit ?? ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          total_message_limit: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      placeholder="Sınırsız"
                      className="bg-secondary/50"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Bugün kullanılan: {settings.messages_used_today} mesaj
                </p>
              </div>

              <Separator className="bg-border/30" />

              {/* Feature Access */}
              <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold">Özellik Erişimi</h4>
                </div>
                <div className="space-y-2">
                  {FEATURES.map((feature) => (
                    <div
                      key={feature.key}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <feature.icon className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{feature.label}</p>
                          <p className="text-xs text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={(settings as any)[feature.key]}
                        onCheckedChange={() => toggleFeature(feature.key)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="bg-border/30" />

              {/* AI Model */}
              <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold">AI Model</h4>
                </div>
                <Select
                  value={settings.ai_model}
                  onValueChange={(val) => setSettings({ ...settings, ai_model: val })}
                >
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_MODELS.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Save */}
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full"
                variant="hero"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Ayarları Kaydet
              </Button>
            </div>
          </ScrollArea>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Ayarlar yüklenemedi.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserSettingsModal;
