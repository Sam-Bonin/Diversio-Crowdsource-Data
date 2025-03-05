import { Response, Question, SentimentType, FeedbackType } from '@/types';
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
    
    // Update user count using the increment_count function
    const { data, error: updateError } = await supabase
      .rpc('increment_count', { username: response.userName });
    
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
      sentiment: item.sentiment as SentimentType,
      feedback: item.feedback as FeedbackType,
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

// Function to mark a question as answered
export const markQuestionAsAnswered = async (questionId: number): Promise<void> => {
  try {
    console.log(`Marking question ${questionId} as answered`);
    
    // Try a different approach to the update
    const { error } = await supabase.rpc('mark_question_answered', { 
      question_id: questionId 
    });
    
    if (error) {
      console.error('Error calling mark_question_answered function:', error);
      
      // Fallback to direct update if RPC fails
      console.log('Trying direct update as fallback...');
      const { error: updateError } = await supabase
        .from('questions')
        .update({ answered: true })
        .eq('id', questionId);
      
      if (updateError) {
        console.error('Fallback update also failed:', updateError);
        throw updateError;
      } else {
        console.log(`Successfully marked question ${questionId} as answered via fallback`);
      }
    } else {
      console.log(`Successfully marked question ${questionId} as answered via RPC`);
    }
  } catch (error) {
    console.error('Error marking question as answered:', error);
    throw error;
  }
};

// Get next question for a user based on their previous responses
export const getNextQuestionId = async (
  userName: string, 
  currentQuestionId: number,
): Promise<number> => {
  try {
    // Get all unanswered questions - include both false AND null values
    const { data: unansweredQuestions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .or('answered.is.null,answered.eq.false') // This syntax handles both NULL and false
      .order('id', { ascending: true });
    
    console.log("Found questions:", unansweredQuestions?.length || 0);
    
    if (questionsError) throw questionsError;
    
    // If no unanswered questions at all, stay on current question
    if (!unansweredQuestions || unansweredQuestions.length === 0) {
      console.log('No unanswered questions found');
      return currentQuestionId;
    }
    
    // Check if there are other unanswered questions different from current
    const otherUnansweredQuestions = unansweredQuestions.filter(q => q.id !== currentQuestionId);
    
    // If there are other unanswered questions, return the first one
    if (otherUnansweredQuestions.length > 0) {
      console.log(`Found ${otherUnansweredQuestions.length} other unanswered questions`);
      return otherUnansweredQuestions[0].id;
    }
    
    // If the only unanswered question is the current one, return it
    if (unansweredQuestions.length === 1 && unansweredQuestions[0].id === currentQuestionId) {
      // This shouldn't happen but just in case
      console.log('Only current question is unanswered');
      return currentQuestionId;
    }
    
    // If we get here, return the first unanswered question (should be covered by above cases but just in case)
    return unansweredQuestions[0].id;
  } catch (error) {
    console.error('Error getting next question:', error);
    return currentQuestionId || 1;
  }
};
