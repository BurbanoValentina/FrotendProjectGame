import React from 'react';
import './WelcomeScreen.css';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGetStarted }) => {
  return (
    <div className="welcome-container">
      <div className="welcome-content">
        <div className="welcome-icon">🎮</div>
        <h1 className="welcome-title">¡Bienvenido al Desafío Matemático!</h1>
        <p className="welcome-description">
          Un juego educativo donde pondrás a prueba tus habilidades matemáticas
          mientras compites por el mejor puntaje.
        </p>
        
        <div className="features-grid">
          <div className="feature-card">
            <span className="feature-icon">🔒</span>
            <h3>Seguro</h3>
            <p>Contraseñas encriptadas con MD5</p>
          </div>
          
          <div className="feature-card">
            <span className="feature-icon">🏆</span>
            <h3>Competitivo</h3>
            <p>Guarda tu mejor puntuación</p>
          </div>
          
          <div className="feature-card">
            <span className="feature-icon">⚡</span>
            <h3>Rápido</h3>
            <p>Resuelve contra el reloj</p>
          </div>
          
          <div className="feature-card">
            <span className="feature-icon">📊</span>
            <h3>Estadísticas</h3>
            <p>Rastrea tu progreso</p>
          </div>
        </div>
        
        <button className="get-started-button" onClick={onGetStarted}>
          🚀 Comenzar Ahora
        </button>
        
        <div className="tech-info">
          <p>Construido con:</p>
          <div className="tech-badges">
            <span className="tech-badge">React + TypeScript</span>
            <span className="tech-badge">Spring Boot</span>
            <span className="tech-badge">Estructuras de Datos</span>
            <span className="tech-badge">Patrones de Diseño</span>
          </div>
        </div>
      </div>
      
      <div className="welcome-background">
        <div className="bg-circle circle-1"></div>
        <div className="bg-circle circle-2"></div>
        <div className="bg-circle circle-3"></div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
