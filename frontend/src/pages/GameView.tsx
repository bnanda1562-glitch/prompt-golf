import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useSocket } from '../context/SocketContext.js';
import { useToast } from '../context/ToastContext.js';
import { Card } from '../components/Card.js';
import api from '../services/api.js';
import confetti from 'canvas-confetti';

interface RoomPlayer {
  userId: string;
  username: string;
  avatar: string;
  score: number;
  hasSubmitted: boolean;
  lastSubmission?: {
    prompt: string;
    characters: number;
    estimatedTokens: number;
    aiResponse: string;
    similarity: number;
    score: number;
  };
}

interface Challenge {
  _id: string;
  targetOutput: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
}

interface RoomState {
  roomCode: string;
  hostId: string;
  status: 'waiting' | 'playing' | 'ended';
  currentRound: number;
  totalRounds: number;
  roundDuration: number;
  timer: number;
  currentChallenge: Challenge | null;
  players: RoomPlayer[];
}

export const GameView: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Mode detection
  const isSoloMode = location.pathname.includes('/solo') || !roomCode;

  // Game States
  const [room, setRoom] = useState<RoomState | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [timer, setTimer] = useState<number>(60);
  const [gameStatus, setGameStatus] = useState<'playing' | 'evaluating' | 'round-results' | 'match-over'>('playing');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Solo Mode Specific States
  const [soloChallenge, setSoloChallenge] = useState<Challenge | null>(null);
  const [soloScore, setSoloScore] = useState<number>(0);
  const [soloRound, setSoloRound] = useState<number>(1);
  const [soloMaxRounds] = useState<number>(3);
  const [soloHistory, setSoloHistory] = useState<any[]>([]);
  const [soloTimerInterval, setSoloTimerInterval] = useState<any>(null);

  // Evaluation detail shown to user
  const [myResult, setMyResult] = useState<any>(null);

  const confettiTriggered = useRef(false);

  // ==========================================
  // SOLO MODE IMPLEMENTATION
  // ==========================================
  const loadSoloChallenge = async () => {
    try {
      setPrompt('');
      setMyResult(null);
      setGameStatus('playing');
      setTimer(60);

      // Load a random challenge via API
      const response = await api.get('/challenges');
      const challenges = response.data;
      if (challenges.length === 0) {
        toast.error('No challenges found. Please add challenges in database first.');
        navigate('/');
        return;
      }
      const randomIdx = Math.floor(Math.random() * challenges.length);
      setSoloChallenge(challenges[randomIdx]);

      // Start solo countdown timer
      startSoloTimer();
    } catch (error) {
      console.error('Failed to load solo challenge:', error);
      toast.error('Could not load challenge.');
    }
  };

  const startSoloTimer = () => {
    if (soloTimerInterval) clearInterval(soloTimerInterval);
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSoloTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setSoloTimerInterval(interval);
  };

  const handleSoloTimeout = () => {
    toast.error('Round timer expired!');
    setMyResult({
      prompt: '[TIMEOUT]',
      characters: 0,
      estimatedTokens: 0,
      aiResponse: 'Time expired before prompt submission.',
      similarity: 0,
      score: 0
    });
    setGameStatus('round-results');
  };

  const handleSoloSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    if (soloTimerInterval) clearInterval(soloTimerInterval);
    setIsSubmitting(true);
    setGameStatus('evaluating');

    try {
      // Evaluate prompt using REST api
      const response = await api.post('/challenges/evaluate', {
        challengeId: soloChallenge?._id,
        prompt: prompt.trim(),
        timeRemaining: timer
      });

      const evaluation = response.data;
      setMyResult(evaluation);
      setSoloScore((prev) => prev + evaluation.score);
      setSoloHistory((prev) => [...prev, { ...evaluation, challenge: soloChallenge }]);
      setGameStatus('round-results');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit prompt');
      startSoloTimer(); // resume timer on fail
      setGameStatus('playing');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSoloNextRound = () => {
    if (soloRound >= soloMaxRounds) {
      setGameStatus('match-over');
      triggerConfetti();
    } else {
      setSoloRound((prev) => prev + 1);
      loadSoloChallenge();
    }
  };

  useEffect(() => {
    if (isSoloMode) {
      loadSoloChallenge();
    }
    return () => {
      if (soloTimerInterval) clearInterval(soloTimerInterval);
    };
  }, [isSoloMode]);


  // ==========================================
  // MULTIPLAYER MODE IMPLEMENTATION
  // ==========================================
  useEffect(() => {
    if (isSoloMode || !socket || !isConnected || !roomCode) return;

    const handleTimerUpdate = (data: { timer: number }) => {
      setTimer(data.timer);
    };

    const handleScoreUpdate = (updatedRoom: RoomState) => {
      setRoom(updatedRoom);
    };

    const handleRoundEnded = (updatedRoom: RoomState) => {
      setRoom(updatedRoom);
      setGameStatus('round-results');
      
      // Look up current user's submission details to display in console
      const me = updatedRoom.players.find(p => p.userId === user?.id);
      if (me?.lastSubmission) {
        setMyResult(me.lastSubmission);
      }
    };

    const handleGameEnded = (finalRoom: RoomState) => {
      setRoom(finalRoom);
      setGameStatus('match-over');
      triggerConfetti();
    };

    const handleGameStarted = (startedRoom: RoomState) => {
      setRoom(startedRoom);
      setPrompt('');
      setMyResult(null);
      setGameStatus('playing');
      setTimer(startedRoom.roundDuration);
    };

    const handleSubmissionResult = (data: any) => {
      setIsSubmitting(false);
      if (data.success) {
        setMyResult(data);
        setGameStatus('evaluating'); // show evaluating screen while waiting for others
      } else {
        toast.error(data.message || 'Failed to score prompt.');
        setGameStatus('playing');
      }
    };

    const handleError = (err: any) => {
      toast.error(err.message || 'Game socket error');
    };

    // Listeners
    socket.on('timer-update', handleTimerUpdate);
    socket.on('score-update', handleScoreUpdate);
    socket.on('round-ended', handleRoundEnded);
    socket.on('game-ended', handleGameEnded);
    socket.on('game-started', handleGameStarted);
    socket.on('submission-result', handleSubmissionResult);
    socket.on('error-msg', handleError);

    return () => {
      socket.off('timer-update', handleTimerUpdate);
      socket.off('score-update', handleScoreUpdate);
      socket.off('round-ended', handleRoundEnded);
      socket.off('game-ended', handleGameEnded);
      socket.off('game-started', handleGameStarted);
      socket.off('submission-result', handleSubmissionResult);
      socket.off('error-msg', handleError);
    };
  }, [socket, isConnected, roomCode, isSoloMode, user]);

  const handleMultiplayerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !socket || !roomCode || !user) return;

    setIsSubmitting(true);
    socket.emit('submit-prompt', {
      roomCode: roomCode.toUpperCase(),
      userId: user.id,
      prompt: prompt.trim(),
      timeRemaining: timer
    });
  };

  const handleMultiplayerNextRound = () => {
    if (!socket || !roomCode) return;
    socket.emit('next-round', { roomCode: roomCode.toUpperCase() });
  };


  // ==========================================
  // SHARED UTILITIES
  // ==========================================
  const triggerConfetti = () => {
    if (confettiTriggered.current) return;
    confettiTriggered.current = true;
    
    const duration = 4 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const activeChallenge = isSoloMode ? soloChallenge : room?.currentChallenge;
  const currentRoundNum = isSoloMode ? soloRound : room?.currentRound;
  const totalRoundsNum = isSoloMode ? soloMaxRounds : room?.totalRounds;
  const isHost = isSoloMode || (room?.hostId === user?.id);

  return (
    <div className="min-h-screen bg-brand-bg text-white pb-12 flex flex-col relative overflow-hidden">
      {/* Background lights */}
      <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-brand-primary/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full bg-brand-secondary/5 blur-[120px] pointer-events-none"></div>

      {/* Top HUD */}
      <header className="border-b border-zinc-850 bg-zinc-950/40 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span 
              onClick={() => { if(confirm('Exit game? Progress will be lost.')) navigate('/'); }}
              className="text-xs font-bold text-zinc-400 hover:text-white cursor-pointer transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-zinc-800"
            >
              ← Back to Lobby
            </span>
            <div className="h-6 w-[1px] bg-zinc-800"></div>
            <h1 className="font-extrabold text-lg text-zinc-200 tracking-tight">
              {isSoloMode ? 'SOLO CHALLENGE' : `LOBBY: ${roomCode}`}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-zinc-400 text-sm font-semibold">
              Round <strong className="text-white">{currentRoundNum ?? 1}</strong> of <strong className="text-zinc-400">{totalRoundsNum ?? 3}</strong>
            </span>
            <div className="h-6 w-[1px] bg-zinc-800"></div>
            
            {/* Timer HUD element */}
            <div className="flex items-center gap-2">
              <svg className={`w-5 h-5 ${timer <= 15 ? 'text-brand-accent animate-pulse' : 'text-brand-secondary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className={`text-xl font-mono font-black ${timer <= 15 ? 'text-brand-accent' : 'text-zinc-100'}`}>
                {timer}s
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-zinc-900/60">
        <div 
          className={`h-full transition-all duration-1000 ${timer <= 15 ? 'bg-brand-accent' : 'bg-brand-secondary'}`}
          style={{ width: `${(timer / 60) * 100}%` }}
        ></div>
      </div>

      <main className="max-w-6xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 w-full">
        {/* Left Column: Challenge console and input */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Target Output Panel */}
          <Card glowing={true} className="border-l-4 border-brand-secondary">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-secondary">Target Output</h3>
              <span className="text-[10px] uppercase font-bold bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">
                {activeChallenge?.category || 'general'}
              </span>
            </div>
            <p className="text-xl font-extrabold text-white leading-relaxed font-display">
              "{activeChallenge?.targetOutput || 'Loading challenge objective...'}"
            </p>
          </Card>

          {/* Gameplay Editor Area */}
          <Card className="flex-1 flex flex-col min-h-[300px]">
            {gameStatus === 'playing' ? (
              <form onSubmit={isSoloMode ? handleSoloSubmit : handleMultiplayerSubmit} className="flex-1 flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-2 flex-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Write your prompt:
                    </label>
                    <span className="text-xs text-zinc-400 font-mono">
                      Length: <strong className={prompt.length > 100 ? 'text-brand-accent' : 'text-brand-secondary'}>{prompt.length}</strong> chars
                    </span>
                  </div>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter prompt that will generate the exact target output above..."
                    className="w-full flex-1 p-4 rounded-xl glass-input text-zinc-100 placeholder-zinc-600 font-mono text-sm leading-relaxed outline-none resize-none min-h-[180px]"
                    disabled={isSubmitting}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !prompt.trim()}
                  className="p-4 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold text-sm tracking-wide hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-30 cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.2)]"
                >
                  {isSubmitting && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  Transmit Prompt to LLM
                </button>
              </form>
            ) : gameStatus === 'evaluating' ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16">
                <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="font-display text-lg font-semibold text-white">Evaluating Prompt Accuracy...</p>
                <p className="text-xs text-zinc-500 max-w-xs text-center leading-relaxed">
                  Claude is generating a completion for your prompt. Our similarity engines will score it shortly.
                </p>
                {myResult && (
                  <div className="mt-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center max-w-sm">
                    <p className="text-xs text-zinc-400 uppercase font-semibold">Your Local Score</p>
                    <p className="text-3xl font-black text-brand-secondary mt-1">{myResult.score} pts</p>
                    <p className="text-xs text-zinc-500 mt-1">Accuracy: {myResult.similarity}% | {myResult.characters} chars</p>
                  </div>
                )}
              </div>
            ) : (
              /* Round Results / Replay console */
              <div className="flex-1 flex flex-col gap-4">
                <h3 className="text-lg font-bold text-white border-b border-zinc-800/60 pb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-brand-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Round Performance Review
                </h3>

                {myResult ? (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-zinc-900/50 border border-zinc-850 p-3 rounded-xl text-center">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold">Accuracy</p>
                        <p className="text-lg font-black text-emerald-400 mt-0.5">{myResult.similarity}%</p>
                      </div>
                      <div className="bg-zinc-900/50 border border-zinc-850 p-3 rounded-xl text-center">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold">Length Penalty</p>
                        <p className="text-lg font-black text-zinc-200 mt-0.5">{myResult.characters} ch</p>
                      </div>
                      <div className="bg-zinc-900/50 border border-zinc-850 p-3 rounded-xl text-center">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold">Points Earned</p>
                        <p className="text-lg font-black text-brand-secondary mt-0.5">+{myResult.score}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Your Submitted Prompt</p>
                      <div className="p-3 bg-zinc-900/70 border border-zinc-850 rounded-xl font-mono text-sm text-zinc-300">
                        "{myResult.prompt}"
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">AI Generated Response</p>
                      <div className="p-3 bg-zinc-900/70 border border-zinc-850 rounded-xl font-mono text-sm text-brand-secondary">
                        "{myResult.aiResponse}"
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400 py-6 text-center italic">No submissions made this round.</p>
                )}

                {/* Host Control Actions to advance rounds */}
                {isHost && gameStatus === 'round-results' && (
                  <button
                    onClick={isSoloMode ? handleSoloNextRound : handleMultiplayerNextRound}
                    className="mt-4 p-3 rounded-xl bg-brand-primary text-white font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer text-center"
                  >
                    {(currentRoundNum ?? 1) >= (totalRoundsNum ?? 3) ? 'Finish Match' : 'Next Round'}
                  </button>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Scoreboards / Lobby updates */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {gameStatus === 'match-over' ? (
            <Card glowing={true} className="flex flex-col gap-6 items-center py-8">
              <svg className="w-16 h-16 text-amber-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 2h2zm0 0H4M8 12a4 4 0 018 0" />
              </svg>
              <div className="text-center">
                <h2 className="text-2xl font-black text-white">Match Concluded!</h2>
                <p className="text-zinc-500 text-xs mt-1">Final scoreboard standings</p>
              </div>

              <div className="w-full flex flex-col gap-3">
                {isSoloMode ? (
                  <div className="p-4 rounded-xl bg-zinc-900 border border-brand-primary/30 flex items-center justify-between">
                    <span className="font-bold text-zinc-200">Your Solo Total:</span>
                    <strong className="text-2xl text-brand-secondary font-black">{soloScore} pts</strong>
                  </div>
                ) : (
                  room?.players
                    .slice()
                    .sort((a, b) => b.score - a.score)
                    .map((player, idx) => (
                      <div 
                        key={player.userId}
                        className={`p-3 rounded-xl border flex items-center justify-between ${
                          idx === 0 
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' 
                            : 'bg-zinc-900/60 border-zinc-850'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm font-mono w-4">#{idx + 1}</span>
                          <img src={player.avatar} alt={player.username} className="w-6 h-6 rounded bg-zinc-800" />
                          <span className="font-semibold text-zinc-200 truncate max-w-[120px]">{player.username}</span>
                        </div>
                        <strong className="font-mono text-sm">{player.score} pts</strong>
                      </div>
                    ))
                )}
              </div>

              <button
                onClick={() => navigate('/')}
                className="w-full p-3 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer text-center"
              >
                Return to Lobby Dashboard
              </button>
            </Card>
          ) : (
            /* Live Scoreboard HUD */
            <Card className="flex flex-col gap-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Scoreboard HUD</h3>
              <div className="flex flex-col gap-2.5">
                {isSoloMode ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between border-b border-zinc-800/50 pb-2 text-sm">
                      <span className="text-zinc-500">Cumulative Score</span>
                      <strong className="text-brand-secondary font-mono">{soloScore} pts</strong>
                    </div>
                    
                    {/* Solo Match Round history tracker */}
                    <div className="flex flex-col gap-2 mt-2">
                      <p className="text-xs font-semibold text-zinc-500">Round Progress</p>
                      {soloHistory.map((h, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-855 text-xs flex justify-between">
                          <span className="text-zinc-400">R{idx + 1}: Acc {h.similarity}%</span>
                          <span className="text-brand-secondary font-bold font-mono">+{h.score} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  room?.players
                    .slice()
                    .sort((a, b) => b.score - a.score)
                    .map((player, idx) => (
                      <div 
                        key={player.userId}
                        className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/30 border border-zinc-900 hover:border-zinc-850 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-bold font-mono text-zinc-500 w-4 text-center">#{idx + 1}</span>
                          <img src={player.avatar} alt={player.username} className="w-6 h-6 rounded bg-zinc-800" />
                          <span className="text-xs font-medium text-zinc-200 truncate max-w-[100px]">
                            {player.username}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${player.hasSubmitted ? 'bg-emerald-400' : 'bg-zinc-700 animate-pulse'}`}></span>
                          <span className="text-xs font-bold font-mono text-zinc-100">{player.score} pts</span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};
