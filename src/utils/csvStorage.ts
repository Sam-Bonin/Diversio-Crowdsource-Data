
import { Response } from '@/types';

// Save responses to localStorage
export const saveResponses = (responses: Response[]): void => {
  localStorage.setItem('responses', JSON.stringify(responses));
};

// Get responses from localStorage
export const getResponses = (): Response[] => {
  const savedData = localStorage.getItem('responses');
  return savedData ? JSON.parse(savedData) : [];
};

// Export responses as CSV
export const exportResponsesAsCSV = (responses: Response[]): string => {
  // Header row
  const headers = ['id', 'userName', 'questionId', 'sentiment', 'feedback', 'skipped', 'timestamp'];
  
  // Convert responses to CSV rows
  const rows = responses.map(response => [
    response.id,
    response.userName,
    response.questionId,
    response.sentiment,
    response.feedback,
    response.skipped.toString(),
    new Date(response.timestamp).toISOString()
  ]);
  
  // Combine header and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  return csvContent;
};

// Download CSV file
export const downloadCSV = (responses: Response[]): void => {
  const csvContent = exportResponsesAsCSV(responses);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', `feedback_responses_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Get next question for a user based on their previous responses
export const getNextQuestionId = (
  userName: string, 
  currentQuestionId: number, 
  questions: Question[], 
  responses: Response[]
): number => {
  const userResponses = responses.filter(r => r.userName === userName);
  
  // Get all question IDs the user has already answered
  const answeredQuestionIds = new Set(userResponses.map(r => r.questionId));
  
  // Find questions the user hasn't answered yet
  const unansweredQuestions = questions.filter(q => !answeredQuestionIds.has(q.id));
  
  // If there are unanswered questions, return the first one
  if (unansweredQuestions.length > 0) {
    return unansweredQuestions[0].id;
  }
  
  // If user has answered all questions, find the least recently answered
  if (userResponses.length > 0) {
    // Sort by timestamp (oldest first)
    const sortedResponses = [...userResponses].sort((a, b) => a.timestamp - b.timestamp);
    return sortedResponses[0].questionId;
  }
  
  // If no responses yet, return the current question ID or the first question
  return currentQuestionId || questions[0].id;
};
