import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";

const Terms = () => {
  const { t, language } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-24 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">{t("terms.title")}</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <p>{t("terms.lastUpdate")}: {new Date().toLocaleDateString(language === "tr" ? "tr-TR" : "en-US")}</p>

          <h2 className="text-xl font-semibold text-foreground">{t("terms.section1Title")}</h2>
          <p>{t("terms.section1Desc")}</p>

          <h2 className="text-xl font-semibold text-foreground">{t("terms.section2Title")}</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>{t("terms.resp1")}</li>
            <li>{t("terms.resp2")}</li>
            <li>{t("terms.resp3")}</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground">{t("terms.section3Title")}</h2>
          <p>{t("terms.section3Desc")}</p>

          <h2 className="text-xl font-semibold text-foreground">{t("terms.section4Title")}</h2>
          <p>{t("terms.section4Desc")}</p>

          <h2 className="text-xl font-semibold text-foreground">{t("terms.section5Title")}</h2>
          <p>{t("terms.section5Desc")}</p>

          <h2 className="text-xl font-semibold text-foreground">{t("terms.section6Title")}</h2>
          <p>{t("terms.section6Desc")} <a href="mailto:admin@vectoraipro.com" className="text-primary hover:underline">admin@vectoraipro.com</a> {t("terms.contactLink")}</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
