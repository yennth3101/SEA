export interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface Test {
  id?: string;
  questions: Question[];
  createdAt: any;
}

export interface Lecture {
  id?: string;
  title: string;
  content: string;
  summary?: string;
  sourceText: string;
  createdAt: any;
}

export interface Submission {
  id?: string;
  studentName: string;
  studentClass: string;
  score: number;
  correctCount?: number;
  totalQuestions: number;
  evaluation: string;
  feedback: string;
  submittedAt: any;
  testId: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'lecturer' | 'student';
}
