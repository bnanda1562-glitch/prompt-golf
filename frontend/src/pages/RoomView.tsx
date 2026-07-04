import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useSocket } from '../context/SocketContext.js';
import { useToast } from '../context/ToastContext.js';
import { Card } from '../components/Card.js';

interface RoomPlayer {
  userId: string;
  username: string;
  avatar: string;
  ready: boolean;
  score: number;
}

interface RoomState {
  roomCode: string;
  hostId: string;
  status: 'waiting' | 'playing' | 'ended';
  currentRound: number;
  totalRounds: number;
  roundDuration: number;
  maxPlayers: number;
  players: RoomPlayer[];
}

export const RoomView: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [room, setRoom] = useState<RoomState | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Join the lobby on component mount
  useEffect(() => {
    if (!socket || !isConnected || !roomCode || !user) return;

    // Join Lobby
    socket.emit('join-room', {
      roomCode: roomCode.toUpperCase(),
      userId: user.id,
      username: user.username,
      avatar: user.avatar
    });

    const handlePlayerJoined = (updatedRoom: RoomState) => {
      setRoom(updatedRoom);
    };

    const handlePlayerLeft = (updatedRoom: RoomState) => {
      setRoom(updatedRoom);
    };

    const handleScoreUpdate = (updatedRoom: RoomState) => {
      setRoom(updatedRoom);
    };

    const handleGameStarted = (startedRoom: RoomState) => {
      toast.success('Game is starting!');
      navigate(`/game/${startedRoom.roomCode}`);
    };

    const handleError = (err: any) => {
      toast.error(err.message || 'Failed to join room');
      navigate('/');
    };

    socket.on('player-joined', handlePlayerJoined);
    socket.on('player-left', handlePlayerLeft);
    socket.on('score-update', handleScoreUpdate);
    socket.on('game-started', handleGameStarted);
    socket.on('error-msg', handleError);

    return () => {
      // Emit leave room on unmount if game hasn't started yet
      if (room && room.status === 'waiting') {
        socket.emit('leave-room', { roomCode: roomCode.toUpperCase(), userId: user.id });
      }
      
      socket.off('player-joined', handlePlayerJoined);
      socket.off('player-left', handlePlayerLeft);
      socket.off('score-update', handleScoreUpdate);
      socket.off('game-started', handleGameStarted);
      socket.off('error-msg', handleError);
    };
  }, [socket, isConnected, roomCode, user, navigate, toast]);

  const toggleReady = () => {
    if (!socket || !roomCode || !user) return;
    socket.emit('ready', {
      roomCode: roomCode.toUpperCase(),
      userId: user.id
    });
  };

  const startGame = () => {
    if (!socket || !roomCode) return;
    socket.emit('start-game', { roomCode: roomCode.toUpperCase() });
  };

  const handleCopyLink = () => {
    const inviteLink = `${window.location.origin}/room/${roomCode?.toUpperCase()}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Invite link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg text-white">
        <div className="flex flex-col items-center gap-4 p-8 glass-panel rounded-2xl max-w-sm w-full animate-pulse">
          <div className="w-12 h-12 border-4 border-brand-secondary border-t-transparent rounded-full animate-spin"></div>
          <p className="font-display font-medium tracking-wide">Syncing Room Lobby...</p>
        </div>
      </div>
    );
  }

  const isHost = room.hostId === user?.id;
  const currentPlayer = room.players.find(p => p.userId === user?.id);
  const everyoneReady = room.players.every(p => p.ready);
  const canStart = everyoneReady && room.players.length >= 2; // Need at least 2 players for multiplayer

  return (
    <div className="min-h-screen bg-brand-bg text-white pb-12 relative overflow-hidden">
      {/* Lights background */}
      <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-brand-primary/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full bg-brand-secondary/5 blur-[120px] pointer-events-none"></div>

      <main className="max-w-4xl mx-auto px-6 mt-16 flex flex-col gap-8 z-10 relative">
        {/* LobbyHeader */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Game Lobby</h1>
              <span className="bg-brand-primary/10 border border-brand-primary/30 text-brand-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Waiting for Players
              </span>
            </div>
            <p className="text-zinc-400 text-sm mt-2">
              Lobby configurations: {room.totalRounds} Rounds | {room.roundDuration}s per Round
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="glass-panel px-5 py-3 rounded-xl flex items-center gap-3 border border-brand-secondary/20 shadow-[0_0_15px_rgba(6,182,212,0.05)]">
              <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Room Code:</span>
              <span className="text-2xl font-black text-brand-secondary font-mono tracking-widest">{room.roomCode}</span>
            </div>
            <button
              onClick={handleCopyLink}
              className="p-3 bg-zinc-850 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 rounded-xl transition-all cursor-pointer flex items-center justify-center text-zinc-300 hover:text-white"
              title="Copy invite URL"
            >
              {copied ? (
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Player list column */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <h2 className="text-lg font-bold text-zinc-300 uppercase tracking-wider">
              Lobby Crew ({room.players.length} / {room.maxPlayers})
            </h2>

            <div className="flex flex-col gap-3">
              {room.players.map((player) => {
                const isPlayerHost = room.hostId === player.userId;
                return (
                  <div
                    key={player.userId}
                    className={`p-4 rounded-xl glass-panel border flex items-center justify-between transition-all ${
                      player.userId === user?.id 
                        ? 'border-brand-primary/40 bg-brand-primary/[0.03]' 
                        : 'border-zinc-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={player.avatar}
                        alt={player.username}
                        className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700/50"
                      />
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                          {player.username}
                          {isPlayerHost && (
                            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded uppercase">
                              Host
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {player.userId === user?.id ? 'You' : 'Connected'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border uppercase tracking-wider transition-all ${
                        player.ready 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                      }`}>
                        {player.ready ? 'Ready' : 'Not Ready'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lobby status column */}
          <div className="md:col-span-1 flex flex-col gap-6">
            <Card className="flex flex-col gap-6">
              <h2 className="text-lg font-bold text-white">Lobby Status</h2>

              <div className="flex flex-col gap-4 text-sm text-zinc-400">
                <div className="flex justify-between border-b border-zinc-800/50 pb-2">
                  <span>Capacity</span>
                  <span className="text-white font-bold">{room.players.length} / {room.maxPlayers}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800/50 pb-2">
                  <span>Match Rounds</span>
                  <span className="text-white font-bold">{room.totalRounds} Rounds</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800/50 pb-2">
                  <span>Timer Scale</span>
                  <span className="text-white font-bold">{room.roundDuration}s / round</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-4">
                {/* Ready Status toggler (only for non-hosts, hosts are ready by default) */}
                {!isHost ? (
                  <button
                    onClick={toggleReady}
                    className={`w-full p-3 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
                      currentPlayer?.ready
                        ? 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300'
                        : 'bg-brand-primary text-white hover:opacity-90 active:scale-[0.98]'
                    }`}
                  >
                    {currentPlayer?.ready ? 'Cancel Ready' : 'Mark Ready'}
                  </button>
                ) : (
                  <div className="text-xs text-zinc-500 text-center italic mb-1">
                    You are host. Ready status locked.
                  </div>
                )}

                {/* Host startGame controls */}
                {isHost && (
                  <button
                    onClick={startGame}
                    disabled={!canStart}
                    className={`w-full p-3 rounded-xl text-zinc-950 font-black text-sm transition-all cursor-pointer ${
                      canStart 
                        ? 'bg-brand-secondary hover:opacity-90 active:scale-[0.98] shadow-[0_0_20px_rgba(6,182,212,0.3)]' 
                        : 'bg-zinc-800 border border-zinc-700/50 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    Start Match
                  </button>
                )}

                {isHost && !canStart && (
                  <p className="text-[10px] text-zinc-500 text-center mt-1 leading-relaxed">
                    {room.players.length < 2
                      ? 'Waiting for at least 2 players to join.'
                      : 'Waiting for all players to click Ready.'}
                  </p>
                )}

                <button
                  onClick={() => navigate('/')}
                  className="w-full p-3 rounded-xl bg-transparent hover:bg-white/5 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white font-semibold text-sm transition-all cursor-pointer text-center"
                >
                  Leave Lobby
                </button>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};
