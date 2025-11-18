import React from "react";
import { AnimatePresence, motion } from "framer-motion";

interface CountdownOverlayProps {
  value: number | null;
  visible: boolean;
}

const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ value, visible }) => (
  <AnimatePresence>
    {visible && value !== null && (
      <motion.div
        className="countdown-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          key={value}
          className="countdown-number"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ duration: 0.45, type: "spring", stiffness: 260 }}
        >
          {value === 0 ? "¡Vamos!" : value}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default CountdownOverlay;
