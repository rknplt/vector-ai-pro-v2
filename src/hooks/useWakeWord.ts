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
  "selam vektör", "selam vector", "selam vektor",
  "merhaba vektör", "merhaba vector", "merhaba vektor",
  "ey vektör", "ey vector", "e vektör", "e vector",
  "vektör", "vector", "vektor", "viktor", "victor",
  "vektörüm", "vektör bey", "vektör abi", "vektör dinle",
  "tamam vektör", "ok vektör", "ok vector",
  "hey vec", "hey vek", "hei vektör", "hei vector",
  "hey vekt", "hey vektör'ü",
];

const WAKE_WORD_STORAGE_KEY = "vector-wake-word-enabled";

export const useWakeWord = (
  onWakeWordDetected: () => void,
  isPaused: boolean = false
): UseWakeWordReturn => {
  const isNative = Capacitor.isNativePlatform();
  const [isWakeWordEnabled, setIsWakeWordEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(WAKE_WORD_STORAGE_KEY);
    if (saved !== null) return saved === "true";
    // Enable by default on native mobile app so "Hey Vector" works immediately out of the box!
    return isNative;
  });

  const [isWakeWordListening, setIsWakeWordListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEnabledRef = useRef(isWakeWordEnabled);
  const isPausedRef = useRef(isPaused);
  const onWakeWordDetectedRef = useRef(onWakeWordDetected);
  const isStartingRef = useRef(false);

  const isSupported = isNative || (typeof window !== "undefined" && 
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window));

  useEffect(() => {
    isEnabledRef.current = isWakeWordEnabled;
    localStorage.setItem(WAKE_WORD_STORAGE_KEY, String(isWakeWordEnabled));
  }, [isWakeWordEnabled]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    onWakeWordDetectedRef.current = onWakeWordDetected;
  }, [onWakeWordDetected]);

  const checkForWakeWord = useCallback((transcript: string): boolean => {
    const normalized = transcript.toLowerCase().trim();
    return WAKE_PHRASES.some(phrase => normalized.includes(phrase));
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
    if (!isSupported || !isEnabledRef.current || isPausedRef.current || isStartingRef.current) return;
    isStartingRef.current = true;

    try {
      // Native Android Recognition via Capacitor
      if (isNative) {
        try {
          const permStatus = await NativeSpeechRecognition.checkPermissions();
          if (permStatus.speechRecognition !== "granted") {
            const req = await NativeSpeechRecognition.requestPermissions();
            if (req.speechRecognition !== "granted") {
              setIsWakeWordListening(false);
              isStartingRef.current = false;
              return;
            }
          }

          await NativeSpeechRecognition.removeAllListeners();

          await NativeSpeechRecognition.addListener("partialResults", (data: { matches: string[] }) => {
            const transcript = (data.matches || []).join(" ").toLowerCase();
            if (checkForWakeWord(transcript)) {
              console.log("Wake word detected on Android native:", transcript);
              if (restartTimeoutRef.current) {
                clearTimeout(restartTimeoutRef.current);
                restartTimeoutRef.current = null;
              }
              NativeSpeechRecognition.stop().catch(() => {});
              setIsWakeWordListening(false);

              setTimeout(() => {
                if (onWakeWordDetectedRef.current) {
                  onWakeWordDetectedRef.current();
                }
              }, 200);
            }
          });

          await NativeSpeechRecognition.addListener("listeningState", (data: { status: "started" | "stopped" }) => {
            setIsWakeWordListening(data.status === "started");
            if (data.status === "stopped" && isEnabledRef.current && !isPausedRef.current) {
              if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
              restartTimeoutRef.current = setTimeout(() => {
                if (isEnabledRef.current && !isPausedRef.current) {
                  startWakeWordDetection();
                }
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
          console.warn("Native speech start notice (recovering in 1.5s):", error);
          setIsWakeWordListening(false);
          if (isEnabledRef.current && !isPausedRef.current) {
            if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
            restartTimeoutRef.current = setTimeout(() => {
              if (isEnabledRef.current && !isPausedRef.current) {
                startWakeWordDetection();
              }
            }, 1500);
          }
        } finally {
          isStartingRef.current = false;
        }
        return;
      }

      // Web Browser recognition
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognitionAPI) {
        isStartingRef.current = false;
        return;
      }

      await stopCurrentRecognition();

      const recognition = new SpeechRecognitionAPI() as SpeechRecognitionInstance;
      recognitionRef.current = recognition;
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "tr-TR";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (checkForWakeWord(transcript)) {
            console.log("Wake word detected on web:", transcript);
            if (restartTimeoutRef.current) {
              clearTimeout(restartTimeoutRef.current);
              restartTimeoutRef.current = null;
            }
            try { recognition.abort(); } catch { /* ignore */ }
            recognitionRef.current = null;
            setIsWakeWordListening(false);
            
            setTimeout(() => {
              if (onWakeWordDetectedRef.current) {
                onWakeWordDetectedRef.current();
              }
            }, 200);
            return;
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsWakeWordListening(false);
        if (event.error !== "not-allowed" && event.error !== "aborted" && isEnabledRef.current && !isPausedRef.current) {
          if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = setTimeout(() => {
            if (isEnabledRef.current && !isPausedRef.current) {
              startWakeWordDetection();
            }
          }, 2000);
        }
      };

      recognition.onend = () => {
        setIsWakeWordListening(false);
        if (isEnabledRef.current && !isPausedRef.current) {
          if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = setTimeout(() => {
            if (isEnabledRef.current && !isPausedRef.current) {
              startWakeWordDetection();
            }
          }, 1000);
        }
      };

      recognition.start();
      setIsWakeWordListening(true);
    } catch (error) {
      console.error("Failed to start wake word detection:", error);
      setIsWakeWordListening(false);
      if (isEnabledRef.current && !isPausedRef.current) {
        if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = setTimeout(() => {
          if (isEnabledRef.current && !isPausedRef.current) {
            startWakeWordDetection();
          }
        }, 3000);
      }
    } finally {
      isStartingRef.current = false;
    }
  }, [isSupported, isNative, checkForWakeWord, stopCurrentRecognition]);

  // Android Native Watchdog: Android SpeechRecognizer times out after silence.
  // The watchdog keeps wake word permanently active without ever dying,
  // while strictly respecting the paused state during active chat speech or TTS playback.
  useEffect(() => {
    if (!isNative || !isWakeWordEnabled) return;

    const watchdog = setInterval(async () => {
      if (!isEnabledRef.current || isPausedRef.current || isStartingRef.current) return;
      try {
        const { listening } = await NativeSpeechRecognition.isListening();
        if (!listening && isEnabledRef.current && !isPausedRef.current) {
          startWakeWordDetection();
        }
      } catch {
        // ignore
      }
    }, 2000);

    return () => clearInterval(watchdog);
  }, [isNative, isWakeWordEnabled, startWakeWordDetection]);

  // Handle pause / resume transitions smoothly
  useEffect(() => {
    if (isPaused) {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      stopCurrentRecognition();
    } else if (isWakeWordEnabled) {
      const timer = setTimeout(() => {
        if (isEnabledRef.current && !isPausedRef.current) {
          startWakeWordDetection();
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isPaused, isWakeWordEnabled, startWakeWordDetection, stopCurrentRecognition]);

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
