import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, GraduationCap, Languages, Scale, Bug, Calculator, Wrench, Crown, Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export type ChatMode = 'general' | 'academic' | 'translator' | 'legal' | 'code-debug' | 'accounting' | 'vehicle' | 'agent-team';

interface ChatModeSelectorProps {
  value: ChatMode;
  onChange: (mode: ChatMode) => void;
  isPlusUser: boolean;
}

const ChatModeSelector = ({ value, onChange, isPlusUser }: ChatModeSelectorProps) => {
  const { t } = useLanguage();

  const CHAT_MODES = [
    { id: 'general' as ChatMode, label: t("mode.general") || "Genel Asistan", icon: MessageSquare },
    { id: 'agent-team' as ChatMode, label: t("mode.agentTeam") || "👑 Ajan Ekibi (9 Kişilik)", icon: Users, plusOnly: true },
    { id: 'academic' as ChatMode, label: t("mode.academic") || "Akademik", icon: GraduationCap },
    { id: 'translator' as ChatMode, label: t("mode.translator") || "Çeviri", icon: Languages },
    { id: 'legal' as ChatMode, label: t("mode.legal") || "Hukuk", icon: Scale, plusOnly: true },
    { id: 'code-debug' as ChatMode, label: t("mode.codeDebug") || "Kod Debug", icon: Bug },
    { id: 'accounting' as ChatMode, label: t("mode.accounting") || "Muhasebe", icon: Calculator },
    { id: 'vehicle' as ChatMode, label: t("mode.vehicle") || "Araç Teşhis", icon: Wrench },
  ];

  const currentMode = CHAT_MODES.find(m => m.id === value) || CHAT_MODES[0];

  return (
    <Select value={value} onValueChange={(v) => {
      const mode = CHAT_MODES.find(m => m.id === v);
      if (mode?.plusOnly && !isPlusUser) return;
      onChange(v as ChatMode);
    }}>
      <SelectTrigger className="w-[105px] sm:w-[155px] h-7 text-xs border-border/30 bg-secondary/50 px-2 shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <currentMode.icon className="w-3.5 h-3.5 text-primary shrink-0" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {CHAT_MODES.map((mode) => (
          <SelectItem
            key={mode.id}
            value={mode.id}
            disabled={mode.plusOnly && !isPlusUser}
          >
            <div className="flex items-center gap-2">
              <mode.icon className="w-3.5 h-3.5 text-primary" />
              <span>{mode.label}</span>
              {mode.plusOnly && !isPlusUser && (
                <Crown className="w-3 h-3 text-amber-400 ml-1" />
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default ChatModeSelector;
