import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useSocket } from '../context/SocketContext.js';
import { useToast } from '../context/ToastContext.js';
import { Card } from '../components/Card.js';
import { Dialog } from '../components/Dialog.js';
import api from '../services/api.js';

interface DashboardStats {
  avgScore: number;
  avgSimilarity: number;
  winRate: number;
  rank: number;
  bestPrompt: {
    prompt: string;
    score: number;
    similarity: number;
    targetOutput: string;
  } | null;
  recentMatches: Array<{
    id: string;
    prompt: string;
    aiResponse: string;
    score: number;
    similarity: number;
    characters: number;
    targetOutput: string;
    category: string;
    difficulty: string;
    submittedAt: string;
  }>;
}

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Lobby creation dialog
  const [isLobbyModalOpen, setIsLobbyModalOpen] = useState<boolean>(false);
  const [totalRounds, setTotalRounds] = useState<number>(3);
  const [roundDuration, setRoundDuration] = useState<number>(60);
  const [maxPlayers, setMaxPlayers] = useState<number>(8);
  const [lobbyLoading, setLobbyLoading] = useState<boolean>(false);

  // Join lobby input
  const [joinCode, setJoinCode] = useState<string>('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/auth/profile');
        setStats(response.data.stats);
      } catch (error) {
        console.error('Failed to load profile stats:', error);
        toast.error('Could not load user statistics.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [toast]);

  // Hook socket listeners for lobby creation
  useEffect(() => {
    if (!socket) return;

    const handleRoomCreated = (roomData: any) => {
      setLobbyLoading(false);
      setIsLobbyModalOpen(false);
      toast.success(`Room ${roomData.roomCode} created!`);
      navigate(`/room/${roomData.roomCode}`);
    };

    const handleError = (err: any) => {
      setLobbyLoading(false);
      toast.error(err.message || 'Lobby operation failed');
    };

    socket.on('room-created', handleRoomCreated);
    socket.on('error-msg', handleError);

    return () => {
      socket.off('room-created', handleRoomCreated);
      socket.off('error-msg', handleError);
    };
  }, [socket, navigate, toast]);

  const handleCreateRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !isConnected) {
      toast.error('Not connected to the websocket server.');
      return;
    }

    setLobbyLoading(true);
    socket.emit('create-room', {
      userId: user?.id,
      username: user?.username,
      avatar: user?.avatar,
      settings: {
        totalRounds,
        roundDuration,
        maxPlayers
      }
    });
  };

  const handleJoinRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      toast.error('Please enter a room code');
      return;
    }
    navigate(`/room/${joinCode.trim().toUpperCase()}`);
  };

  const handlePlaySoloClick = () => {
    // Navigate to Solo Mode (which utilizes GameView with a special routing flag)
    navigate('/game/solo');
  };

  return (
    <div className="min-h-screen bg-brand-bg text-white pb-12">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent tracking-tight">
            PROMPT GOLF
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-500 animate-pulse'}`}></span>
              <span className="text-xs text-zinc-400">{isConnected ? 'Server Connected' : 'Server Offline'}</span>
            </div>
            <div className="flex items-center gap-3 pl-4 border-l border-zinc-800">
              <img src={user?.avatar} alt={user?.username} className="w-8 h-8 rounded-lg bg-zinc-800" />
              <span className="text-sm font-semibold text-zinc-200">{user?.username}</span>
            </div>
            <button 
              onClick={logout}
              className="text-xs font-semibold text-zinc-400 hover:text-brand-accent transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Quick Actions & Stats summary */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Quick Actions */}
          <Card glowing={true} className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-white mb-2">Launch Lobby</h2>
            
            <button 
              onClick={() => setIsLobbyModalOpen(true)}
              className="w-full p-3 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer text-center"
            >
              Create Multiplayer Room
            </button>

            <button 
              onClick={handlePlaySoloClick}
              className="w-full p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 border border-zinc-700/50 font-semibold text-sm hover:text-white transition-all cursor-pointer text-center"
            >
              Play Solo Challenge
            </button>

            <div className="border-t border-zinc-800 my-2"></div>

            <form onSubmit={handleJoinRoomSubmit} className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Join via Room Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="EX: ABCD"
                  className="glass-input p-2.5 rounded-xl text-white uppercase font-bold tracking-widest text-center flex-1 placeholder-zinc-600 text-sm focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 rounded-xl bg-brand-secondary hover:opacity-90 active:scale-[0.95] text-zinc-950 font-bold text-sm transition-all cursor-pointer"
                >
                  Join
                </button>
              </div>
            </form>
          </Card>

          {/* Stats Breakdown */}
          <Card className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-white mb-2">My Profile Stats</h2>
            {loading ? (
              <div className="animate-pulse flex flex-col gap-3">
                <div className="h-6 bg-zinc-800 rounded w-2/3"></div>
                <div className="h-6 bg-zinc-800 rounded w-1/2"></div>
                <div className="h-6 bg-zinc-800 rounded w-3/4"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900/40 border border-zinc-800/60 p-3 rounded-xl">
                  <p className="text-xs text-zinc-500 uppercase font-semibold">ELO Rating</p>
                  <p className="text-2xl font-black text-brand-secondary mt-0.5">{user?.rating}</p>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800/60 p-3 rounded-xl">
                  <p className="text-xs text-zinc-500 uppercase font-semibold">Global Rank</p>
                  <p className="text-2xl font-black text-white mt-0.5">#{stats?.rank || 1}</p>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800/60 p-3 rounded-xl">
                  <p className="text-xs text-zinc-500 uppercase font-semibold">Wins / Games</p>
                  <p className="text-lg font-bold text-zinc-200 mt-1">{user?.wins} <span className="text-zinc-500 text-sm">/ {user?.gamesPlayed}</span></p>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800/60 p-3 rounded-xl">
                  <p className="text-xs text-zinc-500 uppercase font-semibold">Win Rate</p>
                  <p className="text-lg font-bold text-zinc-200 mt-1">{stats?.winRate}%</p>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800/60 p-3 rounded-xl col-span-2">
                  <p className="text-xs text-zinc-500 uppercase font-semibold">Avg. Accuracy / Score</p>
                  <p className="text-lg font-bold text-zinc-200 mt-1">
                    {stats?.avgSimilarity}% <span className="text-zinc-500 text-sm">/ {stats?.avgScore} pts</span>
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Best achievements & Match History list */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Best Submission */}
          {!loading && stats?.bestPrompt && (
            <Card className="border-l-4 border-brand-primary">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-primary mb-2">Best Golf Prompt</h3>
              <p className="text-zinc-400 text-xs italic mb-2">Target Output: "{stats.bestPrompt.targetOutput}"</p>
              <div className="bg-zinc-900/80 p-3 rounded-xl font-mono text-sm text-zinc-100 border border-zinc-800">
                "{stats.bestPrompt.prompt}"
              </div>
              <div className="flex gap-4 mt-3 text-xs text-zinc-400">
                <span>Score: <strong className="text-brand-secondary">{stats.bestPrompt.score} pts</strong></span>
                <span>Accuracy: <strong className="text-emerald-400">{stats.bestPrompt.similarity}%</strong></span>
              </div>
            </Card>
          )}

          {/* Match History */}
          <Card className="flex-1 flex flex-col gap-4">
            <h2 className="text-xl font-bold text-white mb-2">Match & Submission History</h2>
            {loading ? (
              <div className="animate-pulse flex flex-col gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-zinc-850 rounded-xl"></div>
                ))}
              </div>
            ) : !stats || stats.recentMatches.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-zinc-500">
                <svg className="w-12 h-12 mb-3 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-medium">No games played yet.</p>
                <p className="text-xs text-zinc-600 mt-1">Host a multiplayer lobby or play solo to get started!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2">
                {stats.recentMatches.map((match) => (
                  <div 
                    key={match.id}
                    className="p-4 rounded-xl bg-zinc-950/40 border border-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-zinc-800 transition-colors"
                  >
                    <div className="flex-1 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          match.difficulty === 'easy' ? 'bg-emerald-500/20 text-emerald-400' :
                          match.difficulty === 'hard' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {match.difficulty}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-semibold uppercase">{match.category}</span>
                      </div>
                      <p className="text-zinc-400 text-xs italic mt-1">Target: "{match.targetOutput.substring(0, 50)}..."</p>
                      <p className="text-zinc-200 text-sm font-mono mt-1">Prompt: "{match.prompt}"</p>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-zinc-900 pt-2 md:pt-0">
                      <div className="text-right">
                        <p className="text-xs text-zinc-500 uppercase font-semibold">Similarity</p>
                        <p className="text-sm font-bold text-emerald-400">{match.similarity}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-zinc-500 uppercase font-semibold text-right">Score</p>
                        <p className="text-lg font-black text-brand-secondary">{match.score} pts</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* Create Lobby Modal */}
      <Dialog 
        isOpen={isLobbyModalOpen} 
        onClose={() => setIsLobbyModalOpen(false)}
        title="Lobby Customizer"
      >
        <form onSubmit={handleCreateRoomSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Number of Rounds</label>
            <select
              value={totalRounds}
              onChange={(e) => setTotalRounds(Number(e.target.value))}
              className="glass-input p-3 rounded-xl text-white text-sm focus:outline-none"
            >
              <option value={1} className="bg-zinc-950">1 Round</option>
              <option value={3} className="bg-zinc-950">3 Rounds (Standard)</option>
              <option value={5} className="bg-zinc-950">5 Rounds</option>
              <option value={10} className="bg-zinc-950">10 Rounds (Marathon)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Round Timer (Seconds)</label>
            <select
              value={roundDuration}
              onChange={(e) => setRoundDuration(Number(e.target.value))}
              className="glass-input p-3 rounded-xl text-white text-sm focus:outline-none"
            >
              <option value={30} className="bg-zinc-950">30 seconds (Speedrun)</option>
              <option value={60} className="bg-zinc-950">60 seconds (Standard)</option>
              <option value={90} className="bg-zinc-950">90 seconds</option>
              <option value={120} className="bg-zinc-950">120 seconds (Brainy)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Max Lobby Capacity</label>
            <select
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="glass-input p-3 rounded-xl text-white text-sm focus:outline-none"
            >
              <option value={4} className="bg-zinc-950">4 Players</option>
              <option value={8} className="bg-zinc-950">8 Players (Standard)</option>
              <option value={12} className="bg-zinc-950">12 Players</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={lobbyLoading}
            className="mt-4 p-3 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {lobbyLoading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            Launch Server Instance
          </button>
        </form>
      </Dialog>
    </div>
  );
};
