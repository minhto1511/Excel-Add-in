import * as React from "react";

const Logo = ({ size = 28, color = "white", showText = true, textColor = "white" }) => {
  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      gap: "10px",
    }}>
      {/* Logo Icon - Stacked layers representing documents/office work */}
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none"
        style={{ flexShrink: 0 }}
      >
        {/* Top layer - document */}
        <path 
          d="M12 2L2 7L12 12L22 7L12 2Z" 
          fill={color} 
          opacity="0.9"
        />
        {/* Middle layer */}
        <path 
          d="M2 12L12 17L22 12" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          opacity="0.8"
        />
        {/* Bottom layer */}
        <path 
          d="M2 17L12 22L22 17" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          opacity="0.7"
        />
      </svg>
      
      {showText && (
        <span style={{ 
          fontWeight: 600, 
          fontSize: "22px",
          letterSpacing: "-0.5px",
          color: textColor,
        }}>
          EOffice Tutor AI
        </span>
      )}
    </div>
  );
};

export default Logo;

