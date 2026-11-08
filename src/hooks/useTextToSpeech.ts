import { useState, useCallback, useRef, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Capacitor } from "@capacitor/core";
import { TextToSpeech as NativeTTS } from "@capacitor-community/text-to-speech";

export interface VoiceOption {
  id: string;
  edgeVoice: string;
  name: string;
  gender: "female" | "male";
  lang: string;
  langCode: string;
  langLabel: string;
  flag: string;
  desc: string;
}

export const LANGUAGE_VOICES: Record<string, VoiceOption[]> = {
  tr: [
    { id: "tr-emel", edgeVoice: "tr-TR-EmelNeural", name: "Emel", gender: "female", lang: "tr", langCode: "tr-TR", langLabel: "Türkçe", flag: "🇹🇷", desc: "Kadın Sesi - Akıcı ve Doğal" },
    { id: "tr-ahmet", edgeVoice: "tr-TR-AhmetNeural", name: "Ahmet", gender: "male", lang: "tr", langCode: "tr-TR", langLabel: "Türkçe", flag: "🇹🇷", desc: "Erkek Sesi - Tok ve Karizmatik" },
  ],
  en: [
    { id: "en-jenny", edgeVoice: "en-US-JennyNeural", name: "Jenny", gender: "female", lang: "en", langCode: "en-US", langLabel: "English", flag: "🇬🇧", desc: "Female - Clear & Natural" },
    { id: "en-guy", edgeVoice: "en-US-GuyNeural", name: "Guy", gender: "male", lang: "en", langCode: "en-US", langLabel: "English", flag: "🇬🇧", desc: "Male - Professional & Deep" },
  ],
  de: [
    { id: "de-katja", edgeVoice: "de-DE-KatjaNeural", name: "Katja", gender: "female", lang: "de", langCode: "de-DE", langLabel: "Deutsch", flag: "🇩🇪", desc: "Weiblich - Natürlich und Klar" },
    { id: "de-conrad", edgeVoice: "de-DE-ConradNeural", name: "Conrad", gender: "male", lang: "de", langCode: "de-DE", langLabel: "Deutsch", flag: "🇩🇪", desc: "Männlich - Tiefe Stimme" },
  ],
  fr: [
    { id: "fr-denise", edgeVoice: "fr-FR-DeniseNeural", name: "Denise", gender: "female", lang: "fr", langCode: "fr-FR", langLabel: "Français", flag: "🇫🇷", desc: "Femme - Douce et Naturelle" },
    { id: "fr-henri", edgeVoice: "fr-FR-HenriNeural", name: "Henri", gender: "male", lang: "fr", langCode: "fr-FR", langLabel: "Français", flag: "🇫🇷", desc: "Homme - Posé et Chaleureux" },
  ],
  es: [
    { id: "es-elvira", edgeVoice: "es-ES-ElviraNeural", name: "Elvira", gender: "female", lang: "es", langCode: "es-ES", langLabel: "Español", flag: "🇪🇸", desc: "Femenino - Cálida y Amable" },
    { id: "es-alvaro", edgeVoice: "es-ES-AlvaroNeural", name: "Álvaro", gender: "male", lang: "es", langCode: "es-ES", langLabel: "Español", flag: "🇪🇸", desc: "Masculino - Fuerte y Firme" },
  ],
  ar: [
    { id: "ar-zariyah", edgeVoice: "ar-SA-ZariyahNeural", name: "Zariyah", gender: "female", lang: "ar", langCode: "ar-SA", langLabel: "العربية", flag: "🇸🇦", desc: "أنثى - طبيعي وفصيح" },
    { id: "ar-hamed", edgeVoice: "ar-SA-HamedNeural", name: "Hamed", gender: "male", lang: "ar", langCode: "ar-SA", langLabel: "العربية", flag: "🇸🇦", desc: "ذكر - واضح ورصين" },
  ],
  ru: [
    { id: "ru-svetlana", edgeVoice: "ru-RU-SvetlanaNeural", name: "Светлана", gender: "female", lang: "ru", langCode: "ru-RU", langLabel: "Русский", flag: "🇷🇺", desc: "Женский - Мягкий и Приятный" },
    { id: "ru-dmitry", edgeVoice: "ru-RU-DmitryNeural", name: "Дмитрий", gender: "male", lang: "ru", langCode: "ru-RU", langLabel: "Русский", flag: "🇷🇺", desc: "Мужской - Уверенный" },
  ],
  pt: [
    { id: "pt-francisca", edgeVoice: "pt-BR-FranciscaNeural", name: "Francisca", gender: "female", lang: "pt", langCode: "pt-BR", langLabel: "Português", flag: "🇵🇹", desc: "Feminino - Clara e Natural" },
    { id: "pt-antonio", edgeVoice: "pt-BR-AntonioNeural", name: "Antônio", gender: "male", lang: "pt", langCode: "pt-BR", langLabel: "Português", flag: "🇵🇹", desc: "Masculino - Firme e Confiante" },
  ],
  ja: [
    { id: "ja-nanami", edgeVoice: "ja-JP-NanamiNeural", name: "七海 (Nanami)", gender: "female", lang: "ja", langCode: "ja-JP", langLabel: "日本語", flag: "🇯🇵", desc: "女性 - 明るく丁寧" },
    { id: "ja-keita", edgeVoice: "ja-JP-KeitaNeural", name: "敬太 (Keita)", gender: "male", lang: "ja", langCode: "ja-JP", langLabel: "日本語", flag: "🇯🇵", desc: "男性 - 落ち着いたトーン" },
  ],
  zh: [
    { id: "zh-xiaoxiao", edgeVoice: "zh-CN-XiaoxiaoNeural", name: "晓晓 (Xiaoxiao)", gender: "female", lang: "zh", langCode: "zh-CN", langLabel: "中文", flag: "🇨🇳", desc: "女性 - 甜美自然" },
    { id: "zh-yunxi", edgeVoice: "zh-CN-YunxiNeural", name: "云希 (Yunxi)", gender: "male", lang: "zh", langCode: "zh-CN", langLabel: "中文", flag: "🇨🇳", desc: "男性 - 阳光稳重" },
  ],
  ko: [
    { id: "ko-sunhi", edgeVoice: "ko-KR-SunHiNeural", name: "선희 (SunHi)", gender: "female", lang: "ko", langCode: "ko-KR", langLabel: "한국어", flag: "🇰🇷", desc: "여성 - 부드럽고 자연스러움" },
    { id: "ko-injoon", edgeVoice: "ko-KR-InJoonNeural", name: "인준 (InJoon)", gender: "male", lang: "ko", langCode: "ko-KR", langLabel: "한국어", flag: "🇰🇷", desc: "남성 - 신뢰감 있는 음성" },
  ],
  tl: [
    { id: "tl-blessica", edgeVoice: "fil-PH-BlessicaNeural", name: "Blessica", gender: "female", lang: "tl", langCode: "fil-PH", langLabel: "Filipino", flag: "🇵🇭", desc: "Babae - Natural at Malinaw" },
    { id: "tl-angelo", edgeVoice: "fil-PH-AngeloNeural", name: "Angelo", gender: "male", lang: "tl", langCode: "fil-PH", langLabel: "Filipino", flag: "🇵🇭", desc: "Lalaki - Magalang" },
  ],
  hi: [
    { id: "hi-swara", edgeVoice: "hi-IN-SwaraNeural", name: "Swara", gender: "female", lang: "hi", langCode: "hi-IN", langLabel: "हिन्दी", flag: "🇮🇳", desc: "महिला - स्पष्ट और मधुर" },
    { id: "hi-madhur", edgeVoice: "hi-IN-MadhurNeural", name: "Madhur", gender: "male", lang: "hi", langCode: "hi-IN", langLabel: "हिन्दी", flag: "🇮🇳", desc: "पुरुष - शांत और प्रभावी" },
  ],
};

export const TEST_PHRASES: Record<string, string> = {
  tr: "Merhaba, ben Vector, size nasıl yardımcı olabilirim?",
  en: "Hello, I am Vector, how can I help you today?",
  de: "Hallo, ich bin Vector, wie kann ich Ihnen heute helfen?",
  fr: "Bonjour, je suis Vector, comment puis-je vous aider aujourd'hui?",
  es: "Hola, soy Vector, ¿cómo puedo ayudarte hoy?",
  ar: "مرحباً، أنا فيكتور، كيف يمكنني مساعدتك اليوم؟",
  ru: "Привет, я Вектор, чем я могу вам помочь сегодня?",
  pt: "Olá, eu sou o Vector, como posso ajudar você hoje?",
  ja: "こんにちは、Vectorです。何かお手伝いできることはありますか？",
  zh: "你好，我是Vector，今天有什么可以帮助您的？",
  ko: "안녕하세요, 저는 Vector입니다. 오늘 무엇을 도와드릴까요?",
  tl: "Kumusta, ako si Vector, paano kita matutulungan ngayon?",
  hi: "नमस्ते, मैं वेक्टर हूँ, आज मैं आपकी क्या मदद कर सकता हूँ?",
};

export const cleanSpeechText = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^>\s+/gm, "")
    .replace(/^[-*+•]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/[*#~_`]/g, "")
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{231A}-\u{231B}\u{23E9}-\u{23FA}\u{25AA}-\u{25FE}]/gu, "")
    .replace(/\.{2,}/g, ".")
    .replace(/!{2,}/g, "!")
    .replace(/\?{2,}/g, "?")
    .replace(/([a-zA-ZÇĞİÖŞÜçğıöşü\u0600-\u06FF\u0400-\u04FF]+)!\s+/gu, "$1, ")
    .replace(/\s+/g, " ")
    .trim();
};

export const DEFAULT_VOICE_PER_LANG: Record<string, string> = {
  tr: "tr-emel",
  en: "en-jenny",
  de: "de-katja",
  fr: "fr-denise",
  es: "es-elvira",
  ar: "ar-zariyah",
  ru: "ru-svetlana",
  pt: "pt-francisca",
  ja: "ja-nanami",
  zh: "zh-xiaoxiao",
  ko: "ko-sunhi",
  tl: "tl-blessica",
  hi: "hi-swara",
};

const SELECTED_VOICE_STORAGE_KEY = "vector-user-voice-id";
const SPEED_STORAGE_KEY = "vector-user-voice-speed";

export const useTextToSpeech = () => {
  const { language } = useLanguage();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(() => {
    const saved = localStorage.getItem(SELECTED_VOICE_STORAGE_KEY);
    if (saved) return saved;
    return DEFAULT_VOICE_PER_LANG[language] || "tr-emel";
  });
  const [speakingSpeed, setSpeakingSpeed] = useState<string>(() => {
    return localStorage.getItem(SPEED_STORAGE_KEY) || "+20%";
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const getVoiceDetails = useCallback((voiceId: string): VoiceOption => {
    for (const langKey of Object.keys(LANGUAGE_VOICES)) {
      const found = LANGUAGE_VOICES[langKey].find(v => v.id === voiceId);
      if (found) return found;
    }
    return LANGUAGE_VOICES.tr[0];
  }, []);

  useEffect(() => {
    const currentVoice = getVoiceDetails(selectedVoiceId);
    if (currentVoice.lang !== language) {
      const nextVoice = DEFAULT_VOICE_PER_LANG[language] || "en-jenny";
      setSelectedVoiceId(nextVoice);
      localStorage.setItem(SELECTED_VOICE_STORAGE_KEY, nextVoice);
    }
  }, [language, selectedVoiceId, getVoiceDetails]);

  const selectVoice = useCallback((voiceId: string) => {
    setSelectedVoiceId(voiceId);
    localStorage.setItem(SELECTED_VOICE_STORAGE_KEY, voiceId);
  }, []);

  const changeSpeed = useCallback((speed: string) => {
    setSpeakingSpeed(speed);
    localStorage.setItem(SPEED_STORAGE_KEY, speed);
  }, []);

  const stop = useCallback(() => {
    if (Capacitor.isNativePlatform()) {
      NativeTTS.stop().catch(() => {});
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    }
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  const speakNativeWeb = useCallback((cleanText: string, langCode: string, speed: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setIsSpeaking(false);
        setIsLoading(false);
        resolve();
        return;
      }

      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = langCode || "tr-TR";
        
        const rateNum = speed === "+35%" ? 1.35 : speed === "+20%" ? 1.15 : 1.0;
        utterance.rate = rateNum;

        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const langPrefix = langCode.slice(0, 2).toLowerCase();
          const match = voices.find(v => v.lang.replace('_', '-').toLowerCase().startsWith(langPrefix));
          if (match) utterance.voice = match;
        }

        utterance.onstart = () => {
          setIsSpeaking(true);
          setIsLoading(false);
        };
        utterance.onend = () => {
          setIsSpeaking(false);
          setIsLoading(false);
          resolve();
        };
        utterance.onerror = (e) => {
          console.warn("speechSynthesis utterance event:", e);
          setIsSpeaking(false);
          setIsLoading(false);
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error("speechSynthesis invocation failed:", err);
        setIsSpeaking(false);
        setIsLoading(false);
        resolve();
      }
    });
  }, []);

  const speak = useCallback(async (text: string, overrideVoiceId?: string, overrideSpeed?: string) => {
    if (!text.trim()) return;
    const cleanText = cleanSpeechText(text);
    if (!cleanText.trim()) return;

    stop();
    setIsLoading(true);

    const voice = getVoiceDetails(overrideVoiceId || selectedVoiceId);
    const speedParam = overrideSpeed || speakingSpeed;

    // 1. Android & iOS native platform: Use Android OS TextToSpeech Engine directly
    if (Capacitor.isNativePlatform()) {
      try {
        await NativeTTS.stop();
        setIsSpeaking(true);
        setIsLoading(false);

        await NativeTTS.speak({
          text: cleanText,
          lang: voice.langCode || "tr-TR",
          rate: speedParam === "+35%" ? 1.35 : speedParam === "+20%" ? 1.15 : 1.0,
          category: "playback",
        });

        setIsSpeaking(false);
        setIsLoading(false);
        return;
      } catch (nativeErr) {
        console.warn("NativeTTS error, falling back to Web Speech:", nativeErr);
      }
    }

    // 2. Web Dev/Preview server: Use Neural Edge TTS via /api/tts proxy if reachable
    const isDevOrPreview = typeof window !== "undefined" && (window.location.port === "3000" || window.location.port === "5173" || window.location.port === "8080");

    if (isDevOrPreview) {
      try {
        const url = `/api/tts?voice=${encodeURIComponent(voice.edgeVoice)}&text=${encodeURIComponent(cleanText)}&rate=${encodeURIComponent(speedParam)}`;
        const response = await fetch(url);
        
        if (response.ok) {
          const audioBlob = await response.blob();
          const blobUrl = URL.createObjectURL(audioBlob);

          const audio = new Audio(blobUrl);
          audioRef.current = audio;

          audio.onplay = () => {
            setIsSpeaking(true);
            setIsLoading(false);
          };

          audio.onended = () => {
            setIsSpeaking(false);
            setIsLoading(false);
            URL.revokeObjectURL(blobUrl);
            audioRef.current = null;
          };

          audio.onerror = () => {
            setIsSpeaking(false);
            setIsLoading(false);
            URL.revokeObjectURL(blobUrl);
            audioRef.current = null;
          };

          await audio.play();
          return;
        }
      } catch (fetchErr) {
        console.warn("Dev TTS endpoint failed, falling back to native TTS:", fetchErr);
      }
    }

    // 3. Web browsers general fallback: Web SpeechSynthesis
    await speakNativeWeb(cleanText, voice.langCode, speedParam);
  }, [selectedVoiceId, speakingSpeed, getVoiceDetails, stop, speakNativeWeb]);

  return {
    speak,
    stop,
    isSpeaking,
    isLoading,
    selectedVoiceId,
    selectVoice,
    speakingSpeed,
    changeSpeed,
    getVoiceDetails,
    voicesByLanguage: LANGUAGE_VOICES,
  };
};
