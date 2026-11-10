import { useSpeechRecognition, UseSpeechRecognitionReturn } from "./useSpeechRecognition";

export interface UseWakeWordReturn {
  isWakeWordEnabled: boolean;
  isWakeWordListening: boolean;
  enableWakeWord: () => void;
  disableWakeWord: () => void;
  toggleWakeWord: () => void;
  isSupported: boolean;
}

/**
 * Legacy compatibility wrapper: Wake word is now unified directly in useSpeechRecognition
 * to prevent Android single-microphone collisions.
 */
export const useWakeWord = (
  onWakeWordDetected: () => void,
  isPaused: boolean = false
): UseWakeWordReturn => {
  const {
    isWakeWordEnabled,
    isWakeWordListening,
    enableWakeWord,
    disableWakeWord,
    toggleWakeWord,
    isSupported,
  } = useSpeechRecognition({ isPaused, onWakeWordDetected });

  return {
    isWakeWordEnabled,
    isWakeWordListening,
    enableWakeWord,
    disableWakeWord,
    toggleWakeWord,
    isSupported,
  };
};
