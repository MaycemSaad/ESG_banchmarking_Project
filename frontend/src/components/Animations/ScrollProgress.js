import React from 'react';
import './ScrollProgress.css';

const ScrollProgress = ({ progress }) => {
  return (
    <div 
      className="scroll-progress" 
      style={{ transform: `scaleX(${progress / 100})` }}
    >
      <div className="scroll-progress-gradient"></div>
    </div>
  );
};

export default ScrollProgress;