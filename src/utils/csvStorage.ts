
import { Response, Question } from '@/types';
import { supabase } from '@/integrations/supabase/client';

// Save responses to Supabase
export const saveResponses = async (response: Response): Promise<void> => {
  try {
    const { error } = await supabase
      .from('responses')
      .insert({
        id: response.id,
        user_name: response.userName,
        question_id: response.questionId,
        sentiment: response.sentiment,
        feedback: response.feedback,
        skipped: response.skipped,
        timestamp: response.timestamp
      });
    
    if (error) throw error;
    
    // Update user count
    const { error: updateError } = await supabase
      .from('users')
      .update({ count: supabase.rpc('increment_count') })
      .eq('name', response.userName);
    
    if (updateError) console.error('Error updating user count:', updateError);
  } catch (error) {
    console.error('Error saving response to Supabase:', error);
    throw error;
  }
};

// Get responses from Supabase
export const getResponses = async (): Promise<Response[]> => {
  try {
    const { data, error } = await supabase
      .from('responses')
      .select('*');
    
    if (error) throw error;
    
    // Map Supabase data to our Response type
    return data.map(item => ({
      id: item.id,
      userName: item.user_name,
      questionId: item.question_id,
      sentiment: item.sentiment,
      feedback: item.feedback,
      skipped: item.skipped,
      timestamp: item.timestamp
    }));
  } catch (error) {
    console.error('Error getting responses from Supabase:', error);
    return [];
  }
};

// Get users from Supabase
export const getUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('count', { ascending: false });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting users from Supabase:', error);
    return [];
  }
};

// Get questions from Supabase
export const getQuestions = async () => {
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*');
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting questions from Supabase:', error);
    return [];
  }
};

// Get next question for a user based on their previous responses
export const getNextQuestionId = async (
  userName: string, 
  currentQuestionId: number,
): Promise<number> => {
  try {
    // Get all questions
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*');
    
    if (questionsError) throw questionsError;
    
    // Get user's responses
    const { data: userResponses, error: responsesError } = await supabase
      .from('responses')
      .select('*')
      .eq('user_name', userName);
    
    if (responsesError) throw responsesError;
    
    // Get all question IDs the user has already answered
    const answeredQuestionIds = new Set(userResponses.map(r => r.question_id));
    
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
      return sortedResponses[0].question_id;
    }
    
    // If no responses yet, return the current question ID or the first question
    return currentQuestionId || (questions[0]?.id || 1);
  } catch (error) {
    console.error('Error getting next question:', error);
    return currentQuestionId || 1;
  }
};
