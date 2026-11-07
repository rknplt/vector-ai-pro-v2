import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";

const Privacy = () => {
  const { t, language } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-24 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">{t("privacy.title")}</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <p>{t("privacy.lastUpdate")}: {new Date().toLocaleDateString(language === "tr" ? "tr-TR" : "en-US")}</p>

          <h2 className="text-xl font-semibold text-foreground">{t("privacy.section1Title")}</h2>
          <p>{t("privacy.section1Desc")}</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>{t("privacy.data1")}</li>
            <li>{t("privacy.data2")}</li>
            <li>{t("privacy.data3")}</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground">{t("privacy.section2Title")}</h2>
          <p>{t("privacy.section2Desc")}</p>

          <h2 className="text-xl font-semibold text-foreground">{t("privacy.section3Title")}</h2>
          <p>{t("privacy.section3Desc")}</p>

          <h2 className="text-xl font-semibold text-foreground">{t("privacy.section4Title")}</h2>
          <p>{t("privacy.section4Desc")}</p>

          <h2 className="text-xl font-semibold text-foreground">{t("privacy.section5Title")}</h2>
          <p>{t("privacy.section5Desc")}</p>

          <h2 className="text-xl font-semibold text-foreground">{t("privacy.section6Title")}</h2>
          <p>{t("privacy.section6Desc")} <a href="mailto:admin@vectoraipro.com" className="text-primary hover:underline">admin@vectoraipro.com</a> {t("privacy.contactLink")}</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
