
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
import { ArrowRight, LogOut } from 'lucide-react';

// Sample data
const USERS: User[] = [
  { id: 1, name: 'John Doe', count: 23 },
  { id: 2, name: 'Jane Smith', count: 12 },
  { id: 3, name: 'Robert Johnson', count: 35 },
  { id: 4, name: 'Emily Davis', count: 27 },
  { id: 5, name: 'Michael Brown', count: 19 },
  { id: 6, name: 'Sarah Wilson', count: 64 },
  { id: 7, name: 'David Taylor', count: 8 },
  { id: 8, name: 'Amanda Miller', count: 42 },
  { id: 9, name: 'Thomas Anderson', count: 31 },
  { id: 10, name: 'Lisa White', count: 15 },
];

const QUESTIONS: Question[] = [
  { id: 1, question: "How satisfied are you with the application's user interface?", answer: "The interface is clean and intuitive, with good use of white space and clear visual hierarchy." },
  { id: 2, question: "What do you think about the response time of the system?", answer: "Response times are excellent. Most actions complete in under a second." },
  { id: 3, question: "How would you rate the onboarding experience?", answer: "The onboarding is straightforward, but could use more tooltips for first-time users." },
  { id: 4, question: "Is the documentation clear and helpful?", answer: "Documentation is comprehensive but could be organized better for easier reference." },
  { id: 5, question: "What features would you like to see added or improved?", answer: "Integration with third-party apps would greatly enhance the functionality." },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedSentiment, setSelectedSentiment] = useState<SentimentType | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackType | null>(null);
  const [leaderboard, setLeaderboard] = useState<User[]>([...USERS].sort((a, b) => b.count - a.count));
  const [responses, setResponses] = useState<Response[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [questionIndex, setQuestionIndex] = useState<number>(0);

  // Check if user is authenticated
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('authenticated') === 'true';
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [navigate]);

  // Load responses from localStorage
  useEffect(() => {
    const savedResponses = localStorage.getItem('responses');
    if (savedResponses) {
      setResponses(JSON.parse(savedResponses));
    }

    // Set initial question
    setCurrentQuestion(QUESTIONS[0]);
  }, []);

  // Update progress when responses change
  useEffect(() => {
    if (selectedUser) {
      const userResponses = responses.filter(r => r.userName === selectedUser);
      const uniqueQuestionsAnswered = new Set(userResponses.map(r => r.questionId)).size;
      setProgress(Math.round((uniqueQuestionsAnswered / QUESTIONS.length) * 100));
    }
  }, [responses, selectedUser]);

  // Update leaderboard
  useEffect(() => {
    const updatedLeaderboard = [...USERS].map(user => {
      const userResponseCount = new Set(
        responses
          .filter(r => r.userName === user.name)
          .map(r => r.questionId)
      ).size;
      
      return {
        ...user,
        count: userResponseCount || user.count // Keep original count if no responses
      };
    });
    
    setLeaderboard(updatedLeaderboard.sort((a, b) => b.count - a.count));
  }, [responses]);

  const handleUserSelect = (value: string) => {
    setSelectedUser(value);
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

  const recordResponse = (skipped: boolean) => {
    if (!selectedUser || !currentQuestion) {
      toast.error('Please select a user first');
      return;
    }
    
    if (!skipped && (!selectedSentiment || !selectedFeedback)) {
      toast.error('Please select both sentiment and feedback options');
      return;
    }

    const newResponse: Response = {
      id: uuidv4(),
      userName: selectedUser,
      questionId: currentQuestion.id,
      sentiment: selectedSentiment || 'N/A',
      feedback: selectedFeedback || 'N/A',
      skipped: skipped,
      timestamp: Date.now()
    };

    const updatedResponses = [...responses, newResponse];
    setResponses(updatedResponses);
    localStorage.setItem('responses', JSON.stringify(updatedResponses));

    // Move to next question
    const nextIndex = (questionIndex + 1) % QUESTIONS.length;
    setQuestionIndex(nextIndex);
    setCurrentQuestion(QUESTIONS[nextIndex]);
    
    // Reset selections
    setSelectedSentiment(null);
    setSelectedFeedback(null);

    if (skipped) {
      toast.info('Response skipped');
    } else {
      toast.success('Response recorded');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Top Bar */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-medium">Feedback System</h1>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content Area - 3/4 width on large screens */}
          <div className="lg:col-span-3 space-y-6 animate-fade-in">
            {/* User Selection */}
            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-muted-foreground font-normal">Who are you?</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedUser} onValueChange={handleUserSelect}>
                  <SelectTrigger className="w-full md:w-72">
                    <SelectValue placeholder="Select your name" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {USERS.map((user) => (
                      <SelectItem key={user.id} value={user.name}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Question and Answer */}
            {currentQuestion && (
              <>
                <Card className="border border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-muted-foreground font-normal">Question</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-medium">{currentQuestion.question}</p>
                  </CardContent>
                </Card>

                <Card className="border border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-muted-foreground font-normal">Answer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{currentQuestion.answer}</p>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Sentiment and Feedback Buttons */}
            <div className="space-y-4">
              {/* Sentiment Buttons */}
              <div className="grid grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  className={`h-14 button-shadow ${selectedSentiment === 'Positive' ? 'bg-positive text-white' : 'bg-white'}`}
                  onClick={() => handleSentimentSelect('Positive')}
                >
                  Positive
                </Button>
                <Button 
                  variant="outline" 
                  className={`h-14 button-shadow ${selectedSentiment === 'Neutral' ? 'bg-neutral text-white' : 'bg-white'}`}
                  onClick={() => handleSentimentSelect('Neutral')}
                >
                  Neutral
                </Button>
                <Button 
                  variant="outline" 
                  className={`h-14 button-shadow ${selectedSentiment === 'Negative' ? 'bg-negative text-white' : 'bg-white'}`}
                  onClick={() => handleSentimentSelect('Negative')}
                >
                  Negative
                </Button>
                <Button 
                  variant="outline" 
                  className={`h-14 button-shadow ${selectedSentiment === 'N/A' ? 'bg-gray-500 text-white' : 'bg-white'}`}
                  onClick={() => handleSentimentSelect('N/A')}
                >
                  N/A
                </Button>
              </div>

              {/* Feedback Type Buttons */}
              <div className="grid grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  className={`h-14 button-shadow ${selectedFeedback === 'Praise' ? 'bg-praise text-white' : 'bg-white'}`}
                  onClick={() => handleFeedbackSelect('Praise')}
                >
                  Praise
                </Button>
                <Button 
                  variant="outline" 
                  className={`h-14 button-shadow ${selectedFeedback === 'Feedback' ? 'bg-feedback text-white' : 'bg-white'}`}
                  onClick={() => handleFeedbackSelect('Feedback')}
                >
                  Feedback
                </Button>
                <Button 
                  variant="outline" 
                  className={`h-14 button-shadow ${selectedFeedback === 'Criticism' ? 'bg-criticism text-white' : 'bg-white'}`}
                  onClick={() => handleFeedbackSelect('Criticism')}
                >
                  Criticism
                </Button>
                <Button 
                  variant="outline" 
                  className={`h-14 button-shadow ${selectedFeedback === 'N/A' ? 'bg-gray-500 text-white' : 'bg-white'}`}
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
                  
                  {selectedUser && (
                    <div className="bg-white rounded-lg p-4 border border-border">
                      <p className="text-muted-foreground text-sm mb-1">Progress</p>
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
                  )}
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
