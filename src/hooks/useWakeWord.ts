import { useState, useCallback, useRef, useEffect } from "react";

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
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface UseWakeWordReturn {
  isWakeWordEnabled: boolean;
  isWakeWordListening: boolean;
  enableWakeWord: () => void;
  disableWakeWord: () => void;
  toggleWakeWord: () => void;
  isSupported: boolean;
}

const WAKE_PHRASES = [
  "hey vektör", "hey vector", "hey vektor",
  "heyvektor", "heyvektör",
  "hey faktör", "hey viktor", "hey victor",
  "selam vektör", "selam vector",
  "merhaba vektör", "merhaba vector",
  "ey vektör", "ey vector", "e vektör", "e vector",
  "vektör", "vektörüm", "vektör bey", "vektör abi",
  "tamam vektör", "ok vektör", "ok vector",
  "hey vec", "hey vek", "hei vektör", "hei vector",
  "hey vekt", "hey vektör'ü",
];

export const useWakeWord = (onWakeWordDetected: () => void): UseWakeWordReturn => {
  const [isWakeWordEnabled, setIsWakeWordEnabled] = useState(false);
  const [isWakeWordListening, setIsWakeWordListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEnabledRef = useRef(false);
  const onWakeWordDetectedRef = useRef(onWakeWordDetected);
  
  // Keep callback ref up to date without re-creating recognition
  useEffect(() => {
    onWakeWordDetectedRef.current = onWakeWordDetected;
  }, [onWakeWordDetected]);

  const isSupported = typeof window !== "undefined" && 
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const checkForWakeWord = useCallback((transcript: string): boolean => {
    const normalizedTranscript = transcript.toLowerCase().trim();
    return WAKE_PHRASES.some(phrase => normalizedTranscript.includes(phrase));
  }, []);

  const stopCurrentRecognition = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    setIsWakeWordListening(false);
  }, []);

  const startWakeWordDetection = useCallback(() => {
    if (!isSupported || !isEnabledRef.current) return;

    // Stop any existing instance first
    stopCurrentRecognition();

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognitionAPI() as SpeechRecognitionInstance;
      recognitionRef.current = recognition;
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "tr-TR";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (checkForWakeWord(transcript)) {
            console.log("Wake word detected!", transcript);
            // Stop wake word detection before triggering command mode
            try { recognition.abort(); } catch { /* ignore */ }
            recognitionRef.current = null;
            setIsWakeWordListening(false);
            
            // Small delay to ensure recognition is fully stopped before starting command mode
            setTimeout(() => {
              onWakeWordDetectedRef.current();
            }, 300);
            return;
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.log("Wake word recognition error:", event.error);
        setIsWakeWordListening(false);
        
        if (event.error !== "not-allowed" && event.error !== "aborted" && isEnabledRef.current) {
          restartTimeoutRef.current = setTimeout(() => {
            startWakeWordDetection();
          }, 2000);
        }
      };

      recognition.onend = () => {
        setIsWakeWordListening(false);
        
        // Auto-restart if still enabled (mobile auto-stops after silence)
        if (isEnabledRef.current) {
          restartTimeoutRef.current = setTimeout(() => {
            startWakeWordDetection();
          }, 1000);
        }
      };

      recognition.start();
      setIsWakeWordListening(true);
    } catch (error) {
      console.error("Failed to start wake word detection:", error);
      setIsWakeWordListening(false);
      
      // Retry after error
      if (isEnabledRef.current) {
        restartTimeoutRef.current = setTimeout(() => {
          startWakeWordDetection();
        }, 3000);
      }
    }
  }, [isSupported, checkForWakeWord, stopCurrentRecognition]);

  const enableWakeWord = useCallback(() => {
    if (!isSupported) return;
    isEnabledRef.current = true;
    setIsWakeWordEnabled(true);
    startWakeWordDetection();
  }, [isSupported, startWakeWordDetection]);

  const disableWakeWord = useCallback(() => {
    isEnabledRef.current = false;
    setIsWakeWordEnabled(false);
    stopCurrentRecognition();
  }, [stopCurrentRecognition]);

  const toggleWakeWord = useCallback(() => {
    if (isWakeWordEnabled) {
      disableWakeWord();
    } else {
      enableWakeWord();
    }
  }, [isWakeWordEnabled, enableWakeWord, disableWakeWord]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isEnabledRef.current = false;
      stopCurrentRecognition();
    };
  }, [stopCurrentRecognition]);

  return {
    isWakeWordEnabled,
    isWakeWordListening,
    enableWakeWord,
    disableWakeWord,
    toggleWakeWord,
    isSupported,
  };
};
