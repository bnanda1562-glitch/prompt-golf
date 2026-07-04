import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { SocketProvider } from './context/SocketContext.js';
import { ToastProvider } from './context/ToastContext.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { Auth } from './pages/Auth.js';
import { Dashboard } from './pages/Dashboard.js';
import { RoomView } from './pages/RoomView.js';
import { GameView } from './pages/GameView.js';

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<Auth />} />
              <Route path="/signup" element={<Auth />} />
              
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/room/:roomCode" element={
                <ProtectedRoute>
                  <RoomView />
                </ProtectedRoute>
              } />
              
              <Route path="/game/solo" element={
                <ProtectedRoute>
                  <GameView />
                </ProtectedRoute>
              } />
              
              <Route path="/game/:roomCode" element={
                <ProtectedRoute>
                  <GameView />
                </ProtectedRoute>
              } />
              
              {/* Fallback redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
