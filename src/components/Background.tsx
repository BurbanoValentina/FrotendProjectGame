import React from "react";

interface BackgroundProps {
  level: "basic" | "advanced" | "expert";
}

const Background: React.FC<BackgroundProps> = ({ level }) => {
  return <div className={`background background-${level}`}></div>;
};

export default Background;
