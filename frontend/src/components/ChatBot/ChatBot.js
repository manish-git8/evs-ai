import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, User, Bot, Mic, MicOff, ArrowUp, Search, ChevronLeft, ChevronRight, Check, XCircle } from 'lucide-react';
import { getUserName, getEntityType, getEntityId } from '../../pages/localStorageUtil';
import BudgetService from '../../services/BudgetService';
import './ChatBot.css';

const ChatBot = () => {
  // ── Core state ──
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [ticketForm, setTicketForm] = useState({ subject: '', description: '', priority: 'Medium' });
  const [budgetData, setBudgetData] = useState(null);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [userName, setUserName] = useState('User');
  const [authToken, setAuthToken] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const API_BASE_URL = 'http://localhost:8000';

  // ── Voice state ──
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceStatus, setVoiceStatus] = useState('');
  const [audioEnergyLevel, setAudioEnergyLevel] = useState(0);
  const voiceSessionRef = useRef(false);
  const voiceActiveRef = useRef(false);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const cachedVoiceRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const inactivityStageRef = useRef(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const gainNodeRef = useRef(null);
  const healthCheckRef = useRef(null);
  const sttFailureCountRef = useRef(0);
  const restartCountRef = useRef(0);
  const sttRefreshTimerRef = useRef(null);
  const interimTimeoutRef = useRef(null);
  const lastInterimTimeRef = useRef(0);
  const bgRecognitionRef = useRef(null);
  const bgListenerActiveRef = useRef(false);
  const wakeWordTriggeredRef = useRef(false);
  const userNameRef = useRef(userName);
  const speakResponseRef = useRef(null);
  const startVoiceSessionRef = useRef(null);
  const recognitionHandlersRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const handleVoiceResultRef = useRef(null);
  const startRecordingRef = useRef(null);
  const wsRef = useRef(null);
  const startBgListenerRef = useRef(null);
  const VOICE_SESSION_TIMEOUT = 90000;

  // ── Search state for list views ──
  const [searchInput, setSearchInput] = useState('');

  // ── Reject reason state ──
  const [rejectReasonInput, setRejectReasonInput] = useState('');

  // ═══════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════

  const initializeUser = useCallback(() => {
    const storedName = getUserName();
    const entityType = getEntityType();
    if (storedName) setUserName(storedName);

    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      if (userData && userData.jwtToken) {
        setAuthToken(userData.jwtToken);
      }
    } catch (e) { /* ignore parse errors */ }

    const greeting = storedName
      ? `Welcome back, **${storedName}**! 👋\nHow can I help you today?`
      : 'Welcome to EVSProcure! 👋\nHow can I help you today?';

    setMessages([{
      type: 'bot',
      text: greeting,
      responseType: 'menu',
      menuItems: [
        { id: 'cart', label: '🛒 Cart', description: 'Manage procurement carts' },
        { id: 'po', label: '📦 PO', description: 'Manage purchase orders' },
        { id: 'rfq', label: '📝 RFQ', description: 'Manage request for quotes' },
        { id: 'ticket', label: '🎫 Raise Ticket', description: 'Raise a support query' },
      ],
    }]);

    // Fetch budget on init
    try {
      const cid = getEntityId();
      if (cid) {
        BudgetService.getBudgetDashboard(cid)
          .then(res => {
            const d = res.data;
            if (d) setBudgetData({ total: d.totalAllocatedBudget || 0, available: d.totalAvailableBudget || 0 });
          })
          .catch(() => { });
      }
    } catch (e) { /* ignore */ }
  }, []);

  // ── Reusable budget fetcher ──
  const fetchBudget = useCallback(() => {
    try {
      const cid = getEntityId();
      if (cid) {
        BudgetService.getBudgetDashboard(cid)
          .then(res => {
            const d = res.data;
            if (d) setBudgetData({ total: d.totalAllocatedBudget || 0, available: d.totalAvailableBudget || 0 });
          })
          .catch(() => { });
      }
    } catch (e) { /* ignore */ }
  }, []);

  // Refresh budget every time chatbot is opened
  useEffect(() => {
    if (isOpen) fetchBudget();
  }, [isOpen, fetchBudget]);

  // Auto-refresh budget every 30 seconds while open
  useEffect(() => {
    if (!isOpen) return undefined;
    const interval = setInterval(fetchBudget, 30000);
    return () => clearInterval(interval);
  }, [isOpen, fetchBudget]);

  useEffect(() => { initializeUser(); }, [initializeUser]);

  // ── Keep authToken in sync when user logs in/out on the dashboard ──
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'user' || e.key === null) {
        try {
          const userData = JSON.parse(localStorage.getItem('user'));
          setAuthToken(userData?.jwtToken || null);
        } catch { setAuthToken(null); }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ── WebSocket for real-time dashboard sync ──
  useEffect(() => {
    try {
      const ws = new WebSocket(`ws://localhost:8000/ws`);
      ws.onopen = () => console.log('[WS] Connected');
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const eventTypes = ['cart_approved', 'cart_rejected', 'cart_submitted', 'cart_deleted', 'cart_duplicated',
            'po_approved', 'po_rejected', 'rfq_approved', 'rfq_rejected'];
          if (eventTypes.includes(data.type)) {
            window.dispatchEvent(new CustomEvent('evs-cart-update', { detail: data }));
          }
        } catch (e) { /* ignore */ }
      };
      ws.onerror = () => { };
      ws.onclose = () => { };
      wsRef.current = ws;
      return () => { if (ws.readyState === WebSocket.OPEN) ws.close(); };
    } catch (e) { /* ignore */ }
  }, []);

  // ── Scroll helpers ──
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  const scrollToTop = () => messagesContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (el) setShowScrollTop(el.scrollTop > 200);
  };
  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  // ═══════════════════════════════════════════════════════
  // MESSAGE HELPERS
  // ═══════════════════════════════════════════════════════

  const addBotMessage = useCallback((data) => {
    setMessages(prev => [...prev, { type: 'bot', ...data }]);
  }, []);

  const addUserMessage = useCallback((text) => {
    setMessages(prev => [...prev, { type: 'user', text }]);
  }, []);

  // ═══════════════════════════════════════════════════════
  // BACKEND COMMUNICATION
  // ═══════════════════════════════════════════════════════

  const sendToBackend = useCallback(async (text) => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, session_id: sessionId, token: authToken }),
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: true, type: 'error', response: data.detail || 'Something went wrong.' };
      }
      return data;
    } catch (err) {
      console.error('Chat API error:', err);
      return { success: true, type: 'error', response: 'Unable to connect to server. Please check your connection.' };
    }
  }, [sessionId, authToken]);

  const handleBotResponse = useCallback(async (userInput) => {
    setIsTyping(true);
    const data = await sendToBackend(userInput);
    setIsTyping(false);

    if (!data) return;

    // Build message object from backend response
    const msg = {
      text: data.response || '',
      responseType: data.type || 'text',
      menuItems: data.menu_items || null,
      entity: data.entity || null,
      submenu: data.submenu || null,
      items: data.items || null,
      pagination: data.pagination || null,
      search: data.search || '',
      showSearch: data.show_search || false,
      confirmData: data.confirm_data || null,
      suggestions: data.suggestions || null,
      detail: data.detail || null,
      rejectData: data.reject_data || null,
    };

    addBotMessage(msg);


  }, [sendToBackend, addBotMessage]);

  const handleSendMessage = useCallback(async () => {
    const text = inputValue.trim();
    if (!text) return;
    addUserMessage(text);
    setInputValue('');
    await handleBotResponse(text);
  }, [inputValue, addUserMessage, handleBotResponse]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSendMessage();
  };

  // ── Menu/button click handlers ──
  const handleMenuClick = useCallback(async (id, label) => {
    addUserMessage(label || id);
    setIsTyping(true);
    const data = await sendToBackend(id);
    setIsTyping(false);
    if (data) {
      addBotMessage({
        text: data.response || '',
        responseType: data.type || 'text',
        menuItems: data.menu_items || null,
        entity: data.entity || null,
        submenu: data.submenu || null,
        items: data.items || null,
        pagination: data.pagination || null,
        search: data.search || '',
        showSearch: data.show_search || false,
        confirmData: data.confirm_data || null,
        suggestions: data.suggestions || null,
      });
    }
  }, [addUserMessage, sendToBackend, addBotMessage]);

  const handlePageClick = useCallback(async (pageNum) => {
    setIsTyping(true);
    const data = await sendToBackend(`page ${pageNum}`);
    setIsTyping(false);
    if (data) {
      addBotMessage({
        text: data.response || '',
        responseType: data.type || 'text',
        menuItems: data.menu_items || null,
        entity: data.entity || null,
        submenu: data.submenu || null,
        items: data.items || null,
        pagination: data.pagination || null,
        search: data.search || '',
        showSearch: data.show_search || false,
      });
    }
  }, [sendToBackend, addBotMessage]);

  const handleSearchSubmit = useCallback(async (query) => {
    if (!query || !query.trim()) {
      // Clear search — reload list without filter
      setSearchInput('');
      setIsTyping(true);
      const data = await sendToBackend('clear search');
      setIsTyping(false);
      if (data) {
        addBotMessage({
          text: data.response || '',
          responseType: data.type || 'text',
          menuItems: data.menu_items || null,
          entity: data.entity || null,
          submenu: data.submenu || null,
          items: data.items || null,
          pagination: data.pagination || null,
          search: data.search || '',
          showSearch: data.show_search || false,
        });
      }
      return;
    }
    addUserMessage(`Search: ${query}`);
    setIsTyping(true);
    const data = await sendToBackend(`search ${query}`);
    setIsTyping(false);
    setSearchInput('');
    if (data) {
      addBotMessage({
        text: data.response || '',
        responseType: data.type || 'text',
        items: data.items || null,
        pagination: data.pagination || null,
        entity: data.entity || null,
        submenu: data.submenu || null,
        search: data.search || query,
        showSearch: data.show_search || false,
      });
    }
  }, [addUserMessage, sendToBackend, addBotMessage]);

  const handleConfirmClick = useCallback(async (confirmed) => {
    addUserMessage(confirmed ? 'Yes, confirm' : 'No, cancel');
    setIsTyping(true);
    const data = await sendToBackend(confirmed ? 'yes' : 'no');
    setIsTyping(false);
    if (data) {
      addBotMessage({
        text: data.response || '',
        responseType: data.type || 'text',
        menuItems: data.menu_items || null,
        suggestions: data.suggestions || null,
      });
      // Dispatch dashboard refresh on approve/reject
      if (data.type === 'success') {
        window.dispatchEvent(new CustomEvent('evs-cart-update', { detail: { type: 'chatbot_action' } }));
      }
    }
  }, [addUserMessage, sendToBackend, addBotMessage]);

  const handleItemClick = useCallback(async (item, submenu) => {
    if (submenu === 'approve' || submenu === 'reject') {
      // Show the display number (title) to the user
      addUserMessage(`${item.title}`);
      setIsTyping(true);
      // IMPORTANT: Send the display title (e.g. "CART-1464") NOT the internal id
      // Extract the numeric part from the title for the backend command
      const numMatch = (item.title || '').match(/(\d+)/);
      const idForBackend = numMatch ? numMatch[1] : (item.id || item.title);
      const data = await sendToBackend(`${submenu} ${item.entity} ${idForBackend}`);
      setIsTyping(false);
      if (data) {
        addBotMessage({
          text: data.response || '',
          responseType: data.type || 'text',
          confirmData: data.confirm_data || null,
          menuItems: data.menu_items || null,
          rejectData: data.reject_data || null,
        });
      }
    }
  }, [addUserMessage, sendToBackend, addBotMessage]);

  const handleRejectReasonSubmit = useCallback(async (reason) => {
    const displayReason = reason.trim() || '(no reason)';
    addUserMessage(displayReason);
    setRejectReasonInput('');
    setIsTyping(true);
    const data = await sendToBackend(reason.trim() || 'skip');
    setIsTyping(false);
    if (data) {
      addBotMessage({
        text: data.response || '',
        responseType: data.type || 'text',
        confirmData: data.confirm_data || null,
        menuItems: data.menu_items || null,
      });
    }
  }, [addUserMessage, sendToBackend, addBotMessage]);

  const handleRejectReasonCancel = useCallback(async () => {
    addUserMessage('Cancel');
    setRejectReasonInput('');
    setIsTyping(true);
    const data = await sendToBackend('cancel');
    setIsTyping(false);
    if (data) {
      addBotMessage({
        text: data.response || '',
        responseType: data.type || 'text',
        menuItems: data.menu_items || null,
      });
    }
  }, [addUserMessage, sendToBackend, addBotMessage]);

  const handleViewDetail = useCallback(async (item) => {
    addUserMessage(`View ${item.title}`);
    setIsTyping(true);
    const data = await sendToBackend(`view detail ${item.entity} ${item.id}`);
    setIsTyping(false);
    if (data) {
      addBotMessage({
        text: data.response || '',
        responseType: data.type || 'text',
        detail: data.detail || null,
        entity: data.entity || null,
        suggestions: data.suggestions || null,
      });
    }
  }, [addUserMessage, sendToBackend, addBotMessage]);

  const handleSuggestionClick = useCallback(async (suggestion) => {
    addUserMessage(suggestion);
    setIsTyping(true);
    const data = await sendToBackend(suggestion);
    setIsTyping(false);
    if (data) {
      addBotMessage({
        text: data.response || '',
        responseType: data.type || 'text',
        menuItems: data.menu_items || null,
        entity: data.entity || null,
        submenu: data.submenu || null,
        items: data.items || null,
        pagination: data.pagination || null,
        search: data.search || '',
        showSearch: data.show_search || false,
        confirmData: data.confirm_data || null,
        suggestions: data.suggestions || null,
      });
    }
  }, [addUserMessage, sendToBackend, addBotMessage]);

  // ═══════════════════════════════════════════════════════
  // VOICE ASSISTANT (preserved from original)
  // ═══════════════════════════════════════════════════════

  const normalizeVoiceText = (raw) => {
    let t = raw;

    // ── Step 1: Fix voice misrecognitions of 'cart' ──
    // Common voice outputs: "art", "card", "at", "procart", "call", "crate", "guard"
    t = t.replace(/\bprocart\b/gi, 'cart');
    t = t.replace(/\b(approve|reject|show|view|open|check|accept|decline|deny)\s+(art|arts|at|guard|crate|call)\b/gi, '$1 cart');
    t = t.replace(/\b(approve|reject|show|view|open|check|my|the|a)\s+card\b/gi, '$1 cart');
    t = t.replace(/\bcreate\s*card\b/gi, 'create cart');
    t = t.replace(/\bcard\s+(status|details?|list|items?|number|#)\b/gi, 'cart $1');
    t = t.replace(/\bcall\s+(status|details?|list|number|#)\s*/gi, 'cart $1 ');
    t = t.replace(/\b(art|arts|call)\s+(status|details?|list|number|#)\s*(\d+)/gi, 'cart $2 $3');
    t = t.replace(/\b(art|arts|call)\s+(\d{3,})\b/gi, 'cart $2');

    // ── Step 2: Fix 'purchase order' / 'po' misrecognitions ──
    t = t.replace(/\bp\.?\s*o\.?\b/gi, 'po');
    t = t.replace(/\bpurchase\s*order/gi, 'po');
    t = t.replace(/\bpurchse\s*order/gi, 'po');
    t = t.replace(/\bpurcase\s*order/gi, 'po');
    t = t.replace(/\bpuchase\s*order/gi, 'po');

    // ── Step 3: Fix 'rfq' misrecognitions ──
    t = t.replace(/\br\.?\s*f\.?\s*q\.?\b/gi, 'rfq');
    t = t.replace(/\brequest\s*for\s*quot(?:e|ation)/gi, 'rfq');
    t = t.replace(/\brequest\s*quote/gi, 'rfq');
    t = t.replace(/\bquote\s*request/gi, 'rfq');
    t = t.replace(/\bprice\s*quote/gi, 'rfq');
    t = t.replace(/\bvendor\s*quote/gi, 'rfq');

    // ── Step 4: Fix entity synonyms ──
    t = t.replace(/\bindent\b/gi, 'cart');
    t = t.replace(/\brequisition\b/gi, 'cart');
    t = t.replace(/\bshopping\s*cart/gi, 'cart');
    t = t.replace(/\bprocurement\s*cart/gi, 'cart');
    t = t.replace(/\bcard\b/gi, 'cart');  // Universal: "card" always means "cart"

    // ── Step 5: Fix number references ──
    t = t.replace(/\bnumber\s*(\d+)/gi, '$1');
    t = t.replace(/\bhash\s*(\d+)/gi, '#$1');

    // ── Step 6: Remove junk voice artifacts ──
    t = t.replace(/\bflight\s+status\b/gi, 'cart status');
    t = t.replace(/\bhe\s*api\s*ors\b/gi, '');
    t = t.replace(/\ba\s+pro\s*/gi, 'approve ');
    t = t.replace(/\bgabru\b/gi, '');

    return t.trim();
  };

  const stripForVoice = (text) => {
    if (!text) return text;
    let clean = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0F}\u{200D}\u{2702}-\u{27B0}\u{24C2}-\u{1F251}]/gu, '');
    clean = clean.replace(/\*\*(.*?)\*\*/g, '$1');
    clean = clean.replace(/\*(.*?)\*/g, '$1');
    clean = clean.replace(/\n{2,}/g, '. ').replace(/\n/g, '. ');
    clean = clean.replace(/\.\s*\./g, '.').replace(/\s{2,}/g, ' ');
    return clean.trim();
  };

  // TTS readback disabled — speakResponse is a no-op
  const speakResponse = useCallback(async (text) => {
    return;
  }, []);

  useEffect(() => { userNameRef.current = userName; }, [userName]);
  useEffect(() => { speakResponseRef.current = speakResponse; }, [speakResponse]);

  const stopVoiceSession = useCallback(() => {
    console.log('[Voice] Stopping voice session');
    // Stop active SpeechRecognition
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) { }
      recognitionRef.current = null;
    }
    // Stop MediaRecorder (legacy cleanup)
    if (mediaRecorderRef.current) {
      try { if (mediaRecorderRef.current.state === 'recording') mediaRecorderRef.current.stop(); } catch (e) { }
      mediaRecorderRef.current = null;
    }
    recordedChunksRef.current = [];
    synthRef.current.cancel();
    if (inactivityTimerRef.current) { clearTimeout(inactivityTimerRef.current); inactivityTimerRef.current = null; }
    inactivityStageRef.current = 0;
    if (healthCheckRef.current) { clearInterval(healthCheckRef.current); healthCheckRef.current = null; }
    if (sttRefreshTimerRef.current) { clearInterval(sttRefreshTimerRef.current); sttRefreshTimerRef.current = null; }
    if (interimTimeoutRef.current) { clearTimeout(interimTimeoutRef.current); interimTimeoutRef.current = null; }
    lastInterimTimeRef.current = 0;
    if (animationFrameRef.current) { cancelAnimationFrame(animationFrameRef.current); animationFrameRef.current = null; }
    if (audioContextRef.current) { try { audioContextRef.current.close(); } catch (e) { } audioContextRef.current = null; }
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null; }
    analyserRef.current = null;
    gainNodeRef.current = null;
    voiceSessionRef.current = false;
    voiceActiveRef.current = false;
    setIsVoiceActive(false); setIsListening(false); setIsSpeaking(false);
    setVoiceTranscript(''); setVoiceStatus(''); setAudioEnergyLevel(0);
    sttFailureCountRef.current = 0;
    restartCountRef.current = 0;

    // Restart background wake word listener after session ends
    setTimeout(() => {
      if (!voiceActiveRef.current && !bgListenerActiveRef.current) {
        console.log('[Voice] Restarting background wake word listener after session end');
        if (startBgListenerRef.current) startBgListenerRef.current();
      }
    }, 1000);
  }, []);

  // ── Browser SpeechRecognition for active voice session ──
  // Uses the same API as wake word but for active command listening.
  // Instant transcription, built-in noise filtering, no server round-trip.
  const startActiveListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[Voice] SpeechRecognition not available');
      addBotMessage({ text: 'Voice recognition is not supported in this browser. Please use Chrome or Edge.', responseType: 'text' });
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) { }
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    // Debounce: accumulate speech for 1.5s of silence before processing
    let accumulatedText = '';
    let debounceTimer = null;
    let isProcessing = false;  // Lock to prevent duplicate commands

    recognition.onresult = (event) => {
      // Skip if we're still processing the previous command
      if (isProcessing) return;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const part = result[0].transcript.trim();
          if (part.length > 0) {
            accumulatedText += (accumulatedText ? ' ' : '') + part;
            console.log('[STT] Partial final:', part, '| Accumulated:', accumulatedText);
            setVoiceTranscript(accumulatedText);

            // Clear old debounce timer and set new one
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              if (isProcessing) return;
              const fullText = accumulatedText.trim();
              accumulatedText = '';
              if (fullText.length > 1) {
                console.log('[STT] ✅ Processing full command:', fullText);
                isProcessing = true;  // Lock processing
                setVoiceTranscript('');
                setVoiceStatus('processing');
                if (handleVoiceResultRef.current) handleVoiceResultRef.current(fullText);
                // Unlock after 3s to allow next command
                setTimeout(() => {
                  isProcessing = false;
                  accumulatedText = '';
                  if (voiceActiveRef.current) setVoiceStatus('listening');
                }, 3000);
              }
            }, 1500); // Wait 1.5s of silence before processing
          }
        } else {
          // Show interim results for real-time feedback
          if (!isProcessing) {
            const interim = result[0].transcript.trim();
            if (interim) {
              setVoiceTranscript(accumulatedText ? accumulatedText + ' ' + interim : interim);
            }
          }
        }
      }
    };

    let isRestarting = false;  // Guard to prevent double-restart

    recognition.onend = () => {
      console.log('[Voice] Recognition ended, voiceActive:', voiceActiveRef.current);
      // Auto-restart if voice session is still active (single restart guard)
      if (voiceActiveRef.current && !isRestarting) {
        isRestarting = true;
        setTimeout(() => {
          isRestarting = false;
          if (voiceActiveRef.current && recognitionRef.current === recognition) {
            try {
              recognition.start();
              console.log('[Voice] Recognition restarted');
            } catch (e) {
              console.warn('[Voice] Failed to restart recognition:', e);
            }
          }
        }, 500);
      }
    };

    recognition.onerror = (e) => {
      console.warn('[Voice] Recognition error:', e.error);
      if (e.error === 'not-allowed') {
        addBotMessage({ text: '🎤 Microphone access denied. Please allow microphone permission.', responseType: 'text' });
        return;
      }
      // For 'aborted', 'no-speech', 'network' — let onend handle the restart.
      // Do NOT restart here to avoid double-start loops.
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      setVoiceStatus('listening');
      console.log('[Voice] 🎤 Active SpeechRecognition started');
    } catch (e) {
      console.error('[Voice] Failed to start recognition:', e);
    }
  }, [addBotMessage]);

  const ensureRecognitionAlive = useCallback(() => {
    if (!voiceActiveRef.current || isSpeaking) return;
    // Check if recognition is still active
    if (!recognitionRef.current) {
      console.log('[Voice] Recognition dead, restarting...');
      startActiveListening();
    }
  }, [isSpeaking, startActiveListening]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityStageRef.current = 0;
    inactivityTimerRef.current = setTimeout(() => {
      if (!voiceSessionRef.current) return;
      inactivityStageRef.current = 1;
      addBotMessage({ text: 'Are you still there? Voice session will end soon if idle.', responseType: 'text' });
      inactivityTimerRef.current = setTimeout(() => {
        if (voiceSessionRef.current && inactivityStageRef.current >= 1) {
          addBotMessage({ text: 'Voice session ended due to inactivity. Say "Hey EVS" to start again.', responseType: 'text' });
          stopVoiceSession();
        }
      }, VOICE_SESSION_TIMEOUT);
    }, VOICE_SESSION_TIMEOUT);
  }, [addBotMessage, stopVoiceSession]);

  const handleVoiceResult = useCallback(async (transcript) => {
    const normalized = normalizeVoiceText(transcript);
    const lower = normalized.toLowerCase().trim();
    resetInactivityTimer();

    // Wake word detection — comprehensive fuzzy list
    const wakeWords = [
      'hey evs', 'hi evs', 'hello evs', 'helo evs', 'hay evs', 'heya evs',
      'hy evs', 'hii evs', 'hey e v s', 'hey yes', 'ok evs', 'hey eve',
      'ke evs', 'evs', 'tvs', 'hello bot', 'hi bot', 'hey assistant',
      'hello assistant', 'hi there', 'hey there', 'morning evs',
      'wake up', 'yo evs', 'sup evs', 'hola evs',
      'hi eva', 'hey eva', 'hello eva', 'hey ebs', 'hi ebs', 'hello ebs',
      'hey eves', 'hi eves', 'evs hello', 'talk to evs',
      'hey jarvis', 'hey procure', 'hi procure', 'evs bot', 'evs assistant',
      'anyone there', 'you there', 'evs help', 'namaste evs',
      'hello evsprocure', 'whats up evs',
    ];
    if (wakeWords.some(w => lower.includes(w))) {
      // Don't send a second welcome — startVoiceSession already sends one.
      // Just silently consume the wake word so it's not sent as a command.
      return;
    }

    // Exit commands
    const exitWords = ['goodbye', 'bye', 'stop', 'done', 'exit', 'close', 'stop listening', 'end session'];
    if (exitWords.some(w => lower.includes(w))) {
      addBotMessage({ text: 'Goodbye! Say "Hey EVS" to start again. 👋', responseType: 'text' });
      stopVoiceSession();
      return;
    }

    if (!voiceSessionRef.current) return;

    // ── Junk filter: only send if text contains a recognized command keyword ──
    const commandKeywords = /\b(cart|po|rfq|approve|reject|accept|decline|deny|status|details?|budget|back|menu|help|yes|no|confirm|cancel|search|page|next|previous|show|view|check|list|open|create|ticket|support|order|quote|hi|hello|hey)\b/i;
    const hasNumber = /\d{3,}/.test(lower);
    if (!commandKeywords.test(lower) && !hasNumber) {
      console.log('[Voice] ⚠️ Ignoring unrecognized command:', normalized);
      return;
    }

    // Send voice input to backend
    addUserMessage(normalized);
    await handleBotResponse(normalized);
  }, [addBotMessage, stopVoiceSession, resetInactivityTimer, addUserMessage, handleBotResponse]);

  useEffect(() => { handleVoiceResultRef.current = handleVoiceResult; }, [handleVoiceResult]);

  const initAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const gain = ctx.createGain();
      gain.gain.value = 1.5;
      gainNodeRef.current = gain;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(gain);
      gain.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioEnergyLevel(Math.min(1, avg / 100));
        animationFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      console.warn('[Voice] Audio init failed:', e);
    }
  }, []);

  const startVoiceSession = useCallback(async () => {
    console.log('[Voice] Starting voice session...');
    // Stop background wake word listener
    if (bgRecognitionRef.current) {
      try { bgRecognitionRef.current.stop(); } catch (e) { }
      bgRecognitionRef.current = null;
      bgListenerActiveRef.current = false;
    }

    voiceActiveRef.current = true;
    setIsVoiceActive(true);
    setVoiceStatus('listening');
    await initAudio();

    // Start browser SpeechRecognition for active listening
    voiceSessionRef.current = true;
    resetInactivityTimer();
    startActiveListening();
    addBotMessage({ text: `Hello ${userNameRef.current}! 👋 Voice mode active. Say: Cart, PO status, Approve cart 1414, or Budget.`, responseType: 'text' });

    // Health check every 30s
    healthCheckRef.current = setInterval(() => {
      if (voiceActiveRef.current) ensureRecognitionAlive();
    }, 30000);
  }, [initAudio, addBotMessage, resetInactivityTimer, ensureRecognitionAlive, startActiveListening]);

  useEffect(() => { startVoiceSessionRef.current = startVoiceSession; }, [startVoiceSession]);

  const toggleVoice = () => {
    if (isVoiceActive) stopVoiceSession();
    else startVoiceSession();
  };

  // ── Background wake word listener ──
  const startBackgroundWakeWordListener = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[WakeWord] SpeechRecognition API not available in this browser');
      return;
    }
    if (bgListenerActiveRef.current) {
      console.log('[WakeWord] Background listener already active, skipping');
      return;
    }
    // Never start during active voice session
    if (voiceActiveRef.current || voiceSessionRef.current) {
      console.log('[WakeWord] Voice session active, skipping bg listener start');
      return;
    }

    // Reset wake word flag so listener can restart after previous trigger
    wakeWordTriggeredRef.current = false;

    const bg = new SpeechRecognition();
    bg.continuous = true;
    bg.interimResults = true;  // Detect wake word INSTANTLY as user speaks
    bg.lang = 'en-US';
    bg.maxAlternatives = 3;   // Check multiple interpretations

    // Track consecutive no-speech errors for backoff
    let noSpeechCount = 0;
    const MAX_NO_SPEECH = 10;     // Stop after this many consecutive failures
    const BASE_DELAY_MS = 2000;   // Start with 2s delay, doubles each time

    bg.onresult = (event) => {
      // Reset no-speech counter on any valid result
      noSpeechCount = 0;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        // Check ALL alternatives (not just the first) and BOTH interim + final
        for (let alt = 0; alt < event.results[i].length; alt++) {
          const text = event.results[i][alt].transcript.toLowerCase().trim();
          if (!text) continue;

          // Fast substring checks for common patterns
          const hasEVS = text.includes('evs') || text.includes('e v s') || text.includes('e.v.s');
          const hasGreeting = text.includes('hey') || text.includes('hi') || text.includes('hello')
            || text.includes('ok') || text.includes('yo');
          const isTrigger = hasEVS || (hasGreeting && (
            text.includes('eve') || text.includes('ebs') || text.includes('tvs') ||
            text.includes('abs') || text.includes('rvs') || text.includes('ivs') ||
            text.includes('avs') || text.includes('uvs') || text.includes('efs') ||
            text.includes('avis') || text.includes('ibis') || text.includes('eva')
          ));

          // Also check explicit wake words for edge cases
          const wakeWords = [
            'hey bot', 'hi bot', 'hello bot', 'hey assistant', 'hello assistant',
            'hi assistant', 'hey jarvis', 'hey procure', 'hi procure',
            'wake up', 'anyone there', 'you there', 'hi there', 'hey there',
            'evs help', 'evs bot', 'talk to evs', 'namaste evs',
          ];

          if (isTrigger || wakeWords.some(w => text.includes(w))) {
            console.log('[WakeWord] ✅ Wake word detected:', text, '(interim:', !event.results[i].isFinal, ')');
            wakeWordTriggeredRef.current = true;
            try { bg.stop(); } catch (e) { }
            bgRecognitionRef.current = null;
            bgListenerActiveRef.current = false;
            setIsOpen(true);
            setTimeout(() => { if (startVoiceSessionRef.current) startVoiceSessionRef.current(); }, 500);
            return;  // Exit immediately after detection
          }
        }
      }
    };
    bg.onend = () => {
      // Only restart if bg is supposed to be active AND no voice session is running
      if (bgListenerActiveRef.current && !wakeWordTriggeredRef.current && !voiceActiveRef.current && !voiceSessionRef.current) {
        if (noSpeechCount >= MAX_NO_SPEECH) {
          console.warn('[WakeWord] Too many consecutive no-speech errors, stopping listener. Say "Hey EVS" manually or reload.');
          bgListenerActiveRef.current = false;
          bgRecognitionRef.current = null;
          return;
        }
        // Exponential backoff: delay increases with consecutive no-speech errors
        const delay = noSpeechCount > 0 ? Math.min(BASE_DELAY_MS * Math.pow(2, noSpeechCount - 1), 30000) : 500;
        setTimeout(() => {
          if (bgListenerActiveRef.current && !voiceActiveRef.current && !voiceSessionRef.current) {
            try { bg.start(); } catch (e) { console.warn('[WakeWord] Restart failed:', e); }
          }
        }, delay);
      } else if (voiceActiveRef.current || voiceSessionRef.current) {
        // Voice session took over — stop bg listener
        bgListenerActiveRef.current = false;
        bgRecognitionRef.current = null;
      }
    };
    bg.onerror = (e) => {
      if (e.error === 'no-speech') {
        noSpeechCount++;
        // Only log every 3rd occurrence to reduce console spam
        if (noSpeechCount % 3 === 1) {
          console.log('[WakeWord] No speech detected (count:', noSpeechCount, ')');
        }
        return;  // Let onend handle the backoff restart
      }
      console.warn('[WakeWord] Error:', e.error || e);
      // On 'not-allowed' error, mic permission denied — don't retry
      if (e.error === 'not-allowed') {
        bgListenerActiveRef.current = false;
        return;
      }
    };

    try {
      bg.start();
      bgRecognitionRef.current = bg;
      bgListenerActiveRef.current = true;
      console.log('[WakeWord] 🎤 Background wake word listener started');
    } catch (e) {
      console.error('[WakeWord] Failed to start:', e);
    }
  }, []);

  // Keep ref in sync so stopVoiceSession can call it
  useEffect(() => { startBgListenerRef.current = startBackgroundWakeWordListener; }, [startBackgroundWakeWordListener]);

  // Start bg listener on mount AND whenever chatbot closes (not during voice)
  useEffect(() => {
    // Only start bg listener when chatbot is closed and no active voice session
    if (!isOpen && !voiceActiveRef.current && !bgListenerActiveRef.current) {
      setTimeout(() => {
        if (!voiceActiveRef.current && !bgListenerActiveRef.current) {
          startBackgroundWakeWordListener();
        }
      }, 2000);
    }
    return () => { };
  }, [isOpen, startBackgroundWakeWordListener]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (bgRecognitionRef.current) {
        try { bgRecognitionRef.current.stop(); } catch (e) { }
        bgRecognitionRef.current = null;
        bgListenerActiveRef.current = false;
      }
    };
  }, []);

  // ═══════════════════════════════════════════════════════
  // STATUS BADGE HELPER
  // ═══════════════════════════════════════════════════════

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (['approved', 'completed', 'delivered'].includes(s)) return '#22c55e';
    if (['rejected', 'cancelled'].includes(s)) return '#ef4444';
    if (['pending', 'pending_approval', 'submitted', 'requested'].includes(s)) return '#f59e0b';
    if (['draft', 'open'].includes(s)) return '#3b82f6';
    return '#9ca3af';
  };

  // ═══════════════════════════════════════════════════════
  // RENDER HELPERS — Menu, List, Confirm, etc.
  // ═══════════════════════════════════════════════════════

  const renderMenuItems = (menuItems, msg) => (
    <div className="cb-menu-grid">
      {menuItems.map((item) => (
        <button
          key={item.id}
          className="cb-menu-btn"
          onClick={() => handleMenuClick(item.id, item.label)}
        >
          <span className="cb-menu-label">{item.label}</span>
          {item.description && <span className="cb-menu-desc">{item.description}</span>}
        </button>
      ))}
    </div>
  );

  const renderListItems = (msg) => {
    const { items, pagination, submenu, showSearch, search } = msg;
    if (!items) return null;

    return (
      <div className="cb-list-container">
        {/* Search Bar */}
        {showSearch && (
          <div className="cb-search-bar">
            <Search size={16} className="cb-search-icon" />
            <input
              type="text"
              className="cb-search-input"
              placeholder="Search by number or name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => { if (e.key === 'Enter') handleSearchSubmit(searchInput); }}
            />
            <button className="cb-search-btn" onClick={() => handleSearchSubmit(searchInput)}>
              Go
            </button>
            {/* Voice search mic */}
            <button
              className="cb-search-mic"
              onClick={() => { if (!isVoiceActive) startVoiceSession(); }}
              title="Voice search"
            >
              <Mic size={14} />
            </button>
          </div>
        )}
        {search && (
          <div className="cb-search-tag">
            Results for: <strong>{search}</strong>
            <button className="cb-clear-search" onClick={() => handleSearchSubmit('')}>Clear</button>
          </div>
        )}

        {/* Item Cards */}
        {items.map((item, idx) => {
          // Safely convert any value to a renderable string (guards against nested API objects)
          const safe = (v) => {
            if (v == null) return '';
            if (typeof v === 'string') return v;
            if (typeof v === 'number') return String(v);
            if (typeof v === 'object') {
              if (v.firstName || v.lastName) return [v.firstName, v.lastName].filter(Boolean).join(' ');
              return v.name || v.supplierName || v.title || v.email || JSON.stringify(v);
            }
            return String(v);
          };
          const fmtCurrency = (v) => {
            if (v == null || v === '') return '';
            const n = typeof v === 'number' ? v : parseFloat(v);
            return isNaN(n) ? v : `$${n.toFixed(2)}`;
          };
          const fmtDate = (v) => {
            if (!v) return '';
            try { return new Date(v).toLocaleDateString(); } catch { return v; }
          };
          const title = safe(item.title);
          const status = safe(item.status);
          const createdBy = safe(item.created_by);
          const supplier = safe(item.supplier);
          const lineItems = item.line_items || [];
          return (
            <div key={item.id || idx} className="cb-item-card">
              <div className="cb-item-header">
                <span className="cb-item-title">{title || (item.id ? `#${item.id}` : 'Item')}</span>
                <span className="cb-item-status" style={{ backgroundColor: getStatusColor(status) + '20', color: getStatusColor(status) }}>
                  {status}
                </span>
              </div>
              <div className="cb-item-details">
                {item.date && <span className="cb-item-detail">📅 {fmtDate(item.date)}</span>}
                {createdBy && <span className="cb-item-detail">👤 {createdBy}</span>}
                {supplier && <span className="cb-item-detail">🏢 {supplier}</span>}
                {item.needed_by && <span className="cb-item-detail">📦 Need by: {fmtDate(item.needed_by)}</span>}
                {item.item_count && <span className="cb-item-detail">📋 {item.item_count} items</span>}
                {item.last_updated && <span className="cb-item-detail">🕐 Updated: {fmtDate(item.last_updated)}</span>}
              </div>

              {/* Inline line items for cart status */}
              {lineItems.length > 0 && (
                <div className="cb-detail-items">
                  <div className="cb-detail-section-title">📋 Items ({lineItems.length})</div>
                  <div className="cb-detail-items-scroll">
                    {lineItems.map((li, liIdx) => {
                      const name = safe(li.item_name) || safe(li.description) || `Item ${liIdx + 1}`;
                      return (
                        <div key={liIdx} className="cb-compact-line">
                          <span className="cb-line-name">{name}</span>
                          {li.quantity ? <span className="cb-line-meta">*{li.quantity}</span> : null}
                          {li.extended_price ? <span className="cb-line-total">{fmtCurrency(li.extended_price)}</span> : null}
                        </div>
                      );
                    })}
                  </div>
                  <div className="cb-total-row">
                    <span className="cb-total-label">Total</span>
                    <span className="cb-total-value">{fmtCurrency(lineItems.reduce((sum, li) => sum + (parseFloat(li.extended_price) || 0), 0))}</span>
                  </div>
                </div>
              )}

              {/* Empty cart indicator */}
              {lineItems.length === 0 && submenu === 'status' && (
                <div className="cb-detail-empty">🛒 Cart is empty</div>
              )}

              {(submenu === 'approve' || submenu === 'reject') && (
                <div className="cb-item-actions">
                  <button className="cb-action-approve" onClick={() => handleItemClick(item, submenu)}>
                    {submenu === 'approve' ? <><Check size={14} /> Approve</> : <><XCircle size={14} /> Reject</>}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="cb-pagination">
            <button
              className="cb-page-btn"
              disabled={pagination.currentPage <= 1}
              onClick={() => handlePageClick(pagination.currentPage - 1)}
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
              const start = Math.max(1, Math.min(pagination.currentPage - 2, pagination.totalPages - 4));
              const page = start + i;
              if (page > pagination.totalPages) return null;
              return (
                <button
                  key={page}
                  className={`cb-page-num ${page === pagination.currentPage ? 'active' : ''}`}
                  onClick={() => handlePageClick(page)}
                >
                  {page}
                </button>
              );
            })}
            <button
              className="cb-page-btn"
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() => handlePageClick(pagination.currentPage + 1)}
            >
              <ChevronRight size={14} />
            </button>
            <span className="cb-page-info">{pagination.totalItems} total</span>
          </div>
        )}
      </div>
    );
  };

  const renderConfirm = (msg) => (
    <div className="cb-confirm">
      <div className="cb-confirm-buttons">
        <button className="cb-confirm-yes" onClick={() => handleConfirmClick(true)}>
          <Check size={16} /> Yes, Confirm
        </button>
        <button className="cb-confirm-no" onClick={() => handleConfirmClick(false)}>
          <XCircle size={16} /> Cancel
        </button>
      </div>
    </div>
  );

  const renderRejectReason = (msg) => (
    <div className="cb-reject-reason">
      <div className="cb-reject-reason-input-wrap">
        <input
          type="text"
          className="cb-reject-reason-input"
          placeholder="Enter rejection reason..."
          value={rejectReasonInput}
          onChange={(e) => setRejectReasonInput(e.target.value)}
          onKeyPress={(e) => { if (e.key === 'Enter') handleRejectReasonSubmit(rejectReasonInput); }}
          autoFocus
        />
      </div>
      <div className="cb-confirm-buttons">
        <button className="cb-confirm-yes" onClick={() => handleRejectReasonSubmit(rejectReasonInput)}>
          <Check size={16} /> Confirm
        </button>
        <button className="cb-confirm-no" onClick={() => handleRejectReasonCancel()}>
          <XCircle size={16} /> Cancel
        </button>
      </div>
    </div>
  );

  const renderSuggestions = (suggestions) => (
    <div className="cb-suggestions">
      {suggestions.map((s, i) => (
        <button key={i} className="cb-suggestion-btn" onClick={() => handleSuggestionClick(s)}>
          {s}
        </button>
      ))}
    </div>
  );

  // ── Ticket form submit handler ──
  const handleTicketSubmit = async () => {
    if (!ticketForm.subject.trim() || !ticketForm.description.trim()) return;
    setIsTyping(true);
    try {
      const response = await fetch(`${API_BASE_URL}/submit-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: ticketForm.subject,
          description: ticketForm.description,
          priority: ticketForm.priority,
          token: authToken,
        }),
      });
      const data = await response.json();
      setIsTyping(false);
      addBotMessage({
        text: data.response || 'Ticket submitted.',
        responseType: data.type || 'success',
        suggestions: data.suggestions || ['Back to menu'],
      });
      setTicketForm({ subject: '', description: '', priority: 'Medium' });
    } catch {
      setIsTyping(false);
      addBotMessage({ text: 'Failed to submit ticket. Please try again.', responseType: 'error' });
    }
  };

  // ── Ticket form renderer ──
  const renderTicketForm = () => (
    <div className="cb-ticket-form">
      <div className="cb-ticket-field">
        <label>Subject</label>
        <input
          type="text"
          placeholder="Brief summary of your issue"
          value={ticketForm.subject}
          onChange={(e) => setTicketForm(prev => ({ ...prev, subject: e.target.value }))}
        />
      </div>
      <div className="cb-ticket-field">
        <label>Description</label>
        <textarea
          placeholder="Describe your issue in detail..."
          rows={3}
          value={ticketForm.description}
          onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))}
        />
      </div>
      <div className="cb-ticket-field">
        <label>Priority</label>
        <select
          value={ticketForm.priority}
          onChange={(e) => setTicketForm(prev => ({ ...prev, priority: e.target.value }))}
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
      </div>
      <button
        className="cb-ticket-submit"
        onClick={handleTicketSubmit}
        disabled={!ticketForm.subject.trim() || !ticketForm.description.trim()}
      >
        🎫 Submit Ticket
      </button>
    </div>
  );

  const renderDetailView = (msg) => {
    if (!msg.detail) return null;
    const { header, items } = msg.detail;
    if (!header) return null;
    const safe = (v) => {
      if (v == null) return '';
      if (typeof v === 'string') return v;
      if (typeof v === 'number') return String(v);
      if (typeof v === 'object') {
        if (v.firstName || v.lastName) return [v.firstName, v.lastName].filter(Boolean).join(' ');
        return v.name || v.supplierName || v.title || v.email || JSON.stringify(v);
      }
      return String(v);
    };
    const fmtCurrency = (v) => {
      if (v == null || v === '') return '';
      const n = typeof v === 'number' ? v : parseFloat(v);
      return isNaN(n) ? v : `$${n.toFixed(2)}`;
    };
    const fmtDate = (v) => {
      if (!v) return '';
      try { return new Date(v).toLocaleDateString(); } catch { return v; }
    };

    return (
      <div className="cb-detail-card">
        {/* Header */}
        <div className="cb-detail-header">
          <div className="cb-detail-title-row">
            <span className="cb-detail-title">{safe(header.title)}</span>
            <span className="cb-item-status" style={{ backgroundColor: getStatusColor(safe(header.status)) + '20', color: getStatusColor(safe(header.status)) }}>
              {safe(header.status)}
            </span>
          </div>
          <div className="cb-detail-fields">
            {header.date && <div className="cb-detail-field"><span className="cb-field-label">Created</span><span className="cb-field-value">{fmtDate(header.date)}</span></div>}
            {header.created_by && <div className="cb-detail-field"><span className="cb-field-label">Created By</span><span className="cb-field-value">{safe(header.created_by)}</span></div>}
            {header.total && <div className="cb-detail-field"><span className="cb-field-label">Total Amount</span><span className="cb-field-value">{fmtCurrency(header.total)}</span></div>}
            {header.needed_by && <div className="cb-detail-field"><span className="cb-field-label">Needed By</span><span className="cb-field-value">{fmtDate(header.needed_by)}</span></div>}
            {header.supplier && <div className="cb-detail-field"><span className="cb-field-label">Supplier</span><span className="cb-field-value">{safe(header.supplier)}</span></div>}
            {header.item_count && <div className="cb-detail-field"><span className="cb-field-label">Items</span><span className="cb-field-value">{header.item_count}</span></div>}
            {header.last_updated && <div className="cb-detail-field"><span className="cb-field-label">Last Updated</span><span className="cb-field-value">{fmtDate(header.last_updated)}</span></div>}
          </div>
        </div>

        {/* Line Items */}
        {items && items.length > 0 && (
          <div className="cb-detail-items">
            <div className="cb-detail-section-title">📋 Line Items ({items.length})</div>
            <div className="cb-detail-items-scroll">
              {items.map((li, idx) => (
                <div key={idx} className="cb-detail-line-item">
                  <div className="cb-line-item-header">
                    <span className="cb-line-item-name">{safe(li.description) || safe(li.part_id) || `Item ${idx + 1}`}</span>
                    <span className="cb-line-item-price">{fmtCurrency(li.extended_price)}</span>
                  </div>
                  <div className="cb-line-item-details">
                    {li.part_id && <span>ID: {safe(li.part_id)}</span>}
                    {li.quantity && <span>Qty: {li.quantity}{li.uom ? ` ${safe(li.uom)}` : ''}</span>}
                    {li.unit_price && <span>Unit: {fmtCurrency(li.unit_price)}</span>}
                    {li.supplier && <span>🏢 {safe(li.supplier)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {items && items.length === 0 && (
          <div className="cb-detail-empty">No line items found for this cart.</div>
        )}
      </div>
    );
  };

  const formatMarkdownText = (text) => {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />');
  };

  // ═══════════════════════════════════════════════════════
  // TYPING INDICATOR
  // ═══════════════════════════════════════════════════════

  const TypingIndicator = () => (
    <div className="chatbot-typing-indicator">
      <div className="chatbot-message-avatar" style={{ background: 'linear-gradient(to bottom right, #e5e7eb, #d1d5db)' }}>
        <Bot size={18} style={{ color: '#374151' }} />
      </div>
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 16px' }}>
        <div className="chatbot-typing-dots">
          <div className="chatbot-typing-dot"></div>
          <div className="chatbot-typing-dot"></div>
          <div className="chatbot-typing-dot"></div>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════

  return (
    <div className="chatbot-container" style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999 }}>
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} className="chatbot-button">
          <MessageCircle size={28} className="pulse-icon" style={{ color: 'white' }} />
          <span className="chatbot-status-indicator"></span>
        </button>
      )}

      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-content">
              <div className="chatbot-header-icon">
                <Bot size={24} style={{ color: '#2563eb' }} />
              </div>
              <div>
                <h3 className="chatbot-header-title">EVSProcure Assistant</h3>
                <div className="chatbot-header-status">
                  <span className="chatbot-status-dot"></span>
                  Online now
                </div>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button
                onClick={toggleVoice}
                title={isVoiceActive ? 'Stop voice' : 'Start voice'}
                className={`chatbot-header-mic ${isVoiceActive ? 'active' : ''}`}
              >
                {isVoiceActive ? <MicOff size={18} /> : <Mic size={18} />}
                {isListening && <span className="chatbot-mic-ping-sm"></span>}
              </button>
              <button
                onClick={() => {
                  if (isVoiceActive) stopVoiceSession();
                  setIsOpen(false);
                  setTimeout(() => {
                    if (!bgListenerActiveRef.current) startBackgroundWakeWordListener();
                  }, 1000);
                }}
                className="chatbot-close-button"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={messagesContainerRef} onScroll={handleScroll} className="chatbot-messages">
            {/* Budget Banner */}
            {budgetData && (
              <div className="cb-budget-banner">
                <div className="cb-budget-item">
                  <span className="cb-budget-label">💰 Total Budget</span>
                  <span className="cb-budget-value">${typeof budgetData.total === 'number' ? budgetData.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</span>
                </div>
                <div className="cb-budget-divider"></div>
                <div className="cb-budget-item">
                  <span className="cb-budget-label">✅ Available</span>
                  <span className="cb-budget-value cb-budget-available">${typeof budgetData.available === 'number' ? budgetData.available.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</span>
                </div>
              </div>
            )}

            {messages.map((msg, index) => (
              <div key={index} className="chatbot-fade-in">
                <div className={`chatbot-message ${msg.type === 'user' ? 'user' : 'bot'}`}>
                  <div className="chatbot-message-content">
                    <div className="chatbot-message-avatar">
                      {msg.type === 'user'
                        ? <User size={18} style={{ color: 'white' }} />
                        : <Bot size={18} style={{ color: '#374151' }} />
                      }
                    </div>
                    <div className={`chatbot-message-bubble ${msg.responseType === 'error' ? 'cb-error-bubble' : ''} ${msg.responseType === 'success' ? 'cb-success-bubble' : ''}`}>
                      <p style={{ margin: 0 }} dangerouslySetInnerHTML={{ __html: formatMarkdownText(msg.text) }} />
                    </div>
                  </div>
                </div>

                {/* Menu buttons */}
                {msg.type === 'bot' && msg.menuItems && msg.menuItems.length > 0 && renderMenuItems(msg.menuItems, msg)}

                {/* List view */}
                {msg.type === 'bot' && msg.responseType === 'list' && renderListItems(msg)}

                {/* Detail drill-down view */}
                {msg.type === 'bot' && msg.responseType === 'detail' && renderDetailView(msg)}

                {/* Confirmation */}
                {msg.type === 'bot' && msg.responseType === 'confirm' && renderConfirm(msg)}

                {/* Reject reason form */}
                {msg.type === 'bot' && msg.responseType === 'reject_reason' && renderRejectReason(msg)}

                {/* Ticket form */}
                {msg.type === 'bot' && msg.responseType === 'ticket_form' && renderTicketForm()}

                {/* Suggestions */}
                {msg.type === 'bot' && msg.suggestions && msg.suggestions.length > 0 && renderSuggestions(msg.suggestions)}
              </div>
            ))}

            {isTyping && <TypingIndicator />}

            <div ref={messagesEndRef} />

            {showScrollTop && (
              <button onClick={scrollToTop} className="chatbot-scroll-top chatbot-fade-in">
                <ArrowUp size={20} />
              </button>
            )}
          </div>

          {/* Input Area */}
          <div className="chatbot-input-area">
            {isVoiceActive && (
              <div className={`chatbot-voice-status ${voiceStatus || (voiceSessionRef.current ? 'active-session' : 'waiting')}`}>
                <div className={`evs-waveform ${voiceStatus || 'idle'}`}>
                  {[0, 1, 2, 3, 4, 5, 6].map(i => {
                    const offsets = [0.6, 0.8, 1.0, 0.9, 1.0, 0.8, 0.6];
                    const energy = voiceStatus === 'listening' ? audioEnergyLevel : 0;
                    const h = Math.max(4, energy * 24 * offsets[i] + 4);
                    return <div key={i} className="evs-waveform-bar" style={voiceStatus === 'listening' ? { height: `${h}px` } : {}} />;
                  })}
                </div>
                <span className="evs-voice-label">
                  {voiceStatus === 'listening' && (voiceTranscript ? `"${voiceTranscript}"` : 'Listening...')}
                  {voiceStatus === 'processing' && 'Processing...'}
                  {voiceStatus === 'speaking' && 'Speaking...'}
                  {!voiceStatus && voiceSessionRef.current && 'Session active'}
                  {!voiceStatus && !voiceSessionRef.current && isVoiceActive && 'Say "Hey EVS" to begin'}
                </span>
              </div>
            )}
            <div className="chatbot-input-container">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a command..."
                className="chatbot-input"
              />
              <button onClick={handleSendMessage} disabled={!inputValue.trim()} className="chatbot-send-button">
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;
