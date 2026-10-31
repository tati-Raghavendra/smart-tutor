import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  Bot,
  User,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Menu,
  Sparkles,
  BookOpen,
  UploadCloud,
  Layers,
  Video,
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import FormattedMessage from './components/FormattedMessage';
import SourceCitations from './components/SourceCitations';
import LectureStage from './components/LectureStage';
import AvatarCanvas from './components/AvatarCanvas';
import MessageAudioButton from './components/MessageAudioButton';
import { speechManager } from './utils/speech';
import type { Message, DocumentMeta, ModelStatus, AvatarTheme } from './types';

const API_BASE = 'http://localhost:8000/api';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content:
        "Hello! I'm your AI Smart Tutor. 🎓\n\nUpload or drag & drop your **lecture slides or notes (PDF)** into the sidebar. I support full **Markdown**, **KaTeX Math** (e.g. $E = mc^2$ and $$\\sigma(z) = \\frac{1}{1 + e^{-z}}$$), and **Syntax-Highlighted Code**!\n\nUse the **\"AI Avatar Stage\"** button above for an animated slide-by-slide lecture presentation, or click **\"Listen\"** under any message to hear me explain it out loud!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<ModelStatus>('checking');
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isWindowDragging, setIsWindowDragging] = useState(false);

  // Avatar & Speech State
  const [isLectureStageOpen, setIsLectureStageOpen] = useState(false);
  const [avatarTheme, setAvatarTheme] = useState<AvatarTheme>('sophia');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [currentSpeakingMsgId, setCurrentSpeakingMsgId] = useState<string | null>(null);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [selectedVoiceName, setSelectedVoiceName] = useState('');
  const [activeStageDocId, setActiveStageDocId] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);
  const idCounterRef = useRef(0);

  const getNextId = (prefix: string) => {
    idCounterRef.current += 1;
    return `${prefix}-${idCounterRef.current}`;
  };

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/status`);
      const data = await res.json();
      setStatus(data.status);
      if (typeof data.total_chunks === 'number') {
        setTotalChunks(data.total_chunks);
      }
    } catch (err) {
      console.error('Error checking model status:', err);
      setStatus('not_loaded');
    }
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/documents`);
      if (res.ok) {
        const data = await res.json();
        const docs: DocumentMeta[] = data.documents || [];
        setDocuments(docs);
        setTotalChunks(data.total_chunks || 0);
        if (docs.length > 0 && !activeStageDocId) {
          setActiveStageDocId(docs[0].doc_id);
        }
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  }, [activeStageDocId]);

  useEffect(() => {
    const initData = async () => {
      await checkStatus();
      await fetchDocuments();
    };
    initData();

    const interval = setInterval(() => {
      if (status === 'loading') {
        checkStatus();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [status, checkStatus, fetchDocuments]);

  useEffect(() => {
    if (!isLectureStageOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoadingResponse, isLectureStageOpen]);

  // Speech Handlers
  const handleSpeakText = useCallback(
    (text: string, onEndCallback?: () => void) => {
      speechManager.speak(text, {
        voiceName: selectedVoiceName,
        rate: speechRate,
        onStart: () => {
          setIsSpeaking(true);
        },
        onWord: (word) => {
          setCurrentWord(word);
        },
        onEnd: () => {
          setIsSpeaking(false);
          setCurrentWord('');
          setCurrentSpeakingMsgId(null);
          onEndCallback?.();
        },
        onError: () => {
          setIsSpeaking(false);
          setCurrentWord('');
          setCurrentSpeakingMsgId(null);
        },
      });
    },
    [selectedVoiceName, speechRate]
  );

  const handleStopSpeech = useCallback(() => {
    speechManager.stop();
    setIsSpeaking(false);
    setCurrentWord('');
    setCurrentSpeakingMsgId(null);
  }, []);

  const handleToggleMessageAudio = (msgId: string, content: string) => {
    if (isSpeaking && currentSpeakingMsgId === msgId) {
      handleStopSpeech();
    } else {
      setCurrentSpeakingMsgId(msgId);
      handleSpeakText(content);
    }
  };

  // Full-window drag-and-drop listener
  const handleWindowDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsWindowDragging(true);
    }
  };

  const handleWindowDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      setIsWindowDragging(false);
    }
  };

  const handleWindowDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleWindowDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWindowDragging(false);
    dragCounterRef.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const triggerLoadModel = async () => {
    try {
      setStatus('loading');
      await fetch(`${API_BASE}/load`, { method: 'POST' });
    } catch (err) {
      console.error('Error loading model:', err);
      setStatus('not_loaded');
    }
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    setIsUploading(true);
    setUploadError(null);

    const validFiles = Array.from(files).filter(
      (f) =>
        f.name.toLowerCase().endsWith('.pdf') ||
        f.name.toLowerCase().endsWith('.txt') ||
        f.name.toLowerCase().endsWith('.md')
    );

    if (validFiles.length === 0) {
      setUploadError('Please select valid PDF, TXT, or Markdown documents.');
      setIsUploading(false);
      return;
    }

    try {
      for (const file of validFiles) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Failed to process ${file.name}`);
        }

        const data = await res.json();
        const doc = data.document;
        setActiveStageDocId(doc.doc_id);

        setMessages((prev) => [
          ...prev,
          {
            id: getNextId('doc-uploaded'),
            role: 'assistant',
            content: `📄 **${doc.filename}** has been processed and indexed!\n- **${doc.total_pages} slides/pages** analyzed\n- **${doc.total_chunks} indexed passages** ready for citation\n\nYou can chat about this lecture, or click **"AI Avatar Stage"** above to watch the avatar present it slide-by-slide!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
      await fetchDocuments();
      await checkStatus();
    } catch (error: unknown) {
      console.error('Upload error:', error);
      const msg = error instanceof Error ? error.message : 'Upload failed.';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      const res = await fetch(`${API_BASE}/documents/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchDocuments();
        if (activeStageDocId === docId) {
          setActiveStageDocId('');
        }
      }
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  };

  const handleClearAllDocuments = async () => {
    if (!confirm('Are you sure you want to clear all uploaded lecture materials?')) return;
    try {
      const res = await fetch(`${API_BASE}/documents`, { method: 'DELETE' });
      if (res.ok) {
        handleStopSpeech();
        setActiveStageDocId('');
        setIsLectureStageOpen(false);
        await fetchDocuments();
        setMessages((prev) => [
          ...prev,
          {
            id: getNextId('docs-cleared'),
            role: 'assistant',
            content: 'All lecture notes have been cleared. I am now in general tutoring mode.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err) {
      console.error('Error clearing documents:', err);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const messageContent = (customPrompt || input).trim();
    if (!messageContent || isLoadingResponse) return;

    const userMessage: Message = {
      id: getNextId('user-msg'),
      role: 'user',
      content: messageContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoadingResponse(true);

    try {
      if (status !== 'ready') {
        await triggerLoadModel();
      }

      const apiMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          use_rag: documents.length > 0,
          top_k: 4,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to get response from server');
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: getNextId('tutor-msg'),
          role: 'assistant',
          content: data.response,
          sources: data.sources || [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (error) {
      console.error('Error in chat:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: getNextId('err-msg'),
          role: 'assistant',
          content:
            'Sorry, I encountered an error communicating with the local model. Please verify that the backend is running and the model has finished downloading.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoadingResponse(false);
      checkStatus();
    }
  };

  const quickPrompts = [
    { label: '📝 Summarize Slides', prompt: 'Provide a structured summary of the key concepts covered in the uploaded lecture materials.' },
    { label: '📐 Formulas & Equations', prompt: 'Extract and explain the mathematical formulas and theorems from these lecture slides using standard LaTeX.' },
    { label: '💻 Code & Algorithms', prompt: 'Explain the core algorithms mentioned in these notes with clean code implementations and time complexities.' },
    { label: '❓ Quiz Me', prompt: 'Create 3 multiple-choice practice questions based on the uploaded lecture slides, including answer explanations.' },
  ];

  return (
    <div
      onDragEnter={handleWindowDragEnter}
      onDragLeave={handleWindowDragLeave}
      onDragOver={handleWindowDragOver}
      onDrop={handleWindowDrop}
      className="flex h-screen bg-gray-50 text-gray-800 font-sans overflow-hidden relative"
    >
      {/* Full-screen drag overlay */}
      {isWindowDragging && (
        <div className="absolute inset-0 bg-indigo-600/90 z-50 flex flex-col items-center justify-center text-white backdrop-blur-sm pointer-events-none animate-fadeIn">
          <UploadCloud size={64} className="animate-bounce mb-3" />
          <h2 className="text-2xl font-bold">Drop Lecture PDF or Notes Here</h2>
          <p className="text-sm text-indigo-100 mt-1">
            We will extract and index your lecture slides instantly!
          </p>
        </div>
      )}

      {/* Left Sidebar */}
      <Sidebar
        documents={documents}
        totalChunks={totalChunks}
        isUploading={isUploading}
        uploadError={uploadError}
        onFileUpload={handleFileUpload}
        onDeleteDocument={handleDeleteDocument}
        onClearAll={handleClearAllDocuments}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-200 shadow-xs z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-gray-500 hover:text-gray-800 rounded-xl hover:bg-gray-100 transition cursor-pointer"
              title="Toggle Lecture Materials Sidebar"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                <Bot size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-gray-900 leading-tight">Smart Tutor</h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 uppercase tracking-wider">
                    RAG + TTS
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-tight">
                  Interactive AI Avatar & Slide Narration
                </p>
              </div>
            </div>
          </div>

          {/* Action & Status Badges */}
          <div className="flex items-center gap-2.5">
            {/* AI Avatar Lecture Stage Toggle Button */}
            <button
              type="button"
              onClick={() => {
                if (documents.length > 0 && !activeStageDocId) {
                  setActiveStageDocId(documents[0].doc_id);
                }
                setIsLectureStageOpen(!isLectureStageOpen);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs ${
                isLectureStageOpen
                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
              title="Open animated slide-by-slide AI avatar presentation"
            >
              <Video size={15} />
              <span className="hidden sm:inline">
                {isLectureStageOpen ? 'Chat View' : 'AI Avatar Stage'}
              </span>
            </button>

            {/* Documents Status Pill */}
            {documents.length > 0 ? (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-xs font-medium">
                <BookOpen size={13} />
                <span>
                  {documents.length} Note{documents.length > 1 ? 's' : ''} ({totalChunks} chunks)
                </span>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-gray-100 border border-gray-200 text-gray-600 rounded-full text-xs font-medium">
                <Layers size={13} />
                <span>General Mode</span>
              </div>
            )}

            {/* Model Status Pill */}
            {status === 'ready' && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-semibold">
                <CheckCircle size={14} />
                <span className="hidden lg:inline">Local Model Ready</span>
                <span className="lg:hidden">Ready</span>
              </div>
            )}
            {status === 'loading' && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold animate-pulse">
                <RefreshCw size={14} className="animate-spin" />
                <span className="hidden lg:inline">Loading Model...</span>
              </div>
            )}
            {status === 'not_loaded' && (
              <button
                type="button"
                onClick={triggerLoadModel}
                className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-full text-xs font-semibold transition cursor-pointer"
              >
                <AlertCircle size={14} />
                <span>Init Model</span>
              </button>
            )}
          </div>
        </header>

        {/* View Mode: Lecture Stage VS Chat */}
        {isLectureStageOpen ? (
          <LectureStage
            documents={documents}
            activeDocId={activeStageDocId || (documents[0]?.doc_id ?? '')}
            onSelectDoc={(id) => setActiveStageDocId(id)}
            onClose={() => setIsLectureStageOpen(false)}
            avatarTheme={avatarTheme}
            onThemeChange={(thm) => setAvatarTheme(thm)}
            isSpeaking={isSpeaking}
            currentWord={currentWord}
            onSpeakText={handleSpeakText}
            onStopSpeech={handleStopSpeech}
            speechRate={speechRate}
            onRateChange={(r) => setSpeechRate(r)}
            selectedVoiceName={selectedVoiceName}
            onVoiceChange={(v) => setSelectedVoiceName(v)}
          />
        ) : (
          <>
            {/* Chat History Scroll Container */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-w-4xl w-full mx-auto">
              {/* Active Context Banner when documents exist */}
              {documents.length > 0 && (
                <div className="bg-linear-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-indigo-900 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-indigo-600 text-white rounded-lg shrink-0">
                      <Sparkles size={14} />
                    </div>
                    <div>
                      <span className="font-semibold">Lecture Grounding Active:</span> Tutor answers quote and cite slides from{' '}
                      <span className="font-medium underline">
                        {documents.map((d) => d.filename).join(', ')}
                      </span>
                      .
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!activeStageDocId && documents[0]) {
                        setActiveStageDocId(documents[0].doc_id);
                      }
                      setIsLectureStageOpen(true);
                    }}
                    className="shrink-0 px-2.5 py-1 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition cursor-pointer text-[11px]"
                  >
                    Open Avatar Stage
                  </button>
                </div>
              )}

              {/* Messages */}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role !== 'user' && (
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-2xs">
                      <Bot size={17} />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 shadow-xs ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-xs'
                        : 'bg-white text-gray-800 border border-gray-150 rounded-tl-xs'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <>
                        <FormattedMessage content={msg.content} />
                        {msg.sources && msg.sources.length > 0 && (
                          <SourceCitations sources={msg.sources} />
                        )}
                      </>
                    )}

                    {/* Bottom Metadata bar in message bubble */}
                    <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-gray-100 text-[10px]">
                      {msg.role === 'assistant' ? (
                        <MessageAudioButton
                          isCurrentSpeaking={isSpeaking && currentSpeakingMsgId === msg.id}
                          onToggleSpeech={() => handleToggleMessageAudio(msg.id, msg.content)}
                        />
                      ) : (
                        <div />
                      )}
                      <span className={msg.role === 'user' ? 'text-indigo-200' : 'text-gray-400'}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 shrink-0 mt-0.5">
                      <User size={17} />
                    </div>
                  )}
                </div>
              ))}

              {/* Loading Bounce Indicator */}
              {isLoadingResponse && (
                <div className="flex gap-3.5 justify-start">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                    <Bot size={17} />
                  </div>
                  <div className="bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">Tutor is analyzing slides...</span>
                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </main>

            {/* Floating Mini Talking Avatar Widget during chat narration */}
            {isSpeaking && (
              <div
                onClick={() => setIsLectureStageOpen(true)}
                className="fixed bottom-20 right-6 bg-slate-950/95 text-white border border-slate-700/80 rounded-2xl p-3 shadow-2xl flex items-center gap-3 z-30 cursor-pointer hover:border-indigo-400 transition animate-fadeIn backdrop-blur-md max-w-sm"
                title="Click to expand to full AI Classroom Stage"
              >
                <div className="w-12 h-12 shrink-0">
                  <AvatarCanvas
                    theme={avatarTheme}
                    isSpeaking={isSpeaking}
                    currentWord={currentWord}
                    size="sm"
                  />
                </div>
                <div className="min-w-0 pr-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>NARRATING</span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium truncate mt-0.5">
                    {currentWord ? `"...${currentWord}..."` : 'Explaining concept...'}
                  </p>
                  <span className="text-[10px] text-indigo-400 font-semibold underline">
                    Open Stage &rarr;
                  </span>
                </div>
              </div>
            )}

            {/* Quick Prompts Bar if documents exist */}
            {documents.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-100 bg-white/60">
                <div className="max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-[11px] font-semibold text-gray-400 shrink-0 uppercase tracking-wider">
                    Quick Actions:
                  </span>
                  {quickPrompts.map((qp, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSendMessage(undefined, qp.prompt)}
                      disabled={isLoadingResponse}
                      className="shrink-0 text-xs px-3 py-1.5 bg-white border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-gray-700 rounded-full font-medium transition disabled:opacity-50 cursor-pointer shadow-2xs"
                    >
                      {qp.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Footer */}
            <footer className="bg-white border-t border-gray-200 p-3 sm:p-4 shadow-sm shrink-0">
              <form
                onSubmit={(e) => handleSendMessage(e)}
                className="max-w-4xl mx-auto flex items-center gap-2.5"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    documents.length > 0
                      ? `Ask anything about your ${documents.length} uploaded lecture note(s)...`
                      : 'Ask your tutor a question (or drop lecture slides above)...'
                  }
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm placeholder:text-gray-400"
                  disabled={isLoadingResponse}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoadingResponse}
                  className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-40 flex items-center justify-center cursor-pointer shadow-xs"
                  title="Send message"
                >
                  <Send size={18} />
                </button>
              </form>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
