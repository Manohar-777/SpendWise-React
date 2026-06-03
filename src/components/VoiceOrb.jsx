import React from 'react';
import { Mic, MicOff, Volume2, Sparkles, AlertCircle } from 'lucide-react';

/**
 * VoiceOrb Component
 * Displays a premium, interactive glowing orb representing the voice agent.
 * Handles state transitions: 'idle', 'listening', 'thinking', 'speaking', and 'error'.
 * 
 * @param {Object} props
 * @param {'idle' | 'listening' | 'thinking' | 'speaking' | 'error'} props.state - Current voice assistant state
 * @param {boolean} props.isMuted - Whether microphone is muted
 * @param {function} props.onToggleMic - Triggered when the orb itself is clicked (to record/stop)
 * @param {string} props.transcript - Real-time transcript display helper
 */
export default function VoiceOrb({ state, isMuted, onToggleMic, transcript }) {
  const getOrbColor = () => {
    switch (state) {
      case 'listening':
        return 'var(--accent-teal)';
      case 'thinking':
        return 'var(--secondary)';
      case 'speaking':
        return 'var(--accent-cyan)';
      case 'error':
        return 'var(--accent-red)';
      case 'idle':
      default:
        return 'var(--primary)';
    }
  };

  const getOrbLabel = () => {
    switch (state) {
      case 'listening':
        return 'Listening...';
      case 'thinking':
        return 'Analyzing sentence...';
      case 'speaking':
        return 'Speaking response...';
      case 'error':
        return 'Error occurred';
      case 'idle':
      default:
        return isMuted ? 'Mic Disabled' : 'Tap to Speak';
    }
  };

  return (
    <div className="orb-container">
      {/* Visual Ripples and Glowing Layers */}
      <div className="orb-visualizer-wrapper">
        
        {/* Ring 1 (Pulse Ripple) */}
        {state === 'listening' && (
          <div className="orb-ripple ripple-1"></div>
        )}
        
        {/* Ring 2 (Pulse Ripple) */}
        {state === 'listening' && (
          <div className="orb-ripple ripple-2"></div>
        )}

        {/* Orbiting Thinking Ring */}
        {state === 'thinking' && (
          <div className="orb-thinking-ring"></div>
        )}

        {/* Outer Glow Shield */}
        <div 
          className={`orb-glow-shield state-${state}`}
          style={{ '--orb-color': getOrbColor() }}
        ></div>

        {/* The Central Interactive Orb */}
        <button
          onClick={onToggleMic}
          disabled={state === 'thinking'}
          className={`orb-button state-${state}`}
          style={{ '--orb-color': getOrbColor() }}
          aria-label={getOrbLabel()}
        >
          {/* Inner Decorative SVG Waves */}
          <div className="orb-inner-wave-container">
            {state === 'speaking' && (
              <div className="speaking-soundwaves">
                <span className="wave-bar"></span>
                <span className="wave-bar"></span>
                <span className="wave-bar"></span>
                <span className="wave-bar"></span>
                <span className="wave-bar"></span>
              </div>
            )}

            {state === 'listening' && (
              <div className="listening-pulse">
                <div className="mic-pulse-circle"></div>
              </div>
            )}
          </div>

          {/* Central Icon depending on state */}
          <div className="orb-icon-wrapper">
            {isMuted ? (
              <MicOff className="orb-icon text-muted" size={32} />
            ) : state === 'listening' ? (
              <Mic className="orb-icon text-white mic-active" size={32} />
            ) : state === 'thinking' ? (
              <Sparkles className="orb-icon text-white rotating" size={32} />
            ) : state === 'speaking' ? (
              <Volume2 className="orb-icon text-white pulsing-scale" size={32} />
            ) : state === 'error' ? (
              <AlertCircle className="orb-icon text-white" size={32} />
            ) : (
              <Mic className="orb-icon" size={32} style={{ color: getOrbColor() }} />
            )}
          </div>
        </button>
      </div>

      {/* Orb Status Text */}
      <div className="orb-status-text">
        <h3 style={{ color: getOrbColor() }} className="glow-text">
          {getOrbLabel()}
        </h3>
        <p className="orb-sub-status">
          {state === 'idle' && !isMuted && "Say: \"spent 200 on fuel today\" or \"నా ఖర్చులు చెప్పు\""}
          {state === 'listening' && "Speak clearly into your microphone..."}
          {state === 'thinking' && "Structuring raw audio stream..."}
          {state === 'speaking' && "Synthesizing answer..."}
        </p>
      </div>

      {/* Live Speech Feedback (Microphone Subtitle) */}
      {transcript && (
        <div className="live-transcript-bubble glass-panel">
          <span className="live-transcript-label">Heard:</span>
          <span className="live-transcript-text">"{transcript}"</span>
        </div>
      )}
    </div>
  );
}
