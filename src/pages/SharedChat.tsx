import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User, Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SharedMessage {
  role: string;
  content: string;
  created_at: string;
  image: string | null;
}

const SharedChat = () => {
  const { token } = useParams<{ token: string }>();
  const [messages, setMessages] = useState<SharedMessage[]>([]);
  const [title, setTitle] = useState("Paylaşılan Sohbet");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSharedChat = async () => {
      if (!token) return;
      try {
        const { data, error: fnError } = await supabase.functions.invoke('get-shared-chat', {
          body: { token }
        });
        if (fnError || !data) {
          setError("Bu paylaşım linki geçersiz veya süresi dolmuş.");
          return;
        }
        setTitle(data.title || "Paylaşılan Sohbet");
        setMessages(data.messages || []);
      } catch {
        setError("Sohbet yüklenirken bir hata oluştu.");
      } finally {
        setIsLoading(false);
      }
    };
    loadSharedChat();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Sohbet yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" asChild>
            <Link to="/"><ArrowLeft className="w-4 h-4 mr-2" /> Ana Sayfa</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-sm">{title}</h1>
              <p className="text-xs text-muted-foreground">Vector AI ile paylaşılan sohbet</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                message.role === "user" ? "bg-primary" : "bg-secondary"
              }`}>
                {message.role === "user" ? (
                  <User className="w-4 h-4 text-primary-foreground" />
                ) : (
                  <Bot className="w-4 h-4 text-foreground" />
                )}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-md"
                  : "bg-secondary text-foreground rounded-tl-md"
              }`}>
                {message.image && (
                  <img src={message.image} alt="" className="max-w-full rounded-lg mb-2 max-h-48 object-contain" />
                )}
                <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
                <span className="text-xs opacity-60 mt-1 block">
                  {new Date(message.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">Vector AI Pro ile sohbet etmek ister misiniz?</p>
          <Button variant="hero" asChild>
            <Link to="/">Vector AI'ı Dene</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SharedChat;
