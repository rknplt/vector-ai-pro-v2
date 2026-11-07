import { useEffect, useState } from "react";
import { X, Info, AlertTriangle, AlertCircle, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
}

const typeConfig: Record<string, { icon: typeof Info; bg: string; border: string; text: string }> = {
  info: { icon: Info, bg: "bg-primary/10", border: "border-primary/30", text: "text-primary" },
  warning: { icon: AlertTriangle, bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-500" },
  important: { icon: AlertCircle, bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive" },
  update: { icon: Bell, bg: "bg-accent/10", border: "border-accent/30", text: "text-accent" },
};

const AnnouncementBanner = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = sessionStorage.getItem("dismissed_announcements");
    if (stored) setDismissed(new Set(JSON.parse(stored)));

    supabase
      .from("system_announcements")
      .select("id, title, content, type")
      .eq("is_active", true)
      .then(({ data }) => {
        if (data) setAnnouncements(data);
      });
  }, []);

  const dismiss = (id: string) => {
    const next = new Set(dismissed).add(id);
    setDismissed(next);
    sessionStorage.setItem("dismissed_announcements", JSON.stringify([...next]));
  };

  const visible = announcements.filter((a) => !dismissed.has(a.id));
  if (!visible.length) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-40 space-y-1">
      {visible.map((a) => {
        const cfg = typeConfig[a.type] || typeConfig.info;
        const Icon = cfg.icon;
        return (
          <div key={a.id} className={`${cfg.bg} ${cfg.border} border-b px-4 py-2.5`}>
            <div className="container mx-auto flex items-center gap-3">
              <Icon className={`w-4 h-4 shrink-0 ${cfg.text}`} />
              <div className="flex-1 min-w-0">
                <span className={`font-semibold text-sm ${cfg.text}`}>{a.title}</span>
                <span className="text-sm text-muted-foreground ml-2">{a.content}</span>
              </div>
              <button onClick={() => dismiss(a.id)} className="shrink-0 p-1 rounded hover:bg-foreground/10 transition-colors">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AnnouncementBanner;
