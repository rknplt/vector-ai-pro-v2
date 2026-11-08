import { useState, useCallback, useRef, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition as NativeSpeechRecognition } from "@capacitor-community/speech-recognition";

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
  "vektör", "vektörüm", "vektör bey", "vektör abi", "vector",
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

  const isNative = Capacitor.isNativePlatform();
  const isSupported = isNative || (typeof window !== "undefined" && 
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window));

  // Keep callback ref up to date without re-creating recognition
  useEffect(() => {
    onWakeWordDetectedRef.current = onWakeWordDetected;
  }, [onWakeWordDetected]);

  const checkForWakeWord = useCallback((transcript: string): boolean => {
    const normalizedTranscript = transcript.toLowerCase().trim();
    return WAKE_PHRASES.some(phrase => normalizedTranscript.includes(phrase));
  }, []);

  const stopCurrentRecognition = useCallback(async () => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (isNative) {
      try {
        await NativeSpeechRecognition.removeAllListeners();
        await NativeSpeechRecognition.stop();
      } catch {
        /* ignore */
      }
    } else if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }

    setIsWakeWordListening(false);
  }, [isNative]);

  const startWakeWordDetection = useCallback(async () => {
    if (!isSupported || !isEnabledRef.current) return;

    // Stop any existing instance first
    await stopCurrentRecognition();

    // Native Capacitor Android recognition
    if (isNative) {
      try {
        const permStatus = await NativeSpeechRecognition.checkPermissions();
        if (permStatus.speechRecognition !== "granted") {
          const req = await NativeSpeechRecognition.requestPermissions();
          if (req.speechRecognition !== "granted") {
            setIsWakeWordListening(false);
            return;
          }
        }

        await NativeSpeechRecognition.removeAllListeners();

        await NativeSpeechRecognition.addListener("partialResults", (data: { matches: string[] }) => {
          const transcript = (data.matches || []).join(" ").toLowerCase();
          if (checkForWakeWord(transcript)) {
            console.log("Wake word detected on native!", transcript);
            NativeSpeechRecognition.stop().catch(() => {});
            setIsWakeWordListening(false);

            setTimeout(() => {
              if (onWakeWordDetectedRef.current) {
                onWakeWordDetectedRef.current();
              }
            }, 300);
          }
        });

        await NativeSpeechRecognition.addListener("listeningState", (data: { status: "started" | "stopped" }) => {
          setIsWakeWordListening(data.status === "started");
          
          // Auto-restart loop for continuous wake word on Android
          if (data.status === "stopped" && isEnabledRef.current) {
            restartTimeoutRef.current = setTimeout(() => {
              startWakeWordDetection();
            }, 800);
          }
        });

        await NativeSpeechRecognition.start({
          language: "tr-TR",
          maxResults: 2,
          partialResults: true,
          popup: false,
        });

        setIsWakeWordListening(true);
      } catch (error) {
        console.warn("Native wake word error, retrying in 2s:", error);
        setIsWakeWordListening(false);
        if (isEnabledRef.current) {
          restartTimeoutRef.current = setTimeout(() => {
            startWakeWordDetection();
          }, 2000);
        }
      }
      return;
    }

    // Web Browser recognition
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognitionAPI) return;

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
            try { recognition.abort(); } catch { /* ignore */ }
            recognitionRef.current = null;
            setIsWakeWordListening(false);
            
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
        
        // Auto-restart if still enabled
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
      
      if (isEnabledRef.current) {
        restartTimeoutRef.current = setTimeout(() => {
          startWakeWordDetection();
        }, 3000);
      }
    }
  }, [isSupported, isNative, checkForWakeWord, stopCurrentRecognition]);

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
