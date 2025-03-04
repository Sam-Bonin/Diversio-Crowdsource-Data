
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const PasswordGate = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const correctPassword = 'password123'; // This would be better as an environment variable
  const navigate = useNavigate();

  // Check if user is already authenticated
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('authenticated') === 'true';
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate network delay
    setTimeout(() => {
      if (password === correctPassword) {
        localStorage.setItem('authenticated', 'true');
        toast.success('Access granted');
        navigate('/dashboard');
      } else {
        toast.error('Incorrect password');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-white rounded-xl shadow-md overflow-hidden p-8 border border-border">
          <h1 className="text-2xl font-medium text-center mb-6">Enter Password</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password to continue"
                className="h-12 px-4 text-base"
                autoFocus
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 text-base button-shadow"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Continue'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PasswordGate;
