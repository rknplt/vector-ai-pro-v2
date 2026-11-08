import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition as NativeSpeechRecognition } from "@capacitor-community/speech-recognition";

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
}

export const useSpeechRecognition = (): UseSpeechRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const accumulatedTranscriptRef = useRef("");
  const manualStopRef = useRef(false);

  const isNative = Capacitor.isNativePlatform();
  const isSupported = isNative || (typeof window !== "undefined" && 
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window));

  const createRecognition = useCallback(() => {
    if (!isSupported || isNative) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return null;

    const recognition = new SpeechRecognitionAPI() as SpeechRecognitionInstance;
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "tr-TR";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const currentTranscript = finalTranscript || interimTranscript;
      accumulatedTranscriptRef.current = currentTranscript;
      setTranscript(currentTranscript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      
      if (event.error === "not-allowed") {
        toast({
          variant: "destructive",
          title: "Mikrofon İzni Gerekli",
          description: "Sesli komut için mikrofon erişimine izin verin.",
        });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      
      // On mobile/browser, recognition auto-stops after silence.
      if (!manualStopRef.current && accumulatedTranscriptRef.current) {
        setTranscript(accumulatedTranscriptRef.current);
      }
    };

    return recognition;
  }, [isSupported, isNative]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isNative) {
        NativeSpeechRecognition.removeAllListeners().catch(() => {});
        NativeSpeechRecognition.stop().catch(() => {});
      } else if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
      }
    };
  }, [isNative]);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      toast({
        variant: "destructive",
        title: "Desteklenmiyor",
        description: "Cihazınız sesli komutu desteklemiyor.",
      });
      return;
    }

    manualStopRef.current = false;
    accumulatedTranscriptRef.current = "";
    setTranscript("");

    // Native Android Speech Recognition via Capacitor
    if (isNative) {
      try {
        const permStatus = await NativeSpeechRecognition.checkPermissions();
        if (permStatus.speechRecognition !== "granted") {
          const req = await NativeSpeechRecognition.requestPermissions();
          if (req.speechRecognition !== "granted") {
            toast({
              variant: "destructive",
              title: "Mikrofon İzni Gerekli",
              description: "Lütfen uygulama izinlerinden mikrofona onay verin.",
            });
            return;
          }
        }

        await NativeSpeechRecognition.removeAllListeners();

        await NativeSpeechRecognition.addListener("partialResults", (data: { matches: string[] }) => {
          if (data.matches && data.matches.length > 0) {
            const current = data.matches[0];
            accumulatedTranscriptRef.current = current;
            setTranscript(current);
          }
        });

        await NativeSpeechRecognition.addListener("listeningState", (data: { status: "started" | "stopped" }) => {
          setIsListening(data.status === "started");
        });

        await NativeSpeechRecognition.start({
          language: "tr-TR",
          maxResults: 2,
          partialResults: true,
          popup: false,
        });

        setIsListening(true);
      } catch (error) {
        console.error("Native speech recognition start failed:", error);
        setIsListening(false);
      }
      return;
    }

    // Web Browser Speech Recognition
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }

    const recognition = createRecognition();
    if (!recognition) return;
    
    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch (error) {
      console.error("Failed to start browser speech recognition:", error);
      setIsListening(false);
    }
  }, [isSupported, isNative, createRecognition]);

  const stopListening = useCallback(async () => {
    manualStopRef.current = true;
    setIsListening(false);

    if (isNative) {
      try {
        await NativeSpeechRecognition.stop();
      } catch {
        /* ignore */
      }
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
  }, [isNative]);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
  };
};
