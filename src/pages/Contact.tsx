import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

const Contact = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase.from("contact_messages").insert({
      name: name.trim(), email: email.trim(), subject: subject.trim(),
      message: message.trim(), user_id: user?.id || null,
    } as never);

    if (error) {
      toast({ title: t("common.error"), description: t("contact.error"), variant: "destructive" });
    } else {
      toast({ title: t("contact.sent"), description: t("contact.sentDesc") });
      setName(""); setEmail(""); setSubject(""); setMessage("");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-24 max-w-xl">
        <h1 className="text-3xl font-bold mb-4 text-center">{t("contact.title")}</h1>
        <p className="text-muted-foreground text-center mb-8">{t("contact.subtitle")}</p>

        <div className="glass-card rounded-2xl p-6 border border-border/30 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{t("contact.emailLabel")}</p>
              <a href="mailto:admin@vectoraipro.com" className="text-sm text-primary hover:underline">admin@vectoraipro.com</a>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input placeholder={t("contact.yourName")} required value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
            <Input type="email" placeholder={t("contact.yourEmail")} required value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
            <Input placeholder={t("contact.subject")} required value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
            <Textarea placeholder={t("contact.message")} rows={5} required value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? t("contact.sending") : t("contact.send")}
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
