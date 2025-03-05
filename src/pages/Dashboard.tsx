import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { User, Question, SentimentType, FeedbackType, Response } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { ArrowRight, LogOut, ChevronDown, ChevronUp, HelpCircle, X } from 'lucide-react';
import { 
  saveResponses, 
  getResponses, 
  getUsers,
  getQuestions,
  getNextQuestionId,
  markQuestionAsAnswered
} from '@/utils/csvStorage';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedSentiment, setSelectedSentiment] = useState<SentimentType | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackType | null>(null);
  const [leaderboard, setLeaderboard] = useState<User[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userSectionExpanded, setUserSectionExpanded] = useState<boolean>(true);
  const [showTutorialVideo, setShowTutorialVideo] = useState<boolean>(false);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);

  // Check if user is authenticated
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('authenticated') === 'true';
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [navigate]);

  // Load data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Get users from Supabase
        const usersData = await getUsers();
        setUsers(usersData);
        setLeaderboard(usersData);
        
        // Get questions from Supabase
        const questionsData = await getQuestions();
        setQuestions(questionsData);
        
        // Set initial question
        if (questionsData.length > 0) {
          setCurrentQuestion(questionsData[0]);
        }
        
        // Get responses from Supabase
        const responsesData = await getResponses();
        setResponses(responsesData);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Update progress when responses change
  useEffect(() => {
    if (questions.length > 0) {
      // Get all unique question IDs that have been answered by any user
      const uniqueQuestionsAnswered = new Set(responses.map(r => r.questionId)).size;
      setProgress(Math.round((uniqueQuestionsAnswered / questions.length) * 100));
    }
  }, [responses, questions]);

  // Add effect to track progress and show celebration dialog at 100%
  useEffect(() => {
    if (progress === 100 && !showCelebration) {
      setShowCelebration(true);
    }
  }, [progress]);

  const handleUserSelect = async (value: string) => {
    setSelectedUser(value);
    
    // Find the next question for this user
    if (value && questions.length > 0) {
      const nextQuestionId = await getNextQuestionId(value, currentQuestion?.id || 1);
      const nextQuestion = questions.find(q => q.id === nextQuestionId) || questions[0];
      setCurrentQuestion(nextQuestion);
      
      // Find index of next question
      const nextIndex = questions.findIndex(q => q.id === nextQuestionId);
      if (nextIndex !== -1) {
        setQuestionIndex(nextIndex);
      }
    }
    
    // Reset selections
    setSelectedSentiment(null);
    setSelectedFeedback(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('authenticated');
    navigate('/');
    toast.success('Logged out successfully');
  };

  const handleSentimentSelect = (sentiment: SentimentType) => {
    setSelectedSentiment(sentiment);
  };

  const handleFeedbackSelect = (feedback: FeedbackType) => {
    setSelectedFeedback(feedback);
  };

  const recordResponse = async (skipped: boolean) => {
    if (!selectedUser || !currentQuestion) {
      toast.error('Please select a user first');
      return;
    }
    
    if (!skipped && (!selectedSentiment || !selectedFeedback)) {
      toast.error('Please select both sentiment and feedback options');
      return;
    }

    try {
      // Only save response if NOT skipped
      if (!skipped) {
        const newResponse: Response = {
          id: uuidv4(),
          userName: selectedUser,
          questionId: currentQuestion.id,
          sentiment: selectedSentiment || 'N/A',
          feedback: selectedFeedback || 'N/A',
          skipped: false,
          timestamp: Date.now()
        };

        // Save response to Supabase
        await saveResponses(newResponse);
        
        // Update local state
        setResponses([...responses, newResponse]);
        
        // Refresh leaderboard
        const updatedUsers = await getUsers();
        setLeaderboard(updatedUsers);
        
        // Update the question's "answered" flag
        await markQuestionAsAnswered(currentQuestion.id);
        
        toast.success('Response recorded');
        
        // Get fresh questions data to ensure we have the latest "answered" status
        if (!skipped) {
          const freshQuestions = await getQuestions();
          
          // Force the current question to be marked as answered in our local state
          const updatedQuestions = freshQuestions.map(q => 
            q.id === currentQuestion.id ? { ...q, answered: true } : q
          );
          setQuestions(updatedQuestions);
          
          // Also force the current question to be excluded from our next selection
          // This ensures we don't get stuck on the same question
          const remainingUnansweredQuestions = updatedQuestions.filter(q => 
            q.answered !== true && q.id !== currentQuestion.id
          );
          
          if (remainingUnansweredQuestions.length > 0) {
            // If there are other unanswered questions, choose the first one
            const nextQuestion = remainingUnansweredQuestions[0];
            setCurrentQuestion(nextQuestion);
            const nextIndex = updatedQuestions.findIndex(q => q.id === nextQuestion.id);
            if (nextIndex !== -1) {
              setQuestionIndex(nextIndex);
            }
            return; // Skip the regular nextQuestionId flow
          }
        }
      } else {
        // Just show a message when skipped
        toast.info('Question skipped');
      }
      
      // Find next question for this user - regardless of skip
      const nextQuestionId = await getNextQuestionId(selectedUser, currentQuestion.id);
      console.log(`Current question ID: ${currentQuestion.id}, Next question ID: ${nextQuestionId}`);

      // Only show "all answered" if we get back the same ID AND there are no unanswered questions
      const unansweredQuestions = questions.filter(q => q.answered !== true);
      if (nextQuestionId === currentQuestion.id && unansweredQuestions.length <= 1) {
        toast.info('All questions have been answered');
        return;
      }
      
      const nextQuestion = questions.find(q => q.id === nextQuestionId);
      
      if (nextQuestion) {
        setCurrentQuestion(nextQuestion);
        
        // Find index of next question
        const nextIndex = questions.findIndex(q => q.id === nextQuestionId);
        if (nextIndex !== -1) {
          setQuestionIndex(nextIndex);
        }
      } else {
        console.warn(`Could not find question with ID ${nextQuestionId}`);
        toast.info('No more questions available at this time');
      }
      
      // Reset selections
      setSelectedSentiment(null);
      setSelectedFeedback(null);
    } catch (error) {
      console.error('Error recording response:', error);
      toast.error('Failed to record response');
    }
  };

  const toggleUserSection = () => {
    setUserSectionExpanded(!userSectionExpanded);
  };

  const toggleTutorialVideo = () => {
    setShowTutorialVideo(!showTutorialVideo);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary p-4 md:p-8">
      {/* Add Celebration Dialog */}
      <Dialog 
        open={showCelebration} 
        onOpenChange={setShowCelebration}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">WE ARE DONE!!!</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4 py-4">
            <p className="text-lg">Thank you!</p>
            <p>Please let Sam know that all responses have been collected.</p>
          </div>
          <div className="flex justify-center">
            <Button 
              onClick={() => setShowCelebration(false)}
              className="w-32"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="max-w-7xl mx-auto">
        {/* Top Bar */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-medium">Diversio Crowdsourced Data Collection</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content Area - 3/4 width on large screens */}
          <div className="lg:col-span-3 space-y-6 animate-fade-in">
            {/* Announcement Banner */}
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 shadow-sm">
              <p className="text-center text-sm md:text-base">
                Hi Diversio staff, please help Product & Engineering make the best model possible by annotating free text responses with labels. 
                There will be a <span className="font-bold">$100 dollar prize</span> for the person with the most responses!
              </p>
            </div>

            {/* User Selection */}
            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-lg text-muted-foreground font-normal">Who are you?</CardTitle>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={toggleTutorialVideo}
                    className="h-8 p-2 flex items-center gap-1 text-xs"
                  >
                    <HelpCircle className="h-3 w-3" />
                    {showTutorialVideo ? "Hide tutorial" : "Teach me how to do this"}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={toggleUserSection}
                    className="h-8 w-8 p-0"
                  >
                    {userSectionExpanded ? 
                      <ChevronUp className="h-4 w-4" /> : 
                      <ChevronDown className="h-4 w-4" />
                    }
                  </Button>
                </div>
              </CardHeader>
              {userSectionExpanded && (
                <CardContent>
                  {showTutorialVideo && (
                    <div className="mb-4">
                      <div className="relative w-full pb-[56.25%] mb-2">
                        <iframe 
                          className="absolute top-0 left-0 w-full h-full rounded-md"
                          src="https://www.youtube.com/embed/dQw4w9WgXcQ" 
                          title="Tutorial video"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={toggleTutorialVideo}
                        className="flex items-center gap-1"
                      >
                        <X className="h-3 w-3" /> Close tutorial
                      </Button>
                    </div>
                  )}
                  <Select value={selectedUser} onValueChange={handleUserSelect}>
                    <SelectTrigger className="w-full md:w-72">
                      <SelectValue placeholder="Select your name" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.name}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              )}
            </Card>

            {/* Combined Question and Answer */}
            {currentQuestion && (
              <Card className="border border-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-muted-foreground font-normal">Question & Response</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xl font-medium">{currentQuestion.question}</p>
                  <p className="text-gray-700">{currentQuestion.answer}</p>
                </CardContent>
              </Card>
            )}

            {/* Sentiment and Feedback Buttons */}
            <div className="space-y-4">
              {/* Sentiment Buttons with improved color transitions */}
              <div className="grid grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  className={`h-14 button-shadow transition-colors ${
                    selectedSentiment === 'Positive' 
                      ? 'bg-positive text-white hover:bg-positive' 
                      : 'bg-white hover:bg-positive/20'
                  }`}
                  onClick={() => handleSentimentSelect('Positive')}
                >
                  Positive
                </Button>
                <Button 
                  variant="outline" 
                  className={`h-14 button-shadow transition-colors ${
                    selectedSentiment === 'Neutral' 
                      ? 'bg-neutral text-white hover:bg-neutral' 
                      : 'bg-white hover:bg-neutral/20'
                  }`}
                  onClick={() => handleSentimentSelect('Neutral')}
                >
                  Neutral
                </Button>
                <Button 
                  variant="outline" 
                  className={`h-14 button-shadow transition-colors ${
                    selectedSentiment === 'Negative' 
                      ? 'bg-negative text-white hover:bg-negative' 
                      : 'bg-white hover:bg-negative/20'
                  }`}
                  onClick={() => handleSentimentSelect('Negative')}
                >
                  Negative
                </Button>
                <Button 
                  variant="outline" 
                  className={`h-14 button-shadow transition-colors ${
                    selectedSentiment === 'N/A' 
                      ? 'bg-gray-500 text-white hover:bg-gray-500' 
                      : 'bg-white hover:bg-gray-300'
                  }`}
                  onClick={() => handleSentimentSelect('N/A')}
                >
                  N/A
                </Button>
              </div>

              {/* Feedback Type Buttons with improved color transitions */}
              <div className="grid grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  className={`h-14 button-shadow transition-colors ${
                    selectedFeedback === 'Praise' 
                      ? 'bg-praise text-white hover:bg-praise' 
                      : 'bg-white hover:bg-praise/20'
                  }`}
                  onClick={() => handleFeedbackSelect('Praise')}
                >
                  Praise
                </Button>
                <Button 
                  variant="outline" 
                  className={`h-14 button-shadow transition-colors ${
                    selectedFeedback === 'Feedback' 
                      ? 'bg-feedback text-white hover:bg-feedback' 
                      : 'bg-white hover:bg-feedback/20'
                  }`}
                  onClick={() => handleFeedbackSelect('Feedback')}
                >
                  Feedback
                </Button>
                <Button 
                  variant="outline" 
                  className={`h-14 button-shadow transition-colors ${
                    selectedFeedback === 'Criticism' 
                      ? 'bg-criticism text-white hover:bg-criticism' 
                      : 'bg-white hover:bg-criticism/20'
                  }`}
                  onClick={() => handleFeedbackSelect('Criticism')}
                >
                  Criticism
                </Button>
                <Button 
                  variant="outline" 
                  className={`h-14 button-shadow transition-colors ${
                    selectedFeedback === 'N/A' 
                      ? 'bg-gray-500 text-white hover:bg-gray-500' 
                      : 'bg-white hover:bg-gray-300'
                  }`}
                  onClick={() => handleFeedbackSelect('N/A')}
                >
                  N/A
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4 mt-8">
              <Button 
                variant="secondary" 
                className="w-32 h-12 button-shadow"
                onClick={() => recordResponse(true)}
              >
                Skip
              </Button>
              <Button 
                className="w-32 h-12 button-shadow"
                onClick={() => recordResponse(false)}
                disabled={!selectedUser || !selectedSentiment || !selectedFeedback}
              >
                Log <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Leaderboard - 1/4 width on large screens */}
          <div className="lg:col-span-1 animate-fade-in">
            <Card className="border border-border shadow-sm h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">Leaderboard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted text-muted-foreground">
                        <tr>
                          <th className="py-3 px-4 text-left font-medium text-sm">Name</th>
                          <th className="py-3 px-4 text-right font-medium text-sm">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((user, index) => (
                          <tr 
                            key={user.id} 
                            className={`border-t border-border ${user.name === selectedUser ? 'bg-primary/5' : ''}`}
                          >
                            <td className="py-3 px-4">{user.name}</td>
                            <td className="py-3 px-4 text-right font-mono">{user.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Progress bar - now always shown regardless of user selection */}
                  <div className="bg-white rounded-lg p-4 border border-border">
                    <p className="text-muted-foreground text-sm mb-1">Team Progress</p>
                    <div className="flex items-center space-x-2">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary rounded-full h-2 transition-all duration-500" 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{progress}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
