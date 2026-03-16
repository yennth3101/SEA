import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Bot, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

const MODEL_NAME = "gemini-3-flash-preview";

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface ChatbotProps {
  context: string;
}

export default function Chatbot({ context }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', parts: [{ text: input }] };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const apiKey = localStorage.getItem('user_gemini_api_key') || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Vui lòng cấu hình API Key trong phần Giảng viên.");
      }
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [
          ...messages,
          { role: "user", parts: [{ text: input }] }
        ],
        config: {
          systemInstruction: `Bạn là trợ lý học tập. Bạn CHỈ được trả lời dựa trên tài liệu sau. 
          Nếu thông tin không có trong tài liệu, hãy nói rõ: "Thông tin này không có trong tài liệu giảng viên đã cung cấp."
          Tài liệu: ${context}`
        }
      });

      const botMessage: Message = { role: 'model', parts: [{ text: response.text || "Xin lỗi, tôi không thể trả lời lúc này." }] };
      setMessages(prev => [...prev, botMessage]);
    } catch (error: any) {
      console.error(error);
      const errorMessage: Message = { role: 'model', parts: [{ text: `Lỗi: ${error.message}` }] };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-emerald-600 text-white py-3 px-6 rounded-full shadow-2xl hover:bg-emerald-700 transition-all z-40 flex items-center gap-2 font-bold animate-bounce"
      >
        <MessageSquare className="w-5 h-5" />
        Hỏi trợ lý AI
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for easier closing */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/5 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-stone-200 flex flex-col z-50 overflow-hidden"
            >
            <div className="bg-emerald-600 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <span className="font-bold">Hỏi đáp AI</span>
              </div>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }} 
                className="hover:bg-emerald-700 p-2 rounded-full transition-colors"
                aria-label="Đóng chat"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50">
              {messages.length === 0 && (
                <div className="text-center py-8 text-stone-500 text-sm">
                  <Bot className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>Chào bạn! Tôi là trợ lý học tập. Hãy đặt câu hỏi về bài giảng này nhé.</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-emerald-600 text-white rounded-tr-none' 
                      : 'bg-white text-stone-800 border border-stone-200 rounded-tl-none shadow-sm'
                  }`}>
                    {msg.parts[0].text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-stone-200 shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSend} className="p-4 border-t border-stone-100 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Hỏi về bài học..."
                  className="flex-1 bg-stone-100 p-2 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
                <button type="submit" className="bg-emerald-600 text-white p-2 rounded-xl hover:bg-emerald-700 transition-all">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </>
  );
}
