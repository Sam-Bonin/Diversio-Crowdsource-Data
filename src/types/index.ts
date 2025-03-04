
export type User = {
  id: number;
  name: string;
  count: number;
};

export type Question = {
  id: number;
  question: string;
  answer: string;
};

export type SentimentType = 'Positive' | 'Neutral' | 'Negative' | 'N/A';
export type FeedbackType = 'Praise' | 'Feedback' | 'Criticism' | 'N/A';

export type Response = {
  id: string;
  userName: string;
  questionId: number;
  sentiment: SentimentType;
  feedback: FeedbackType;
  skipped: boolean;
  timestamp: number;
};
