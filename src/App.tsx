import React, { useState, useEffect } from "react";
import WelcomeScreen from "./components/WelcomeScreen";
import Login from "./components/Login";
import Register from "./components/Register";
import ForgotPassword from "./components/ForgotPassword";
import GameModeSelection from "./components/GameModeSelection";
import GameScreen from "./components/GameScreen";
import MultiplayerScreen from "./components/MultiplayerScreen";
import AuthService from "./services/AuthService";

type AppView =
  | 'welcome'
  | 'login'
  | 'register'
  | 'forgotPassword'
  | 'gameMode'
  | 'chatbotGame'
  | 'multiplayer';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('welcome');
  const [deepLinkRoomCode, setDeepLinkRoomCode] = useState<string | null>(null);
  const authService = AuthService.getInstance();

  useEffect(() => {
    // Verificar si hay una sesión activa
    const hasSession = authService.isAuthenticated();
    setCurrentView(hasSession ? 'gameMode' : 'welcome');

    const params = new URLSearchParams(window.location.search);
    const qrRoomCode = params.get('roomCode');

    if (qrRoomCode) {
      const normalizedCode = qrRoomCode.toUpperCase();
      setDeepLinkRoomCode(normalizedCode);
      setCurrentView(hasSession ? 'multiplayer' : 'login');
    }
  }, []);

  const consumeDeepLinkRoomCode = () => {
    setDeepLinkRoomCode(null);
    if (window.location.search) {
      const url = new URL(window.location.href);
      url.searchParams.delete('roomCode');
      url.searchParams.delete('autoJoin');
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleLoginSuccess = () => {
    authService.pushNavigation('gameMode');
    setCurrentView(deepLinkRoomCode ? 'multiplayer' : 'gameMode');
  };

  const handleRegisterSuccess = () => {
    authService.pushNavigation('gameMode');
    setCurrentView(deepLinkRoomCode ? 'multiplayer' : 'gameMode');
  };

  const handleSelectChatbot = () => {
    authService.pushNavigation('chatbotGame');
    setCurrentView('chatbotGame');
  };

  const handleSelectMultiplayer = () => {
    authService.pushNavigation('multiplayer');
    setCurrentView('multiplayer');
  };

  const handleBackToModeSelection = () => {
    setCurrentView('gameMode');
  };

  const handleForgotPassword = () => {
    setCurrentView('forgotPassword');
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentView('login');
  };

  const getCurrentUser = () => {
    return authService.getCurrentUser();
  };

  return (
    <div className="app">
      {currentView === 'welcome' && (
        <WelcomeScreen onGetStarted={() => setCurrentView('login')} />
      )}
      
      {currentView === 'login' && (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onSwitchToRegister={() => setCurrentView('register')}
          onForgotPassword={handleForgotPassword}
        />
      )}
      
      {currentView === 'forgotPassword' && (
        <ForgotPassword
          onBackToLogin={() => setCurrentView('login')}
        />
      )}

      {currentView === 'register' && (
        <Register
          onRegisterSuccess={handleRegisterSuccess}
          onSwitchToLogin={() => setCurrentView('login')}
        />
      )}
      
      {currentView === 'gameMode' && (
        <GameModeSelection
          onSelectChatbot={handleSelectChatbot}
          onSelectMultiplayer={handleSelectMultiplayer}
          playerName={getCurrentUser()?.nickname || getCurrentUser()?.username || 'Jugador'}
        />
      )}
      
      {currentView === 'chatbotGame' && (
        <GameScreen onLogout={handleLogout} onBack={handleBackToModeSelection} />
      )}
      
      {currentView === 'multiplayer' && (
        <MultiplayerScreen 
          onBack={handleBackToModeSelection}
          playerName={getCurrentUser()?.nickname || getCurrentUser()?.username || 'Jugador'}
          initialRoomCode={deepLinkRoomCode}
          onRoomCodeConsumed={consumeDeepLinkRoomCode}
        />
      )}
    </div>
  );
};

export default App;
