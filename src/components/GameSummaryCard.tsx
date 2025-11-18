import React from "react";
import { AnimatePresence, motion } from "framer-motion";

interface GameSummaryCardProps {
  visible: boolean;
  correctAnswers: number;
  totalQuestions: number;
  score: number;
  botScore: number;
  performanceLabel: string;
  performanceDescription: string;
  onClose: () => void;
  onPlayAgain: () => void;
}

const GameSummaryCard: React.FC<GameSummaryCardProps> = ({
  visible,
  correctAnswers,
  totalQuestions,
  score,
  botScore,
  performanceLabel,
  performanceDescription,
  onClose,
  onPlayAgain,
}) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        className="summary-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ duration: 0.35, type: "spring", stiffness: 180 }}
      >
        <div className="summary-header">
          <span className="summary-badge">{performanceLabel}</span>
          <p className="summary-description">{performanceDescription}</p>
        </div>
        <div className="summary-stats">
          <div>
            <span>✅ Preguntas resueltas</span>
            <strong>
              {correctAnswers}/{totalQuestions}
            </strong>
          </div>
          <div>
            <span>🎯 Tu puntaje</span>
            <strong>{score}</strong>
          </div>
          <div>
            <span>🤖 Puntaje del bot</span>
            <strong>{botScore}</strong>
          </div>
        </div>
        <div className="summary-actions">
          <button type="button" className="summary-button ghost" onClick={onClose}>
            Cerrar
          </button>
          <button type="button" className="summary-button primary" onClick={onPlayAgain}>
            Jugar otra vez
          </button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default GameSummaryCard;
