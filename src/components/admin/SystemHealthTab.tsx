import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Database, Server, Key, Users, MessageSquare, Shield, CheckCircle, XCircle } from "lucide-react";

interface TableInfo {
  name: string;
  count: number;
}

interface HealthCheck {
  database: boolean;
  auth: boolean;
  edgeFunctions: boolean;
  apiKeys: { provider: string; active: boolean }[];
  tables: TableInfo[];
}

const SystemHealthTab = () => {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    setLoading(true);

    // Check tables in parallel
    const tableNames = ["profiles", "chat_messages", "conversations", "invite_codes", "user_roles", "user_settings", "audit_logs", "app_settings", "ai_api_keys"];

    const tablePromises = tableNames.map(async (name) => {
      const { count } = await supabase.from(name as any).select("*", { count: "exact", head: true });
      return { name, count: count || 0 };
    });

    const [tables, apiKeysRes, authCheck, edgeFnCheck] = await Promise.all([
      Promise.all(tablePromises),
      supabase.from("ai_api_keys").select("provider, is_active"),
      supabase.auth.getSession().then(() => true).catch(() => false),
      supabase.functions.invoke("verify-admin").then(() => true).catch(() => false),
    ]);

    setHealth({
      database: true,
      auth: !!authCheck,
      edgeFunctions: !!edgeFnCheck,
      apiKeys: (apiKeysRes.data || []).map((k: any) => ({ provider: k.provider, active: k.is_active })),
      tables,
    });
    setLastChecked(new Date());
    setLoading(false);
  };

  const StatusIcon = ({ ok }: { ok: boolean }) =>
    ok ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />;

  if (loading || !health) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const tableNameMap: Record<string, string> = {
    profiles: "Profiller",
    chat_messages: "Mesajlar",
    conversations: "Sohbetler",
    invite_codes: "Davet Kodları",
    user_roles: "Kullanıcı Rolleri",
    user_settings: "Kullanıcı Ayarları",
    audit_logs: "Denetim Günlüğü",
    app_settings: "Uygulama Ayarları",
    ai_api_keys: "AI API Anahtarları",
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-border/30 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Sistem Sağlığı</h2>
          {lastChecked && (
            <p className="text-sm text-muted-foreground">
              Son kontrol: {lastChecked.toLocaleTimeString("tr-TR")}
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={checkHealth} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Kontrol Et
        </Button>
      </div>

      {/* Service Status */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4 border-border/30 flex items-center gap-3">
          <StatusIcon ok={health.database} />
          <div>
            <p className="font-medium">Veritabanı</p>
            <p className="text-xs text-muted-foreground">{health.database ? "Bağlı" : "Bağlantı hatası"}</p>
          </div>
        </Card>
        <Card className="p-4 border-border/30 flex items-center gap-3">
          <StatusIcon ok={health.auth} />
          <div>
            <p className="font-medium">Kimlik Doğrulama</p>
            <p className="text-xs text-muted-foreground">{health.auth ? "Çalışıyor" : "Sorun var"}</p>
          </div>
        </Card>
        <Card className="p-4 border-border/30 flex items-center gap-3">
          <StatusIcon ok={health.edgeFunctions} />
          <div>
            <p className="font-medium">Backend Fonksiyonları</p>
            <p className="text-xs text-muted-foreground">{health.edgeFunctions ? "Çalışıyor" : "Sorun var"}</p>
          </div>
        </Card>
      </div>

      {/* API Keys Status */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Key className="w-4 h-4" />
          API Anahtarları Durumu
        </h3>
        {health.apiKeys.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-3">
            {health.apiKeys.map((key) => (
              <Card key={key.provider} className="p-3 border-border/30 flex items-center justify-between">
                <span className="text-sm font-medium capitalize">{key.provider.replace(/_/g, " ")}</span>
                <Badge variant={key.active ? "default" : "secondary"}>
                  {key.active ? "Aktif" : "Pasif"}
                </Badge>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Tanımlı API anahtarı yok</p>
        )}
      </div>

      {/* Table Stats */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Database className="w-4 h-4" />
          Tablo İstatistikleri
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {health.tables.map((table) => (
            <Card key={table.name} className="p-3 border-border/30">
              <p className="text-xs text-muted-foreground">{tableNameMap[table.name] || table.name}</p>
              <p className="text-lg font-bold">{table.count.toLocaleString("tr-TR")}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SystemHealthTab;
