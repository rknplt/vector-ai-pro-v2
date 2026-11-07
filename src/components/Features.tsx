import { 
  Code2, MessageSquare, Image, Video, Mic, Monitor, Smartphone, 
  Calculator, Wrench, Brain, Lock, Crown, GraduationCap, Scale, 
  FileText, Globe, Languages, Table2, Palette, Bug, LayoutTemplate, Share2,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Features = () => {
  const { t } = useLanguage();

  const features = [
    { icon: Code2, titleKey: "feature.codeWriting", descKey: "feature.codeWritingDesc", free: true },
    { icon: MessageSquare, titleKey: "feature.chatAssistant", descKey: "feature.chatAssistantDesc", free: true },
    { icon: Image, titleKey: "feature.imageAnalysis", descKey: "feature.imageAnalysisDesc", free: true },
    { icon: Wrench, titleKey: "feature.vehicleDiag", descKey: "feature.vehicleDiagDesc", free: true },
    { icon: Calculator, titleKey: "feature.accounting", descKey: "feature.accountingDesc", free: true },
    { icon: Brain, titleKey: "feature.multiAI", descKey: "feature.multiAIDesc", free: true },
    { icon: GraduationCap, titleKey: "feature.academic", descKey: "feature.academicDesc", free: true },
    { icon: Languages, titleKey: "feature.translator", descKey: "feature.translatorDesc", free: true },
    { icon: FileText, titleKey: "feature.pdf", descKey: "feature.pdfDesc", free: true },
    { icon: Globe, titleKey: "feature.web", descKey: "feature.webDesc", free: true },
    { icon: Table2, titleKey: "feature.excel", descKey: "feature.excelDesc", free: true },
    { icon: Palette, titleKey: "feature.imageGen", descKey: "feature.imageGenDesc", free: true },
    { icon: Bug, titleKey: "feature.codeDebug", descKey: "feature.codeDebugDesc", free: true },
    { icon: LayoutTemplate, titleKey: "feature.templates", descKey: "feature.templatesDesc", free: true },
    { icon: Share2, titleKey: "feature.sharing", descKey: "feature.sharingDesc", free: true },
    { icon: Scale, titleKey: "feature.legal", descKey: "feature.legalDesc", free: false },
    { icon: Mic, titleKey: "feature.voice", descKey: "feature.voiceDesc", free: false },
    { icon: Video, titleKey: "feature.video", descKey: "feature.videoDesc", free: false },
    { icon: Monitor, titleKey: "feature.pcControl", descKey: "feature.pcControlDesc", free: false },
    { icon: Smartphone, titleKey: "feature.phoneControl", descKey: "feature.phoneControlDesc", free: false },
  ];

  return (
    <section id="features" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            {t("features.title")} <span className="gradient-text">{t("features.titleHighlight")}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t("features.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative glass-card rounded-2xl p-6 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {!feature.free && (
                <div className="absolute top-4 right-4">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-accent/20 text-accent text-xs font-medium">
                    <Crown className="w-3 h-3" />
                    Plus
                  </div>
                </div>
              )}
              
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300
                ${feature.free 
                  ? 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground' 
                  : 'bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground'
                }`}
              >
                <feature.icon className="w-6 h-6" />
              </div>
              
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                {t(feature.titleKey)}
                {!feature.free && <Lock className="w-3 h-3 text-muted-foreground" />}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t(feature.descKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
