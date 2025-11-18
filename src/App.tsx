import React, { useState, useEffect } from "react";
import WelcomeScreen from "./components/WelcomeScreen";
import Login from "./components/Login";
import Register from "./components/Register";
import GameModeSelection from "./components/GameModeSelection";
import GameScreen from "./components/GameScreen";
import MultiplayerScreen from "./components/MultiplayerScreen";
import AuthService from "./services/AuthService";

type AppView = 'welcome' | 'login' | 'register' | 'gameMode' | 'chatbotGame' | 'multiplayer';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('welcome');
  const authService = AuthService.getInstance();

  useEffect(() => {
    // Verificar si hay una sesión activa
    if (authService.isAuthenticated()) {
      setCurrentView('gameMode');
    }
  }, []);

  const handleLoginSuccess = () => {
    authService.pushNavigation('gameMode');
    setCurrentView('gameMode');
  };

  const handleRegisterSuccess = () => {
    authService.pushNavigation('gameMode');
    setCurrentView('gameMode');
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
        />
      )}
    </div>
  );
};

export default App;
