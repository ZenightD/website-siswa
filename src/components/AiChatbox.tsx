import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Trash2, Bot, User as UserIcon } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface AiChatboxProps {
  authToken?: string | null;
}

const STARTER_PROMPTS = [
  'Ringkas data sekolah saat ini',
  'Jelaskan relasi tabel Kelas & Jurusan',
  'Cara ekspor laporan PDF & Excel',
];

export const AiChatbox: React.FC<AiChatboxProps> = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Halo! Ini adalah antarmuka UI Asisten AI Manajemen Sekolah. Logika pemrosesan AI saat ini belum diaktifkan dan siap dihubungkan ke backend Laravel/AI di tahap berikutnya.',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const sendMessage = (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    const nowTime = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: nowTime,
    };

    const noticeMsg: ChatMessage = {
      id: `a_${Date.now() + 1}`,
      role: 'assistant',
      text: 'Pesan diterima pada antarmuka UI. Logika AI Asisten saat ini sedang dinonaktifkan sementara.',
      timestamp: nowTime,
    };

    setMessages((prev) => [...prev, userMsg, noticeMsg]);
    setInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: 'Percakapan UI dibersihkan. Tombol dan tampilan Asisten AI tetap siap digunakan.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="fixed right-5 bottom-5 z-40 flex flex-col items-end">
      {isOpen && (
        <div
          className="mb-3 flex h-[480px] w-[calc(100vw-2.5rem)] max-w-[390px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          role="dialog"
          aria-label="Asisten AI Manajemen Sekolah"
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-[#1D5497] px-4 py-3 text-white dark:bg-[#153E75]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight">Asisten AI</h3>
                <p className="text-[11px] text-blue-100">UI Chatbox (Mode Siaga)</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearChat}
                title="Bersihkan percakapan"
                className="rounded-lg p-1.5 text-blue-100 transition-colors hover:bg-white/15 hover:text-white"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Tutup chatbox"
                className="rounded-lg p-1.5 text-blue-100 transition-colors hover:bg-white/15 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={listRef}
            className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950/60"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    msg.role === 'user'
                      ? 'bg-[#1D5497] text-white dark:bg-blue-600'
                      : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <UserIcon className="h-3.5 w-3.5" />
                  ) : (
                    <Bot className="h-3.5 w-3.5" />
                  )}
                </div>

                <div
                  className={`max-w-[78%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#1D5497] text-white dark:bg-blue-600'
                      : 'border border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                  <div
                    className={`mt-1 text-[10px] tabular-nums ${
                      msg.role === 'user'
                        ? 'text-blue-100/80'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick prompts UI */}
          {messages.length <= 2 && (
            <div className="flex flex-wrap gap-1.5 border-t border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
              {STARTER_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendMessage(q)}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tulis pesan pada UI chatbox..."
              className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-800"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Kirim pesan"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1D5497] text-white transition-colors hover:bg-[#17437A] disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Bottom-Right Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? 'Tutup Asisten AI' : 'Buka Asisten AI'}
        className="flex items-center gap-2.5 rounded-xl bg-[#1D5497] px-4 py-3 text-sm font-semibold text-white shadow-lg transition-transform duration-150 hover:scale-[1.02] hover:bg-[#17437A] focus-visible:outline-2 focus-visible:outline-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500"
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
        <span className="whitespace-nowrap">{isOpen ? 'Tutup Asisten' : 'Asisten AI'}</span>
      </button>
    </div>
  );
};
