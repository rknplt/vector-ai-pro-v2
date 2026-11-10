import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  image?: string;
}

interface DbMessage {
  id: string;
  user_id: string;
  conversation_id: string | null;
  role: string;
  content: string;
  image: string | null;
  created_at: string;
}

interface DocumentData {
  type: string;
  data: string;
  name: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const RENDER_BACKEND_URL = "https://ai-sirket-ajanlari.onrender.com";
const RENDER_SECRET_KEY = "orkun-guvenli-anahtar-2026";

function createWelcomeMessage(content: string, mode: string = 'general'): Message {
  let welcomeContent = content;
  if (mode === 'agent-team') {
    welcomeContent = "👑 **Vector AI Pro - 9 Kişilik Otonom Ajan Ekibi Aktif!**\n\nEkibimiz hazır bekliyor:\n- 👔 **Genel Müdür (CEO)**\n- 🏛️ **Yazılım Mimarı**\n- 💻 **Kıdemli Kod Yazarı**\n- 🛡️ **Siber Güvenlik Uzmanı**\n- 🧪 **Test & Kalite Uzmanı**\n- 🚀 **DevOps & Bulut Mimarı**\n- 🗄️ **Veritabanı Yöneticisi**\n- 📋 **Ürün Yöneticisi**\n- 🖥️ **PC & Sistem Kontrolcüsü**\n\nNasıl bir proje veya görev başlatmak istersiniz?";
  }
  return {
    id: "welcome",
    role: "assistant",
    content: welcomeContent,
    timestamp: new Date(),
  };
}

export const useChat = (conversationId: string | null, mode: string = 'general', welcomeText?: string, language: string = 'tr') => {
  const welcome = welcomeText || "Merhaba, ben Vector 👋 Size nasıl yardımcı olabilirim?";
  const welcomeMsg = createWelcomeMessage(welcome, mode);
  const [messages, setMessages] = useState<Message[]>([welcomeMsg]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const loadedConversationRef = useRef<string | null>(null);

  // Synchronize welcome message when language or mode changes for an empty chat
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].id === "welcome") {
        return [createWelcomeMessage(welcome, mode)];
      }
      return prev;
    });
  }, [welcome, mode]);

  // Load chat history when conversation changes
  useEffect(() => {
    if (!conversationId || conversationId === loadedConversationRef.current) {
      if (!conversationId) {
        setMessages([createWelcomeMessage(welcome, mode)]);
        loadedConversationRef.current = null;
      }
      return;
    }

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setIsLoadingHistory(false);
          return;
        }

        const { data, error } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Failed to load history:", error);
          setMessages([createWelcomeMessage(welcome, mode)]);
        } else if (data && data.length > 0) {
          const loaded: Message[] = data.map((d: DbMessage) => ({
            id: d.id,
            role: d.role as "user" | "assistant",
            content: d.content,
            timestamp: new Date(d.created_at),
            image: d.image || undefined,
          }));
          setMessages(loaded);
        } else {
          setMessages([createWelcomeMessage(welcome, mode)]);
        }
        loadedConversationRef.current = conversationId;
      } catch (err) {
        console.error("Error loading chat:", err);
        setMessages([createWelcomeMessage(welcome, mode)]);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [conversationId, welcome, mode]);

  const saveMessage = async (message: Message, userId: string, convId: string) => {
    try {
      await supabase.from("chat_messages").insert({
        id: message.id,
        user_id: userId,
        conversation_id: convId,
        role: message.role,
        content: message.content,
        image: message.image || null,
      });

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convId);
    } catch (err) {
      console.error("Failed to save message:", err);
    }
  };

  const clearHistory = useCallback(async () => {
    if (!conversationId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast({ variant: "destructive", title: "Oturum Gerekli", description: "Geçmişi silmek için giriş yapın." });
      return;
    }
    try {
      const { error } = await supabase.from("chat_messages").delete().eq("conversation_id", conversationId);
      if (error) throw error;
      setMessages([createWelcomeMessage(welcome, mode)]);
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  }, [conversationId, welcome, mode]);

  // Direct fallback to 24/7 Render Multi-Agent Backend
  const callRenderBackend = async (prompt: string): Promise<string> => {
    const resp = await fetch(`${RENDER_BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-token": RENDER_SECRET_KEY,
      },
      body: JSON.stringify({
        message: prompt,
        sender: "Patron",
      }),
    });
    if (!resp.ok) {
      throw new Error(`Render API hatası: ${resp.status}`);
    }
    const data = await resp.json();
    return data.reply || "Ajan ekibinden yanıt alındı.";
  };

  const sendMessage = useCallback(async (
    input: string, 
    image?: string, 
    video?: string,
    document?: DocumentData,
    documentContent?: string,
    forcedMode?: string
  ) => {
    if ((!input.trim() && !image && !video && !document && !documentContent) || !conversationId) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token || !session.user) {
      toast({ variant: "destructive", title: "Oturum Gerekli", description: "Mesaj göndermek için lütfen giriş yapın." });
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input || (video ? (language === 'en' ? "Analyze this video." : "Bu videoyu analiz et.") : document ? `📄 ${document.name}` : (language === 'en' ? "Analyze this image." : "Bu görüntüyü analiz et.")),
      timestamp: new Date(),
      image,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    await saveMessage(userMessage, session.user.id, conversationId);

    let assistantContent = "";
    const assistantMessageId = crypto.randomUUID();

    const updateAssistant = (nextChunk: string) => {
      assistantContent += nextChunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.id === `stream-${assistantMessageId}`) {
          return prev.map((m, i) => 
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { 
          id: `stream-${assistantMessageId}`, 
          role: "assistant" as const, 
          content: assistantContent, 
          timestamp: new Date() 
        }];
      });
    };

    const effectiveMode = forcedMode || mode;

    // Check if the query needs real-time live internet information (yesterday, today, news, matches, etc.)
    const needsLiveWeb = /(?:dün|dünkü|bugün|bu sabah|bu akşam|bu hafta|geçen|ne zaman|nedir|kimdir|nerede|kaç|nasıl|güncel|son dakika|haber|fiyat|kur|skor|maç|sonuç|dolar|euro|bitcoin|hava durumu|weather|araştır|bul|neler oldu|gündem|kim kazandı|şampiyon|puan durumu|yesterday|today|news|price|score|202[4-9])/i.test(input);

    let searchAugmentation = "";
    if (needsLiveWeb) {
      try {
        const browserLang = typeof navigator !== 'undefined' ? (navigator.language || 'tr-TR') : 'tr-TR';
        const langCode = language || browserLang.split('-')[0] || 'tr';
        const countryCode = (browserLang.includes('-') ? browserLang.split('-')[1] : (langCode === 'tr' ? 'TR' : langCode === 'en' ? 'US' : langCode === 'de' ? 'DE' : 'TR')).toUpperCase();
        const sResp = await fetch(`/api/search?q=${encodeURIComponent(input)}&hl=${langCode}&gl=${countryCode}`);
        if (sResp.ok) {
          const sData = await sResp.json();
          if (sData.results && sData.results.length > 0) {
            searchAugmentation = `\n\n[Canlı İnternet ve Google Arama Sonuçları]:\n${sData.results.join("\n")}\nLütfen yukarıdaki canlı internet ve arama verilerini kullanarak kullanıcıya doğrudan, kesin ve güncel bilgileri (net skor, isim, döviz kuru veya olay) eksiksiz olarak aktar. Kendi bilgi kesim tarihini gerekçe göstererek 'bilmiyorum' deme.`;
          }
        }
      } catch (sErr) {
        console.warn("Live web search fetch failed:", sErr);
      }
    }

    // If Mode is Agent Team: directly invoke our 24/7 autonomous company engine!
    if (effectiveMode === 'agent-team') {
      try {
        const teamPrompt = `[9 Kişilik Otonom Ajan Ekibi Görevi]\nKullanıcı Görevi: ${input}${searchAugmentation}\nLütfen CEO, Yazılım Mimarı, Kıdemli Geliştirici, Siber Güvenlik, QA Test ve DevOps uzmanı sırasıyla kendi analiz, mimari, kod ve test çıktılarını detaylı ve yapılandırılmış şekilde sunsun.`;
        const teamResponse = await callRenderBackend(teamPrompt);
        assistantContent = teamResponse;
        const assistantMessage: Message = {
          id: assistantMessageId,
          role: "assistant",
          content: assistantContent,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        await saveMessage(assistantMessage, session.user.id, conversationId);
      } catch (err) {
        console.error("Agent team error:", err);
        toast({ variant: "destructive", title: "Ajan Ekibi Hatası", description: "Şirket sunucusuna erişilemedi." });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      const chatMessages = messages
        .filter(m => m.id !== "welcome")
        .concat({
          ...userMessage,
          content: userMessage.content + searchAugmentation,
        })
        .map(m => ({ role: m.role, content: m.content }));

      const body: any = { 
        messages: chatMessages,
        mode,
        language,
      };
      if (image) body.image = image;
      if (video) body.video = video;
      if (document) body.document = document;
      if (documentContent) body.documentContent = documentContent;

      if (documentContent && document) {
        try {
          await supabase.from("user_knowledge_base").insert({
            user_id: session.user.id,
            file_name: document.name,
            file_type: document.type,
            content: documentContent.slice(0, 50000),
            conversation_id: conversationId,
            is_global: false,
          } as any);
        } catch (err) {
          console.error("Failed to save to knowledge base:", err);
        }
      }

      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      // If Supabase edge function fails or hits quota, trigger bulletproof Render backend fallback!
      if (!response.ok) {
        console.warn(`Primary AI gateway responded with ${response.status}, engaging Render fallback...`);
        try {
          const langInstruction = language ? `[User Interface Language: ${language} - Please respond strictly in this language]\n` : "";
          const fallbackReply = await callRenderBackend(langInstruction + input + searchAugmentation);
          assistantContent = fallbackReply;
          const assistantMessage: Message = {
            id: assistantMessageId,
            role: "assistant",
            content: assistantContent,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, assistantMessage]);
          await saveMessage(assistantMessage, session.user.id, conversationId);
          setIsLoading(false);
          return;
        } catch (fbErr) {
          console.error("Fallback also failed:", fbErr);
          const errorData = await response.json().catch(() => ({}));
          toast({ variant: "destructive", title: "Hata", description: errorData.error || "AI servisine bağlanılamadı." });
          setIsLoading(false);
          return;
        }
      }

      if (!response.body) throw new Error("Yanıt stream'i alınamadı");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) updateAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) updateAssistant(content);
          } catch {}
        }
      }

      if (assistantContent) {
        const assistantMessage: Message = {
          id: assistantMessageId,
          role: "assistant",
          content: assistantContent,
          timestamp: new Date(),
        };
        setMessages(prev => prev.map(m => 
          m.id === `stream-${assistantMessageId}` ? { ...m, id: assistantMessageId } : m
        ));
        await saveMessage(assistantMessage, session.user.id, conversationId);
      }
    } catch (error) {
      console.error("Chat error, trying Render fallback:", error);
      try {
        const fallbackReply = await callRenderBackend(input);
        const assistantMessage: Message = {
          id: assistantMessageId,
          role: "assistant",
          content: fallbackReply,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        await saveMessage(assistantMessage, session.user.id, conversationId);
      } catch {
        toast({ variant: "destructive", title: "Bağlantı Hatası", description: "AI servisine bağlanırken bir hata oluştu." });
      }
    } finally {
      setIsLoading(false);
    }
  }, [messages, conversationId, mode, language]);

  const addMessage = useCallback(async (message: Message) => {
    setMessages(prev => [...prev, message]);
    if (!conversationId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await saveMessage(message, session.user.id, conversationId);
    }
  }, [conversationId]);

  return { messages, isLoading, isLoadingHistory, sendMessage, clearHistory, addMessage };
};
