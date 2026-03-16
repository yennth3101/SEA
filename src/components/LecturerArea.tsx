import React, { useState, useEffect } from 'react';
import { Upload, Send, FileText, CheckCircle2, AlertCircle, Loader2, Table, RefreshCw, Settings } from 'lucide-react';
import { collection, addDoc, serverTimestamp, updateDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Submission } from '../types';
import { GoogleGenAI } from "@google/genai";
import Chatbot from './Chatbot';

const MODEL_NAME = "gemini-3-flash-preview";

export default function LecturerArea() {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [currentExtractedText, setCurrentExtractedText] = useState('');
  
  // Local API Key State
  const [localApiKey, setLocalApiKey] = useState(localStorage.getItem('user_gemini_api_key') || '');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const saveApiKey = (key: string) => {
    localStorage.setItem('user_gemini_api_key', key);
    setLocalApiKey(key);
    setShowSettings(false);
  };

  const fetchSubmissions = async () => {
    const q = query(collection(db, 'submissions'), orderBy('submittedAt', 'desc'));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
    setSubmissions(data);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text && (!files || files.length === 0)) {
      alert('Vui lòng nhập nội dung hoặc chọn file.');
      return;
    }

    const apiKey = localApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      setShowSettings(true);
      setErrorMessage("Vui lòng nhập API Key để tiếp tục.");
      return;
    }

    setLoading(true);
    setStatus('uploading');
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('text', text);
      if (files) {
        for (let i = 0; i < files.length; i++) {
          formData.append('files', files[i]);
        }
      }

      setStatus('processing');
      const response = await fetch('/api/process-documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Lỗi trích xuất tài liệu trên máy chủ' }));
        throw new Error(errorData.error || 'Lỗi trích xuất tài liệu');
      }
      
      const { extractedText } = await response.json();
      setCurrentExtractedText(extractedText);

      // Call Gemini from Frontend
      const ai = new GoogleGenAI({ apiKey });

      // 1. Generate Lecture
      const lecturePrompt = `Dựa trên tài liệu sau, hãy tạo một bài giảng chi tiết bằng tiếng Việt. 
      Yêu cầu:
      - Tiêu đề rõ ràng.
      - Chia thành các mục chính.
      - Diễn giải dễ hiểu, có ví dụ cụ thể.
      - Có phần tóm tắt cuối bài.
      Định dạng: Markdown.
      
      Tài liệu: ${extractedText.substring(0, 30000)}`;
      
      const lectureResponse = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [{ role: "user", parts: [{ text: lecturePrompt }] }]
      });
      const lectureContent = lectureResponse.text;

      // 2. Generate Test (15 questions)
      const testPrompt = `Dựa trên tài liệu sau, hãy tạo 15 câu hỏi trắc nghiệm tiếng Việt.
      Mỗi câu có 4 đáp án A, B, C, D. Chỉ có 1 đáp án đúng.
      Trả về định dạng JSON: { "questions": [ { "question": "...", "options": ["A...", "B...", "C...", "D..."], "correctAnswer": "A", "explanation": "..." } ] }
      
      Tài liệu: ${extractedText.substring(0, 30000)}`;

      const testResponse = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [{ role: "user", parts: [{ text: testPrompt }] }],
        config: { responseMimeType: "application/json" }
      });

      let testData;
      try {
        testData = JSON.parse(testResponse.text || "{}");
      } catch (parseError) {
        const jsonMatch = (testResponse.text || "").match(/```json\n([\s\S]*?)\n```/) || (testResponse.text || "").match(/{[\s\S]*}/);
        if (jsonMatch) {
          testData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          throw new Error("AI không thể tạo bài test đúng định dạng JSON.");
        }
      }

      // Save to Firestore
      const lectureRef = await addDoc(collection(db, 'lectures'), {
        title: "Bài giảng mới",
        content: lectureContent,
        sourceText: extractedText,
        createdAt: serverTimestamp(),
      });

      const testRef = await addDoc(collection(db, 'tests'), {
        ...testData,
        createdAt: serverTimestamp(),
      });

      // Update current settings
      await updateDoc(doc(db, 'settings', 'current'), {
        currentLectureId: lectureRef.id,
        currentTestId: testRef.id,
        updatedAt: serverTimestamp(),
      });

      setStatus('done');
      setText('');
      setFiles(null);
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setErrorMessage(error.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Settings className="text-emerald-600" /> Cấu hình Gemini API
            </h3>
            <p className="text-sm text-stone-600 mb-4">
              Dán API Key của bạn vào đây để ứng dụng có thể sử dụng AI. Key này chỉ được lưu cục bộ trên trình duyệt của bạn.
            </p>
            <input
              type="password"
              value={localApiKey}
              onChange={(e) => setLocalApiKey(e.target.value)}
              placeholder="Nhập API Key..."
              className="w-full p-3 rounded-xl border border-stone-200 mb-4 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 py-2 px-4 rounded-xl border border-stone-200 hover:bg-stone-50 transition-all font-medium"
              >
                Hủy
              </button>
              <button
                onClick={() => saveApiKey(localApiKey)}
                className="flex-1 py-2 px-4 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all font-medium"
              >
                Lưu lại
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Upload className="text-emerald-600" /> Tải tài liệu giảng dạy
          </h2>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-stone-100 rounded-full transition-all text-stone-500"
              title="Cài đặt API"
            >
              <Settings className="w-5 h-5" />
            </button>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
              (localApiKey || process.env.GEMINI_API_KEY) ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}>
              <div className={`w-2 h-2 rounded-full ${(localApiKey || process.env.GEMINI_API_KEY) ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
              {(localApiKey || process.env.GEMINI_API_KEY) ? 'AI đã sẵn sàng' : 'Chưa cấu hình API Key'}
            </div>
          </div>
        </div>
        
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Nhập nội dung trực tiếp</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-40 p-4 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none resize-none"
              placeholder="Dán nội dung bài giảng vào đây..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Hoặc tải lên file (PDF, Word, Excel, Text)</label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-stone-300 border-dashed rounded-xl cursor-pointer bg-stone-50 hover:bg-stone-100 transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FileText className="w-8 h-8 mb-3 text-stone-400" />
                  <p className="mb-2 text-sm text-stone-500">
                    <span className="font-semibold">Click để tải lên</span> hoặc kéo thả
                  </p>
                  <p className="text-xs text-stone-400">PDF, DOCX, XLSX, TXT...</p>
                </div>
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  onChange={(e) => setFiles(e.target.files)} 
                />
              </label>
            </div>
            {files && (
              <div className="mt-2 text-sm text-emerald-600 font-medium">
                Đã chọn {files.length} file
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Send className="w-5 h-5" />}
            Gửi tài liệu & Sinh nội dung học tập
          </button>
        </form>

        {status !== 'idle' && (
          <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 ${
            status === 'done' ? 'bg-emerald-50 text-emerald-700' : 
            status === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
          }`}>
            {status === 'processing' && <Loader2 className="animate-spin" />}
            {status === 'done' && <CheckCircle2 />}
            {status === 'error' && <AlertCircle />}
            <span className="font-medium">
              {status === 'uploading' && 'Đang tải tài liệu lên...'}
              {status === 'processing' && 'AI đang phân tích và tạo bài giảng, bài test...'}
              {status === 'done' && 'Hoàn tất! Sinh viên đã có thể xem nội dung mới nhất.'}
              {status === 'error' && errorMessage}
            </span>
          </div>
        )}
      </section>

      {currentExtractedText && <Chatbot context={currentExtractedText} />}

      <section className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Table className="text-emerald-600" /> Bảng điểm sinh viên
          </h2>
          <button 
            onClick={fetchSubmissions}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-100">
                <th className="py-4 px-4 font-semibold text-stone-600">Họ tên</th>
                <th className="py-4 px-4 font-semibold text-stone-600">Lớp</th>
                <th className="py-4 px-4 font-semibold text-stone-600">Điểm</th>
                <th className="py-4 px-4 font-semibold text-stone-600">Đánh giá</th>
                <th className="py-4 px-4 font-semibold text-stone-600">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
                <tr key={sub.id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                  <td className="py-4 px-4 font-medium">{sub.studentName}</td>
                  <td className="py-4 px-4 text-stone-600">{sub.studentClass}</td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      sub.score >= 8 ? 'bg-emerald-100 text-emerald-700' :
                      sub.score >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {sub.score}/10
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-stone-500 italic">"{sub.evaluation}"</td>
                  <td className="py-4 px-4 text-xs text-stone-400">
                    {sub.submittedAt?.toDate().toLocaleString('vi-VN')}
                  </td>
                </tr>
              ))}
              {submissions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-stone-400 italic">Chưa có sinh viên nào nộp bài.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
