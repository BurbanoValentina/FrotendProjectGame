import React, { useState, useEffect } from "react";
import WelcomeScreen from "./components/WelcomeScreen";
import Login from "./components/Login";
import Register from "./components/Register";
import GameScreen from "./components/GameScreen";
import AuthService from "./services/AuthService";

type AppView = 'welcome' | 'login' | 'register' | 'game';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('welcome');
  const authService = AuthService.getInstance();

  useEffect(() => {
    // Verificar si hay una sesión activa
    if (authService.isAuthenticated()) {
      setCurrentView('game');
    }
  }, []);

  const handleLoginSuccess = () => {
    authService.pushNavigation('game');
    setCurrentView('game');
  };

  const handleRegisterSuccess = () => {
    authService.pushNavigation('game');
    setCurrentView('game');
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentView('login');
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
      
      {currentView === 'game' && (
        <GameScreen onLogout={handleLogout} />
      )}
    </div>
  );
};

export default App;
