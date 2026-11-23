import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Send,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

import { assistantService } from '../../services/assistantService';
import { AssistantChatResponse, VoiceState } from '../../types/assistant';

// TypeScript declaration for Web Speech API
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export const JarvisVoiceAssistant: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [response, setResponse] = useState<AssistantChatResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [hasSpeechRecognition, setHasSpeechRecognition] = useState(true);
  const [speechPermissionError, setSpeechPermissionError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isExecutingRef = useRef(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize SpeechSynthesis and check SpeechRecognition availability
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setHasSpeechRecognition(false);
    }
  }, []);

  // Stop TTS speech when component unmounts or assistant closes
  const stopSpeaking = useCallback(() => {
    if (synthRef.current && synthRef.current.speaking) {
      synthRef.current.cancel();
    }
  }, []);

  const speakText = useCallback(
    (text: string) => {
      if (isMuted || !synthRef.current || !text) return;
      stopSpeaking();

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.lang = 'en-US';

        // Select an articulate English voice if available
        const voices = synthRef.current.getVoices();
        const preferredVoice = voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel'))
        );
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        synthRef.current.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis error:', e);
      }
    },
    [isMuted, stopSpeaking]
  );

  // Send interpreted command to backend
  const executeCommand = useCallback(
    async (commandText: string, isConfirmed = false) => {
      if (!commandText.trim() || isExecutingRef.current) return;

      isExecutingRef.current = true;
      setVoiceState('processing');
      setErrorMessage(null);
      stopSpeaking();

      try {
        const result = await assistantService.sendCommand({
          transcript: commandText.trim(),
          currentPath: location.pathname,
          confirmed: isConfirmed,
        });

        setResponse(result);

        if (result.requiresConfirmation) {
          setVoiceState('confirming');
        } else if (result.status === 'ERROR') {
          setVoiceState('error');
          setErrorMessage(result.displayText || 'Jarvis could not process the request.');
        } else {
          setVoiceState('success');
          // Autonomously perform the requested navigation / action
          if (result.actionRoute) {
            navigate(result.actionRoute);
          }
        }

        // Speak the assistant's verified response
        if (result.spokenText) {
          speakText(result.spokenText);
        }
      } catch (err: any) {
        console.error('Error executing assistant command:', err);
        setVoiceState('error');
        const detail = err.problem?.detail || err.message || 'Network error or service unavailable. Please try again.';
        setErrorMessage(detail);
        speakText('Sorry, I encountered an error connecting to the EventPulse service.');
      } finally {
        isExecutingRef.current = false;
      }
    },
    [location.pathname, speakText, stopSpeaking]
  );

  // Start Speech Recognition upon explicit user click
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setHasSpeechRecognition(false);
      setSpeechPermissionError('Speech recognition is not supported in this browser. Please use text input below.');
      return;
    }

    stopSpeaking();
    setSpeechPermissionError(null);
    setTranscript('');
    setInterimTranscript('');
    setErrorMessage(null);

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setVoiceState('listening');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (interim) {
          setInterimTranscript(interim);
        }

        if (final) {
          const cleanFinal = final.trim();
          setTranscript(cleanFinal);
          setInterimTranscript('');
          // Stop recognition and execute
          recognition.stop();
          executeCommand(cleanFinal);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechPermissionError('Microphone permission was denied. Please allow microphone access in your browser settings.');
          setVoiceState('idle');
        } else if (event.error === 'no-speech') {
          setVoiceState('idle');
        } else {
          setSpeechPermissionError(`Speech error: ${event.error}. You can also type your command below.`);
          setVoiceState('idle');
        }
      };

      recognition.onend = () => {
        if (voiceState === 'listening') {
          setVoiceState('idle');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.error('Failed to start speech recognition:', e);
      setSpeechPermissionError('Could not access microphone. Please type your query below.');
      setVoiceState('idle');
    }
  };

  // Cancel ongoing listening session
  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }
    setVoiceState('idle');
    setInterimTranscript('');
  };

  // Handle manual text form submission
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const text = textInput.trim();
    setTextInput('');
    setTranscript(text);
    executeCommand(text);
  };

  // Handle sample query pill click
  const handleSampleClick = (sampleText: string) => {
    setTranscript(sampleText);
    executeCommand(sampleText);
  };

  // Handle confirmation of transactional operation
  const handleConfirmAction = () => {
    if (response?.pendingAction) {
      const command = `Confirm ${response.pendingAction.actionName || response.intent}`;
      executeCommand(command, true);
    } else if (response?.actionRoute) {
      navigate(response.actionRoute);
    }
  };

  const handleCancelAction = () => {
    setVoiceState('idle');
    setResponse(null);
    stopSpeaking();
  };

  // Toggle Assistant Modal open/close
  const toggleOpen = () => {
    if (isOpen) {
      stopListening();
      stopSpeaking();
      setIsOpen(false);
    } else {
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  };

  return (
    <>
      {/* Floating Jarvis Launch Button */}
      <button
        id="jarvis-launcher-button"
        onClick={toggleOpen}
        aria-label="Open Jarvis AI Voice Assistant"
        title="Jarvis AI Voice Assistant (Speech & Natural Language)"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 18px',
          borderRadius: 'var(--radius-full)',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #38bdf8 100%)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35), 0 2px 8px rgba(0, 0, 0, 0.15)',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          fontWeight: 600,
          fontSize: '0.92rem',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: isOpen ? 'scale(0.95)' : 'scale(1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
          e.currentTarget.style.boxShadow = '0 12px 28px rgba(37, 99, 235, 0.45), 0 4px 12px rgba(0,0,0,0.18)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = isOpen ? 'scale(0.95)' : 'scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 99, 235, 0.35), 0 2px 8px rgba(0, 0, 0, 0.15)';
        }}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={18} style={{ color: '#bae6fd' }} />
          {voiceState === 'listening' && (
            <span
              style={{
                position: 'absolute',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '2px solid #38bdf8',
                animation: 'jarvis-ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite',
              }}
            />
          )}
        </div>
        <span>Jarvis Voice</span>
      </button>

      {/* Jarvis Voice Assistant Interactive Modal / Dock */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="jarvis-modal-title"
          style={{
            position: 'fixed',
            bottom: '88px',
            right: '24px',
            width: '420px',
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: 'calc(100vh - 120px)',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            boxShadow: '0 20px 40px -8px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.8)',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: 'var(--font-sans)',
            animation: 'jarvis-slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8',
                }}
              >
                <Sparkles size={16} />
              </div>
              <div>
                <h3 id="jarvis-modal-title" style={{ margin: 0, fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                  Jarvis AI Assistant
                </h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                  Natural language & voice commerce
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Mute / Unmute Voice Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (!isMuted) stopSpeaking();
                  setIsMuted(!isMuted);
                }}
                title={isMuted ? 'Unmute voice synthesis' : 'Mute voice synthesis'}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isMuted ? '#f87171' : '#94a3b8',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={toggleOpen}
                title="Close Assistant"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Assistant Body / Scrollable Content */}
          <div
            style={{
              padding: '20px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              backgroundColor: '#f8fafc',
            }}
          >
            {/* Warning or Permission Error Banner */}
            {speechPermissionError && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--status-warning-bg)',
                  border: '1px solid var(--status-warning-border)',
                  color: 'var(--status-warning)',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{speechPermissionError}</span>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--status-danger-bg)',
                  border: '1px solid var(--status-danger-border)',
                  color: 'var(--status-danger)',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Listening Visualizer */}
            {voiceState === 'listening' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px 16px',
                  backgroundColor: '#eff6ff',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px dashed var(--brand-primary)',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 0 10px rgba(37, 99, 235, 0.2)',
                    animation: 'jarvis-pulse 1.5s ease-in-out infinite',
                  }}
                >
                  <Mic size={28} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontWeight: 700, color: 'var(--brand-primary)', fontSize: '0.95rem' }}>
                    Listening...
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {interimTranscript || 'Speak your command clearly into the microphone'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={stopListening}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: '#ffffff',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Cancel Listening
                </button>
              </div>
            )}

            {/* Processing State */}
            {voiceState === 'processing' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px',
                  backgroundColor: '#ffffff',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                  gap: '12px',
                }}
              >
                <Loader2 size={24} style={{ color: 'var(--brand-primary)', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Interpreting natural language via Gemini...
                </span>
              </div>
            )}

            {/* Transactional Confirmation Banner */}
            {voiceState === 'confirming' && response?.pendingAction && (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#fffbeb',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid #fde68a',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309' }}>
                  <ShieldAlert size={20} />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    Confirmation Required
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#78350f', lineHeight: 1.5 }}>
                  {response.displayText}
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleConfirmAction}
                    style={{
                      flex: 1,
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--brand-primary)',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    Confirm & Proceed
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelAction}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#ffffff',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      fontWeight: 500,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Response Card Display */}
            {response && voiceState !== 'listening' && voiceState !== 'processing' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  backgroundColor: '#ffffff',
                  padding: '16px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {transcript && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600 }}>Command:</span>
                    <span style={{ fontStyle: 'italic' }}>"{transcript}"</span>
                  </div>
                )}
                {/* Spoken Output Text Banner */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-secondary)',
                    borderLeft: '4px solid var(--brand-primary)',
                  }}
                >
                  <Volume2 size={16} style={{ color: 'var(--brand-primary)', flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                    {response.spokenText}
                  </p>
                </div>

                {/* Structured Payload Rendering */}
                {response.data && Array.isArray(response.data) && response.data.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                    {/* Render Events */}
                    {response.intent === 'SEARCH_EVENTS' &&
                      response.data.map((evt: any) => (
                        <div
                          key={evt.id || evt.slug}
                          onClick={() => {
                            navigate(`/events/${evt.slug || evt.id}`);
                            setIsOpen(false);
                          }}
                          style={{
                            display: 'flex',
                            gap: '10px',
                            padding: '8px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-subtle)',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          {evt.thumbnailUrl && (
                            <img
                              src={evt.thumbnailUrl}
                              alt={evt.title}
                              style={{ width: '56px', height: '56px', borderRadius: '6px', objectFit: 'cover' }}
                            />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {evt.title}
                            </p>
                            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {evt.venueName ? `${evt.venueName}, ` : ''}{evt.city}
                            </p>
                            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
                              ₹{evt.startingPrice || evt.price}
                            </p>
                          </div>
                        </div>
                      ))}

                    {/* Render Tickets */}
                    {response.intent === 'VIEW_MY_TICKETS' &&
                      response.data.map((ticket: any) => (
                        <div
                          key={ticket.id}
                          style={{
                            padding: '10px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-subtle)',
                            backgroundColor: 'var(--bg-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem' }}>{ticket.eventTitle}</p>
                            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Tier: {ticket.tierName || ticket.ticketType} • Seat: {ticket.seatLabel || 'GA'}
                            </p>
                          </div>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              backgroundColor: ticket.status === 'ISSUED' ? 'var(--status-success-bg)' : 'var(--bg-secondary)',
                              color: ticket.status === 'ISSUED' ? 'var(--status-success)' : 'var(--text-secondary)',
                            }}
                          >
                            {ticket.status}
                          </span>
                        </div>
                      ))}

                    {/* Render Orders */}
                    {response.intent === 'VIEW_MY_ORDERS' &&
                      response.data.map((order: any) => (
                        <div
                          key={order.id}
                          onClick={() => {
                            navigate(`/orders/${order.id}/confirmation`);
                            setIsOpen(false);
                          }}
                          style={{
                            padding: '10px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-subtle)',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.82rem' }}>Order #{order.id?.slice(0, 8)}</p>
                            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Total: ₹{order.totalAmount}
                            </p>
                          </div>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              backgroundColor: order.status === 'PAID' ? 'var(--status-success-bg)' : 'var(--status-warning-bg)',
                              color: order.status === 'PAID' ? 'var(--status-success)' : 'var(--status-warning)',
                            }}
                          >
                            {order.status}
                          </span>
                        </div>
                      ))}
                  </div>
                )}

                {/* Organizer Analytics Rendering */}
                {response.intent === 'VIEW_ORGANIZER_ANALYTICS' && response.data && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '8px',
                      marginTop: '4px',
                    }}
                  >
                    <div style={{ padding: '10px', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>ACTIVE EVENTS</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {response.data.activeEvents ?? 0}
                      </p>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>TICKETS SOLD</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                        {response.data.totalTicketsSold ?? 0}
                      </p>
                    </div>
                    <div style={{ gridColumn: 'span 2', padding: '10px', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>GROSS REVENUE</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '1.15rem', fontWeight: 700, color: 'var(--status-success)' }}>
                        ₹{response.data.grossRevenue ?? 0}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Route Redirect Link */}
                {response.actionRoute && (
                  <button
                    type="button"
                    onClick={() => {
                      navigate(response.actionRoute!);
                      setIsOpen(false);
                    }}
                    style={{
                      marginTop: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--brand-subtle)',
                      color: 'var(--brand-primary)',
                      border: '1px solid rgba(37, 99, 235, 0.2)',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <span>View Page in App</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            )}

            {/* Sample Command Suggestions Pill Bar */}
            {(!response || voiceState === 'idle') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Suggested Commands
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {[
                    'Find comedy shows in Chennai',
                    'Search concert events',
                    'Show my tickets',
                    'Check my orders',
                    'Open resale marketplace',
                    'Organizer analytics',
                  ].map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => handleSampleClick(sample)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: '#ffffff',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.76rem',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--brand-subtle)';
                        e.currentTarget.style.color = 'var(--brand-primary)';
                        e.currentTarget.style.borderColor = 'var(--brand-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      }}
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input & Microphone Action Bar */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#ffffff',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <form onSubmit={handleTextSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                ref={inputRef}
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={voiceState === 'listening' ? 'Listening...' : 'Ask Jarvis or tap mic...'}
                disabled={voiceState === 'listening' || voiceState === 'processing'}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.86rem',
                  outline: 'none',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--brand-primary)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
              />

              {/* Explicit Microphone Activation Button */}
              {hasSpeechRecognition && (
                <button
                  type="button"
                  onClick={voiceState === 'listening' ? stopListening : startListening}
                  title={voiceState === 'listening' ? 'Stop listening' : 'Start voice input'}
                  aria-label={voiceState === 'listening' ? 'Stop listening' : 'Start voice input'}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: voiceState === 'listening' ? '#ef4444' : 'var(--brand-primary)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {voiceState === 'listening' ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
              )}

              {/* Text Submit Button */}
              <button
                type="submit"
                disabled={!textInput.trim() || voiceState === 'processing'}
                title="Send command"
                aria-label="Send command"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: textInput.trim() ? '#0f172a' : 'var(--bg-secondary)',
                  color: textInput.trim() ? '#ffffff' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: textInput.trim() ? 'pointer' : 'default',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                }}
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Global CSS Keyframe Animations for Jarvis */}
      <style>{`
        @keyframes jarvis-ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        @keyframes jarvis-pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.08);
          }
        }
        @keyframes jarvis-slide-up {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};
