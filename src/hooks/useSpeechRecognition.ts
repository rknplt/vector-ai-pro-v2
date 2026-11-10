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
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

export const LANG_TO_LOCALE: Record<string, string> = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
  ar: "ar-SA",
  ru: "ru-RU",
  pt: "pt-BR",
  ja: "ja-JP",
  zh: "zh-CN",
  ko: "ko-KR",
  tl: "fil-PH",
  hi: "hi-IN",
};

export const WAKE_PHRASES = [
  "hey vektör", "hey vector", "hey vektor", "hey faktör", "hey viktor", "hey victor",
  "selam vektör", "selam vector", "merhaba vektör", "merhaba vector",
  "vektör", "vector", "vektor", "viktor", "victor", "vektörüm", "vektör bey",
  "tamam vektör", "tamam vector", "ok vektör", "ok vector",
];

export function stripWakeWord(text: string): string {
  let cleaned = text.trim();
  const lower = cleaned.toLowerCase();
  for (const phrase of WAKE_PHRASES) {
    if (lower.startsWith(phrase)) {
      cleaned = cleaned.slice(phrase.length).trim();
      cleaned = cleaned.replace(/^[,.?!:\s]+/, "").trim();
      break;
    }
  }
  return cleaned;
}

export function playWakeChime() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.20);
      osc.start();
      osc.stop(ctx.currentTime + 0.20);
    }
  } catch {
    /* ignore */
  }
}

export interface UseSpeechRecognitionOptions {
  language?: string;
  isPaused?: boolean;
  onWakeWordDetected?: () => void;
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
  isWakeWordEnabled: boolean;
  isWakeWordListening: boolean;
  enableWakeWord: () => void;
  disableWakeWord: () => void;
  toggleWakeWord: () => void;
}

const WAKE_WORD_STORAGE_KEY = "vector-wake-word-enabled";

export const useSpeechRecognition = ({
  language = "tr",
  isPaused = false,
  onWakeWordDetected,
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn => {
  const isNative = Capacitor.isNativePlatform();
  const isSupported = isNative || (typeof window !== "undefined" && 
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window));

  const [isWakeWordEnabled, setIsWakeWordEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(WAKE_WORD_STORAGE_KEY);
    if (saved !== null) return saved === "true";
    return isNative;
  });

  const [isListening, setIsListening] = useState(false);
  const [isWakeWordListening, setIsWakeWordListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  const modeRef = useRef<"IDLE" | "WAKE_WORD" | "COMMAND">("IDLE");
  const isPausedRef = useRef(isPaused);
  const isWakeWordEnabledRef = useRef(isWakeWordEnabled);
  const onWakeWordDetectedRef = useRef(onWakeWordDetected);
  const accumulatedTranscriptRef = useRef("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeLocale = LANG_TO_LOCALE[language] || "tr-TR";

  useEffect(() => {
    isWakeWordEnabledRef.current = isWakeWordEnabled;
    localStorage.setItem(WAKE_WORD_STORAGE_KEY, String(isWakeWordEnabled));
  }, [isWakeWordEnabled]);

  useEffect(() => {
    onWakeWordDetectedRef.current = onWakeWordDetected;
  }, [onWakeWordDetected]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Unified Session Starter (Android Native or Web Speech)
  const startSession = useCallback(async (targetMode: "WAKE_WORD" | "COMMAND") => {
    if (!isSupported || isPausedRef.current) return;

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    // 1. Native Android Implementation via Capacitor
    if (isNative) {
      try {
        const permStatus = await NativeSpeechRecognition.checkPermissions();
        if (permStatus.speechRecognition !== "granted") {
          const req = await NativeSpeechRecognition.requestPermissions();
          if (req.speechRecognition !== "granted") {
            setIsListening(false);
            setIsWakeWordListening(false);
            modeRef.current = "IDLE";
            return;
          }
        }

        await NativeSpeechRecognition.removeAllListeners();

        await NativeSpeechRecognition.addListener("partialResults", (data: { matches: string[] }) => {
          const raw = (data.matches || []).join(" ").trim();
          if (!raw) return;

          const lower = raw.toLowerCase();

          // A) Waiting for Wake Word ("Vector")
          if (modeRef.current === "WAKE_WORD") {
            const matched = WAKE_PHRASES.some(phrase => lower.includes(phrase));
            if (matched) {
              console.log("Wake word recognized seamlessly on Android:", raw);
              modeRef.current = "COMMAND";
              setIsListening(true);
              playWakeChime();
              if (onWakeWordDetectedRef.current) {
                onWakeWordDetectedRef.current();
              }

              // Extract any command spoken in the same breath
              const commandText = stripWakeWord(raw);
              if (commandText) {
                accumulatedTranscriptRef.current = commandText;
                setTranscript(commandText);
              } else {
                accumulatedTranscriptRef.current = "";
                setTranscript("");
              }
              return;
            }
          }

          // B) Actively Recording Command
          if (modeRef.current === "COMMAND") {
            const commandText = stripWakeWord(raw);
            accumulatedTranscriptRef.current = commandText;
            setTranscript(commandText);
          }
        });

        await NativeSpeechRecognition.addListener("listeningState", (data: { status: "started" | "stopped" }) => {
          setIsWakeWordListening(data.status === "started");

          if (data.status === "stopped") {
            if (modeRef.current === "COMMAND") {
              // Sentence finished! Let ChatInterface send the accumulated transcript
              setIsListening(false);
              modeRef.current = "IDLE";
            } else if (modeRef.current === "WAKE_WORD" && isWakeWordEnabledRef.current && !isPausedRef.current) {
              // Silence timeout during idle wake-word: restart smoothly in 400ms
              if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
              restartTimerRef.current = setTimeout(() => {
                if (modeRef.current === "WAKE_WORD" && isWakeWordEnabledRef.current && !isPausedRef.current) {
                  startSession("WAKE_WORD");
                }
              }, 400);
            }
          }
        });

        modeRef.current = targetMode;
        if (targetMode === "COMMAND") {
          setIsListening(true);
        }

        await NativeSpeechRecognition.start({
          language: activeLocale,
          maxResults: 2,
          partialResults: true,
          popup: false,
        });

        setIsWakeWordListening(true);
      } catch (err) {
        console.warn("SpeechRecognition start notice:", err);
        setIsListening(false);
        setIsWakeWordListening(false);
        modeRef.current = "IDLE";
        if (isWakeWordEnabledRef.current && !isPausedRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (isWakeWordEnabledRef.current && !isPausedRef.current) {
              startSession("WAKE_WORD");
            }
          }, 1200);
        }
      }
      return;
    }

    // 2. Web Browser Implementation (Web Speech API)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognitionAPI() as SpeechRecognitionInstance;
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = activeLocale;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const raw = (finalTranscript || interimTranscript).trim();
      if (!raw) return;

      const lower = raw.toLowerCase();

      if (modeRef.current === "WAKE_WORD") {
        const matched = WAKE_PHRASES.some(phrase => lower.includes(phrase));
        if (matched) {
          console.log("Wake word recognized on Web:", raw);
          modeRef.current = "COMMAND";
          setIsListening(true);
          playWakeChime();
          if (onWakeWordDetectedRef.current) {
            onWakeWordDetectedRef.current();
          }

          const commandText = stripWakeWord(raw);
          if (commandText) {
            accumulatedTranscriptRef.current = commandText;
            setTranscript(commandText);
          } else {
            accumulatedTranscriptRef.current = "";
            setTranscript("");
          }
          return;
        }
      }

      if (modeRef.current === "COMMAND") {
        const commandText = stripWakeWord(raw);
        accumulatedTranscriptRef.current = commandText;
        setTranscript(commandText);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn("Web speech error:", event.error);
      if (modeRef.current === "COMMAND") {
        setIsListening(false);
        modeRef.current = "IDLE";
      }
      setIsWakeWordListening(false);
      if (isWakeWordEnabledRef.current && !isPausedRef.current && event.error !== "not-allowed") {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (isWakeWordEnabledRef.current && !isPausedRef.current) {
            startSession("WAKE_WORD");
          }
        }, 1500);
      }
    };

    recognition.onend = () => {
      setIsWakeWordListening(false);
      if (modeRef.current === "COMMAND") {
        setIsListening(false);
        modeRef.current = "IDLE";
      } else if (isWakeWordEnabledRef.current && !isPausedRef.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (isWakeWordEnabledRef.current && !isPausedRef.current) {
            startSession("WAKE_WORD");
          }
        }, 600);
      }
    };

    modeRef.current = targetMode;
    if (targetMode === "COMMAND") {
      setIsListening(true);
    }

    try {
      recognition.start();
      setIsWakeWordListening(true);
    } catch {
      /* ignore */
    }
  }, [isSupported, isNative, activeLocale]);

  // Pause / Resume handler (e.g. while AI is speaking or thinking)
  useEffect(() => {
    isPausedRef.current = isPaused;

    if (isPaused) {
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      if (isNative) {
        NativeSpeechRecognition.stop().catch(() => {});
      } else if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
      }
      modeRef.current = "IDLE";
      setIsListening(false);
      setIsWakeWordListening(false);
    } else if (isWakeWordEnabled) {
      const timer = setTimeout(() => {
        if (!isPausedRef.current && isWakeWordEnabledRef.current && modeRef.current === "IDLE") {
          startSession("WAKE_WORD");
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isPaused, isWakeWordEnabled, isNative, startSession]);

  // Manual Trigger: User taps mic button
  const startListening = useCallback(async () => {
    accumulatedTranscriptRef.current = "";
    setTranscript("");

    // If native recognizer is already running in WAKE_WORD mode, transition instantly without session teardown!
    if (isNative && modeRef.current === "WAKE_WORD" && isWakeWordListening) {
      modeRef.current = "COMMAND";
      setIsListening(true);
      playWakeChime();
      return;
    }

    playWakeChime();
    await startSession("COMMAND");
  }, [isNative, isWakeWordListening, startSession]);

  const stopListening = useCallback(async () => {
    setIsListening(false);
    modeRef.current = "IDLE";

    if (isNative) {
      try {
        await NativeSpeechRecognition.stop();
      } catch {
        /* ignore */
      }
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        /* ignore */
      }
    }
  }, [isNative]);

  const enableWakeWord = useCallback(() => {
    setIsWakeWordEnabled(true);
    isWakeWordEnabledRef.current = true;
    if (!isPausedRef.current && modeRef.current === "IDLE") {
      startSession("WAKE_WORD");
    }
  }, [startSession]);

  const disableWakeWord = useCallback(() => {
    setIsWakeWordEnabled(false);
    isWakeWordEnabledRef.current = false;
    if (modeRef.current === "WAKE_WORD") {
      stopListening();
    }
  }, [stopListening]);

  const toggleWakeWord = useCallback(() => {
    if (isWakeWordEnabled) {
      disableWakeWord();
    } else {
      enableWakeWord();
    }
  }, [isWakeWordEnabled, enableWakeWord, disableWakeWord]);

  // Initial activation on launch
  useEffect(() => {
    if (isWakeWordEnabled && !isPaused) {
      const timer = setTimeout(() => {
        if (!isPausedRef.current && isWakeWordEnabledRef.current && modeRef.current === "IDLE") {
          startSession("WAKE_WORD");
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isWakeWordEnabled, isPaused, startSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (isNative) {
        NativeSpeechRecognition.removeAllListeners().catch(() => {});
        NativeSpeechRecognition.stop().catch(() => {});
      } else if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
      }
    };
  }, [isNative]);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
    isWakeWordEnabled,
    isWakeWordListening,
    enableWakeWord,
    disableWakeWord,
    toggleWakeWord,
  };
};
