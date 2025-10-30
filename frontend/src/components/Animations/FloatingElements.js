import React, { useEffect, useRef } from 'react';
import './FloatingElements.css';

const FloatingElements = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Créer des éléments flottants
    const createFloatingElement = (index) => {
      const element = document.createElement('div');
      element.className = `floating-element element-${index + 1}`;
      
      // Styles aléatoires
      const size = Math.random() * 40 + 20;
      const left = Math.random() * 80 + 10;
      const animationDuration = Math.random() * 20 + 20;
      const animationDelay = Math.random() * 5;
      
      element.style.width = `${size}px`;
      element.style.height = `${size}px`;
      element.style.left = `${left}%`;
      element.style.animationDuration = `${animationDuration}s`;
      element.style.animationDelay = `${animationDelay}s`;
      
      // Ajouter un contenu SVG ou emoji basé sur l'index
      if (index % 4 === 0) {
        element.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
        `;
      } else if (index % 4 === 1) {
        element.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        `;
      } else if (index % 4 === 2) {
        element.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
        `;
      } else {
        element.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
        `;
      }
      
      container.appendChild(element);
    };

    // Créer plusieurs éléments
    for (let i = 0; i < 8; i++) {
      createFloatingElement(i);
    }

    // Nettoyage
    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="floating-elements"
    />
  );
};

export default FloatingElements;