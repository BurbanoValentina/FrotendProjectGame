import React from "react";
import { motion } from "framer-motion";

interface TimerProps {
  timeRemaining: number;
}

const Timer: React.FC<TimerProps> = ({ timeRemaining }) => {
  const isLowTime = timeRemaining <= 10;
  
  return (
    <motion.div
      className="timer"
      animate={isLowTime ? {
        scale: [1, 1.1, 1],
        boxShadow: [
          "0 5px 15px rgba(240, 147, 251, 0.3)",
          "0 8px 25px rgba(255, 107, 107, 0.5)",
          "0 5px 15px rgba(240, 147, 251, 0.3)"
        ]
      } : {}}
      transition={isLowTime ? {
        duration: 0.5,
        repeat: Infinity,
        repeatType: "loop"
      } : {}}
    >
      <span className="timer-icon">⏱️</span>
      <motion.span
        className="timer-value"
        key={timeRemaining}
        initial={{ scale: 1.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{ color: isLowTime ? '#ff6b6b' : 'white' }}
      >
        {timeRemaining}s
      </motion.span>
    </motion.div>
  );
};

export default Timer;
