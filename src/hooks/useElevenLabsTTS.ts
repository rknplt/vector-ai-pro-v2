import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ElevenLabsVoice {
  id: string;
  name: string;
  category: string;
}

// Yeni seslerin ve senin belirlediğin favorilerin listesi
export const ELEVENLABS_VOICES: ElevenLabsVoice[] = [
  { id: "LYfSi2g3Frvxg50fRl91", name: "Lisa (Kadın)", category: "Favori" },
  { id: "j82ax9yhzfYwq9lDvRWL", name: "Kadir (Erkek)", category: "Favori" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", category: "Doğal" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", category: "Doğal" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", category: "Doğal" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", category: "Doğal" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", category: "Doğal" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", category: "Doğal" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", category: "Doğal" },
  { id: "N2lVS1w4EtoT3dr4eOWO", name: "Callum", category: "Doğal" },
  { id: "jsCqWAovK2LkecY7zXl4", name: "Freya", category: "Doğal" },
  { id: "g5CIjZEefAph4nQFvHAz", name: "Ethan", category: "Doğal" },
];

const ELEVENLABS_VOICE_KEY = "vector-elevenlabs-voice";

export const useElevenLabsTTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Varsayılan olarak listendeki ilk sesi (Lisa) seçer
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(() => {
    return localStorage.getItem(ELEVENLABS_VOICE_KEY) || ELEVENLABS_VOICES[0].id;
  });

  const selectVoice = useCallback((voiceId: string) => {
    setSelectedVoiceId(voiceId);
    localStorage.setItem(ELEVENLABS_VOICE_KEY, voiceId);
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsLoading(true);
    setIsSpeaking(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      if (!accessToken) {
        throw new Error("Oturum bulunamadı");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ 
            text, 
            voiceId: selectedVoiceId,
            // Belirlediğin %75 ve %70 ayarlarını isteğe ekledik
            voiceSettings: {
              stability: 0.75,
              similarity_boost: 0.70,
              style: 0.0,
              use_speaker_boost: true
            }
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `TTS hatası: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.audioContent) {
        throw new Error("Ses içeriği alınamadı");
      }

      const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        setIsLoading(false);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        setIsLoading(false);
        audioRef.current = null;
      };

      setIsLoading(false);
      await audio.play();
    } catch (error) {
      console.error("ElevenLabs TTS hatası:", error);
      setIsSpeaking(false);
      setIsLoading(false);
      throw error;
    }
  }, [selectedVoiceId]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    isLoading,
    availableVoices: ELEVENLABS_VOICES,
    selectedVoiceId,
    selectVoice,
  };
};
