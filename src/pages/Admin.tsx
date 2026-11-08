import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Zap,
  Cpu,
  Users,
  Ticket,
  Settings,
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  Check,
  Crown,
  Shield,
  RefreshCw,
  Save,
  Globe,
  MessageSquare,
  Mail,
  Bell,
  Lock,
  History,
  BarChart3,
  Megaphone,
  Ban,
  HeartPulse,
  Search,
  Calendar,
  Filter,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import UserDetailsModal from "@/components/admin/UserDetailsModal";
import UserSettingsModal from "@/components/admin/UserSettingsModal";
import AIModelsTab from "@/components/admin/AIModelsTab";
import DashboardTab from "@/components/admin/DashboardTab";
import AnnouncementsTab from "@/components/admin/AnnouncementsTab";
import UserSuspensionDialog from "@/components/admin/UserSuspensionDialog";
import SystemHealthTab from "@/components/admin/SystemHealthTab";
import ContactMessagesTab from "@/components/admin/ContactMessagesTab";

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

interface InviteCode {
  id: string;
  code: string;
  plan_granted: "free" | "plus";
  is_used: boolean;
  used_by: string | null;
  created_at: string;
  expires_at: string | null;
}

interface AppSettings {
  site_name: string;
  site_description: string;
  maintenance_mode: boolean;
  allow_registration: boolean;
  welcome_message: string;
  contact_email: string;
  enable_notifications: boolean;
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

const Admin = () => {
  const { user, isLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [createCodeOpen, setCreateCodeOpen] = useState(false);
  const [newCodePlan, setNewCodePlan] = useState<"plus">("plus");
  const [selectedCodeIds, setSelectedCodeIds] = useState<Set<string>>(new Set());
  const [expiresIn, setExpiresIn] = useState<string>("7");
  const [settings, setSettings] = useState<AppSettings>({
    site_name: "Vector AI Pro",
    site_description: "Yapay zeka destekli asistan",
    maintenance_mode: false,
    allow_registration: true,
    welcome_message: "Vector AI Pro'ya hoş geldiniz!",
    contact_email: "",
    enable_notifications: true,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [creatingCode, setCreatingCode] = useState(false);
  const [serverVerified, setServerVerified] = useState(false);
  const [verifyingAdmin, setVerifyingAdmin] = useState(true);
  
  // User filters
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userPlanFilter, setUserPlanFilter] = useState<string>("all");
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(10);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [settingsUser, setSettingsUser] = useState<Profile | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [suspensionUser, setSuspensionUser] = useState<Profile | null>(null);
  
  // Audit log filters
  const [auditSearchTerm, setAuditSearchTerm] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState<string>("all");
  const [auditAdminFilter, setAuditAdminFilter] = useState<string>("all");
  const [auditStartDate, setAuditStartDate] = useState<Date | undefined>(undefined);
  const [auditEndDate, setAuditEndDate] = useState<Date | undefined>(undefined);
  const [auditCurrentPage, setAuditCurrentPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);
  
  // Filtered users
  const filteredUsers = profiles.filter(profile => {
    // Search filter
    const searchLower = userSearchTerm.toLowerCase();
    const matchesSearch = !userSearchTerm || 
      (profile.full_name?.toLowerCase().includes(searchLower)) ||
      (profile.email?.toLowerCase().includes(searchLower)) ||
      profile.user_id.toLowerCase().includes(searchLower);
    
    // Plan filter
    const matchesPlan = userPlanFilter === "all" || profile.plan === userPlanFilter;
    
    return matchesSearch && matchesPlan;
  });
  
  // User pagination
  const userTotalPages = Math.ceil(filteredUsers.length / userPageSize);
  const paginatedUsers = filteredUsers.slice(
    (userCurrentPage - 1) * userPageSize,
    userCurrentPage * userPageSize
  );

  // Get activity logs for selected user
  const selectedUserActivity = useMemo(() => {
    if (!selectedUser) return [];
    return auditLogs.filter(
      (log) => 
        log.target_id === selectedUser.user_id || 
        (log.target_type === "profiles" && log.details?.email === selectedUser.email)
    );
  }, [selectedUser, auditLogs]);
  
  // Reset page when filters change
  useEffect(() => {
    setUserCurrentPage(1);
  }, [userSearchTerm, userPlanFilter]);
  
  const hasActiveUserFilters = userSearchTerm || userPlanFilter !== "all";
  
  const clearUserFilters = () => {
    setUserSearchTerm("");
    setUserPlanFilter("all");
    setUserCurrentPage(1);
  };

  // User bulk selection
  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleAllUsers = () => {
    if (selectedUserIds.size === paginatedUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(paginatedUsers.map(p => p.user_id)));
    }
  };

  const handleBulkUpdatePlan = async (plan: "free" | "plus") => {
    if (selectedUserIds.size === 0) return;
    const ids = Array.from(selectedUserIds);
    for (const uid of ids) {
      await handleUpdateUserPlan(uid, plan);
    }
    setSelectedUserIds(new Set());
  };

  // Audit logging helper
  const logAuditAction = async (
    action: string,
    targetType: string,
    targetId?: string,
    details?: Record<string, unknown>
  ) => {
    if (!user) return;
    
    // Using raw insert with explicit typing to work around type sync delay
    await supabase.from("audit_logs").insert({
      admin_id: user.id,
      action,
      target_type: targetType,
      target_id: targetId || null,
      details: details || null,
    } as never);
  };

  // Server-side admin verification
  useEffect(() => {
    const verifyAdminServerSide = async () => {
      if (!user) {
        setVerifyingAdmin(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setVerifyingAdmin(false);
          return;
        }

        let verified = false;

        // 1. Try server edge function
        try {
          const response = await supabase.functions.invoke("verify-admin");
          if (!response.error && response.data?.isAdmin) {
            verified = true;
          } else if (response.error) {
            console.warn("verify-admin edge function invoke notice:", response.error);
          }
        } catch (fnErr) {
          console.warn("verify-admin invocation failed, falling back to database check:", fnErr);
        }

        // 2. Fallback to direct DB query with active user session (e.g. Capacitor mobile or edge function offline)
        if (!verified) {
          const { data: roleData, error: roleError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .maybeSingle();

          if (!roleError && roleData?.role === "admin") {
            verified = true;
          }
        }

        setServerVerified(verified);
      } catch (error) {
        console.error("Admin verification failed:", error);
        setServerVerified(false);
      } finally {
        setVerifyingAdmin(false);
      }
    };

    if (!isLoading && user) {
      verifyAdminServerSide();
    } else if (!isLoading && !user) {
      setVerifyingAdmin(false);
    }
  }, [user, isLoading]);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
      return;
    }

    // Wait for server verification to complete
    if (verifyingAdmin) {
      return;
    }

    // Allow access if verified by either edge function or authenticated user_roles check
    if (!isLoading && user && !serverVerified && !isAdmin) {
      toast({
        title: "Erişim Reddedildi",
        description: "Bu sayfaya erişim yetkiniz yok.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    if (!isLoading && (serverVerified || isAdmin)) {
      fetchData();
    }
  }, [user, isLoading, isAdmin, serverVerified, verifyingAdmin, navigate]);

  const fetchData = async () => {
    setLoadingData(true);
    
    const [profilesRes, codesRes, settingsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("invite_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("app_settings").select("*"),
    ]);

    // Fetch audit logs separately to avoid type issues until types sync
    const auditRes = await (supabase as unknown as { from: (table: string) => { select: (cols: string) => { order: (col: string, opts: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: AuditLog[] | null }> } } } }).from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100);

    if (profilesRes.data) setProfiles(profilesRes.data);
    if (codesRes.data) setInviteCodes(codesRes.data);
    if (auditRes.data) setAuditLogs(auditRes.data);
    
    if (settingsRes.data && settingsRes.data.length > 0) {
      const loadedSettings: Partial<AppSettings> = {};
      settingsRes.data.forEach((setting) => {
        const key = setting.setting_key as keyof AppSettings;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (loadedSettings as any)[key] = setting.setting_value;
      });
      setSettings((prev) => ({ ...prev, ...loadedSettings }));
    }
    
    setLoadingData(false);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);

    const settingsToSave = Object.entries(settings).map(([key, value]) => ({
      setting_key: key,
      setting_value: value,
      updated_by: user?.id,
    }));

    for (const setting of settingsToSave) {
      const { error } = await supabase
        .from("app_settings")
        .upsert(
          { ...setting },
          { onConflict: "setting_key" }
        );

      if (error) {
        toast({
          title: "Hata",
          description: `${setting.setting_key} ayarı kaydedilemedi.`,
          variant: "destructive",
        });
        setSavingSettings(false);
        return;
      }
    }

    await logAuditAction("settings_updated", "app_settings", undefined, { settings });

    toast({
      title: "Başarılı",
      description: "Ayarlar kaydedildi.",
    });
    setSavingSettings(false);
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) code += "-";
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateCode = async () => {
    setCreatingCode(true);

    const code = generateCode();
    const expiresAt = expiresIn
      ? new Date(Date.now() + parseInt(expiresIn) * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data, error } = await supabase.from("invite_codes").insert({
      code,
      plan_granted: newCodePlan,
      expires_at: expiresAt,
      created_by: user?.id,
    }).select().single();

    if (error) {
      toast({
        title: "Hata",
        description: "Davet kodu oluşturulamadı.",
        variant: "destructive",
      });
    } else {
      await logAuditAction("invite_code_created", "invite_codes", data?.id, { 
        code, 
        plan_granted: newCodePlan,
        expires_at: expiresAt 
      });
      toast({
        title: "Başarılı",
        description: "Davet kodu oluşturuldu.",
      });
      setCreateCodeOpen(false);
      fetchData();
    }

    setCreatingCode(false);
  };

  const handleDeleteCode = async (id: string) => {
    const codeToDelete = inviteCodes.find(c => c.id === id);
    const { error } = await supabase.from("invite_codes").delete().eq("id", id);

    if (error) {
      toast({
        title: "Hata",
        description: "Davet kodu silinemedi.",
        variant: "destructive",
      });
    } else {
      await logAuditAction("invite_code_deleted", "invite_codes", id, { 
        code: codeToDelete?.code 
      });
      toast({
        title: "Başarılı",
        description: "Davet kodu silindi.",
      });
      fetchData();
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Bulk actions for invite codes
  const toggleCodeSelection = (codeId: string) => {
    setSelectedCodeIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(codeId)) {
        newSet.delete(codeId);
      } else {
        newSet.add(codeId);
      }
      return newSet;
    });
  };

  const toggleAllCodes = () => {
    if (selectedCodeIds.size === inviteCodes.length) {
      setSelectedCodeIds(new Set());
    } else {
      setSelectedCodeIds(new Set(inviteCodes.map(c => c.id)));
    }
  };

  const handleBulkCopyCodes = () => {
    const selectedCodes = inviteCodes
      .filter(c => selectedCodeIds.has(c.id) && !c.is_used)
      .map(c => c.code);
    
    if (selectedCodes.length === 0) {
      toast({
        title: "Uyarı",
        description: "Kopyalanacak aktif kod seçilmedi.",
        variant: "destructive",
      });
      return;
    }
    
    navigator.clipboard.writeText(selectedCodes.join("\n"));
    toast({
      title: "Başarılı",
      description: `${selectedCodes.length} kod panoya kopyalandı.`,
    });
  };

  const handleBulkDeleteCodes = async () => {
    const idsToDelete = Array.from(selectedCodeIds);
    
    if (idsToDelete.length === 0) {
      toast({
        title: "Uyarı",
        description: "Silinecek kod seçilmedi.",
        variant: "destructive",
      });
      return;
    }

    const codesToDelete = inviteCodes.filter(c => selectedCodeIds.has(c.id));
    
    const { error } = await supabase
      .from("invite_codes")
      .delete()
      .in("id", idsToDelete);

    if (error) {
      toast({
        title: "Hata",
        description: "Kodlar silinirken hata oluştu.",
        variant: "destructive",
      });
    } else {
      await logAuditAction("invite_codes_bulk_deleted", "invite_codes", null, { 
        count: idsToDelete.length,
        codes: codesToDelete.map(c => c.code)
      });
      toast({
        title: "Başarılı",
        description: `${idsToDelete.length} kod silindi.`,
      });
      setSelectedCodeIds(new Set());
      fetchData();
    }
  };

  const handleUpdateUserPlan = async (userId: string, newPlan: "free" | "plus") => {
    const profile = profiles.find(p => p.user_id === userId);
    const oldPlan = profile?.plan;
    
    const { error } = await supabase
      .from("profiles")
      .update({ plan: newPlan })
      .eq("user_id", userId);

    if (error) {
      toast({
        title: "Hata",
        description: "Kullanıcı planı güncellenemedi.",
        variant: "destructive",
      });
    } else {
      await logAuditAction("user_plan_changed", "profiles", userId, { 
        email: profile?.email,
        old_plan: oldPlan,
        new_plan: newPlan 
      });
      toast({
        title: "Başarılı",
        description: "Kullanıcı planı güncellendi.",
      });
      fetchData();
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      user_plan_changed: "Plan Değişikliği",
      invite_code_created: "Kod Oluşturuldu",
      invite_code_deleted: "Kod Silindi",
      settings_updated: "Ayarlar Güncellendi",
    };
    return labels[action] || action;
  };

  const getAdminEmail = (adminId: string) => {
    const profile = profiles.find(p => p.user_id === adminId);
    return profile?.email || adminId.slice(0, 8) + "...";
  };

  // Get unique action types from audit logs
  const uniqueActions = [...new Set(auditLogs.map(log => log.action))];
  
  // Get unique admin IDs from audit logs
  const uniqueAdmins = [...new Set(auditLogs.map(log => log.admin_id))];

  // Filter audit logs
  const filteredAuditLogs = auditLogs.filter(log => {
    // Search term filter
    if (auditSearchTerm) {
      const searchLower = auditSearchTerm.toLowerCase();
      const adminEmail = getAdminEmail(log.admin_id).toLowerCase();
      const actionLabel = getActionLabel(log.action).toLowerCase();
      const targetType = log.target_type.toLowerCase();
      const details = log.details ? JSON.stringify(log.details).toLowerCase() : "";
      
      if (!adminEmail.includes(searchLower) && 
          !actionLabel.includes(searchLower) && 
          !targetType.includes(searchLower) &&
          !details.includes(searchLower)) {
        return false;
      }
    }
    
    // Action type filter
    if (auditActionFilter !== "all" && log.action !== auditActionFilter) {
      return false;
    }
    
    // Admin filter
    if (auditAdminFilter !== "all" && log.admin_id !== auditAdminFilter) {
      return false;
    }
    
    // Date range filter
    const logDate = new Date(log.created_at);
    if (auditStartDate) {
      const startOfDay = new Date(auditStartDate);
      startOfDay.setHours(0, 0, 0, 0);
      if (logDate < startOfDay) return false;
    }
    if (auditEndDate) {
      const endOfDay = new Date(auditEndDate);
      endOfDay.setHours(23, 59, 59, 999);
      if (logDate > endOfDay) return false;
    }
    
    return true;
  });

  const clearAuditFilters = () => {
    setAuditSearchTerm("");
    setAuditActionFilter("all");
    setAuditAdminFilter("all");
    setAuditStartDate(undefined);
    setAuditEndDate(undefined);
    setAuditCurrentPage(1);
  };

  const hasActiveFilters = auditSearchTerm || auditActionFilter !== "all" || auditAdminFilter !== "all" || auditStartDate || auditEndDate;

  // Pagination calculations
  const totalPages = Math.ceil(filteredAuditLogs.length / auditPageSize);
  const paginatedAuditLogs = filteredAuditLogs.slice(
    (auditCurrentPage - 1) * auditPageSize,
    auditCurrentPage * auditPageSize
  );

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setAuditCurrentPage(1);
  };

  const sanitizeCSVCell = (value: string): string => {
    const str = String(value);
    if (/^[=+\-@|]/.test(str)) {
      return "'" + str;
    }
    return str;
  };

  const exportAuditLogsToCSV = () => {
    const headers = ["Tarih", "Admin", "İşlem", "Hedef Türü", "Hedef ID", "Detaylar"];
    
    const rows = filteredAuditLogs.map(log => [
      format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
      getAdminEmail(log.admin_id),
      getActionLabel(log.action),
      log.target_type,
      log.target_id || "",
      log.details ? JSON.stringify(log.details) : ""
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => {
        const sanitized = sanitizeCSVCell(String(cell));
        return `"${sanitized.replace(/"/g, '""')}"`;
      }).join(","))
    ].join("\n");
    
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `audit-logs-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Başarılı",
      description: `${filteredAuditLogs.length} kayıt CSV olarak dışa aktarıldı.`,
    });
  };

  if (isLoading || verifyingAdmin || (user && serverVerified && loadingData)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render admin UI until server verification is complete and successful
  if (!serverVerified) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass-card border-b border-border/30 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">Admin Panel</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Yenile
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="glass-card p-1 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Kullanıcılar
            </TabsTrigger>
            <TabsTrigger value="invites" className="gap-2">
              <Ticket className="w-4 h-4" />
              Davet Kodları
            </TabsTrigger>
            <TabsTrigger value="announcements" className="gap-2">
              <Megaphone className="w-4 h-4" />
              Duyurular
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Ayarlar
            </TabsTrigger>
            <TabsTrigger value="ai-models" className="gap-2">
              <Cpu className="w-4 h-4" />
              AI Modelleri
            </TabsTrigger>
            <TabsTrigger value="health" className="gap-2">
              <HeartPulse className="w-4 h-4" />
              Sistem Sağlığı
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <Mail className="w-4 h-4" />
              Mesajlar
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <History className="w-4 h-4" />
              Denetim Günlüğü
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <DashboardTab />
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements">
            <AnnouncementsTab />
          </TabsContent>

          {/* System Health Tab */}
          <TabsContent value="health">
            <SystemHealthTab />
          </TabsContent>

          {/* Contact Messages Tab */}
          <TabsContent value="messages">
            <ContactMessagesTab />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="glass-card rounded-2xl p-6 border border-border/30">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Kullanıcı Yönetimi</h2>
                <p className="text-sm text-muted-foreground">
                  {filteredUsers.length} / {profiles.length} kullanıcı
                </p>
              </div>
              
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-6">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="İsim veya e-posta ile ara..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="pl-10 bg-secondary/50"
                  />
                </div>
                
                {/* Plan Filter */}
                <Select value={userPlanFilter} onValueChange={setUserPlanFilter}>
                  <SelectTrigger className="w-[140px] bg-secondary/50">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Planlar</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="plus">Plus</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Clear Filters */}
                {hasActiveUserFilters && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearUserFilters}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Filtreleri Temizle
                  </Button>
                )}
              </div>

              {/* Bulk Actions */}
              {selectedUserIds.size > 0 && (
                <div className="flex items-center gap-3 mb-4 p-3 bg-primary/10 border border-primary/20 rounded-xl">
                  <span className="text-sm font-medium">{selectedUserIds.size} kullanıcı seçildi</span>
                  <Button size="sm" variant="outline" onClick={() => handleBulkUpdatePlan("plus")}>
                    <Crown className="w-3 h-3 mr-1" />
                    Plus Yap
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkUpdatePlan("free")}>
                    Free Yap
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedUserIds(new Set())}>
                    <X className="w-3 h-3 mr-1" />
                    Seçimi Kaldır
                  </Button>
                </div>
              )}
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={paginatedUsers.length > 0 && selectedUserIds.size === paginatedUsers.length}
                          onCheckedChange={toggleAllUsers}
                        />
                      </TableHead>
                      <TableHead>Kullanıcı</TableHead>
                      <TableHead>E-posta</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Kayıt Tarihi</TableHead>
                      <TableHead>İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.map((profile) => (
                      <TableRow 
                        key={profile.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedUser(profile)}
                        data-state={selectedUserIds.has(profile.user_id) ? "selected" : undefined}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedUserIds.has(profile.user_id)}
                            onCheckedChange={() => toggleUserSelection(profile.user_id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {profile.full_name || "-"}
                        </TableCell>
                        <TableCell>{profile.email}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              profile.plan === "plus"
                                ? "bg-primary/20 text-primary"
                                : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {profile.plan === "plus" && <Crown className="w-3 h-3" />}
                            {profile.plan === "plus" ? "Plus" : "Free"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {format(new Date(profile.created_at), "dd MMM yyyy", {
                            locale: tr,
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUser(profile);
                              }}
                              title="Detayları Görüntüle"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSettingsUser(profile);
                              }}
                              title="Kullanıcı Ayarları"
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSuspensionUser(profile);
                              }}
                              title="Hesap Durumu"
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateUserPlan(
                                  profile.user_id,
                                  profile.plan === "plus" ? "free" : "plus"
                                );
                              }}
                            >
                              {profile.plan === "plus" ? "Free Yap" : "Plus Yap"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {paginatedUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          {hasActiveUserFilters ? "Filtrelere uygun kullanıcı bulunamadı" : "Henüz kullanıcı yok"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              {filteredUsers.length > 0 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Sayfa başına:</span>
                    <Select 
                      value={userPageSize.toString()} 
                      onValueChange={(val) => {
                        setUserPageSize(Number(val));
                        setUserCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[70px] h-8 bg-secondary/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground mr-2">
                      {(userCurrentPage - 1) * userPageSize + 1}-{Math.min(userCurrentPage * userPageSize, filteredUsers.length)} / {filteredUsers.length}
                    </span>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setUserCurrentPage(1)}
                      disabled={userCurrentPage === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setUserCurrentPage(p => Math.max(1, p - 1))}
                      disabled={userCurrentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <span className="text-sm px-2">
                      Sayfa {userCurrentPage} / {userTotalPages || 1}
                    </span>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setUserCurrentPage(p => Math.min(userTotalPages, p + 1))}
                      disabled={userCurrentPage >= userTotalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setUserCurrentPage(userTotalPages)}
                      disabled={userCurrentPage >= userTotalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Invite Codes Tab */}
          <TabsContent value="invites">
            <div className="glass-card rounded-2xl p-6 border border-border/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold">Davet Kodları</h2>
                  {selectedCodeIds.size > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {selectedCodeIds.size} seçili
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Bulk Actions */}
                  {selectedCodeIds.size > 0 && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleBulkCopyCodes}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Kopyala ({selectedCodeIds.size})
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleBulkDeleteCodes}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Sil ({selectedCodeIds.size})
                      </Button>
                    </>
                  )}
                  <Dialog open={createCodeOpen} onOpenChange={setCreateCodeOpen}>
                    <DialogTrigger asChild>
                      <Button variant="hero" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Yeni Kod
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-card border-border/30">
                      <DialogHeader>
                        <DialogTitle>Yeni Davet Kodu</DialogTitle>
                        <DialogDescription>
                          Plus plan için tek kullanımlık davet kodu oluşturun.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Geçerlilik Süresi (gün)</Label>
                          <Input
                            type="number"
                            value={expiresIn}
                            onChange={(e) => setExpiresIn(e.target.value)}
                            placeholder="7"
                            className="bg-secondary/50"
                          />
                          <p className="text-sm text-muted-foreground">
                            Boş bırakırsanız süresiz geçerli olur.
                          </p>
                        </div>
                        <Button
                          variant="hero"
                          className="w-full"
                          onClick={handleCreateCode}
                          disabled={creatingCode}
                        >
                          {creatingCode ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></div>
                          ) : (
                            "Oluştur"
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={inviteCodes.length > 0 && selectedCodeIds.size === inviteCodes.length}
                          onCheckedChange={toggleAllCodes}
                          aria-label="Tümünü seç"
                        />
                      </TableHead>
                      <TableHead>Kod</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Oluşturulma</TableHead>
                      <TableHead>Son Kullanma</TableHead>
                      <TableHead>İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inviteCodes.map((code) => (
                      <TableRow 
                        key={code.id}
                        className={selectedCodeIds.has(code.id) ? "bg-muted/30" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedCodeIds.has(code.id)}
                            onCheckedChange={() => toggleCodeSelection(code.id)}
                            aria-label={`${code.code} kodunu seç`}
                          />
                        </TableCell>
                        <TableCell className="font-mono">{code.code}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                            <Crown className="w-3 h-3" />
                            Plus
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              code.is_used
                                ? "bg-muted text-muted-foreground"
                                : "bg-success/20 text-success"
                            }`}
                          >
                            {code.is_used ? "Kullanıldı" : "Aktif"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {format(new Date(code.created_at), "dd MMM yyyy", {
                            locale: tr,
                          })}
                        </TableCell>
                        <TableCell>
                          {code.expires_at
                            ? format(new Date(code.expires_at), "dd MMM yyyy", {
                                locale: tr,
                              })
                            : "Süresiz"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopyCode(code.code)}
                              disabled={code.is_used}
                            >
                              {copiedCode === code.code ? (
                                <Check className="w-4 h-4 text-success" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCode(code.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {inviteCodes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          Henüz davet kodu yok
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6">
              {/* General Settings */}
              <div className="glass-card rounded-2xl p-6 border border-border/30">
                <div className="flex items-center gap-3 mb-6">
                  <Globe className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold">Genel Ayarlar</h2>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="site_name">Site Adı</Label>
                    <Input
                      id="site_name"
                      value={settings.site_name}
                      onChange={(e) => updateSetting("site_name", e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">İletişim E-postası</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={settings.contact_email}
                      onChange={(e) => updateSetting("contact_email", e.target.value)}
                      className="bg-secondary/50"
                      placeholder="ornek@email.com"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="site_description">Site Açıklaması</Label>
                    <Textarea
                      id="site_description"
                      value={settings.site_description}
                      onChange={(e) => updateSetting("site_description", e.target.value)}
                      className="bg-secondary/50 min-h-[80px]"
                    />
                  </div>
                </div>
              </div>

              {/* Welcome Message */}
              <div className="glass-card rounded-2xl p-6 border border-border/30">
                <div className="flex items-center gap-3 mb-6">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold">Karşılama Mesajı</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="welcome_message">Hoş Geldin Mesajı</Label>
                  <Textarea
                    id="welcome_message"
                    value={settings.welcome_message}
                    onChange={(e) => updateSetting("welcome_message", e.target.value)}
                    className="bg-secondary/50 min-h-[100px]"
                    placeholder="Kullanıcıları karşılamak için bir mesaj yazın..."
                  />
                  <p className="text-sm text-muted-foreground">
                    Bu mesaj yeni kullanıcılara gösterilir.
                  </p>
                </div>
              </div>

              {/* Security & Access */}
              <div className="glass-card rounded-2xl p-6 border border-border/30">
                <div className="flex items-center gap-3 mb-6">
                  <Lock className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold">Güvenlik ve Erişim</h2>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Bakım Modu</Label>
                      <p className="text-sm text-muted-foreground">
                        Aktif olduğunda sadece adminler siteye erişebilir.
                      </p>
                    </div>
                    <Switch
                      checked={settings.maintenance_mode}
                      onCheckedChange={(checked) => updateSetting("maintenance_mode", checked)}
                    />
                  </div>
                  <div className="border-t border-border/30" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Kayıt İzni</Label>
                      <p className="text-sm text-muted-foreground">
                        Yeni kullanıcıların kayıt olmasına izin ver.
                      </p>
                    </div>
                    <Switch
                      checked={settings.allow_registration}
                      onCheckedChange={(checked) => updateSetting("allow_registration", checked)}
                    />
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div className="glass-card rounded-2xl p-6 border border-border/30">
                <div className="flex items-center gap-3 mb-6">
                  <Bell className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold">Bildirimler</h2>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Bildirimleri Etkinleştir</Label>
                    <p className="text-sm text-muted-foreground">
                      E-posta ve uygulama içi bildirimler gönder.
                    </p>
                  </div>
                  <Switch
                    checked={settings.enable_notifications}
                    onCheckedChange={(checked) => updateSetting("enable_notifications", checked)}
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button
                  variant="hero"
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="min-w-[140px]"
                >
                  {savingSettings ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Kaydet
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* AI Models Tab */}
          <TabsContent value="ai-models">
            <AIModelsTab />
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="audit">
            <div className="glass-card rounded-2xl p-6 border border-border/30">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Denetim Günlüğü</h2>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    {filteredAuditLogs.length} / {auditLogs.length} kayıt
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={exportAuditLogsToCSV}
                    disabled={filteredAuditLogs.length === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    CSV İndir
                  </Button>
                </div>
              </div>
              
              {/* Filters */}
              <div className="space-y-4 mb-6">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Ara... (admin, işlem, hedef, detaylar)"
                    value={auditSearchTerm}
                    onChange={(e) => setAuditSearchTerm(e.target.value)}
                    className="pl-10 bg-secondary/50"
                  />
                </div>
                
                {/* Filter Row */}
                <div className="flex flex-wrap gap-3">
                  {/* Action Type Filter */}
                  <Select value={auditActionFilter} onValueChange={setAuditActionFilter}>
                    <SelectTrigger className="w-[180px] bg-secondary/50">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="İşlem Türü" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm İşlemler</SelectItem>
                      {uniqueActions.map(action => (
                        <SelectItem key={action} value={action}>
                          {getActionLabel(action)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Admin Filter */}
                  <Select value={auditAdminFilter} onValueChange={setAuditAdminFilter}>
                    <SelectTrigger className="w-[200px] bg-secondary/50">
                      <Users className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Admin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Adminler</SelectItem>
                      {uniqueAdmins.map(adminId => (
                        <SelectItem key={adminId} value={adminId}>
                          {getAdminEmail(adminId)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Start Date Picker */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[160px] justify-start bg-secondary/50">
                        <Calendar className="w-4 h-4 mr-2" />
                        {auditStartDate ? format(auditStartDate, "dd MMM yyyy", { locale: tr }) : "Başlangıç"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={auditStartDate}
                        onSelect={setAuditStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  {/* End Date Picker */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[160px] justify-start bg-secondary/50">
                        <Calendar className="w-4 h-4 mr-2" />
                        {auditEndDate ? format(auditEndDate, "dd MMM yyyy", { locale: tr }) : "Bitiş"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={auditEndDate}
                        onSelect={setAuditEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  {/* Clear Filters */}
                  {hasActiveFilters && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearAuditFilters}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Filtreleri Temizle
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>İşlem</TableHead>
                      <TableHead>Hedef</TableHead>
                      <TableHead>Detaylar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAuditLogs.map((log) => (
                      <TableRow 
                        key={log.id} 
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedAuditLog(log)}
                      >
                        <TableCell className="text-sm">
                          {format(new Date(log.created_at), "dd MMM yyyy HH:mm", {
                            locale: tr,
                          })}
                        </TableCell>
                        <TableCell className="text-sm">
                          {getAdminEmail(log.admin_id)}
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                            {getActionLabel(log.action)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.target_type}
                          {log.target_id && (
                            <span className="ml-1 font-mono text-xs">
                              ({log.target_id.slice(0, 8)}...)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">
                          {log.details ? (
                            <span className="font-mono text-xs text-muted-foreground">
                              {JSON.stringify(log.details).slice(0, 50)}...
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {paginatedAuditLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          {hasActiveFilters ? "Filtrelere uygun kayıt bulunamadı" : "Henüz denetim kaydı yok"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              {filteredAuditLogs.length > 0 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Sayfa başına:</span>
                    <Select 
                      value={auditPageSize.toString()} 
                      onValueChange={(val) => {
                        setAuditPageSize(Number(val));
                        setAuditCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[70px] h-8 bg-secondary/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground mr-2">
                      {(auditCurrentPage - 1) * auditPageSize + 1}-{Math.min(auditCurrentPage * auditPageSize, filteredAuditLogs.length)} / {filteredAuditLogs.length}
                    </span>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setAuditCurrentPage(1)}
                      disabled={auditCurrentPage === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setAuditCurrentPage(p => Math.max(1, p - 1))}
                      disabled={auditCurrentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <span className="text-sm px-2">
                      Sayfa {auditCurrentPage} / {totalPages || 1}
                    </span>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setAuditCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={auditCurrentPage >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setAuditCurrentPage(totalPages)}
                      disabled={auditCurrentPage >= totalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Audit Log Details Modal */}
      <Dialog open={!!selectedAuditLog} onOpenChange={(open) => !open && setSelectedAuditLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Denetim Kaydı Detayları
            </DialogTitle>
            <DialogDescription>
              İşlem hakkında detaylı bilgiler
            </DialogDescription>
          </DialogHeader>
          
          {selectedAuditLog && (
            <div className="space-y-4 mt-4">
              {/* Basic Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Kayıt ID</Label>
                  <p className="font-mono text-sm bg-secondary/50 p-2 rounded">{selectedAuditLog.id}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tarih ve Saat</Label>
                  <p className="text-sm bg-secondary/50 p-2 rounded">
                    {format(new Date(selectedAuditLog.created_at), "dd MMMM yyyy, HH:mm:ss", { locale: tr })}
                  </p>
                </div>
              </div>

              {/* Admin Info */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Admin</Label>
                <div className="bg-secondary/50 p-3 rounded space-y-1">
                  <p className="text-sm font-medium">{getAdminEmail(selectedAuditLog.admin_id)}</p>
                  <p className="font-mono text-xs text-muted-foreground">{selectedAuditLog.admin_id}</p>
                </div>
              </div>

              {/* Action */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">İşlem</Label>
                <div className="bg-secondary/50 p-3 rounded">
                  <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-primary/20 text-primary">
                    {getActionLabel(selectedAuditLog.action)}
                  </span>
                  <span className="ml-2 font-mono text-xs text-muted-foreground">({selectedAuditLog.action})</span>
                </div>
              </div>

              {/* Target */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Hedef Türü</Label>
                  <p className="text-sm bg-secondary/50 p-2 rounded">{selectedAuditLog.target_type}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Hedef ID</Label>
                  <p className="font-mono text-sm bg-secondary/50 p-2 rounded">
                    {selectedAuditLog.target_id || "-"}
                  </p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Detaylar (JSON)</Label>
                <div className="bg-secondary/50 p-3 rounded">
                  {selectedAuditLog.details ? (
                    <pre className="font-mono text-xs overflow-x-auto whitespace-pre-wrap break-words">
                      {JSON.stringify(selectedAuditLog.details, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Detay bilgisi yok</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* User Details Modal */}
      <UserDetailsModal
        user={selectedUser}
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        userActivity={selectedUserActivity}
        getAdminEmail={getAdminEmail}
      />

      {/* User Settings Modal */}
      <UserSettingsModal
        userId={settingsUser?.user_id || null}
        userName={settingsUser?.full_name || settingsUser?.email || "Kullanıcı"}
        isOpen={!!settingsUser}
        onClose={() => setSettingsUser(null)}
        onSaved={() => {
          fetchData();
          setSettingsUser(null);
        }}
      />

      {/* User Suspension Dialog */}
      {suspensionUser && (
        <UserSuspensionDialog
          userId={suspensionUser.user_id}
          userName={suspensionUser.full_name || suspensionUser.email || "Kullanıcı"}
          currentStatus="active"
          isOpen={!!suspensionUser}
          onClose={() => setSuspensionUser(null)}
          onUpdated={() => {
            fetchData();
            setSuspensionUser(null);
          }}
        />
      )}
    </div>
  );
};

export default Admin;
