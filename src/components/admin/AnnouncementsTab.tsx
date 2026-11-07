import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Eye, EyeOff, Megaphone, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  expires_at: string | null;
}

const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
  info: { label: "Bilgi", icon: Info, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  warning: { label: "Uyarı", icon: AlertTriangle, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  success: { label: "Başarılı", icon: CheckCircle, color: "bg-green-500/20 text-green-400 border-green-500/30" },
  important: { label: "Önemli", icon: Megaphone, color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const AnnouncementsTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState("info");
  const [newExpiresIn, setNewExpiresIn] = useState("0");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from("system_announcements")
      .select("*")
      .order("created_at", { ascending: false });
    setAnnouncements((data as Announcement[]) || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setCreating(true);

    const expiresAt = newExpiresIn !== "0"
      ? new Date(Date.now() + parseInt(newExpiresIn) * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { error } = await supabase.from("system_announcements").insert({
      title: newTitle,
      content: newContent,
      type: newType,
      created_by: user?.id,
      expires_at: expiresAt,
    } as any);

    if (error) {
      toast({ title: "Hata", description: "Duyuru oluşturulamadı.", variant: "destructive" });
    } else {
      toast({ title: "Başarılı", description: "Duyuru yayınlandı." });
      setCreateOpen(false);
      setNewTitle("");
      setNewContent("");
      setNewType("info");
      setNewExpiresIn("0");
      fetchAnnouncements();
    }
    setCreating(false);
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    await supabase.from("system_announcements").update({ is_active: !currentActive } as any).eq("id", id);
    fetchAnnouncements();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("system_announcements").delete().eq("id", id);
    toast({ title: "Başarılı", description: "Duyuru silindi." });
    fetchAnnouncements();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6 border border-border/30">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Sistem Duyuruları</h2>
          <p className="text-sm text-muted-foreground">Tüm kullanıcılara duyuru yayınlayın</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Yeni Duyuru
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-border/30">
            <DialogHeader>
              <DialogTitle>Yeni Duyuru Oluştur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Duyuru başlığı"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <Textarea
                placeholder="Duyuru içeriği..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={4}
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Tür</label>
                  <Select value={newType} onValueChange={setNewType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeConfig).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Süre</label>
                  <Select value={newExpiresIn} onValueChange={setNewExpiresIn}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Süresiz</SelectItem>
                      <SelectItem value="1">1 Gün</SelectItem>
                      <SelectItem value="3">3 Gün</SelectItem>
                      <SelectItem value="7">7 Gün</SelectItem>
                      <SelectItem value="30">30 Gün</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreate} disabled={creating || !newTitle.trim() || !newContent.trim()} className="w-full">
                {creating ? "Oluşturuluyor..." : "Duyuru Yayınla"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {announcements.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>Henüz duyuru yok</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => {
            const cfg = typeConfig[a.type] || typeConfig.info;
            const Icon = cfg.icon;
            return (
              <Card key={a.id} className={`p-4 border-border/30 ${!a.is_active ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${cfg.color} shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{a.title}</h3>
                        <Badge variant={a.is_active ? "default" : "secondary"} className="shrink-0">
                          {a.is_active ? "Aktif" : "Pasif"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{a.content}</p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{format(new Date(a.created_at), "dd MMM yyyy, HH:mm", { locale: tr })}</span>
                        {a.expires_at && (
                          <span>Bitiş: {format(new Date(a.expires_at), "dd MMM yyyy", { locale: tr })}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleActive(a.id, a.is_active)}
                      title={a.is_active ? "Pasif yap" : "Aktif yap"}
                    >
                      {a.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(a.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AnnouncementsTab;
