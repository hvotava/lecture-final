import React, { useState } from 'react';
import { VoicePanel } from '../components/VoicePanel';

export function Playground() {
  const [status, setStatus] = useState<string>('Odpojeno');
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-20), `${timestamp}: ${message}`]);
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    addLog(`Status changed: ${newStatus}`);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    addLog(`Error: ${errorMessage}`);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎙️ OpenAI Realtime WebRTC Playground
          </h1>
          <p className="text-lg text-gray-600">
            Testování hlasové komunikace s AI asistentem
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Voice Panel */}
          <div>
            <VoicePanel 
              onStatusChange={handleStatusChange}
              onError={handleError}
              className="h-fit"
            />
          </div>

          {/* Status & Logs Panel */}
          <div className="space-y-6">
            {/* Current Status */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                📊 Aktuální stav
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="font-medium text-gray-700">Status:</span>
                  <span className={`font-bold ${
                    status === 'Connected' ? 'text-green-600' :
                    status === 'Connecting...' ? 'text-yellow-600' :
                    status.startsWith('Chyba') ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {status}
                  </span>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <div className="flex items-start">
                      <span className="text-red-600 mr-2">⚠️</span>
                      <div>
                        <p className="font-medium text-red-800">Poslední chyba:</p>
                        <p className="text-red-700 text-sm mt-1">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-blue-800 text-sm">
                    <strong>💡 Tip:</strong> Po kliknutí na "Spustit" povolte přístup k mikrofonu. 
                    AI vás bude slyšet a odpoví hlasem. Můžete AI kdykoliv přerušit.
                  </p>
                </div>
              </div>
            </div>

            {/* Logs Panel */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  📝 Logy událostí
                </h3>
                <button
                  onClick={clearLogs}
                  className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                >
                  Vymazat
                </button>
              </div>

              <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-64 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-gray-500">Zatím žádné logy...</p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            📚 Jak používat
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-bold text-gray-700 mb-2">🚀 Spuštění:</h4>
              <ol className="list-decimal list-inside space-y-1 text-gray-600 text-sm">
                <li>Klikněte na tlačítko "🎙️ Spustit"</li>
                <li>Povolte přístup k mikrofonu v prohlížeči</li>
                <li>Počkejte na připojení (zelený status)</li>
                <li>Začněte mluvit - AI vám odpoví</li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-gray-700 mb-2">💬 Konverzace:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
                <li>AI mluví česky a rozumí češtině</li>
                <li>Podporuje "barge-in" - můžete AI přerušit</li>
                <li>VU-meter ukazuje úroveň vašeho hlasu</li>
                <li>Pro ukončení klikněte "🛑 Zastavit"</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-yellow-800 text-sm">
              <strong>⚠️ Poznámka:</strong> Toto je experimentální funkce. 
              Pro nejlepší výsledky používejte sluchátka a mluvte zřetelně.
            </p>
          </div>
        </div>

        {/* Technical Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 bg-gray-800 text-white rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">🔧 Technické informace</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong>Backend:</strong><br />
                {process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080'}
              </div>
              <div>
                <strong>WebRTC:</strong><br />
                Browser native RTCPeerConnection
              </div>
              <div>
                <strong>Audio:</strong><br />
                PCM16 @ 24kHz, Barge-in support
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 