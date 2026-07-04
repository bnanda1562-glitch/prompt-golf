import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { Card } from '../components/Card.js';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [formLoading, setFormLoading] = useState<boolean>(false);

  const { login, signup, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // If already authenticated, skip authentication screen
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      if (isLogin) {
        if (!email || !password) {
          toast.error('Please fill in all fields');
          setFormLoading(false);
          return;
        }
        await login(email, password);
        toast.success('Logged in successfully!');
      } else {
        if (!username || !email || !password) {
          toast.error('Please fill in all fields');
          setFormLoading(false);
          return;
        }
        if (username.length < 3) {
          toast.error('Username must be at least 3 characters');
          setFormLoading(false);
          return;
        }
        if (password.length < 6) {
          toast.error('Password must be at least 6 characters');
          setFormLoading(false);
          return;
        }
        await signup(username, email, password);
        toast.success('Registration successful!');
      }
      navigate('/', { replace: true });
    } catch (error: any) {
      console.error('Auth submit error:', error);
      const errMsg = error.response?.data?.message || `Error: ${error.message}` || 'Authentication failed. Please try again.';
      toast.error(errMsg);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-brand-bg relative overflow-hidden">
      {/* Background neon light glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-brand-primary/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-brand-secondary/10 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md z-10">
        {/* Title Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">
            PROMPT GOLF
          </h1>
          <p className="text-zinc-400 text-sm mt-2">
            The real-time multiplayer code golf game for AI prompts.
          </p>
        </div>

        <Card glowing={true} className="w-full">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="golf_pro"
                  className="glass-input p-3 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none"
                  disabled={formLoading}
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="glass-input p-3 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none"
                disabled={formLoading}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="glass-input p-3 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none"
                disabled={formLoading}
              />
            </div>

            <button
              type="submit"
              disabled={formLoading}
              className="mt-4 p-3 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {formLoading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {isLogin ? 'Enter Lobby' : 'Sign Up'}
            </button>
          </form>

          {/* Switch link */}
          <div className="mt-6 text-center text-sm">
            <span className="text-zinc-400">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
            </span>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setUsername('');
                setEmail('');
                setPassword('');
              }}
              className="text-brand-secondary font-semibold hover:underline bg-transparent border-none cursor-pointer"
              disabled={formLoading}
            >
              {isLogin ? 'Register Here' : 'Login Here'}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};
