import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, 
  Bot, 
  Play, 
  CheckCircle2, 
  ShieldCheck, 
  Cpu, 
  Database, 
  Code2, 
  TestTube, 
  Cloud, 
  Crown,
  Monitor,
  Sparkles
} from "lucide-react";
import PlusFeatureGate from "@/components/PlusFeatureGate";
import { useLanguage } from "@/contexts/LanguageContext";

export interface AgentInfo {
  id: string;
  name: string;
  role: string;
  desc: string;
  status: "ready" | "busy" | "idle";
  icon: any;
  color: string;
}

export const AGENT_TEAM: AgentInfo[] = [
  {
    id: "ceo",
    name: "Genel Müdür (CEO)",
    role: "Yönetim & Koordinasyon",
    desc: "Görevi analiz eder, şirket stratejisini kurar ve işleri ilgili ajanlara dağıtır.",
    status: "ready",
    icon: Users,
    color: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  },
  {
    id: "architect",
    name: "Yazılım Mimarı",
    role: "Sistem & Teknoloji Tasarımı",
    desc: "Projenin dosya yapısını, veri akışını ve kullanılacak modern kütüphaneleri belirler.",
    status: "ready",
    icon: Cpu,
    color: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  },
  {
    id: "developer",
    name: "Kıdemli Kod Yazarı",
    role: "Full-Stack Geliştirme",
    desc: "Frontend ve backend kodlarını hatasız, temiz ve üretime hazır şekilde yazar.",
    status: "ready",
    icon: Code2,
    color: "text-green-400 bg-green-400/10 border-green-400/30",
  },
  {
    id: "security",
    name: "Siber Güvenlik Uzmanı",
    role: "Güvenlik & Açık Denetimi",
    desc: "SQL Injection, XSS, token sızıntıları ve yetkilendirme açıklarını engeller.",
    status: "ready",
    icon: ShieldCheck,
    color: "text-red-400 bg-red-400/10 border-red-400/30",
  },
  {
    id: "qa",
    name: "Test & Kalite Uzmanı",
    role: "QA & Doğrulama",
    desc: "Birim testleri, uçtan uca senaryolar ve kullanıcı akışını test eder.",
    status: "ready",
    icon: TestTube,
    color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  },
  {
    id: "devops",
    name: "DevOps & Bulut Mimarı",
    role: "CI/CD & Dağıtım",
    desc: "Docker, Render, GitHub Actions ve sunucu sağlığını 7/24 yönetir.",
    status: "ready",
    icon: Cloud,
    color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
  },
  {
    id: "dba",
    name: "Veritabanı Yöneticisi",
    role: "SQL & Veri Mimarisi",
    desc: "Veritabanı şemalarını, indeksleri ve veri tutarlılığını optimize eder.",
    status: "ready",
    icon: Database,
    color: "text-purple-400 bg-purple-400/10 border-purple-400/30",
  },
  {
    id: "pm",
    name: "Ürün Yöneticisi (PM)",
    role: "Kullanıcı Deneyimi & Yol Haritası",
    desc: "Özelliklerin kullanıcı ihtiyaçlarına uygunluğunu ve sürüm planını yönetir.",
    status: "ready",
    icon: Bot,
    color: "text-pink-400 bg-pink-400/10 border-pink-400/30",
  },
  {
    id: "pc_agent",
    name: "PC & Sistem Kontrolcüsü",
    role: "Yerel Cihaz Otomasyonu",
    desc: "Ekran görüntüsü alma, komut çalıştırma ve bilgisayarı uzaktan yönetme.",
    status: "ready",
    icon: Monitor,
    color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  },
];

interface AgentTeamDashboardProps {
  onDispatchTask: (prompt: string) => void;
}

const AGENT_LOCALES: Record<string, Record<string, { name: string; role: string; desc: string }>> = {
  ja: {
    ceo: { name: "CEO (最高経営責任者)", role: "経営 & 指揮", desc: "タスクを分析し、企業戦略を立案し、各エージェントへ配分します。" },
    architect: { name: "ソフトウェアアーキテクト", role: "システム設計", desc: "ディレクトリ構造、データフロー、最新ライブラリを設計します。" },
    developer: { name: "シニアエンジニア", role: "フルスタック開発", desc: "フロントエンドとバックエンドのコードを正確かつクリーンに実装します。" },
    security: { name: "サイバーセキュリティ専門家", role: "セキュリティ監査", desc: "SQLインジェクション、XSS、トークン漏洩などの脆弱性を防ぎます。" },
    qa: { name: "QA・テスト専門家", role: "品質保証 & 検証", desc: "ユニットテスト、エンドツーエンド検証、ユーザーフローをテストします。" },
    devops: { name: "DevOps & クラウド設計者", role: "CI/CD & デプロイ", desc: "Docker、Render、GitHub Actions、サーバーを24時間監視します。" },
    dba: { name: "データベース管理者 (DBA)", role: "SQL & データ設計", desc: "DBスキーマ、インデックス、データ整合性を最適化します。" },
    pm: { name: "プロダクトマネージャー (PM)", role: "UX & ロードマップ", desc: "ユーザー要件の適合性とリリース計画を管理します。" },
    pc_agent: { name: "PC & システム制御", role: "端末自動化", desc: "スクリーンショット取得、コマンド実行、PCのリモート管理。" },
  },
  en: {
    ceo: { name: "Chief Executive (CEO)", role: "Leadership & Strategy", desc: "Analyzes high-level goals, sets company strategy, and coordinates agents." },
    architect: { name: "Software Architect", role: "System & Tech Design", desc: "Designs architecture, data flow, scalable patterns, and modern libraries." },
    developer: { name: "Senior Full-Stack Dev", role: "Full-Stack Implementation", desc: "Writes clean, production-ready frontend and backend code." },
    security: { name: "Cybersecurity Specialist", role: "Security & Auditing", desc: "Audits for SQLi, XSS, token exposure, and access controls." },
    qa: { name: "QA & Test Engineer", role: "Testing & Validation", desc: "Writes unit tests, runs end-to-end user scenarios and edge cases." },
    devops: { name: "DevOps & Cloud Architect", role: "CI/CD & Deployment", desc: "Manages Docker, Render cloud pipelines, and 24/7 server health." },
    dba: { name: "Database Administrator", role: "SQL & Schema Design", desc: "Optimizes relational schemas, indexing, caching, and data integrity." },
    pm: { name: "Product Manager (PM)", role: "User Experience & Roadmaps", desc: "Prioritizes user features and release management." },
    pc_agent: { name: "PC Automation Controller", role: "Local Device Automation", desc: "Takes screenshots, executes commands, and automates PC tasks." },
  },
};

export const AgentTeamDashboard = ({ onDispatchTask }: AgentTeamDashboardProps) => {
  const [open, setOpen] = useState(false);
  const [taskPrompt, setTaskPrompt] = useState("");
  const { t, language } = useLanguage();

  const handleStartTask = (customPrompt?: string) => {
    const textToSend = customPrompt || taskPrompt;
    if (!textToSend.trim()) return;
    onDispatchTask(textToSend);
    setTaskPrompt("");
    setOpen(false);
  };

  const sampleTasks = language === "ja" ? [
    "🚀 EコマースWebプロジェクトのアーキテクチャとDBスキーマを作成",
    "🛡️ 既存コードのセキュリティおよび品質監査を実施",
    "🖥️ PCのスクリーンショットを取得しシステム状況を診断",
    "📱 iOSとAndroid向けの最新UIコンポーネントを設計",
  ] : language === "tr" ? [
    "🚀 Yeni bir e-ticaret web projesi mimarisi ve veritabanı şemasını hazırla",
    "🛡️ Mevcut kodlarımızın güvenlik ve kalite denetimini gerçekleştir",
    "🖥️ Bilgisayarımın ekran görüntüsünü al ve sistem durumunu raporla",
    "📱 Android ve iOS için modern arayüz bileşenleri tasarımı oluştur",
  ] : [
    "🚀 Architect an e-commerce platform and database schema",
    "🛡️ Perform security audit and code quality inspection",
    "🖥️ Capture desktop screenshot and diagnose system state",
    "📱 Design modern mobile UI components for iOS and Android",
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1 border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary font-medium text-xs h-7 px-1.5 sm:px-2 shrink-0"
          title={t("agentTeam.modalTitle")}
        >
          <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="hidden md:inline">{t("agentTeam.button")}</span>
          <Badge variant="secondary" className="px-1 py-0 text-[10px] bg-primary/20 text-primary shrink-0">
            {t("agentTeam.badge") || "9 Ajan"}
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center text-white shadow-lg shadow-primary/25">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  {t("agentTeam.modalTitle")}
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Plus</Badge>
                </DialogTitle>
                <DialogDescription>
                  {t("agentTeam.modalDesc")}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <PlusFeatureGate featureName={t("agentTeam.modalTitle")} showPreview={true}>
          <div className="space-y-4 pt-2">
            {/* Quick Task Dispatcher */}
            <div className="bg-secondary/40 p-4 rounded-2xl border border-border/50 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span className="flex items-center gap-1.5 text-foreground">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> {t("agentTeam.dispatchPrompt")}:
                </span>
                <span className="text-green-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> {t("agentTeam.ready")}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={taskPrompt}
                  onChange={(e) => setTaskPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleStartTask()}
                  placeholder={t("agentTeam.placeholder")}
                  className="flex-1 bg-background border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
                <Button 
                  onClick={() => handleStartTask()} 
                  disabled={!taskPrompt.trim()}
                  className="bg-primary text-white gap-1.5 h-10"
                >
                  <Play className="w-3.5 h-3.5" /> {t("agentTeam.send")}
                </Button>
              </div>

              {/* Sample Task Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {sampleTasks.map((taskItem, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleStartTask(taskItem)}
                    className="text-[11px] bg-background/80 hover:bg-primary/20 hover:text-primary transition-colors border border-border/40 px-2.5 py-1 rounded-lg text-muted-foreground text-left truncate max-w-full"
                  >
                    {taskItem}
                  </button>
                ))}
              </div>
            </div>

            {/* Agents Grid */}
            <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between px-1">
              <span>{t("agentTeam.modalTitle")}</span>
              <span>{t("agentTeam.cloud247") || "7/24 Kesintisiz Bulut"}</span>
            </div>

            <ScrollArea className="h-[280px] pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {AGENT_TEAM.map((agent) => {
                  const Icon = agent.icon;
                  const localized = AGENT_LOCALES[language]?.[agent.id] || AGENT_LOCALES.en?.[agent.id];
                  const agentName = language === "tr" ? agent.name : (localized?.name || agent.name);
                  const agentRole = language === "tr" ? agent.role : (localized?.role || agent.role);
                  const agentDesc = language === "tr" ? agent.desc : (localized?.desc || agent.desc);
                  return (
                    <div
                      key={agent.id}
                      className="p-3 rounded-xl border border-border/50 bg-background/60 hover:border-primary/40 transition-colors flex items-start gap-3"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${agent.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-semibold text-xs text-foreground truncate">{agentName}</h4>
                          <span className="text-[10px] text-green-400 flex items-center gap-0.5 shrink-0">
                            <CheckCircle2 className="w-2.5 h-2.5" /> {t("agentTeam.ready")}
                          </span>
                        </div>
                        <p className="text-[11px] text-primary/80 font-medium">{agentRole}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{agentDesc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </PlusFeatureGate>
      </DialogContent>
    </Dialog>
  );
};

export default AgentTeamDashboard;
