import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Crown, MessageSquare, Ticket, TrendingUp, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { tr } from "date-fns/locale";

interface Stats {
  totalUsers: number;
  plusUsers: number;
  freeUsers: number;
  totalMessages: number;
  totalConversations: number;
  activeInviteCodes: number;
  usedInviteCodes: number;
  newUsersLast7Days: number;
  messagesLast7Days: { date: string; count: number }[];
  registrationsLast7Days: { date: string; count: number }[];
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--muted-foreground))"];

const DashboardTab = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    const sevenDaysAgo = subDays(new Date(), 7).toISOString();

    const [profilesRes, messagesRes, conversationsRes, codesRes, recentMessagesRes, recentProfilesRes] = await Promise.all([
      supabase.from("profiles").select("plan, created_at"),
      supabase.from("chat_messages").select("id", { count: "exact", head: true }),
      supabase.from("conversations").select("id", { count: "exact", head: true }),
      supabase.from("invite_codes").select("is_used"),
      supabase.from("chat_messages").select("created_at").gte("created_at", sevenDaysAgo),
      supabase.from("profiles").select("created_at").gte("created_at", sevenDaysAgo),
    ]);

    const profiles = profilesRes.data || [];
    const plusUsers = profiles.filter(p => p.plan === "plus").length;
    const codes = codesRes.data || [];

    // Build daily message counts
    const messageDays: Record<string, number> = {};
    const regDays: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const day = format(subDays(new Date(), i), "yyyy-MM-dd");
      messageDays[day] = 0;
      regDays[day] = 0;
    }

    (recentMessagesRes.data || []).forEach(m => {
      const day = format(new Date(m.created_at), "yyyy-MM-dd");
      if (messageDays[day] !== undefined) messageDays[day]++;
    });

    (recentProfilesRes.data || []).forEach(p => {
      const day = format(new Date(p.created_at), "yyyy-MM-dd");
      if (regDays[day] !== undefined) regDays[day]++;
    });

    setStats({
      totalUsers: profiles.length,
      plusUsers,
      freeUsers: profiles.length - plusUsers,
      totalMessages: messagesRes.count || 0,
      totalConversations: conversationsRes.count || 0,
      activeInviteCodes: codes.filter(c => !c.is_used).length,
      usedInviteCodes: codes.filter(c => c.is_used).length,
      newUsersLast7Days: (recentProfilesRes.data || []).length,
      messagesLast7Days: Object.entries(messageDays).map(([date, count]) => ({
        date: format(new Date(date), "dd MMM", { locale: tr }),
        count,
      })),
      registrationsLast7Days: Object.entries(regDays).map(([date, count]) => ({
        date: format(new Date(date), "dd MMM", { locale: tr }),
        count,
      })),
    });
    setLoading(false);
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const planData = [
    { name: "Plus", value: stats.plusUsers },
    { name: "Free", value: stats.freeUsers },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Toplam Kullanıcı" value={stats.totalUsers} />
        <StatCard icon={Crown} label="Plus Kullanıcı" value={stats.plusUsers} accent />
        <StatCard icon={MessageSquare} label="Toplam Mesaj" value={stats.totalMessages} />
        <StatCard icon={Ticket} label="Aktif Kodlar" value={stats.activeInviteCodes} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Son 7 Gün Kayıt" value={stats.newUsersLast7Days} />
        <StatCard icon={Activity} label="Toplam Sohbet" value={stats.totalConversations} />
        <StatCard icon={Ticket} label="Kullanılan Kodlar" value={stats.usedInviteCodes} />
        <StatCard icon={Users} label="Free Kullanıcı" value={stats.freeUsers} />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="glass-card p-6 border-border/30">
          <h3 className="font-semibold mb-4">Son 7 Gün - Mesajlar</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.messagesLast7Days}>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Mesaj" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="glass-card p-6 border-border/30">
          <h3 className="font-semibold mb-4">Son 7 Gün - Kayıtlar</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.registrationsLast7Days}>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Kayıt" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Plan Distribution */}
      <Card className="glass-card p-6 border-border/30">
        <h3 className="font-semibold mb-4">Plan Dağılımı</h3>
        <div className="flex items-center justify-center">
          <ResponsiveContainer width={300} height={200}>
            <PieChart>
              <Pie data={planData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {planData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 ml-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: COLORS[0] }} />
              <span className="text-sm">Plus: {stats.plusUsers}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: COLORS[1] }} />
              <span className="text-sm">Free: {stats.freeUsers}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent?: boolean }) => (
  <Card className={`glass-card p-4 border-border/30 ${accent ? "border-primary/30 bg-primary/5" : ""}`}>
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${accent ? "bg-primary/20" : "bg-secondary/50"}`}>
        <Icon className={`w-5 h-5 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <div>
        <p className="text-2xl font-bold">{value.toLocaleString("tr-TR")}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  </Card>
);

export default DashboardTab;
