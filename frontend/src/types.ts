export interface DocumentSource {
  chunk_id: string;
  doc_id: string;
  filename: string;
  page_num: number;
  score: number;
  text: string;
  preview: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: DocumentSource[];
  timestamp: string;
}

export interface DocumentMeta {
  doc_id: string;
  filename: string;
  total_pages: number;
  total_chunks: number;
  total_words: number;
  file_size_bytes: number;
  upload_time: string;
}

export type ModelStatus = 'ready' | 'loading' | 'not_loaded' | 'checking';

export type AvatarTheme = 'sophia' | 'alex' | 'nova';

export interface SpeechState {
  isSpeaking: boolean;
  isPaused: boolean;
  activeText: string;
  currentWord: string;
  rate: number;
  pitch: number;
  voiceName: string;
}

export interface SlideOverview {
  pageNum: number;
  filename: string;
  title: string;
  snippet: string;
}
