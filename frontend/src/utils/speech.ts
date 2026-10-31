export interface SpeakOptions {
  voiceName?: string;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onWord?: (word: string, charIndex: number) => void;
  onEnd?: () => void;
  onError?: (error: unknown) => void;
}

export const isSpeechSupported = (): boolean => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
};

export const getVoices = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    if (!isSpeechSupported()) {
      resolve([]);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    const handleVoicesChanged = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    };

    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    // Fallback timeout in case event doesn't fire
    setTimeout(() => {
      resolve(window.speechSynthesis.getVoices());
    }, 500);
  });
};

/**
 * Prepares lecture text for natural spoken narration:
 * Strips code blocks, LaTeX delimiters, markdown formatting,
 * and converts abbreviations or slide references into natural speech.
 */
export const cleanTextForSpeech = (text: string): string => {
  if (!text) return '';

  return (
    text
      // Replace code blocks with brief announcement
      .replace(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g, 'Here is the code implementation: $1')
      // Clean block math $$...$$ or \[...\]
      .replace(/\$\$([\s\S]*?)\$\$/g, 'formula: $1')
      .replace(/\\\[([\s\S]*?)\\\]/g, 'formula: $1')
      // Clean inline math $...$ or \(...\)
      .replace(/\$([^$\n]+)\$/g, '$1')
      .replace(/\\\(([^)\n]+)\\\)/g, '$1')
      // Replace slide references: [Slide 4] -> "Slide 4"
      .replace(/\[(?:Slide|Page)\s*(\d+)\]/gi, 'Slide $1')
      // Remove markdown headings
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold and italic markers
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
      .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
      // Remove list markers (- item, * item)
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      // Remove table pipes
      .replace(/\|/g, ' ')
      .replace(/[-:]{3,}/g, '')
      // Remove inline backticks
      .replace(/`([^`]+)`/g, '$1')
      // Collapse whitespace
      .replace(/\s+/g, ' ')
      .trim()
  );
};

class SpeechManager {
  private isSpeakingState = false;
  private isPausedState = false;

  public get isSpeaking(): boolean {
    return this.isSpeakingState;
  }

  public get isPaused(): boolean {
    return this.isPausedState;
  }

  public stop(): void {
    if (!isSpeechSupported()) return;
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn('Speech cancellation error:', e);
    }
    this.isSpeakingState = false;
    this.isPausedState = false;
  }

  public pause(): void {
    if (!isSpeechSupported() || !this.isSpeakingState) return;
    try {
      window.speechSynthesis.pause();
      this.isPausedState = true;
    } catch (e) {
      console.warn('Speech pause error:', e);
    }
  }

  public resume(): void {
    if (!isSpeechSupported() || !this.isPausedState) return;
    try {
      window.speechSynthesis.resume();
      this.isPausedState = false;
    } catch (e) {
      console.warn('Speech resume error:', e);
    }
  }

  public async speak(text: string, options: SpeakOptions = {}): Promise<void> {
    if (!isSpeechSupported()) return;

    this.stop();

    const clean = cleanTextForSpeech(text);
    if (!clean) return;

    const voices = await getVoices();
    let selectedVoice: SpeechSynthesisVoice | undefined;

    if (options.voiceName) {
      selectedVoice = voices.find((v) => v.name === options.voiceName);
    }

    if (!selectedVoice) {
      // Prefer high-quality natural English voices
      selectedVoice =
        voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Online'))) ||
        voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Alex'))) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];
    }

    const utterance = new SpeechSynthesisUtterance(clean);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.rate = Math.max(0.7, Math.min(1.6, options.rate || 1.0));
    utterance.pitch = Math.max(0.8, Math.min(1.3, options.pitch || 1.0));

    utterance.onstart = () => {
      this.isSpeakingState = true;
      this.isPausedState = false;
      options.onStart?.();
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const charIdx = event.charIndex;
        // Extract the spoken word
        const remaining = clean.slice(charIdx);
        const match = remaining.match(/^\S+/);
        const word = match ? match[0].replace(/[^\w]/g, '') : '';
        options.onWord?.(word, charIdx);
      }
    };

    utterance.onend = () => {
      this.isSpeakingState = false;
      this.isPausedState = false;
      options.onEnd?.();
    };

    utterance.onerror = (err) => {
      // Ignore user cancellation errors
      if ((err as { error?: string }).error !== 'canceled') {
        console.warn('SpeechSynthesis error:', err);
        options.onError?.(err);
      }
      this.isSpeakingState = false;
      this.isPausedState = false;
    };

    // Chrome bug workaround: speechSynthesis can pause unexpectedly if long utterance
    window.speechSynthesis.speak(utterance);
  }
}

export const speechManager = new SpeechManager();
