import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Play,
  Square,
  RotateCcw,
  Volume2,
  X,
  Layers,
  GraduationCap,
  Settings2,
  User,
} from 'lucide-react';
import AvatarCanvas from './AvatarCanvas';
import FormattedMessage from './FormattedMessage';
import { getVoices } from '../utils/speech';
import type { DocumentMeta, AvatarTheme, SlideOverview } from '../types';

interface LectureStageProps {
  documents: DocumentMeta[];
  activeDocId: string;
  onSelectDoc: (docId: string) => void;
  onClose: () => void;
  avatarTheme: AvatarTheme;
  onThemeChange: (theme: AvatarTheme) => void;
  isSpeaking: boolean;
  currentWord: string;
  onSpeakText: (text: string, onEndCallback?: () => void) => void;
  onStopSpeech: () => void;
  speechRate: number;
  onRateChange: (rate: number) => void;
  selectedVoiceName: string;
  onVoiceChange: (voiceName: string) => void;
}

const API_BASE = 'http://localhost:8000/api';

export default function LectureStage({
  documents,
  activeDocId,
  onSelectDoc,
  onClose,
  avatarTheme,
  onThemeChange,
  isSpeaking,
  currentWord,
  onSpeakText,
  onStopSpeech,
  speechRate,
  onRateChange,
  selectedVoiceName,
  onVoiceChange,
}: LectureStageProps) {
  const [slides, setSlides] = useState<SlideOverview[]>([]);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [isLoadingSlides, setIsLoadingSlides] = useState(false);
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);
  const [slideExplanation, setSlideExplanation] = useState<string>('');
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // Refs for tracking state inside speech callbacks
  const autoAdvanceRef = useRef(autoAdvance);
  const currentSlideIdxRef = useRef(currentSlideIdx);
  const slidesRef = useRef(slides);
  const explainSlideRef = useRef<((idx?: number) => Promise<void>) | null>(null);

  useEffect(() => {
    autoAdvanceRef.current = autoAdvance;
    currentSlideIdxRef.current = currentSlideIdx;
    slidesRef.current = slides;
  }, [autoAdvance, currentSlideIdx, slides]);

  // Load available system voices
  useEffect(() => {
    getVoices().then((v) => {
      setVoices(v);
    });
  }, []);

  // Fetch slides when active document changes
  const fetchSlides = useCallback(async (docId: string) => {
    if (!docId) return;
    setIsLoadingSlides(true);
    setSlideExplanation('');
    try {
      const res = await fetch(`${API_BASE}/documents/${docId}/slides`);
      if (res.ok) {
        const data = await res.json();
        setSlides(data.slides || []);
        setCurrentSlideIdx(0);
      }
    } catch (err) {
      console.error('Error fetching slides:', err);
    } finally {
      setIsLoadingSlides(false);
    }
  }, []);

  useEffect(() => {
    if (activeDocId) {
      const init = async () => {
        await fetchSlides(activeDocId);
      };
      init();
    }
  }, [activeDocId, fetchSlides]);

  const currentSlide = slides[currentSlideIdx];

  const handleExplainSlide = useCallback(async (slideIdxToExplain?: number) => {
    const targetIdx = typeof slideIdxToExplain === 'number' ? slideIdxToExplain : currentSlideIdxRef.current;
    const targetSlide = slidesRef.current[targetIdx];
    if (!targetSlide || !activeDocId) return;

    setIsGeneratingExplanation(true);
    onStopSpeech();

    try {
      const res = await fetch(`${API_BASE}/explain-slide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_id: activeDocId,
          page_num: targetSlide.pageNum || targetIdx + 1,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate slide explanation');

      const data = await res.json();
      setSlideExplanation(data.explanation);

      // Speak explanation with avatar
      onSpeakText(data.explanation, () => {
        // Callback when narration finishes
        if (autoAdvanceRef.current && currentSlideIdxRef.current + 1 < slidesRef.current.length) {
          const nextIdx = currentSlideIdxRef.current + 1;
          setCurrentSlideIdx(nextIdx);
          // Small pause before explaining next slide
          setTimeout(() => {
            explainSlideRef.current?.(nextIdx);
          }, 1200);
        }
      });
    } catch (err) {
      console.error('Error in slide explanation:', err);
    } finally {
      setIsGeneratingExplanation(false);
    }
  }, [activeDocId, onSpeakText, onStopSpeech]);

  useEffect(() => {
    explainSlideRef.current = handleExplainSlide;
  }, [handleExplainSlide]);

  const handlePrevSlide = () => {
    if (currentSlideIdx > 0) {
      onStopSpeech();
      setSlideExplanation('');
      setCurrentSlideIdx(currentSlideIdx - 1);
    }
  };

  const handleNextSlide = () => {
    if (currentSlideIdx + 1 < slides.length) {
      onStopSpeech();
      setSlideExplanation('');
      setCurrentSlideIdx(currentSlideIdx + 1);
    }
  };

  const currentDoc = documents.find((d) => d.doc_id === activeDocId);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 text-white overflow-hidden relative">
      {/* Stage Header */}
      <header className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/90 text-white rounded-xl shadow-xs">
            <GraduationCap size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                AI Lecture Stage
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                Video Avatar Feel
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Interactive slide-by-slide avatar walkthrough (Zero API Video Cost)
            </p>
          </div>
        </div>

        {/* Document Switcher & Controls */}
        <div className="flex items-center gap-2.5">
          {documents.length > 1 && (
            <select
              value={activeDocId}
              onChange={(e) => onSelectDoc(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs rounded-xl px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {documents.map((d) => (
                <option key={d.doc_id} value={d.doc_id}>
                  {d.filename}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            title="Tutor & Voice Settings"
          >
            <Settings2 size={18} />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            title="Exit Presentation Stage"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Settings Dropdown Drawer */}
      {showSettings && (
        <div className="bg-slate-950 border-b border-slate-800 p-4 shrink-0 flex flex-wrap items-center justify-between gap-4 text-xs animate-fadeIn">
          {/* Avatar Theme Selection */}
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-medium">Avatar Tutor:</span>
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {(['sophia', 'alex', 'nova'] as AvatarTheme[]).map((thm) => (
                <button
                  key={thm}
                  type="button"
                  onClick={() => onThemeChange(thm)}
                  className={`px-3 py-1 rounded-lg font-semibold capitalize transition cursor-pointer ${
                    avatarTheme === thm
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {thm === 'sophia' ? '👩‍🏫 Sophia' : thm === 'alex' ? '👨‍🏫 Alex' : '🤖 Nova'}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Voice:</span>
            <select
              value={selectedVoiceName}
              onChange={(e) => onVoiceChange(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs rounded-xl px-2.5 py-1 text-slate-200 focus:outline-none max-w-[200px] truncate"
            >
              <option value="">Default System Natural Voice</option>
              {voices
                .filter((v) => v.lang.startsWith('en'))
                .map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
            </select>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Speed:</span>
            <div className="flex items-center gap-1">
              {[0.8, 1.0, 1.25, 1.5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onRateChange(s)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                    speechRate === s
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Classroom Presentation Arena */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch max-w-7xl mx-auto w-full">
        {/* Left Column: Interactive Lecture Slide (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-lg flex flex-col justify-between relative overflow-hidden">
            {/* Top Slide Meta Bar */}
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Slide {slides.length > 0 ? currentSlideIdx + 1 : 0} of {slides.length}
                </span>
                <span className="text-xs text-slate-400 truncate max-w-[240px]">
                  {currentDoc?.filename || 'Lecture Slides'}
                </span>
              </div>

              {/* Slide Navigation Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  disabled={currentSlideIdx === 0 || slides.length === 0}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition disabled:opacity-40 cursor-pointer"
                  title="Previous Slide"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleNextSlide}
                  disabled={currentSlideIdx + 1 >= slides.length || slides.length === 0}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition disabled:opacity-40 cursor-pointer"
                  title="Next Slide"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Slide Body */}
            {isLoadingSlides ? (
              <div className="flex-1 flex items-center justify-center py-16 text-slate-400">
                <span className="text-xs">Loading lecture slides...</span>
              </div>
            ) : slides.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-slate-400 space-y-2">
                <Layers size={36} className="text-slate-600" />
                <h3 className="text-sm font-semibold text-slate-300">No slides loaded</h3>
                <p className="text-xs max-w-sm text-slate-500">
                  Upload a lecture PDF in the left sidebar to start the interactive presentation!
                </p>
              </div>
            ) : (
              <div className="flex-1 space-y-4 overflow-y-auto max-h-[460px] pr-2">
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight border-l-4 border-indigo-500 pl-3">
                  {currentSlide?.title || `Slide ${currentSlideIdx + 1}`}
                </h3>
                <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800/80 text-xs sm:text-sm text-slate-200 font-mono leading-relaxed whitespace-pre-wrap">
                  {currentSlide?.snippet || 'No text extracted for this slide.'}
                </div>
              </div>
            )}

            {/* Slide Bottom Action Bar */}
            <div className="pt-4 mt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleExplainSlide()}
                disabled={isGeneratingExplanation || slides.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-md disabled:opacity-50 cursor-pointer"
              >
                <Sparkles size={16} className={isGeneratingExplanation ? 'animate-spin' : ''} />
                <span>
                  {isGeneratingExplanation
                    ? 'Preparing Presentation...'
                    : `Explain Slide ${currentSlideIdx + 1} Out Loud`}
                </span>
              </button>

              <label className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAdvance}
                  onChange={(e) => setAutoAdvance(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                />
                <span>Auto-advance slides</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: AI Avatar Presenter Podium (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col items-center justify-between relative overflow-hidden">
            {/* Presenter Name Badge */}
            <div className="w-full flex items-center justify-between mb-2 pb-2 border-b border-slate-800/70 text-xs">
              <div className="flex items-center gap-2 font-semibold text-slate-200">
                <User size={14} className="text-indigo-400" />
                <span>
                  {avatarTheme === 'sophia'
                    ? 'Professor Sophia'
                    : avatarTheme === 'alex'
                    ? 'Dr. Alex'
                    : 'Nova AI Mentor'}
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isSpeaking
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isSpeaking ? 'Speaking' : 'Listening / Idle'}
              </span>
            </div>

            {/* The Avatar Podium */}
            <div className="py-2 flex flex-col items-center justify-center">
              <AvatarCanvas
                theme={avatarTheme}
                isSpeaking={isSpeaking}
                currentWord={currentWord}
                size="lg"
              />
            </div>

            {/* Avatar Audio Controls */}
            <div className="w-full mt-4 pt-3 border-t border-slate-800 flex items-center justify-center gap-3">
              {isSpeaking ? (
                <button
                  type="button"
                  onClick={onStopSpeech}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
                >
                  <Square size={14} className="fill-current" />
                  <span>Stop Speech</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => slideExplanation && onSpeakText(slideExplanation)}
                  disabled={!slideExplanation}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-40"
                >
                  <Play size={14} className="fill-current" />
                  <span>Replay Explanation</span>
                </button>
              )}

              {slideExplanation && (
                <button
                  type="button"
                  onClick={() => onSpeakText(slideExplanation)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer"
                  title="Re-narrate from start"
                >
                  <RotateCcw size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Current Explanation Script Card */}
          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col overflow-hidden max-h-[220px]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mb-2 pb-1.5 border-b border-slate-800">
              <Volume2 size={14} className="text-indigo-400" />
              <span>Spoken Lecture Script</span>
            </div>
            <div className="flex-1 overflow-y-auto text-xs leading-relaxed text-slate-300">
              {slideExplanation ? (
                <FormattedMessage content={slideExplanation} />
              ) : (
                <span className="text-slate-500 italic">
                  Click &ldquo;Explain Slide {currentSlideIdx + 1} Out Loud&rdquo; to hear your AI tutor present this topic.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Subtitle / Live Caption Bar at Bottom */}
      <footer className="px-6 py-2.5 bg-slate-950 border-t border-slate-800 shrink-0 text-center">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider">
            Live Subtitles:
          </span>
          <p className="text-indigo-200 font-medium truncate max-w-xl">
            {isSpeaking
              ? currentWord
                ? `"...${currentWord}..."`
                : 'Speaking lecture material...'
              : 'Avatar tutor is ready to present.'}
          </p>
        </div>
      </footer>
    </div>
  );
}
