import React, { useState, useEffect } from 'react';
import { BookOpen, ClipboardCheck, ArrowRight, CheckCircle2, Trophy, User, School, Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { doc, getDoc, addDoc, collection, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Lecture, Test, Submission } from '../types';
import Chatbot from './Chatbot';

export default function StudentView() {
  const [step, setStep] = useState<'lecture' | 'test' | 'result'>('lecture');
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Test state
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Listen to current settings in real-time
    const unsubscribe = onSnapshot(doc(db, 'settings', 'current'), async (settingsSnap) => {
      if (settingsSnap.exists()) {
        const { currentLectureId, currentTestId } = settingsSnap.data();
        
        if (currentLectureId) {
          const lectureSnap = await getDoc(doc(db, 'lectures', currentLectureId));
          if (lectureSnap.exists()) {
            setLecture({ id: lectureSnap.id, ...lectureSnap.data() } as Lecture);
          }
        } else {
          setLecture(null);
        }
        
        if (currentTestId) {
          const testSnap = await getDoc(doc(db, 'tests', currentTestId));
          if (testSnap.exists()) {
            setTest({ id: testSnap.id, ...testSnap.data() } as Test);
          }
        } else {
          setTest(null);
        }
      }
      setLoading(false);
    }, (error) => {
      console.error("Lỗi lắng nghe cài đặt:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmitTest = async () => {
    if (!studentName || !studentClass) {
      alert('Vui lòng nhập đầy đủ họ tên và lớp.');
      return;
    }
    if (Object.keys(answers).length < (test?.questions.length || 0)) {
      alert('Vui lòng hoàn thành tất cả các câu hỏi.');
      return;
    }

    setSubmitting(true);
    try {
      let correctCount = 0;
      const totalQuestions = test?.questions.length || 15;
      
      test?.questions.forEach((q, idx) => {
        if (answers[idx] === q.correctAnswer) correctCount++;
      });

      // Calculate score on scale of 10
      const score = Number(((correctCount / totalQuestions) * 10).toFixed(1));

      const evaluation = score >= 8.5 ? 'Xuất sắc' : score >= 7.0 ? 'Khá' : score >= 5.0 ? 'Trung bình' : 'Cần cố gắng';
      const feedback = score >= 8.5 ? 'Bạn đã nắm vững kiến thức bài học rất tốt.' : 
                       score >= 7.0 ? 'Bạn hiểu bài tốt, hãy tiếp tục phát huy.' :
                       score >= 5.0 ? 'Bạn đã đạt yêu cầu, nhưng cần ôn tập thêm.' :
                       'Bạn cần xem lại bài giảng kỹ hơn để nắm chắc kiến thức.';

      const submissionData = {
        studentName,
        studentClass,
        score,
        correctCount,
        totalQuestions,
        evaluation,
        feedback,
        submittedAt: serverTimestamp(),
        testId: test?.id || '',
      };

      const docRef = await addDoc(collection(db, 'submissions'), submissionData);
      setSubmission({ id: docRef.id, ...submissionData } as Submission);
      setStep('result');
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mb-4" />
      <p className="text-stone-500">Đang tải nội dung bài học...</p>
    </div>
  );

  if (!lecture) return (
    <div className="text-center py-20">
      <BookOpen className="w-16 h-16 mx-auto text-stone-300 mb-4" />
      <h2 className="text-2xl font-bold text-stone-600">Chưa có bài giảng nào được tải lên</h2>
      <p className="text-stone-500">Vui lòng quay lại sau.</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Stepper */}
      <div className="flex items-center justify-center mb-12">
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all ${step === 'lecture' ? 'bg-emerald-600 text-white shadow-md' : 'bg-emerald-100 text-emerald-700'}`}>
            <BookOpen className="w-4 h-4" /> Bài giảng
          </div>
          <div className="w-8 h-px bg-stone-200" />
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all ${step === 'test' ? 'bg-emerald-600 text-white shadow-md' : 'bg-emerald-100 text-emerald-700'}`}>
            <ClipboardCheck className="w-4 h-4" /> Bài test
          </div>
          <div className="w-8 h-px bg-stone-200" />
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all ${step === 'result' ? 'bg-emerald-600 text-white shadow-md' : 'bg-emerald-100 text-emerald-700'}`}>
            <Trophy className="w-4 h-4" /> Kết quả
          </div>
        </div>
      </div>

      {step === 'lecture' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 prose prose-stone max-w-none">
            <h1 className="text-3xl font-black text-stone-900 mb-8 border-b pb-4">{lecture.title}</h1>
            <div className="markdown-body">
              <ReactMarkdown>{lecture.content}</ReactMarkdown>
            </div>
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={() => setStep('test')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-12 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 group"
            >
              Hoàn thành bài học <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* Chatbot always available if lecture exists */}
      {lecture && <Chatbot context={lecture.sourceText} />}

      {step === 'test' && test && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
              <ClipboardCheck className="text-emerald-600" /> Bài kiểm tra 15 câu trắc nghiệm
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-600 flex items-center gap-2">
                  <User className="w-4 h-4" /> Họ và tên sinh viên
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-600 flex items-center gap-2">
                  <School className="w-4 h-4" /> Tên lớp
                </label>
                <input
                  type="text"
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Lớp K65-CNTT"
                />
              </div>
            </div>

            <div className="space-y-12">
              {test.questions.map((q, idx) => (
                <div key={idx} className="space-y-4">
                  <p className="font-bold text-lg text-stone-800">
                    Câu {idx + 1}: {q.question}
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    {q.options.map((opt, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      return (
                        <button
                          key={optIdx}
                          onClick={() => setAnswers({ ...answers, [idx]: letter })}
                          className={`text-left p-4 rounded-xl border transition-all flex items-center gap-3 ${
                            answers[idx] === letter 
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500' 
                              : 'bg-white border-stone-200 hover:border-emerald-300'
                          }`}
                        >
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            answers[idx] === letter ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-500'
                          }`}>
                            {letter}
                          </span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-16 flex justify-center">
              <button
                onClick={handleSubmitTest}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-16 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="animate-spin" /> : <Send className="w-5 h-5" />}
                Nộp bài ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'result' && submission && (
        <div className="space-y-8 animate-in zoom-in duration-500">
          <div className="bg-white p-12 rounded-3xl shadow-sm border border-stone-200 text-center">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-12 h-12 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-black text-stone-900 mb-2">Chúc mừng bạn đã hoàn thành!</h2>
            <p className="text-stone-500 mb-8">Kết quả bài kiểm tra của sinh viên {submission.studentName}</p>
            
            <div className="flex justify-center gap-8 mb-12">
              <div className="text-center">
                <p className="text-4xl font-black text-emerald-600">{submission.score}/10</p>
                <p className="text-sm font-bold text-stone-400 uppercase tracking-widest">Điểm số</p>
              </div>
              <div className="w-px bg-stone-100" />
              <div className="text-center">
                <p className="text-4xl font-black text-emerald-600">{submission.evaluation}</p>
                <p className="text-sm font-bold text-stone-400 uppercase tracking-widest">Xếp loại</p>
              </div>
            </div>

            <div className="bg-stone-50 p-6 rounded-2xl text-left mb-12">
              <h3 className="font-bold text-stone-800 mb-2 flex items-center gap-2">
                <CheckCircle2 className="text-emerald-600 w-5 h-5" /> Nhận xét từ AI:
              </h3>
              <p className="text-stone-600 italic">"{submission.feedback}"</p>
            </div>

            <div className="space-y-8 text-left">
              <h3 className="text-xl font-bold border-b pb-2">Đáp án chi tiết</h3>
              {test?.questions.map((q, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-stone-100">
                  <p className="font-bold mb-2">Câu {idx + 1}: {q.question}</p>
                  <p className={`text-sm font-bold mb-1 ${answers[idx] === q.correctAnswer ? 'text-emerald-600' : 'text-red-600'}`}>
                    Lựa chọn của bạn: {answers[idx]} {answers[idx] === q.correctAnswer ? '(Đúng)' : `(Sai - Đáp án đúng: ${q.correctAnswer})`}
                  </p>
                  <p className="text-sm text-stone-500 bg-stone-50 p-2 rounded mt-2">
                    <span className="font-bold">Giải thích:</span> {q.explanation}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => window.location.reload()}
              className="mt-12 text-emerald-600 font-bold hover:underline"
            >
              Quay lại trang chủ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
