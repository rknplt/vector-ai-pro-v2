import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Ban, ShieldCheck } from "lucide-react";

interface UserSuspensionDialogProps {
  userId: string;
  userName: string;
  currentStatus: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const UserSuspensionDialog = ({
  userId,
  userName,
  currentStatus,
  isOpen,
  onClose,
  onUpdated,
}: UserSuspensionDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState(currentStatus || "active");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);

    // Upsert user_settings
    const { error } = await supabase
      .from("user_settings")
      .update({
        account_status: status,
        suspension_reason: status !== "active" ? reason : null,
      })
      .eq("user_id", userId);

    if (error) {
      // If no row exists, insert
      const { error: insertError } = await supabase.from("user_settings").insert({
        user_id: userId,
        account_status: status,
        suspension_reason: status !== "active" ? reason : null,
      });

      if (insertError) {
        toast({ title: "Hata", description: "Durum güncellenemedi.", variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    // Log audit
    await supabase.from("audit_logs").insert({
      admin_id: user?.id,
      action: "user_status_changed",
      target_type: "user_settings",
      target_id: userId,
      details: { status, reason: status !== "active" ? reason : null, user_name: userName },
    } as never);

    toast({ title: "Başarılı", description: `Kullanıcı durumu "${status}" olarak güncellendi.` });
    setSaving(false);
    onUpdated();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass-card border-border/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-destructive" />
            Hesap Durumu Yönetimi
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Kullanıcı</p>
            <p className="font-medium">{userName}</p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Hesap Durumu</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-green-500" /> Aktif
                  </span>
                </SelectItem>
                <SelectItem value="suspended">
                  <span className="flex items-center gap-2">
                    <Ban className="w-4 h-4 text-yellow-500" /> Askıya Alındı
                  </span>
                </SelectItem>
                <SelectItem value="banned">
                  <span className="flex items-center gap-2">
                    <Ban className="w-4 h-4 text-red-500" /> Engellendi
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {status !== "active" && (
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Sebep</label>
              <Textarea
                placeholder="Askıya alma / engelleme sebebi..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={onClose}>İptal</Button>
            <Button
              onClick={handleSave}
              disabled={saving || (status !== "active" && !reason.trim())}
              variant={status !== "active" ? "destructive" : "default"}
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserSuspensionDialog;
