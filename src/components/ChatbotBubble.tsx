import React from "react";
import { motion } from "framer-motion";

interface ChatbotBubbleProps {
  message: string;
  botScore: number;
  botSolved: number;
  playerScore: number;
  isActive: boolean;
  mood: "sassy" | "confident" | "panic";
}

const moodEmojis: Record<ChatbotBubbleProps["mood"], string> = {
  sassy: "😏",
  confident: "😎",
  panic: "😳",
};

const moodTitles: Record<ChatbotBubbleProps["mood"], string> = {
  sassy: "Modo burlón",
  confident: "Modo campeón",
  panic: "Modo pánico",
};

const ChatbotBubble: React.FC<ChatbotBubbleProps> = ({
  message,
  botScore,
  botSolved,
  playerScore,
  isActive,
  mood,
}) => (
  <motion.div
    className="chatbot-wrapper"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <div className={`chatbot-bubble ${mood}`}>
      <div className="chatbot-face">{moodEmojis[mood]}</div>
      <div className="chatbot-content">
        <p className="chatbot-title">
          {isActive ? moodTitles[mood] : "El bot está esperando"}
        </p>
        <p className="chatbot-message">{message}</p>
        <div className="chatbot-stats">
          <div>
            <span>🤖 Puntaje bot</span>
            <strong>{botScore}</strong>
          </div>
          <div>
            <span>✅ Resueltas</span>
            <strong>{botSolved}</strong>
          </div>
          <div>
            <span>🆚 Tu puntaje</span>
            <strong>{playerScore}</strong>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

export default ChatbotBubble;
