import React from 'react';
import { useOpenAIRealtime } from '../hooks/useOpenAIRealtime';

interface VoicePanelProps {
  backendUrl?: string;
  className?: string;
  onError?: (error: string) => void;
  onStatusChange?: (status: string) => void;
}

export function VoicePanel({ 
  backendUrl, 
  className = '', 
  onError,
  onStatusChange 
}: VoicePanelProps) {
  const {
    isConnected,
    isConnecting,
    audioLevel,
    start,
    stop,
    error
  } = useOpenAIRealtime({
    backendUrl,
    onError,
    onStatusChange
  });

  const handleToggle = () => {
    if (isConnected) {
      stop();
    } else if (!isConnecting) {
      start();
    }
  };

  const getStatusText = () => {
    if (isConnecting) return 'Připojuji...';
    if (isConnected) return 'Připojeno - Mluvte';
    if (error) return `Chyba: ${error}`;
    return 'Odpojeno';
  };

  const getStatusColor = () => {
    if (error) return 'text-red-600';
    if (isConnected) return 'text-green-600';
    if (isConnecting) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getButtonColor = () => {
    if (isConnected) return 'bg-red-500 hover:bg-red-600';
    if (isConnecting) return 'bg-yellow-500 cursor-not-allowed';
    return 'bg-green-500 hover:bg-green-600';
  };

  // VU-meter bars (0-10 levels)
  const audioLevelBars = Math.round(audioLevel * 10);

  return (
    <div className={`voice-panel p-6 bg-white rounded-lg shadow-lg border ${className}`}>
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          🎙️ AI Hlasový Asistent
        </h2>
        <p className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </p>
      </div>

      {/* VU-Meter */}
      <div className="mb-6">
        <div className="text-center mb-2">
          <span className="text-sm text-gray-600">Úroveň audia</span>
        </div>
        <div className="flex justify-center items-end space-x-1 h-16">
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className={`w-3 transition-all duration-100 ${
                i < audioLevelBars
                  ? i < 6
                    ? 'bg-green-400'
                    : i < 8
                    ? 'bg-yellow-400'
                    : 'bg-red-400'
                  : 'bg-gray-200'
              }`}
              style={{
                height: `${8 + i * 4}px`,
                opacity: i < audioLevelBars ? 1 : 0.3
              }}
            />
          ))}
        </div>
        <div className="text-center mt-1">
          <span className="text-xs text-gray-500">
            {Math.round(audioLevel * 100)}%
          </span>
        </div>
      </div>

      {/* Main Control Button */}
      <div className="text-center mb-4">
        <button
          onClick={handleToggle}
          disabled={isConnecting}
          className={`
            px-8 py-4 rounded-full text-white font-bold text-lg
            transition-all duration-200 transform hover:scale-105
            disabled:cursor-not-allowed disabled:transform-none
            ${getButtonColor()}
            ${isConnected ? 'animate-pulse' : ''}
          `}
        >
          {isConnecting ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Připojuji...
            </span>
          ) : isConnected ? (
            '🛑 Zastavit'
          ) : (
            '🎙️ Spustit'
          )}
        </button>
      </div>

      {/* Instructions */}
      <div className="text-center text-sm text-gray-600">
        {isConnected ? (
          <div>
            <p className="mb-1">✅ Připojeno k AI asistentovi</p>
            <p>💬 Můžete mluvit - AI vás slyší a odpoví</p>
            <p className="text-xs mt-2">🔄 Podporuje "barge-in" - můžete AI přerušit</p>
          </div>
        ) : (
          <div>
            <p className="mb-1">Klikněte "Spustit" pro zahájení konverzace</p>
            <p className="text-xs">🎧 Potřebujete mikrofon a reproduktory</p>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">⚠️</span>
            <span className="text-red-800 text-sm">{error}</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
          >
            Obnovit stránku
          </button>
        </div>
      )}

      {/* Technical Info (Development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-2 bg-gray-50 border rounded text-xs text-gray-600">
          <div>Backend: {backendUrl || 'default'}</div>
          <div>Audio Level: {Math.round(audioLevel * 100)}%</div>
          <div>Status: {isConnecting ? 'connecting' : isConnected ? 'connected' : 'disconnected'}</div>
        </div>
      )}
    </div>
  );
} 