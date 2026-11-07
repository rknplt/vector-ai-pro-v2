import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { 
  Send, 
  Mic, 
  MicOff, 
  Image as ImageIcon, 
  Video, 
  Paperclip, 
  Sparkles,
  Bot,
  User,
  Code2,
  Loader2,
  Volume2,
  VolumeX,
  X,
  Trash2,
  Ear,
  EarOff,
  Wand2,
  Download,
  Menu,
  Plus,
  FileText,
  Table2,
  Share2,
  Link2,
  Check,
  Car
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useChat } from "@/hooks/useChat";
import { useConversations } from "@/hooks/useConversations";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useWakeWord } from "@/hooks/useWakeWord";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ConversationSidebar from "@/components/chat/ConversationSidebar";
import VoiceSettingsDialog from "@/components/chat/VoiceSettingsDialog";
import ChatModeSelector, { type ChatMode } from "@/components/chat/ChatModeSelector";
import AgentTeamDashboard from "@/components/chat/AgentTeamDashboard";
import TemplateLibrary from "@/components/chat/TemplateLibrary";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import { useVoiceCommands } from "@/hooks/useVoiceCommands";
import { useLanguage, languageList, type Language } from "@/contexts/LanguageContext";
import * as XLSX from "xlsx";

const ChatInterface = () => {
  const { userPlan } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const {
    conversations,
    activeConversationId,
    isLoading: isLoadingConversations,
    createConversation,
    updateConversationTitle,
    deleteConversation,
    selectConversation,
  } = useConversations();

  const [chatMode, setChatMode] = useState<ChatMode>('general');
  const { messages, isLoading, isLoadingHistory, sendMessage, clearHistory, addMessage } = useChat(activeConversationId, chatMode, t("chat.welcome"), language);
  const [input, setInput] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<{ type: string; data: string; name: string } | null>(null);
  const [selectedDocumentContent, setSelectedDocumentContent] = useState<string | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [isDriveMode, setIsDriveMode] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wakeLockRef = useRef<any>(null);
  const lastTapRef = useRef<number>(0);
  const { generateImage, isGenerating } = useImageGeneration();
  const { processCommand } = useVoiceCommands();
  
  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    isSupported: isSpeechSupported 
  } = useSpeechRecognition();

  const { 
    speak, stop, isSpeaking, isLoading: isTTSLoading,
    selectedVoiceId, selectVoice,
    speakingSpeed, changeSpeed,
  } = useTextToSpeech();

  const handleWakeWordDetected = useCallback(() => {
    toast({ title: "Hey Vector!", description: t("chat.listening") });
    if (isSpeaking) stop();
    startListening();
  }, [isSpeaking, stop, startListening]);

  const {
    isWakeWordEnabled,
    isWakeWordListening,
    toggleWakeWord,
    enableWakeWord,
    isSupported: isWakeWordSupported,
  } = useWakeWord(handleWakeWordDetected);

  useEffect(() => {
    if (!isListening && isWakeWordEnabled && !isWakeWordListening) {
      const timeout = setTimeout(() => { enableWakeWord(); }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isListening, isWakeWordEnabled, isWakeWordListening, enableWakeWord]);

  useEffect(() => {
    if (isDriveMode) {
      if (!isWakeWordEnabled) {
        enableWakeWord();
      }
      if ("wakeLock" in navigator && !wakeLockRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigator as any).wakeLock?.request("screen").then((lock: any) => {
          wakeLockRef.current = lock;
        }).catch(() => {});
      }
      toast({
        title: "🚗 Sürüş Modu",
        description: "Ekran karartıldı. 'Vektör' diyerek konuşabilirsiniz.",
      });
    } else {
      if (wakeLockRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        wakeLockRef.current.release?.().catch(() => {});
        wakeLockRef.current = null;
      }
    }
  }, [isDriveMode, isWakeWordEnabled, enableWakeWord]);

  const handleDriveModeTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 450) {
      setIsDriveMode(false);
      toast({ title: "Sürüş Modu Kapatıldı", description: "Normal ekrana dönüldü." });
    } else {
      toast({ title: "🚗 Sürüş Modu Aktif", description: "Çıkmak için ekrana tekrar hızlıca dokunun veya 'Sürüş modunu kapat' deyin." });
    }
    lastTapRef.current = now;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (transcript) setInput(transcript);
  }, [transcript]);

  const prevListeningRef = useRef(isListening);
  const inputRef = useRef(input);
  const handleSendRef = useRef<(() => void) | null>(null);
  inputRef.current = input;

  useEffect(() => {
    if (!autoSpeak || isLoading) return;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === "assistant" && lastMessage.id !== lastMessageIdRef.current && !lastMessage.id.startsWith("stream-")) {
      lastMessageIdRef.current = lastMessage.id;
      speak(lastMessage.content);
    }
  }, [messages, isLoading, autoSpeak, speak]);

  useEffect(() => {
    if (!activeConversationId) return;
    const userMessages = messages.filter(m => m.role === "user");
    const currentConversation = conversations.find(c => c.id === activeConversationId);
    if (userMessages.length === 1 && (currentConversation?.title === "Yeni Sohbet" || currentConversation?.title === "New Chat")) {
      const firstMessage = userMessages[0].content;
      const title = firstMessage.length > 30 ? firstMessage.substring(0, 30) + "..." : firstMessage;
      updateConversationTitle(activeConversationId, title);
    }
  }, [messages, activeConversationId, conversations, updateConversationTitle]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast({ variant: "destructive", title: t("chat.fileTooLarge"), description: "Max 50MB" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: t("chat.invalidFile") });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => setSelectedImage(event.target?.result as string);
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast({ variant: "destructive", title: t("chat.fileTooLarge"), description: "Max 50MB" });
      return;
    }
    if (!file.type.startsWith("video/")) {
      toast({ variant: "destructive", title: t("chat.invalidFile") });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => setSelectedVideo(event.target?.result as string);
    reader.readAsDataURL(file);
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast({ variant: "destructive", title: t("chat.fileTooLarge"), description: "Max 50MB" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as ArrayBuffer;
      const base64 = btoa(String.fromCharCode(...new Uint8Array(result)));
      setSelectedDocument({ type: "pdf", data: base64, name: file.name });
    };
    reader.readAsArrayBuffer(file);
    if (documentInputRef.current) documentInputRef.current.value = "";
  };

  const handleExcelSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast({ variant: "destructive", title: t("chat.fileTooLarge"), description: "Max 50MB" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        let textContent = `📊 Dosya: ${file.name}\n\n`;
        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_csv(sheet);
          textContent += `--- Sayfa: ${sheetName} ---\n${jsonData}\n\n`;
        });
        // Truncate if too long
        if (textContent.length > 30000) {
          textContent = textContent.slice(0, 30000) + "\n\n[... veri kesildi - dosya çok büyük]";
        }
        setSelectedDocumentContent(textContent);
        setSelectedDocument({ type: "excel", data: "", name: file.name });
      } catch {
        toast({ variant: "destructive", title: t("common.error") });
      }
    };
    reader.readAsArrayBuffer(file);
    if (excelInputRef.current) excelInputRef.current.value = "";
  };

  const handleShareChat = async () => {
    if (!activeConversationId) return;
    setShareLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({ variant: "destructive", title: t("common.sessionRequired") });
        return;
      }

      // Check if already shared
      const { data: existing } = await supabase
        .from("shared_conversations")
        .select("share_token")
        .eq("conversation_id", activeConversationId)
        .eq("user_id", session.user.id)
        .maybeSingle();

      let token = existing?.share_token;

      if (!token) {
        const { data: newShare, error } = await supabase
          .from("shared_conversations")
          .insert({ conversation_id: activeConversationId, user_id: session.user.id })
          .select("share_token")
          .single();
        if (error) throw error;
        token = newShare.share_token;
      }

      const shareUrl = `${window.location.origin}/shared/${token}`;
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: t("chat.linkCopied"), description: t("chat.linkCopiedDesc") });
    } catch (err) {
      console.error("Share error:", err);
      toast({ variant: "destructive", title: t("common.error"), description: t("chat.shareError") });
    } finally {
      setShareLoading(false);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage && !selectedVideo && !selectedDocument) || isLoading) return;
    
    if (!selectedImage && !selectedVideo && !selectedDocument && input.trim()) {
      if (/sürüş\s*modu|araba\s*modu|motor\s*modu|araç\s*modu/i.test(input)) {
        if (/kapat|çık|bitir/i.test(input)) {
          setIsDriveMode(false);
          speak("Sürüş modundan çıkıldı.");
          setInput("");
          if (isListening) stopListening();
          return;
        } else if (/aç|başlat|geç/i.test(input)) {
          setIsDriveMode(true);
          speak("Sürüş modu aktif. 'Vektör' diyerek seslenebilirsiniz.");
          setInput("");
          if (isListening) stopListening();
          return;
        }
      }

      const commandResult = processCommand(input.trim());
      if (commandResult.handled) {
        setInput("");
        if (isListening) stopListening();
        return;
      }
    }
    
    let convId = activeConversationId;
    if (!convId) {
      convId = await createConversation();
      if (!convId) return;
    }
    
    const message = input;
    const image = selectedImage;
    const video = selectedVideo;
    const doc = selectedDocument;
    const docContent = selectedDocumentContent;
    setInput("");
    setSelectedImage(null);
    setSelectedVideo(null);
    setSelectedDocument(null);
    setSelectedDocumentContent(null);
    if (isListening) stopListening();
    if (isSpeaking) stop();
    
    await sendMessage(
      message, 
      image || undefined, 
      video || undefined,
      doc && doc.type === "pdf" ? doc : undefined,
      docContent || undefined
    );
  };

  handleSendRef.current = handleSend;
  useEffect(() => {
    if (prevListeningRef.current && !isListening && inputRef.current.trim()) {
      const timeout = setTimeout(() => {
        if (inputRef.current.trim() && handleSendRef.current) handleSendRef.current();
      }, 300);
      prevListeningRef.current = isListening;
      return () => clearTimeout(timeout);
    }
    prevListeningRef.current = isListening;
  }, [isListening]);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
      if (input.trim()) handleSend();
    } else {
      if (isSpeaking) stop();
      startListening();
    }
  };

  const toggleAutoSpeak = () => {
    if (isSpeaking) stop();
    setAutoSpeak(!autoSpeak);
  };

  const handleImageGeneration = async () => {
    if (!input.trim()) {
      toast({ title: t("chat.promptRequired"), description: t("chat.promptRequiredDesc") });
      return;
    }
    let convId = activeConversationId;
    if (!convId) {
      convId = await createConversation();
      if (!convId) return;
    }
    const prompt = input;
    setInput("");
    await addMessage({ id: crypto.randomUUID(), role: "user", content: `🎨 Görsel oluştur: ${prompt}`, timestamp: new Date() });
    const result = await generateImage(prompt);
    if (result?.image) {
      const imgSrc = `data:${result.image.mimeType};base64,${result.image.data}`;
      await addMessage({ id: crypto.randomUUID(), role: "assistant", content: result.text || "İşte oluşturduğum görsel:", timestamp: new Date(), image: imgSrc });
    } else if (!result) {
      await addMessage({ id: crypto.randomUUID(), role: "assistant", content: "Üzgünüm, görseli oluşturamadım. Lütfen tekrar deneyin.", timestamp: new Date() });
    }
  };

  const handleNewConversation = async () => { await createConversation(); };

  const handleTemplateSelect = (prompt: string) => { setInput(prompt); };

  return (
    <section id="chat" className="py-12 md:py-24 relative">
      <div className="container mx-auto px-2 md:px-4">
        <div className="text-center mb-6 md:mb-12">
          <h2 className="text-2xl md:text-5xl font-bold mb-2 md:mb-4">
            {t("chat.title")} <span className="gradient-text">{t("chat.titleHighlight")}</span>
          </h2>
          <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto">
            {t("chat.subtitle")}
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="glass-card rounded-2xl md:rounded-3xl overflow-hidden border border-border/30 flex flex-col md:flex-row h-[70vh] md:h-[75vh]">
            {/* Mobile Sidebar Overlay */}
            {showMobileSidebar && (
              <div className="fixed inset-0 z-50 md:hidden">
                <div className="absolute inset-0 bg-black/60" onClick={() => setShowMobileSidebar(false)} />
                <div className="absolute left-0 top-0 h-full w-[280px] bg-card border-r border-border/30 animate-in slide-in-from-left duration-200">
                  <ConversationSidebar
                    conversations={conversations}
                    activeConversationId={activeConversationId}
                    onSelectConversation={(id) => { selectConversation(id); setShowMobileSidebar(false); }}
                    onCreateConversation={() => { handleNewConversation(); setShowMobileSidebar(false); }}
                    onDeleteConversation={deleteConversation}
                    onUpdateTitle={updateConversationTitle}
                    isLoading={isLoadingConversations}
                  />
                </div>
              </div>
            )}

            {/* Conversation Sidebar - hidden on mobile */}
            <div className="hidden md:block">
              <ConversationSidebar
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={selectConversation}
                onCreateConversation={handleNewConversation}
                onDeleteConversation={deleteConversation}
                onUpdateTitle={updateConversationTitle}
                isLoading={isLoadingConversations}
              />
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Chat Header */}
              <div className="flex items-center justify-between p-2 md:p-4 border-b border-border/30">
                <div className="flex items-center gap-2 md:gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-8 w-8 text-muted-foreground"
                    onClick={() => setShowMobileSidebar(true)}
                    title={t("sidebar.chats")}
                  >
                    <Menu className="w-5 h-5" />
                  </Button>
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-card" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Vector</h3>
                    <p className="text-xs text-muted-foreground">
                      {isSpeaking ? t("chat.speaking") : t("chat.active")}
                    </p>
                  </div>
                  {/* Mode Selector */}
                  <ChatModeSelector value={chatMode} onChange={setChatMode} isPlusUser={userPlan === "plus"} />
                  {/* Agent Team Dashboard */}
                  <AgentTeamDashboard onDispatchTask={(prompt) => { setChatMode('agent-team'); sendMessage(prompt, undefined, undefined, undefined, undefined, 'agent-team'); }} />
                </div>
                <div className="flex items-center gap-1">
                  {/* Auto-speak toggle - always visible */}
                  <Button
                    variant={autoSpeak ? "default" : "ghost"}
                    size="icon"
                    onClick={toggleAutoSpeak}
                    className="h-8 w-8"
                    title={autoSpeak ? t("chat.autoSpeakOn") : t("chat.autoSpeakOff")}
                  >
                    {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </Button>

                  {/* More options dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title={t("chat.more") || "More"}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={handleShareChat}
                        disabled={!activeConversationId || messages.length <= 1 || shareLoading}
                      >
                        {shareLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Share2 className="w-4 h-4 mr-2" />}
                        {t("chat.share")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={toggleWakeWord}
                        disabled={!isWakeWordSupported}
                      >
                        {isWakeWordEnabled ? <Ear className="w-4 h-4 mr-2" /> : <EarOff className="w-4 h-4 mr-2" />}
                        {isWakeWordEnabled ? t("chat.wakeWordOn") : t("chat.wakeWordOff")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setIsDriveMode(true)}
                      >
                        <Car className="w-4 h-4 mr-2 text-primary" />
                        {t("chat.driveMode") || "Sürüş Modu"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={clearHistory}
                        disabled={messages.length <= 1 || !activeConversationId}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t("chat.clear")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <VoiceSettingsDialog
                    selectedVoiceId={selectedVoiceId}
                    onSelectVoice={selectVoice}
                    onTestVoice={(text, vId, spd) => speak(text, vId, spd)}
                    speakingSpeed={speakingSpeed}
                    onChangeSpeed={changeSpeed}
                    isLoading={isTTSLoading}
                  />

                  {/* Quick Language Selector */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8 px-2"
                        title={t("chat.changeLanguage") || "Change Language"}
                      >
                        <span>{languageList.find(l => l.code === language)?.flag || "🌐"}</span>
                        <span className="hidden sm:inline uppercase text-[11px] font-semibold">{language}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 max-h-72 overflow-y-auto">
                      {languageList.map((l) => (
                        <DropdownMenuItem
                          key={l.code}
                          onClick={() => setLanguage(l.code)}
                          className={`gap-2 text-xs cursor-pointer ${language === l.code ? "bg-primary/10 font-bold text-primary" : ""}`}
                        >
                          <span>{l.flag}</span>
                          <span>{l.label}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 min-h-0 overflow-y-auto p-2 md:p-4 space-y-3 md:space-y-4">
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{t("chat.loadingHistory")}</span>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                        ${message.role === "user" ? "bg-primary" : "bg-secondary"}`}
                    >
                      {message.role === "user" ? (
                        <User className="w-4 h-4 text-primary-foreground" />
                      ) : (
                        <Bot className="w-4 h-4 text-foreground" />
                      )}
                    </div>
                    <div
                      className={`max-w-[90%] md:max-w-[80%] rounded-2xl px-3 py-2 md:px-4 md:py-3
                        ${message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-md"
                          : "bg-secondary text-foreground rounded-tl-md"
                        }`}
                    >
                      {message.image && (
                        <img 
                          src={message.image} 
                          alt="Image" 
                          className="max-w-full rounded-lg mb-2 max-h-48 object-contain"
                        />
                      )}
                      <div className={`text-sm max-w-none overflow-x-auto prose prose-sm dark:prose-invert
                        [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:rounded-lg [&_table]:overflow-hidden [&_table]:shadow-sm [&_table]:min-w-[400px]
                        [&_thead]:bg-muted/80 
                        [&_th]:px-2 [&_th]:py-2 [&_th]:md:px-4 [&_th]:md:py-2.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wider [&_th]:border-b [&_th]:border-border/60
                        [&_tbody_tr]:border-b [&_tbody_tr]:border-border/30 [&_tbody_tr:last-child]:border-0
                        [&_tbody_tr:nth-child(even)]:bg-muted/20 [&_tbody_tr]:hover:bg-muted/40 [&_tbody_tr]:transition-colors
                        [&_td]:px-2 [&_td]:py-2 [&_td]:md:px-4 [&_td]:md:py-2.5 [&_td]:text-sm
                        [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4
                        [&_code]:bg-muted/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
                        [&_pre]:bg-muted/50 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto
                        [&_p]:my-1.5 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h3]:font-semibold
                        [&_blockquote]:border-l-2 [&_blockquote]:border-primary/50 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground
                        ${message.role === "user" ? "[&_table]:hidden" : ""}
                      `}>
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            table: ({ children, ...props }) => (
                              <div className="relative group">
                                <button
                                  onClick={(e) => {
                                    const tableEl = e.currentTarget.parentElement?.querySelector('table');
                                    if (!tableEl) return;
                                    const rows = Array.from(tableEl.querySelectorAll('tr'));
                                    const data = rows.map(row => 
                                      Array.from(row.querySelectorAll('th, td')).map(cell => cell.textContent?.trim() || '')
                                    );
                                    const ws = XLSX.utils.aoa_to_sheet(data);
                                    const wb = XLSX.utils.book_new();
                                    XLSX.utils.book_append_sheet(wb, ws, 'Tablo');
                                    const colWidths = data[0]?.map((_, colIdx) => ({
                                      wch: Math.max(...data.map(row => (row[colIdx]?.length || 10)))
                                    }));
                                    if (colWidths) ws['!cols'] = colWidths;
                                    XLSX.writeFile(wb, 'tablo.xlsx');
                                  }}
                                  className="absolute -top-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-primary/90 shadow-md z-10"
                                  title={t("chat.exportExcel") || "Export to Excel"}
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  Excel
                                </button>
                                <table {...props}>{children}</table>
                              </div>
                            ),
                          }}
                        >
                          {DOMPurify.sanitize(message.content, { ALLOWED_TAGS: [], ALLOWED_ATTR: [], KEEP_CONTENT: true })}
                        </ReactMarkdown>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs opacity-60">
                          {message.timestamp.toLocaleTimeString(language === "tr" ? "tr-TR" : "en-US", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {message.role === "assistant" && (
                          <button
                            onClick={() => { if (isSpeaking) stop(); else speak(message.content); }}
                            className="opacity-50 hover:opacity-100 transition-opacity"
                            title={isSpeaking ? t("chat.stop") : t("chat.listen")}
                          >
                            {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                      <Bot className="w-4 h-4 text-foreground" />
                    </div>
                    <div className="bg-secondary rounded-2xl rounded-tl-md px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">{t("chat.typing")}</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* File Previews */}
              {(selectedImage || selectedVideo || selectedDocument) && (
                <div className="px-4 py-2 border-t border-border/30 flex gap-2 flex-wrap">
                  {selectedImage && (
                    <div className="relative inline-block">
                      <img src={selectedImage} alt="Selected" className="h-20 rounded-lg object-contain" />
                      <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/80 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {selectedVideo && (
                    <div className="relative inline-block">
                      <video src={selectedVideo} className="h-20 rounded-lg object-contain" muted />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Video className="w-6 h-6 text-primary-foreground drop-shadow-lg" />
                      </div>
                      <button onClick={() => setSelectedVideo(null)} className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/80 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {selectedDocument && (
                    <div className="relative inline-block">
                      <div className="h-20 px-4 rounded-lg bg-secondary flex flex-col items-center justify-center gap-1">
                        <FileText className="w-6 h-6 text-primary" />
                        <span className="text-xs text-muted-foreground max-w-[100px] truncate">{selectedDocument.name}</span>
                      </div>
                      <button onClick={() => { setSelectedDocument(null); setSelectedDocumentContent(null); }} className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/80 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Input Area */}
              <div className="p-2 md:p-4 border-t border-border/30">
                <div className="flex items-center gap-1 md:gap-2 p-1.5 md:p-2 rounded-2xl bg-secondary/50">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8 md:h-9 md:w-9 shrink-0" title={t("chat.tools") || "Tools"}>
                        <Plus className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52">
                      <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                        <ImageIcon className="w-4 h-4 mr-2" />
                        {t("chat.addImage")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => videoInputRef.current?.click()}>
                        <Video className="w-4 h-4 mr-2" />
                        {t("chat.addVideo")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => documentInputRef.current?.click()}>
                        <FileText className="w-4 h-4 mr-2" />
                        {t("chat.uploadPdf")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => excelInputRef.current?.click()}>
                        <Table2 className="w-4 h-4 mr-2" />
                        {t("chat.uploadExcel")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={handleImageGeneration}
                        disabled={isGenerating || !input.trim()}
                      >
                        {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                        {t("chat.generateImage")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Template Library */}
                  <TemplateLibrary onSelectTemplate={handleTemplateSelect} />

                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                  <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
                  <input ref={documentInputRef} type="file" accept=".pdf" onChange={handleDocumentSelect} className="hidden" />
                  <input ref={excelInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelSelect} className="hidden" />

                  <input
                    type="text"
                    placeholder={
                      selectedDocument ? `${t("chat.placeholderDoc")} ${selectedDocument.name}...` :
                      selectedVideo ? t("chat.placeholderVideo") : 
                      selectedImage ? t("chat.placeholderImage") : 
                      t("chat.placeholder")
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground px-2 text-sm md:text-base"
                  />

                  <div className="flex gap-2">
                    <Button
                      variant={isListening ? "destructive" : "ghost"}
                      size="icon"
                      onClick={toggleListening}
                      disabled={!isSpeechSupported}
                      className={isListening ? "" : "text-muted-foreground hover:text-foreground"}
                      title={!isSpeechSupported ? (t("chat.speechNotSupported") || "Speech not supported") : (t("chat.voiceCommand") || "Voice Command")}
                    >
                      {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </Button>
                    <Button
                      variant="hero"
                      size="icon"
                      onClick={handleSend}
                      disabled={(!input.trim() && !selectedImage && !selectedVideo && !selectedDocument) || isLoading}
                      title={t("chat.send") || "Send"}
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {isListening && (
                  <div className="flex items-center justify-center gap-2 mt-4 py-2">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-primary rounded-full voice-wave"
                          style={{ height: "16px", animationDelay: `${i * 0.1}s` }}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-primary font-medium">{t("chat.listening")}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Drive Mode OLED Black Screen Overlay */}
      {isDriveMode && (
        <div 
          onClick={handleDriveModeTap}
          className="fixed inset-0 z-[99999] bg-black text-white flex flex-col justify-between p-6 select-none cursor-pointer animate-in fade-in duration-300"
        >
          {/* Top Bar: Minimal Dimmed Status */}
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-primary" />
              <span>{t("chat.driveModeActive") || "Sürüş Modu Aktif"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[11px] text-zinc-400">Hey Vector Dinliyor</span>
            </div>
          </div>

          {/* Center: Subtle Status Visualizer */}
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className={`w-20 h-20 rounded-full border border-zinc-800 flex items-center justify-center bg-zinc-950/60 transition-all ${isListening ? "border-green-500 shadow-lg shadow-green-500/20" : isSpeaking ? "border-primary shadow-lg shadow-primary/20" : ""}`}>
              {isListening ? (
                <Mic className="w-8 h-8 text-green-400 animate-pulse" />
              ) : isSpeaking ? (
                <Volume2 className="w-8 h-8 text-primary animate-bounce" />
              ) : (
                <Car className="w-8 h-8 text-zinc-600" />
              )}
            </div>
            <p className="text-zinc-500 text-xs tracking-wider uppercase font-medium">
              {isListening 
                ? (t("chat.listening") || "Dinleniyor...") 
                : isSpeaking 
                ? (t("chat.speaking") || "Vector Yanıtlıyor...") 
                : "'Vektör' diye seslenin"}
            </p>
          </div>

          {/* Bottom Bar: Instructions to Exit */}
          <div className="flex items-center justify-between text-zinc-600 text-xs pt-4 border-t border-zinc-900/50">
            <span>{t("chat.driveModeExit") || "Çıkmak için ekrana çift dokunun"}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsDriveMode(false);
                toast({ title: "Sürüş Modu Kapatıldı", description: "Normal ekrana dönüldü." });
              }}
              className="text-zinc-400 hover:text-white h-7 text-xs border border-zinc-800 hover:bg-zinc-900"
            >
              Modu Kapat
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};

export default ChatInterface;
