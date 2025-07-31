import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ children, content }) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // Position tooltip to the left of the button, centered vertically
      setPosition({
        top: rect.top + rect.height / 2,
        left: rect.left,
      });
      setVisible(true);
    }
  };

  const hideTooltip = () => setVisible(false);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        className="inline-block"
      >
        {children}
      </div>
      {visible && ReactDOM.createPortal(
        <div
          className="absolute p-2 bg-gray-900 border border-cyan-400 rounded-md shadow-lg z-[100] pointer-events-none w-64 transform -translate-x-full -translate-y-1/2"
          style={{ top: position.top, left: position.left, marginLeft: '-0.5rem' }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
};

export default Tooltip;
