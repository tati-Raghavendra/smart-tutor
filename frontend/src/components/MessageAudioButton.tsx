import { Volume2, Square } from 'lucide-react';

interface MessageAudioButtonProps {
  isCurrentSpeaking: boolean;
  onToggleSpeech: () => void;
}

export default function MessageAudioButton({
  isCurrentSpeaking,
  onToggleSpeech,
}: MessageAudioButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggleSpeech}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
        isCurrentSpeaking
          ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80 hover:border-indigo-300'
      }`}
      title={isCurrentSpeaking ? 'Stop narration' : 'Listen with AI Avatar narration'}
    >
      {isCurrentSpeaking ? (
        <>
          <Square size={12} className="fill-current text-red-600" />
          <span>Stop</span>
        </>
      ) : (
        <>
          <Volume2 size={13} className="text-indigo-600" />
          <span>Listen</span>
        </>
      )}
    </button>
  );
}
