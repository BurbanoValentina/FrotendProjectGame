import React from "react";
import { motion } from "framer-motion";

interface BackgroundProps {
  level: "basic" | "advanced" | "expert";
}

const Background: React.FC<BackgroundProps> = ({ level }) => {
  // Patrones de diseño: Strategy pattern para colores según dificultad
  const getGradient = () => {
    switch (level) {
      case "basic":
        return "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
      case "advanced":
        return "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)";
      case "expert":
        return "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)";
      default:
        return "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
    }
  };

  return (
    <motion.div
      className={`background background-${level}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: getGradient(),
        zIndex: -1
      }}
    />
  );
};

export default Background;
