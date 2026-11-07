import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Mail, 
  Calendar, 
  Crown, 
  Clock, 
  Activity,
  Shield
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url?: string | null;
  plan: "free" | "plus";
  created_at: string;
  updated_at?: string;
}

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any;
  created_at: string;
}

interface UserDetailsModalProps {
  user: Profile | null;
  isOpen: boolean;
  onClose: () => void;
  userActivity: AuditLog[];
  getAdminEmail: (adminId: string) => string;
}

const getActionLabel = (action: string) => {
  const labels: Record<string, string> = {
    user_plan_changed: "Plan Değişikliği",
    invite_code_created: "Kod Oluşturuldu",
    invite_code_deleted: "Kod Silindi",
    invite_codes_bulk_deleted: "Toplu Kod Silindi",
    settings_updated: "Ayarlar Güncellendi",
  };
  return labels[action] || action;
};

const UserDetailsModal = ({
  user,
  isOpen,
  onClose,
  userActivity,
  getAdminEmail,
}: UserDetailsModalProps) => {
  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass-card border-border/30 max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Kullanıcı Detayları
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-100px)]">
          <div className="space-y-6 pr-4">
            {/* Profile Card */}
            <div className="bg-secondary/30 rounded-xl p-6 space-y-4">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center shrink-0">
                  {user.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt={user.full_name || "User"} 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-primary-foreground" />
                  )}
                </div>

                {/* Basic Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold truncate">
                      {user.full_name || "İsimsiz Kullanıcı"}
                    </h3>
                    <Badge 
                      variant={user.plan === "plus" ? "default" : "secondary"}
                      className={user.plan === "plus" ? "bg-primary/20 text-primary border-primary/30" : ""}
                    >
                      {user.plan === "plus" && <Crown className="w-3 h-3 mr-1" />}
                      {user.plan === "plus" ? "Plus" : "Free"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    {user.email || "E-posta yok"}
                  </p>
                </div>
              </div>

              <Separator className="bg-border/30" />

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Kayıt Tarihi
                  </p>
                  <p className="font-medium">
                    {format(new Date(user.created_at), "dd MMMM yyyy, HH:mm", { locale: tr })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Güncelleme
                  </p>
                  <p className="font-medium">
                    {user.updated_at 
                      ? format(new Date(user.updated_at), "dd MMMM yyyy, HH:mm", { locale: tr })
                      : "-"
                    }
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Kullanıcı ID
                  </p>
                  <p className="font-mono text-xs bg-secondary/50 px-2 py-1 rounded inline-block">
                    {user.user_id}
                  </p>
                </div>
              </div>
            </div>

            {/* Activity History */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-primary" />
                <h4 className="font-semibold">Aktivite Geçmişi</h4>
                <Badge variant="secondary" className="ml-auto">
                  {userActivity.length} kayıt
                </Badge>
              </div>

              {userActivity.length > 0 ? (
                <div className="space-y-3">
                  {userActivity.map((log) => (
                    <div 
                      key={log.id} 
                      className="bg-secondary/20 rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          {getActionLabel(log.action)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "dd MMM yyyy, HH:mm", { locale: tr })}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Yapan: </span>
                        <span className="font-medium">{getAdminEmail(log.admin_id)}</span>
                      </div>
                      {log.details && (
                        <div className="text-xs font-mono bg-secondary/30 rounded p-2 mt-2 break-all">
                          {typeof log.details === "object" 
                            ? JSON.stringify(log.details, null, 2)
                            : String(log.details)
                          }
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground bg-secondary/20 rounded-lg">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Bu kullanıcıyla ilgili aktivite kaydı yok</p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailsModal;
