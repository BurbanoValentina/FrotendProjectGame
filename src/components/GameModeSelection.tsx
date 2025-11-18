import React from 'react';
import { motion } from 'framer-motion';
import Button from './Button';
import Background from './Background';
import '../styles/GameModeSelection.css';

interface GameModeSelectionProps {
  onSelectChatbot: () => void;
  onSelectMultiplayer: () => void;
  playerName: string;
}

const GameModeSelection: React.FC<GameModeSelectionProps> = ({
  onSelectChatbot,
  onSelectMultiplayer,
  playerName
}) => {
  return (
    <div className="game-mode-selection">
      <Background level="basic" />
      <motion.div
        className="mode-selection-container"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h1
          className="mode-title"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          ¡Bienvenido, {playerName}!
        </motion.h1>
        
        <motion.p
          className="mode-subtitle"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Selecciona tu modo de juego
        </motion.p>

        <div className="mode-buttons-container">
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Button
              onClick={onSelectChatbot}
              className="mode-button chatbot-button"
            >
              <span className="button-icon">🤖</span>
              <span className="button-text">Jugar contra Chatbot</span>
              <span className="button-description">Practica contra la IA</span>
            </Button>
          </motion.div>

          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <Button
              onClick={onSelectMultiplayer}
              className="mode-button multiplayer-button"
            >
              <span className="button-icon">👥</span>
              <span className="button-text">Multijugador</span>
              <span className="button-description">Juega con amigos en línea</span>
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default GameModeSelection;
