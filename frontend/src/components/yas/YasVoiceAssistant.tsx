import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Mic,
  Send,
  X,
  Volume2,
  VolumeX,
  AlertCircle,
  Loader2,
  Database,
  Calendar,
  Lock,
} from 'lucide-react';

import { assistantService } from '../../services/assistantService';
import { AssistantChatResponse, VoiceState } from '../../types/assistant';
import { useAssistantAppContext } from '../../context/AssistantAppContext';
import { YasOctopusMascot } from './YasOctopusMascot';

// TypeScript declaration for Web Speech API
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export const YasVoiceAssistant: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getFullApplicationContext, triggerSeatSelection, triggerQuantityUpdate } = useAssistantAppContext();

  const [isOpen, setIsOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [response, setResponse] = useState<AssistantChatResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [speechPermissionError, setSpeechPermissionError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isExecutingRef = useRef(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingActionTokenRef = useRef<string | null>(null);

  const activeAppContext = getFullApplicationContext();

  // Initialize SpeechSynthesis and check SpeechRecognition availability
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechPermissionError('Speech recognition is not supported in this browser. Please use text input below.');
    }
  }, []);

  // Stop active speech playback
  const stopSpeaking = useCallback(() => {
    if (synthRef.current && synthRef.current.speaking) {
      synthRef.current.cancel();
    }
  }, []);

  // Speak text via browser SpeechSynthesis
  const speakText = useCallback(
    (text: string) => {
      if (isMuted || !synthRef.current || !text) return;

      stopSpeaking();

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;

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

  // Send interpreted command to backend with rich application context
  const executeCommand = useCallback(
    async (commandText: string, isConfirmed = false, customActionToken?: string) => {
      if (!commandText.trim() || isExecutingRef.current) return;

      isExecutingRef.current = true;
      setVoiceState('processing');
      setErrorMessage(null);
      stopSpeaking();

      try {
        const currentAppContext = getFullApplicationContext();
        const tokenToUse = customActionToken || pendingActionTokenRef.current || undefined;

        const result = await assistantService.sendCommand({
          transcript: commandText.trim(),
          currentPath: location.pathname,
          confirmed: isConfirmed,
          actionToken: tokenToUse,
          context: currentAppContext,
        });

        setResponse(result);

        // Store or clear pending action token
        if (result.pendingAction?.actionToken) {
          pendingActionTokenRef.current = result.pendingAction.actionToken;
        } else if (isConfirmed) {
          pendingActionTokenRef.current = null;
        }

        // Handle seat selection event on active seat map
        if (result.intent === 'SELECT_SEATS' && result.data?.selectedSeatIds) {
          triggerSeatSelection(result.data.selectedSeatIds, result.data.selectedSeatLabels);
        }

        // Handle quantity update on active page
        if (result.intent === 'UPDATE_SELECTION' && result.data?.quantity) {
          triggerQuantityUpdate(result.data.quantity);
        }

        // Set voice and mascot state based on authoritative execution status
        if (result.status === 'REQUIRES_CONFIRMATION' || result.requiresConfirmation) {
          setVoiceState('confirming');
        } else if (result.status === 'AWAITING_PAYMENT') {
          setVoiceState('awaiting_payment');
          // Navigate to checkout if order was created
          if (result.actionRoute) {
            navigate(result.actionRoute);
          }
        } else if (result.status === 'REQUIRES_AUTHENTICATION') {
          setVoiceState('idle');
        } else if (result.status === 'NEEDS_CLARIFICATION') {
          setVoiceState('idle');
        } else if (result.status === 'ERROR' || result.status === 'FAILED') {
          setVoiceState('error');
          setErrorMessage(result.displayText || 'YAS could not process the request.');
        } else {
          setVoiceState('success');
          // Only navigate for true navigation or payment confirmation intents, NOT for seat selection or booking quotes!
          if (
            result.actionRoute &&
            (result.intent === 'NAVIGATE_TO_PAGE' ||
              result.intent === 'VIEW_EVENT_DETAILS' ||
              result.intent === 'CONFIRM_PAYMENT')
          ) {
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
    [location.pathname, navigate, speakText, stopSpeaking, getFullApplicationContext, triggerSeatSelection, triggerQuantityUpdate]
  );

  // Start Speech Recognition upon explicit user click
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
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
      executeCommand('confirm', true, response.pendingAction.actionToken);
    } else if (response?.actionRoute) {
      navigate(response.actionRoute);
    }
  };

  const handleCancelAction = () => {
    setVoiceState('idle');
    setResponse(null);
    pendingActionTokenRef.current = null;
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
      {/* Floating YAS Launch Button with Orange Octopus Mascot */}
      <button
        id="yas-launcher-button"
        onClick={toggleOpen}
        aria-label="Open YAS AI Assistant"
        title="YAS AI Assistant (Voice & Natural Language)"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 18px',
          borderRadius: 'var(--radius-full)',
          background: 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 24px rgba(234, 88, 12, 0.38), 0 2px 8px rgba(0, 0, 0, 0.15)',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          fontWeight: 600,
          fontSize: '0.92rem',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: isOpen ? 'scale(0.95)' : 'scale(1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
          e.currentTarget.style.boxShadow = '0 12px 28px rgba(234, 88, 12, 0.5), 0 4px 12px rgba(0,0,0,0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = isOpen ? 'scale(0.95)' : 'scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(234, 88, 12, 0.38), 0 2px 8px rgba(0, 0, 0, 0.15)';
        }}
      >
        <YasOctopusMascot state={voiceState} size="sm" />
        <span>YAS Voice</span>
      </button>

      {/* YAS Voice Assistant Interactive Modal / Dock */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="yas-modal-title"
          style={{
            position: 'fixed',
            bottom: '88px',
            right: '24px',
            width: '440px',
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
            animation: 'yas-slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #ea580c 0%, #f97316 60%, #fb923c 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <YasOctopusMascot state={voiceState} size="md" />
              <div>
                <h3 id="yas-modal-title" style={{ margin: 0, fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                  YAS AI Assistant
                </h3>
                <p style={{ margin: 0, fontSize: '0.74rem', color: '#ffedd5', fontWeight: 500 }}>
                  Reliable operations & natural language voice commerce
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Mute/Unmute Speech Output Toggle */}
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setIsMuted(!isMuted);
                }}
                aria-label={isMuted ? 'Unmute voice' : 'Mute voice'}
                title={isMuted ? 'Unmute voice' : 'Mute voice'}
                style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={toggleOpen}
                aria-label="Close YAS AI Assistant"
                style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Active Context Awareness Bar */}
          {activeAppContext.eventTitle && (
            <div
              style={{
                backgroundColor: '#fff7ed',
                borderBottom: '1px solid #fed7aa',
                padding: '7px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.76rem',
                color: '#c2410c',
                fontWeight: 600,
              }}
            >
              <Calendar size={13} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Active: {activeAppContext.eventTitle}
                {activeAppContext.activeSection ? ` • Section: ${activeAppContext.activeSection}` : ''}
                {activeAppContext.selectedSeatLabels && activeAppContext.selectedSeatLabels.length > 0
                  ? ` • Seats: ${activeAppContext.selectedSeatLabels.join(', ')}`
                  : ''}
              </span>
            </div>
          )}

          {/* Conversation and State Body Area */}
          <div
            style={{
              padding: '16px 20px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              backgroundColor: '#f8fafc',
            }}
          >
            {/* Empty State / Welcome Introduction */}
            {!response && voiceState === 'idle' && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '16px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <YasOctopusMascot state="idle" size="lg" />
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    Hi, I’m YAS!
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    I can book tickets, select specific seats on the map, retrieve your passes, and answer verified EventPulse questions.
                  </p>
                </div>
              </div>
            )}

            {/* Permission / Unsupported Browser Error Alert */}
            {speechPermissionError && (
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--status-warning-bg)',
                  border: '1px solid #fed7aa',
                  borderRadius: 'var(--radius-md)',
                  color: '#9a3412',
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

            {/* Error Message Alert */}
            {errorMessage && (
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--radius-md)',
                  color: '#991b1b',
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

            {/* Listening Visualizer Card */}
            {voiceState === 'listening' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px 16px',
                  backgroundColor: '#fff7ed',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px dashed #f97316',
                  gap: '10px',
                }}
              >
                <YasOctopusMascot state="listening" size="lg" />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontWeight: 700, color: '#ea580c', fontSize: '0.92rem' }}>
                    Listening...
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {interimTranscript || 'Speak your command clearly into the microphone'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={stopListening}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: '#ffffff',
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Cancel Listening
                </button>
              </div>
            )}

            {/* Processing / Thinking State */}
            {voiceState === 'processing' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px',
                  backgroundColor: '#ffffff',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                  gap: '12px',
                }}
              >
                <YasOctopusMascot state="thinking" size="md" />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Loader2 size={16} style={{ color: '#ea580c', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Executing via verified domain services...
                  </span>
                </div>
              </div>
            )}

            {/* Authentication Required Card */}
            {response?.status === 'REQUIRES_AUTHENTICATION' && (
              <div
                style={{
                  padding: '14px',
                  backgroundColor: '#fef2f2',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid #fecaca',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b' }}>
                  <Lock size={18} />
                  <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>Authentication Required</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#7f1d1d', lineHeight: 1.45 }}>
                  {response.displayText}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    navigate('/login', { state: { from: location.pathname, ...response.data } });
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                  }}
                >
                  Sign in to EventPulse
                </button>
              </div>
            )}

            {/* Verified Booking Quote & Confirmation Card */}
            {response?.bookingQuote && (
              <div
                style={{
                  padding: '14px',
                  backgroundColor: '#ffffff',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid #fed7aa',
                  boxShadow: '0 2px 8px rgba(234, 88, 12, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {response.bookingQuote.eventTitle}
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                      {response.bookingQuote.venueName} • {response.bookingQuote.sectionName}
                    </p>
                  </div>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      backgroundColor: '#ffedd5',
                      color: '#c2410c',
                    }}
                  >
                    {response.bookingQuote.ticketTierName}
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>
                      {response.bookingQuote.seatLabels && response.bookingQuote.seatLabels.length > 0
                        ? `Seat(s): ${response.bookingQuote.seatLabels.join(', ')}`
                        : `Quantity: ${response.bookingQuote.quantity}`}
                    </span>
                    <span>₹{response.bookingQuote.subtotal}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>Service Fees</span>
                    <span>₹{response.bookingQuote.serviceFee}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>Taxes & GST</span>
                    <span>₹{response.bookingQuote.taxAmount}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      color: '#ea580c',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '6px',
                      marginTop: '2px',
                    }}
                  >
                    <span>Total Payable</span>
                    <span>₹{response.bookingQuote.totalAmount}</span>
                  </div>
                </div>

                {voiceState === 'confirming' && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={handleConfirmAction}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: '#ea580c',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                      }}
                    >
                      Confirm & Proceed
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelAction}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: '#f1f5f9',
                        color: 'var(--text-secondary)',
                        border: 'none',
                        fontWeight: 600,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Clarification Chips for Ambiguous Queries */}
            {response?.status === 'NEEDS_CLARIFICATION' && response.suggestedFollowUps && response.suggestedFollowUps.length > 0 && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid #bbf7d0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#166534', fontWeight: 600 }}>
                  Please clarify:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {response.suggestedFollowUps.map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => executeCommand(opt)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #16a34a',
                        color: '#16a34a',
                        borderRadius: '16px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* General Response Card Display */}
            {response && voiceState !== 'listening' && voiceState !== 'processing' && !response.bookingQuote && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  backgroundColor: '#ffffff',
                  padding: '14px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {transcript && (
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600 }}>Command:</span>
                    <span style={{ fontStyle: 'italic' }}>"{transcript}"</span>
                  </div>
                )}

                {/* Spoken Output Banner */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#fff7ed',
                    borderLeft: '4px solid #ea580c',
                  }}
                >
                  <Volume2 size={15} style={{ color: '#ea580c', flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                    {response.spokenText}
                  </p>
                </div>

                {/* Verified Source Indicator Badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.7rem',
                    color: '#059669',
                    backgroundColor: '#ecfdf5',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    width: 'fit-content',
                  }}
                >
                  <Database size={11} />
                  <span style={{ fontWeight: 600 }}>Verified Source: EventPulse Authoritative Catalog</span>
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
                              style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'cover' }}
                            />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {evt.title}
                            </p>
                            <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                              {evt.venueName ? `${evt.venueName}, ` : ''}{evt.city}
                            </p>
                            <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', fontWeight: 600, color: '#ea580c' }}>
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
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.84rem' }}>{ticket.eventTitle}</p>
                            <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                              Pass: {ticket.ticketNumber} • {ticket.seatLabel || 'General Admission'}
                            </p>
                          </div>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              backgroundColor: 'var(--status-success-bg)',
                              color: 'var(--status-success)',
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
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.84rem' }}>{order.eventTitle}</p>
                            <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                              #{order.orderNumber} • ₹{order.totalAmount}
                            </p>
                          </div>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              backgroundColor: order.status === 'CONFIRMED' ? 'var(--status-success-bg)' : '#fef3c7',
                              color: order.status === 'CONFIRMED' ? 'var(--status-success)' : '#92400e',
                            }}
                          >
                            {order.status}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Command Suggestions */}
          <div
            style={{
              padding: '8px 16px',
              backgroundColor: '#f1f5f9',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
            }}
          >
            {activeAppContext.eventTitle ? (
              <>
                <button
                  type="button"
                  onClick={() => handleSampleClick('book two tickets for this concert')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.74rem',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Book 2 tickets here
                </button>
                <button
                  type="button"
                  onClick={() => handleSampleClick('select seat A12')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.74rem',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Select seat A12
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSampleClick('Book two tickets for Anuv Jain')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.74rem',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Book Anuv Jain
                </button>
                <button
                  type="button"
                  onClick={() => handleSampleClick('Show my tickets')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.74rem',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  My Tickets
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => handleSampleClick('Find comedy shows in Chennai')}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.74rem',
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Comedy in Chennai
            </button>
          </div>

          {/* Bottom Voice / Text Command Bar */}
          <form
            onSubmit={handleTextSubmit}
            style={{
              padding: '12px 16px',
              backgroundColor: '#ffffff',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <button
              type="button"
              onClick={voiceState === 'listening' ? stopListening : startListening}
              aria-label={voiceState === 'listening' ? 'Stop listening' : 'Start microphone listening'}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: voiceState === 'listening' ? '#ef4444' : '#ea580c',
                border: 'none',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.2s ease',
              }}
            >
              <Mic size={18} />
            </button>

            <input
              ref={inputRef}
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={activeAppContext.eventTitle ? `Ask YAS about ${activeAppContext.eventTitle.slice(0, 24)}...` : 'Ask YAS or tap mic...'}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.85rem',
                outline: 'none',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
              }}
            />

            <button
              type="submit"
              disabled={!textInput.trim() || voiceState === 'processing'}
              aria-label="Submit command text"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: textInput.trim() ? '#ea580c' : 'var(--bg-secondary)',
                border: 'none',
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
      )}
    </>
  );
};
