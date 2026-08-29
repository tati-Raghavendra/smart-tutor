import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type ModelStatus = 'ready' | 'loading' | 'not_loaded' | 'checking';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I am your AI Smart Tutor. You can chat with me here. Once we verify this chat interface works, we will add support for uploading notes (PDF) and an AI avatar explaining them!",
    },
  ]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<ModelStatus>('checking');
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API_BASE = 'http://localhost:8000/api';

  useEffect(() => {
    checkStatus();
    // Poll status if loading
    const interval = setInterval(() => {
      if (status === 'loading') {
        checkStatus();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoadingResponse]);

  const checkStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/status`);
      const data = await res.json();
      setStatus(data.status);
    } catch (err) {
      console.error("Error checking model status:", err);
      setStatus('not_loaded');
    }
  };

  const triggerLoadModel = async () => {
    try {
      setStatus('loading');
      await fetch(`${API_BASE}/load`, { method: 'POST' });
    } catch (err) {
      console.error("Error loading model:", err);
      setStatus('not_loaded');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoadingResponse) return;

    const userMessage: Message = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoadingResponse(true);

    try {
      // If status is not ready, warn/auto-load
      if (status !== 'ready') {
        await triggerLoadModel();
      }

      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!res.ok) {
        throw new Error('Failed to get response from server');
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Error in chat:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I encountered an error communicating with the local model. Please verify that the backend is running and the model has finished downloading.",
        },
      ]);
    } finally {
      setIsLoadingResponse(false);
      checkStatus();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-800">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-lg">
            <Bot size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Smart Tutor</h1>
            <p className="text-xs text-gray-500">Prototype Step 1: Local Chat Mode</p>
          </div>
        </div>

        {/* Model Status Indicator */}
        <div className="flex items-center gap-3">
          {status === 'ready' && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-semibold">
              <CheckCircle size={14} />
              Local Model Ready
            </div>
          )}
          {status === 'loading' && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold animate-pulse">
              <RefreshCw size={14} className="animate-spin" />
              Downloading & Loading Model (~950MB)...
            </div>
          )}
          {status === 'not_loaded' && (
            <button
              onClick={triggerLoadModel}
              className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-full text-xs font-semibold transition"
            >
              <AlertCircle size={14} />
              Initialize Local Model (Download)
            </button>
          )}
          {status === 'checking' && (
            <div className="text-xs text-gray-400">Connecting to server...</div>
          )}
        </div>
      </header>

      {/* Main Chat Window */}
      <main className="flex-1 overflow-y-auto p-6 max-w-4xl w-full mx-auto space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role !== 'user' && (
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <Bot size={18} />
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-800 border border-gray-100'
              }`}
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 shrink-0">
                <User size={18} />
              </div>
            )}
          </div>
        ))}
        {isLoadingResponse && (
          <div className="flex gap-4 justify-start">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Bot size={18} />
            </div>
            <div className="bg-white text-gray-800 border border-gray-100 max-w-[75%] rounded-2xl px-4 py-3 shadow-sm text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Footer */}
      <footer className="bg-white border-t border-gray-200 p-4 shadow-inner">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              status === 'ready'
                ? "Ask your tutor anything..."
                : "Initialize the local model above to begin chatting..."
            }
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            disabled={isLoadingResponse}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoadingResponse}
            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center"
          >
            <Send size={18} />
          </button>
        </form>
      </footer>
    </div>
  );
}
