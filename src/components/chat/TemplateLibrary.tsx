import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LayoutTemplate, FileText, User, Share2, Mail, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface TemplateCategory {
  nameKey: string;
  icon: typeof FileText;
  templates: { titleKey: string; promptTr: string; promptEn: string }[];
}

const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    nameKey: "templates.petition",
    icon: FileText,
    templates: [
      { titleKey: "templates.jobApplication", promptTr: "Profesyonel bir iş başvuru dilekçesi yaz. Pozisyon: [pozisyon adı], Şirket: [şirket adı]. Deneyimlerimi ve yeteneklerimi vurgula.", promptEn: "Write a professional job application letter. Position: [position name], Company: [company name]. Highlight my experience and skills." },
      { titleKey: "templates.resignation", promptTr: "Profesyonel ve nazik bir istifa dilekçesi yaz. Çalıştığım şirket: [şirket adı], Son çalışma günüm: [tarih].", promptEn: "Write a professional and polite resignation letter. Company: [company name], Last working day: [date]." },
      { titleKey: "templates.complaint", promptTr: "Resmi bir şikayet dilekçesi yaz. Konu: [şikayet konusu]. Muhatap kurum: [kurum adı].", promptEn: "Write a formal complaint letter. Subject: [complaint topic]. Addressed to: [institution name]." },
      { titleKey: "templates.request", promptTr: "Resmi bir talep dilekçesi yaz. Talep konusu: [konu]. Başvurulan makam: [makam].", promptEn: "Write a formal request letter. Request topic: [topic]. Addressed to: [authority]." },
    ]
  },
  {
    nameKey: "templates.cvCareer",
    icon: User,
    templates: [
      { titleKey: "templates.prepareCV", promptTr: "Profesyonel bir CV/özgeçmiş taslağı oluştur. Mesleğim: [meslek], Deneyim yılı: [yıl], Eğitim: [eğitim bilgisi].", promptEn: "Create a professional CV/resume draft. Profession: [profession], Years of experience: [years], Education: [education info]." },
      { titleKey: "templates.coverLetter", promptTr: "Etkili bir ön yazı (cover letter) mektubu yaz. Başvurduğum pozisyon: [pozisyon], Öne çıkan özelliklerim: [özellikler].", promptEn: "Write an effective cover letter. Position applying for: [position], Key strengths: [strengths]." },
      { titleKey: "templates.referenceLetter", promptTr: "Profesyonel bir referans mektubu taslağı yaz. Referans verilen kişi: [isim], Pozisyon: [pozisyon].", promptEn: "Write a professional reference letter draft. Person referenced: [name], Position: [position]." },
    ]
  },
  {
    nameKey: "templates.socialMedia",
    icon: Share2,
    templates: [
      { titleKey: "templates.instagramPost", promptTr: "Dikkat çekici bir Instagram postu metni yaz. Konu: [konu]. Uygun hashtagler ekle.", promptEn: "Write an engaging Instagram post caption. Topic: [topic]. Add relevant hashtags." },
      { titleKey: "templates.linkedinPost", promptTr: "Profesyonel bir LinkedIn paylaşımı yaz. Konu: [konu]. Sektörel bakış açısı ekle.", promptEn: "Write a professional LinkedIn post. Topic: [topic]. Add industry perspective." },
      { titleKey: "templates.tweet", promptTr: "Viral potansiyeli olan kısa bir tweet yaz. Konu: [konu]. 280 karakter sınırına uy.", promptEn: "Write a short tweet with viral potential. Topic: [topic]. Stay within 280 characters." },
    ]
  },
  {
    nameKey: "templates.email",
    icon: Mail,
    templates: [
      { titleKey: "templates.businessEmail", promptTr: "Profesyonel bir iş e-postası yaz. Konu: [konu], Alıcı: [kişi/kurum].", promptEn: "Write a professional business email. Subject: [subject], Recipient: [person/company]." },
      { titleKey: "templates.thankYouEmail", promptTr: "İş görüşmesi sonrası profesyonel bir teşekkür e-postası yaz. Pozisyon: [pozisyon].", promptEn: "Write a professional thank-you email after a job interview. Position: [position]." },
      { titleKey: "templates.followUpEmail", promptTr: "Nazik ama etkili bir takip (follow-up) e-postası yaz. Konu: [konu].", promptEn: "Write a polite but effective follow-up email. Subject: [subject]." },
    ]
  }
];

interface TemplateLibraryProps {
  onSelectTemplate: (prompt: string) => void;
}

const TemplateLibrary = ({ onSelectTemplate }: TemplateLibraryProps) => {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { t, language } = useLanguage();

  const handleSelect = (template: { promptTr: string; promptEn: string }) => {
    onSelectTemplate(language === 'en' ? template.promptEn : template.promptTr);
    setOpen(false);
    setSelectedCategory(null);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSelectedCategory(null); }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground h-8 w-8"
          title={t("templates.title")}
        >
          <LayoutTemplate className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        {!selectedCategory ? (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1">{t("templates.title")}</p>
            {TEMPLATE_CATEGORIES.map((cat) => (
              <button
                key={cat.nameKey}
                onClick={() => setSelectedCategory(cat.nameKey)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-secondary transition-colors text-sm"
              >
                <cat.icon className="w-4 h-4 text-primary" />
                <span className="flex-1 text-left">{t(cat.nameKey)}</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-xs text-primary hover:underline px-2 py-1"
            >
              {t("templates.back")}
            </button>
            {TEMPLATE_CATEGORIES.find(c => c.nameKey === selectedCategory)?.templates.map((tmpl) => (
              <button
                key={tmpl.titleKey}
                onClick={() => handleSelect(tmpl)}
                className="w-full text-left px-2 py-2 rounded-lg hover:bg-secondary transition-colors text-sm"
              >
                {t(tmpl.titleKey)}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default TemplateLibrary;
