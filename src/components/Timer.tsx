import React from "react";

interface TimerProps {
  timeRemaining: number;
}

const Timer: React.FC<TimerProps> = ({ timeRemaining }) => {
  return <div className="timer">{timeRemaining}s</div>;
};

export default Timer;
