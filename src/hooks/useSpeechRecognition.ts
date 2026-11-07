import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

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

  const isSupported = typeof window !== "undefined" && 
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const createRecognition = useCallback(() => {
    if (!isSupported) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
      
      // On mobile, recognition auto-stops after silence.
      // If we have accumulated transcript and user didn't manually stop,
      // keep the transcript available for auto-send.
      if (!manualStopRef.current && accumulatedTranscriptRef.current) {
        // Trigger a final transcript update so ChatInterface can detect it
        setTranscript(accumulatedTranscriptRef.current);
      }
    };

    return recognition;
  }, [isSupported]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      toast({
        variant: "destructive",
        title: "Desteklenmiyor",
        description: "Tarayıcınız sesli komutu desteklemiyor.",
      });
      return;
    }

    // Create a fresh recognition instance each time (important for mobile)
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }

    manualStopRef.current = false;
    accumulatedTranscriptRef.current = "";
    setTranscript("");
    
    const recognition = createRecognition();
    if (!recognition) return;
    
    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      setIsListening(false);
    }
  }, [isSupported, createRecognition]);

  const stopListening = useCallback(() => {
    manualStopRef.current = true;
    setIsListening(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
  };
};
