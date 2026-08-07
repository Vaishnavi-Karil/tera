import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const savedProfile = (() => {
  try {
    const saved = localStorage.getItem('tera_user_profile');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return {
    name: 'Vaishnavi',
    interests: 'Artificial Intelligence, Agentic AI, workflows on AI tools, and Antigravity CLI (antigravity-cli)'
  };
})();
axios.defaults.headers.common['x-user-id'] = savedProfile.name || 'default';

const savedToken = localStorage.getItem('tera_auth_token') || '';
if (savedToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
}



const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
};

const getSessionSummary = (session) => {
  if (session.summary && session.summary.trim() !== '') {
    return session.summary;
  }
  const title = session.title ? session.title.toLowerCase() : '';
  if (title.includes('stress') || title.includes('anxiety') || title.includes('overwhelmed')) {
    return "Tera's Summary: Explored launch anxiety; prioritized design audit over meditation.";
  }
  if (title.includes('morning') || title.includes('reflection') || title.includes('gratitude')) {
    return "Tera's Summary: Focused on gratitude and setting intentions for the week ahead.";
  }
  if (title.includes('mindfulness') || title.includes('meditation') || title.includes('journey')) {
    return "Tera's Summary: Discussed meditation benefits and created a morning plan.";
  }
  if (title.includes('productivity') || title.includes('sprint') || title.includes('work')) {
    return "Tera's Summary: Analyzed project timelines, set up deep work blocks, and planned design audit.";
  }
  if (title.includes('philosophy') || title.includes('deep')) {
    return "Tera's Summary: Explored existential questions and personal growth metrics.";
  }
  return `Tera's Summary: Discussed ${session.title || 'chat session'} and outlined next actions.`;
};

function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [homeJournal, setHomeJournal] = useState('');
  const [journalSaved, setJournalSaved] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connections, setConnections] = useState({
    google: { linked: false, loading: false },
    meta: { linked: false, loading: false },
    phone: { linked: false, loading: false },
    microsoft: { linked: false, loading: false },
    linkedin: { linked: false, loading: false },
    youtube: { linked: false, loading: false },
    github: { linked: false, loading: false }
  });

  const fetchConnections = async () => {
    try {
      const res = await axios.get(`${API_BASE}/connections`);
      setConnections(res.data);
    } catch (err) {
      console.error("Failed to fetch connections status", err);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);



  const handleLinkAccount = async (platform) => {
    setConnections(prev => ({
      ...prev,
      [platform]: { ...prev[platform], loading: true }
    }));
    
    try {
      const res = await axios.post(`${API_BASE}/connections/link/${platform}`);
      if (res.data.method === 'OAUTH_REDIRECT' && res.data.authUrl) {
        // Redirect user to the real OAuth provider (Scaffolded URL for now)
        alert(`Redirecting to: ${res.data.authUrl}`);
      } else if (res.data.method === 'BRIDGE_APP') {
        alert(`Integration Required: ${res.data.message}`);
      }
      
      // Re-fetch status
      const statusRes = await axios.get(`${API_BASE}/connections`);
      setConnections(statusRes.data);
    } catch (err) {
      console.error("Failed to initiate linking", err);
      setConnections(prev => ({
        ...prev,
        [platform]: { ...prev[platform], loading: false }
      }));
    }
  };

  // Continuous Voice Chat states (Voice Companion / Continuous Call Mode)
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [callStatus, setCallStatus] = useState('Call Ended');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [voiceLang, setVoiceLang] = useState('hi-IN');
  const voiceLangRef = useRef('hi-IN');
  useEffect(() => {
    voiceLangRef.current = voiceLang;
  }, [voiceLang]);
  const recognitionRef = useRef(null);
  const [dailySummaries, setDailySummaries] = useState({});

  const isVoiceActiveRef = useRef(false);
  const isPausedRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const loadingRef = useRef(false);

  useEffect(() => {
    isVoiceActiveRef.current = isVoiceActive;
    isPausedRef.current = isPaused;
    isSpeakingRef.current = isSpeaking;
    loadingRef.current = loading;
  }, [isVoiceActive, isPaused, isSpeaking, loading]);

  // Health, Routine & Diet states (Cleaned - no assumptions)
  const [routines, setRoutines] = useState([]);
  const [dietLogs, setDietLogs] = useState([]);
  const [healthStatus, setHealthStatus] = useState("Healthy");
  const [newRoutineInput, setNewRoutineInput] = useState('');
  const [newDietInput, setNewDietInput] = useState('');
  const [newSicknessInput, setNewSicknessInput] = useState('');
  const [aiStatus, setAiStatus] = useState({ useLocalModel: false, localModelName: '', hasGeminiKey: false });
  const [friendProfile, setFriendProfile] = useState({
    name: '',
    personality: 'Warm & Supportive',
    voiceFile: null
  });
  const [userProfile, setUserProfile] = useState(savedProfile);

  useEffect(() => {
    localStorage.setItem('tera_user_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  const [editName, setEditName] = useState(userProfile.name);
  const [editInterests, setEditInterests] = useState(userProfile.interests);

  useEffect(() => {
    setEditName(userProfile.name);
    setEditInterests(userProfile.interests);
  }, [userProfile]);
  const [showPersonalityLab, setShowPersonalityLab] = useState(false);

  const [token, setToken] = useState(localStorage.getItem('tera_auth_token') || '');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authInterests, setAuthInterests] = useState('');
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const handleAuthSuccess = (newToken, user) => {
    localStorage.setItem('tera_auth_token', newToken);
    localStorage.setItem('tera_user_profile', JSON.stringify({
      name: user.name,
      interests: user.interests || ''
    }));
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUserProfile({
      name: user.name,
      interests: user.interests || ''
    });
    // Re-fetch data
    fetchSessions();
    fetchConnections();
    fetchDailySummaries();
  };

  const handleLogout = () => {
    localStorage.removeItem('tera_auth_token');
    localStorage.removeItem('tera_user_profile');
    delete axios.defaults.headers.common['Authorization'];
    setToken('');
    setUserProfile({ name: 'Vaishnavi', interests: '' });
    setSessions([]);
    setMessages([]);
    setCurrentSession(null);
  };

  const handleTraditionalAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      if (authMode === 'signup') {
        const res = await axios.post(`${API_BASE}/auth/register`, {
          email: authEmail.trim(),
          password: authPassword,
          name: authName.trim(),
          interests: authInterests
        });
        handleAuthSuccess(res.data.token, res.data.user);
      } else {
        const res = await axios.post(`${API_BASE}/auth/login`, {
          email: authEmail.trim(),
          password: authPassword
        });
        handleAuthSuccess(res.data.token, res.data.user);
      }
    } catch (err) {
      console.error("Authentication error:", err);
      setAuthError(err.response?.data?.error || "Authentication failed. Please verify credentials.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLoginSuccess = async (credential) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await axios.post(`${API_BASE}/auth/google`, { credential });
      handleAuthSuccess(res.data.token, res.data.user);
    } catch (err) {
      console.error("Google Login error:", err);
      setAuthError(err.response?.data?.error || "Google Sign-In failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleMockGoogleLogin = () => {
    const mockName = prompt("Enter Name for Simulated Google Login (Dev Mode):", "Vaishnavi");
    if (!mockName) return;
    const mockCredential = `mock_${mockName}`;
    handleGoogleLoginSuccess(mockCredential);
  };

  const handleSyncProfileSettings = async () => {
    try {
      const res = await axios.put(`${API_BASE}/auth/profile`, {
        name: editName.trim(),
        interests: editInterests
      });
      handleAuthSuccess(res.data.token, res.data.user);
      setShowPersonalityLab(false);
    } catch (err) {
      console.error("Failed to update profile settings", err);
      alert("Could not update settings. Please try again.");
    }
  };

  useEffect(() => {
    if (token) return; // Only load GIS if user is not logged in

    // Load Google Identity Services SDK once
    let script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    const initializeGoogle = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: '123456789-mockclientid.apps.googleusercontent.com', // placeholder client ID
          callback: (response) => {
            handleGoogleLoginSuccess(response.credential);
          }
        });
        
        // Render Google Sign-in button if container exists
        const btnContainer = document.getElementById('google-signin-btn');
        if (btnContainer) {
          window.google.accounts.id.renderButton(
            btnContainer,
            { theme: 'outline', size: 'large', width: '100%' }
          );
        }
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      document.body.appendChild(script);
    } else {
      initializeGoogle();
    }
  }, [token]);

  useEffect(() => {
    const fetchAiStatus = async () => {
      try {
        const res = await axios.get(`${API_BASE}/status`);
        setAiStatus(res.data);
      } catch (err) {
        console.error("Failed to fetch AI status", err);
      }
    };
    fetchAiStatus();
  }, []);

  // Relationship support states
  const [relationshipLogs, setRelationshipLogs] = useState([]);
  const [newRelationshipInput, setNewRelationshipInput] = useState('');

  // Text-To-Speech function
  const speakText = (text) => {
    if (!isAudioEnabled || !('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    
    const cleanText = text
      .replace(/[\*\_~`#]/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E6}-\u{1F1FF}]/gu, '');
      
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const hasHindi = /[\u0900-\u097F]/.test(text) || 
                        /\b(hoon|hai|kya|aaj|karna|ho|tum|meri|baat|suno|kaise|achha|acha|chalo|haan|nahin|na|rahi|rhi|tha|gya|gyee|hu|gai|rha|rhi|gaye|gayi)\b/i.test(text);
      
      utterance.lang = hasHindi ? 'hi-IN' : 'en-US';
      utterance.volume = 1.0; // Ensure full volume

      let voice = null;
      if (hasHindi) {
        voice = voices.find(v => v.name.toLowerCase().includes('natural') && (v.lang.startsWith('hi') || v.lang.includes('IN'))) ||
                voices.find(v => (v.lang.startsWith('hi') || v.lang.includes('IN')) && v.name.toLowerCase().includes('google')) ||
                voices.find(v => v.name.toLowerCase().includes('kalpana')) ||
                voices.find(v => v.name.toLowerCase().includes('swara')) ||
                voices.find(v => v.lang.startsWith('hi') || v.lang.includes('IN')) ||
                voices.find(v => v.lang.startsWith('en'));
      } else {
        voice = voices.find(v => v.name.toLowerCase().includes('natural') && v.lang.startsWith('en')) ||
                voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
                voices.find(v => v.lang.startsWith('en')) ||
                voices[0];
      }
      
      if (voice) {
        utterance.voice = voice;
        utterance.rate = 1.0; // Standard, clear speaking rate
        utterance.pitch = 1.0; // Balanced pitch
      }
      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      setVoice();
    } else {
      window.speechSynthesis.onvoiceschanged = setVoice;
    }
  };

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [activeTab]);
  
  const chatEndRef = useRef(null);

  // Daily Focus widget tasks (in Chat tab)
  const [tasks, setTasks] = useState([
    { id: 1, text: "Morning Meditation (10m)", checked: false },
    { id: 2, text: "Deep Work Session - Design Audit", checked: false },
    { id: 3, text: "Review Health Metrics", checked: false }
  ]);

  // Mera Sahayak widget tasks (in Assistant tab)
  const [assistantTasks, setAssistantTasks] = useState([
    { id: 1, text: "Morning mindfulness (10m)", checked: true },
    { id: 2, text: "Review Q3 Vision document", checked: false },
    { id: 3, text: "Order new workstation plant", checked: false },
    { id: 4, text: "Sync with Sarah on branding", checked: false }
  ]);

  // Fetch all sessions and daily summaries on mount
  useEffect(() => {
    fetchSessions();
    fetchDailySummaries();
  }, []);

  // Fetch daily summaries when tab changes to voice or reflections
  useEffect(() => {
    if (activeTab === 'voice' || activeTab === 'reflections') {
      fetchDailySummaries();
    }
  }, [activeTab]);

  // Fetch messages when current session changes
  useEffect(() => {
    if (currentSession) {
      fetchMessages(currentSession.id);
    } else {
      setMessages([]);
    }
  }, [currentSession]);

  // Scroll to bottom when messages, loading, or voiceText update
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, activeTab, voiceText]);

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const res = await axios.get(`${API_BASE}/sessions`);
      setSessions(res.data);
      if (res.data.length > 0 && !currentSession) {
        setCurrentSession(res.data[0]);
      }
    } catch (err) {
      console.error("Error fetching sessions:", err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchMessages = async (sessionId) => {
    try {
      const res = await axios.get(`${API_BASE}/sessions/${sessionId}/messages`);
      setMessages(res.data);
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  const fetchDailySummaries = async () => {
    try {
      const res = await axios.get(`${API_BASE}/daily-summaries`);
      setDailySummaries(res.data);
    } catch (err) {
      console.error("Error fetching daily summaries:", err);
    }
  };

  // Update Axios headers and re-fetch user specific databases on profile switch
  useEffect(() => {
    const tenantName = userProfile.name || 'default';
    axios.defaults.headers.common['x-user-id'] = tenantName;
    
    // Clear old state and fetch new tenant data
    if (tenantName !== 'default') {
      fetchSessions();
      fetchConnections();
      fetchDailySummaries();
      setCurrentSession(null);
      setMessages([]);
    }
  }, [userProfile.name]);

  const getDynamicGreeting = () => {
    const hours = new Date().getHours();
    const name = userProfile.name || 'Friend';
    if (hours >= 5 && hours < 12) return `Good Morning, ${name}.`;
    if (hours >= 12 && hours < 17) return `Good Afternoon, ${name}.`;
    if (hours >= 17 && hours < 21) return `Good Evening, ${name}.`;
    return `Good Night, ${name}.`;
  };

  const startRecognitionInstance = () => {
    if (!isVoiceActiveRef.current || isPausedRef.current || isSpeakingRef.current || loadingRef.current) {
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = voiceLangRef.current;

    rec.onstart = () => {
      setIsListening(true);
      setCallStatus('Listening...');
      setVoiceText('');
    };

    rec.onresult = (event) => {
      const result = event.results[event.resultIndex];
      const transcript = result[0].transcript;
      setVoiceText(transcript);
      
      if (result.isFinal) {
        rec.stop();
        setIsListening(false);
        setCallStatus('Connected to Tera');
        sendVoiceInputToAI(transcript);
      }
    };

    rec.onerror = (e) => {
      console.error("Speech recognition error:", e.error, e.message);
      setIsListening(false);
      
      if (e.error === 'not-allowed') {
        setCallStatus('Microphone permission denied');
        stopVoiceMode();
      } else if (e.error === 'no-speech') {
        setCallStatus('Connected to Tera');
      } else {
        setCallStatus(`Speech error: ${e.error}`);
      }
    };

    rec.onend = () => {
      setIsListening(false);
      if (recognitionRef.current !== rec) return;

      if (isVoiceActiveRef.current && !isPausedRef.current && !isSpeakingRef.current && !loadingRef.current) {
        setTimeout(() => {
          try {
            if (recognitionRef.current === rec && isVoiceActiveRef.current && !isPausedRef.current && !isSpeakingRef.current && !loadingRef.current) {
              rec.start();
            }
          } catch (err) {
            // already started
          }
        }, 400);
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (e) {
      console.error("Failed to start SpeechRecognition:", e);
    }
  };

  const sendVoiceInputToAI = async (text) => {
    if (!text.trim()) {
      startRecognitionInstance();
      return;
    }

    let activeSession = currentSession;
    if (!activeSession) {
      try {
        const res = await axios.post(`${API_BASE}/sessions`, { title: 'Voice Sanctuary Session' });
        activeSession = res.data;
        setSessions(prev => [res.data, ...prev]);
        setCurrentSession(res.data);
      } catch (err) {
        console.error("Error creating voice session:", err);
        startRecognitionInstance();
        return;
      }
    }

    const tempUserMsg = {
      id: 'temp-user',
      sender: 'user',
      content: text,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setLoading(true);
    loadingRef.current = true;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    try {
      const res = await axios.post(`${API_BASE}/sessions/${activeSession.id}/messages`, {
        content: text,
        friendProfile: friendProfile,
        userProfile: {
          ...userProfile,
          tasks: tasks
        }
      });

      setMessages(prev =>
        prev.filter(m => m.id !== 'temp-user')
          .concat([res.data.userMessage, res.data.assistantMessage])
      );

      fetchSessions();
      fetchDailySummaries();

      setLoading(false);
      loadingRef.current = false;

      if (res.data.assistantMessage && res.data.assistantMessage.content) {
        speakVoiceResponse(res.data.assistantMessage.content);
      } else {
        startRecognitionInstance();
      }
    } catch (err) {
      console.error("Error in voice AI response:", err);
      setMessages(prev => prev.filter(m => m.id !== 'temp-user'));
      
      const errMsg = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        content: "Sorry, I had trouble connecting. Please check if the backend server and model are running.",
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, errMsg]);

      setLoading(false);
      loadingRef.current = false;
      
      speakVoiceResponse("Sorry, server connect nahi ho pa raha hai. Dobara check karein.");
    }
  };

  const speakVoiceResponse = (text) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    isSpeakingRef.current = true;
    setCallStatus('Tera is speaking...');

    const cleanText = text
      .replace(/[\*\_~`#]/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E6}-\u{1F1FF}]/gu, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);

    const voices = window.speechSynthesis.getVoices();
    const hasHindi = /[\u0900-\u097F]/.test(text) || 
                      /\b(hoon|hai|kya|aaj|karna|ho|tum|meri|baat|suno|kaise|achha|acha|chalo|haan|nahin|na|rahi|rhi|tha|gya|gyee|hu|gai|rha|rhi|gaye|gayi)\b/i.test(text);
    
    utterance.lang = hasHindi ? 'hi-IN' : 'en-US';
    utterance.volume = 1.0; // Ensure full volume

    let voice = null;
    if (hasHindi) {
      voice = voices.find(v => v.name.toLowerCase().includes('natural') && (v.lang.startsWith('hi') || v.lang.includes('IN'))) ||
              voices.find(v => (v.lang.startsWith('hi') || v.lang.includes('IN')) && v.name.toLowerCase().includes('google')) ||
              voices.find(v => v.name.toLowerCase().includes('kalpana')) ||
              voices.find(v => v.name.toLowerCase().includes('swara')) ||
              voices.find(v => v.lang.startsWith('hi') || v.lang.includes('IN')) ||
              voices.find(v => v.lang.startsWith('en'));
    } else {
      voice = voices.find(v => v.name.toLowerCase().includes('natural') && v.lang.startsWith('en')) ||
              voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
              voices.find(v => v.lang.startsWith('en')) ||
              voices[0];
    }

    if (voice) {
      utterance.voice = voice;
      utterance.rate = 1.0; // Standard, clear speaking rate
      utterance.pitch = 1.0; // Balanced pitch
    }

    utterance.onend = () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      setCallStatus('Connected to Tera');
      startRecognitionInstance();
    };

    utterance.onerror = (errEvent) => {
      console.error("SpeechSynthesis error:", errEvent);
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      setCallStatus('Connected to Tera');
      startRecognitionInstance();
    };

    window.speechSynthesis.speak(utterance);
  };

  const startVoiceMode = () => {
    setIsVoiceActive(true);
    setIsPaused(false);
    setCallStatus('Connected to Tera');
    setVoiceText('');

    isVoiceActiveRef.current = true;
    isPausedRef.current = false;
    isSpeakingRef.current = false;
    loadingRef.current = false;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    startRecognitionInstance();
  };

  const pauseVoiceMode = () => {
    setIsPaused(true);
    setIsListening(false);
    setIsSpeaking(false);
    setCallStatus('Call on Hold');

    isPausedRef.current = true;
    isSpeakingRef.current = false;

    if (recognitionRef.current) {
      const tempRec = recognitionRef.current;
      recognitionRef.current = null;
      try {
        tempRec.stop();
      } catch (e) {}
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const stopVoiceMode = () => {
    setIsVoiceActive(false);
    setIsPaused(false);
    setIsListening(false);
    setIsSpeaking(false);
    setCallStatus('Call Ended');
    setVoiceText('');

    isVoiceActiveRef.current = false;
    isPausedRef.current = false;
    isSpeakingRef.current = false;

    if (recognitionRef.current) {
      const tempRec = recognitionRef.current;
      recognitionRef.current = null;
      try {
        tempRec.stop();
      } catch (e) {}
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const handleCreateSession = async (title = 'New Chat Session') => {
    try {
      const res = await axios.post(`${API_BASE}/sessions`, { title });
      setSessions(prev => [res.data, ...prev]);
      setCurrentSession(res.data);
      setActiveTab('chat');
    } catch (err) {
      console.error("Error creating session:", err);
    }
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API_BASE}/sessions/${sessionId}`);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
      }
      fetchDailySummaries();
    } catch (err) {
      console.error("Error deleting session:", err);
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;

    let activeSession = currentSession;
    const messageContent = inputValue.trim();
    setInputValue('');

    // If no active session, create one first
    if (!activeSession) {
      try {
        const res = await axios.post(`${API_BASE}/sessions`, { title: 'New Chat Session' });
        activeSession = res.data;
        setSessions(prev => [res.data, ...prev]);
        setCurrentSession(res.data);
      } catch (err) {
        console.error("Error auto-creating session:", err);
        return;
      }
    }

    // Append user message immediately
    const tempUserMsg = {
      id: 'temp-user',
      sender: 'user',
      content: messageContent,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setLoading(true);

    if (isVoiceActive && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    try {
      const res = await axios.post(`${API_BASE}/sessions/${activeSession.id}/messages`, {
        content: messageContent,
        friendProfile: friendProfile, // Pass the custom personality profile
        userProfile: {
          ...userProfile,
          tasks: tasks
        }
      });

      // Update messages with actual saved values
      setMessages(prev => 
        prev.filter(m => m.id !== 'temp-user')
          .concat([res.data.userMessage, res.data.assistantMessage])
      );

      // Read AI response aloud
      if (res.data.assistantMessage && res.data.assistantMessage.content) {
        if (isVoiceActive) {
          speakVoiceResponse(res.data.assistantMessage.content);
        } else {
          speakText(res.data.assistantMessage.content);
        }
      }

      // Fetch sessions again to update sidebar title and summary
      fetchSessions();
      fetchDailySummaries();
    } catch (err) {
      console.error("Error sending message:", err);
      if (isVoiceActive) {
        startRecognitionInstance();
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, checked: !t.checked } : t));
  };

  const toggleAssistantTask = (id) => {
    setAssistantTasks(prev => prev.map(t => t.id === id ? { ...t, checked: !t.checked } : t));
  };

  const handleAddAssistantTask = () => {
    const text = prompt("Enter new task:");
    if (text && text.trim()) {
      setAssistantTasks(prev => [
        ...prev,
        { id: Date.now(), text: text.trim(), checked: false }
      ]);
    }
  };

  const handleSaveJournal = () => {
    if (!homeJournal.trim()) return;
    setJournalSaved(true);
    setTimeout(() => {
      setJournalSaved(false);
      setHomeJournal('');
    }, 3000);
  };

  const remainingTasks = tasks.filter(t => !t.checked).length;
  const remainingAssistantTasks = assistantTasks.filter(t => !t.checked).length;

  // Render Functions for Tabs
  const renderChatTab = () => {
    return (
      <>
        {/* Top App Bar Header */}
        <header className="flex justify-between items-center w-full px-10 h-16 bg-transparent z-30 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary ai-pulse"></div>
              <span className="text-sm font-label-caps text-secondary/80">Friend Nexus</span>
            </div>

            {/* AI Model Status Badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-bold tracking-widest uppercase transition-all duration-500 ${
              aiStatus.useLocalModel 
                ? 'bg-green-500/10 border-green-500/30 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.1)]' 
                : (aiStatus.hasGeminiKey ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-red-500/10 border-red-500/30 text-red-400')
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${aiStatus.useLocalModel ? 'bg-green-400 animate-pulse' : (aiStatus.hasGeminiKey ? 'bg-primary' : 'bg-red-400')}`}></span>
              {aiStatus.useLocalModel ? `Local: ${aiStatus.localModelName}` : (aiStatus.hasGeminiKey ? 'Cloud: Gemini 1.5' : 'Mock Mode')}
            </div>
          </div>
          <div className="flex items-center gap-6">
            {/* Friend Nexus Lab Toggle */}
            <button 
              onClick={() => setShowPersonalityLab(!showPersonalityLab)}
              title="Voice & Personality Lab"
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all ${
                showPersonalityLab 
                  ? 'bg-primary text-on-primary border-primary' 
                  : 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">neurology</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">Personality Lab</span>
            </button>

            <button 
              onClick={() => {
                const newVal = !isAudioEnabled;
                setIsAudioEnabled(newVal);
                if (!newVal && 'speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                }
              }}
              title={isAudioEnabled ? "Mute Voice" : "Enable Voice"}
              className={`hover:opacity-80 transition-opacity flex items-center justify-center p-1.5 rounded-full border transition-all ${
                isAudioEnabled 
                  ? 'bg-primary/10 border-primary/20 text-primary' 
                  : 'bg-white/5 border-white/5 text-on-surface-variant/40'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isAudioEnabled ? 'volume_up' : 'volume_off'}
              </span>
            </button>
            <button className="text-on-surface-variant hover:opacity-80 transition-opacity">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/20 ring-4 ring-primary/5">
              <img 
                alt="User Avatar" 
                className="w-full h-full object-cover" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDswykIKSPyr9CUaZ5rC6vHv303aFYM8YzDbc2FPrTVFK9542avAohcqDTPSQU2cqC4Gk_iSfM_Mb7JhxjuvU8RaNzov4R4E0B5iJn0lqJIeGuiTrFUnbUHKI4inM6U1jM277KXgxLA1jGaiDR2J1c9QL9TqCKvKPmsmR-ZOT8x8oaNZzt5ZmTQ5xPoJkKYbn5kCiQZvT1YJCbY3YXbVJllWuEwhLyHNYI9xtLujgRvYD9ikeY-DYxGsDmDFARjwDyImk4wcSJzn-T8"
              />
            </div>
          </div>
        </header>

        {/* Chat Feed Messages Container */}
        <div className="flex-1 flex flex-col overflow-hidden px-10 pb-28 relative">
          
          {/* Voice & Personality Lab Panel */}
          {showPersonalityLab && (
            <div className="absolute top-4 right-10 z-50 w-80 glass-card p-6 rounded-[2rem] border-primary/30 shadow-2xl animate-in slide-in-from-top-4 duration-500">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-headline-md text-sm uppercase tracking-[0.2em] text-primary">Friend Nexus Lab</h3>
                <button onClick={() => setShowPersonalityLab(false)} className="text-on-surface-variant/40 hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-label-caps text-on-surface-variant/60 block mb-2">Friend's Name</label>
                  <input 
                    type="text" 
                    value={friendProfile.name}
                    onChange={(e) => setFriendProfile(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Aryan"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:ring-1 ring-primary/50 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-label-caps text-on-surface-variant/60 block mb-2">Personality Type</label>
                  <select 
                    value={friendProfile.personality}
                    onChange={(e) => setFriendProfile(prev => ({ ...prev, personality: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:ring-1 ring-primary/50 outline-none"
                  >
                    <option value="Warm & Supportive">Warm & Supportive</option>
                    <option value="Funny & Witty">Funny & Witty</option>
                    <option value="Mature & Wise">Mature & Wise</option>
                    <option value="Strict & Disciplined">Strict & Disciplined</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-label-caps text-on-surface-variant/60 block mb-2">Voice Cloning (Audio)</label>
                  <div className="relative group">
                    <input 
                      type="file" 
                      accept="audio/*"
                      onChange={(e) => setFriendProfile(prev => ({ ...prev, voiceFile: e.target.files[0] }))}
                      className="hidden" 
                      id="voice-upload"
                    />
                    <label 
                      htmlFor="voice-upload"
                      className="flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer group-hover:border-primary/40 transition-all bg-white/2"
                    >
                      <span className="material-symbols-outlined text-primary group-hover:animate-bounce">cloud_upload</span>
                      <span className="text-[11px] font-medium text-on-surface-variant">
                        {friendProfile.voiceFile ? friendProfile.voiceFile.name : 'Upload Friend\'s Voice'}
                      </span>
                    </label>
                  </div>
                  <p className="text-[9px] text-on-surface-variant/40 mt-2 italic text-center">Upload a 10s audio clip for zero-shot cloning.</p>
                </div>

                {/* User Profile Settings */}
                <div className="border-t border-white/10 pt-4 mt-2">
                  <h4 className="text-[10px] font-label-caps text-primary uppercase tracking-wider mb-3">Your Profile Settings</h4>
                  
                  <div className="mb-3">
                    <label className="text-[10px] font-label-caps text-on-surface-variant/60 block mb-1">Your Name</label>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="e.g. Vaishnavi"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:ring-1 ring-primary/50 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-label-caps text-on-surface-variant/60 block mb-1">Your Interests & CLI Tools</label>
                    <textarea 
                      value={editInterests}
                      onChange={(e) => setEditInterests(e.target.value)}
                      placeholder="e.g. Agentic AI, Antigravity CLI, etc."
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:ring-1 ring-primary/50 outline-none resize-none"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleSyncProfileSettings}
                  className="w-full py-3 bg-primary text-on-primary rounded-xl font-bold text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mb-2.5"
                >
                  Sync Settings
                </button>

                <button 
                  onClick={handleLogout}
                  className="w-full py-3 bg-error/10 hover:bg-error/20 text-error rounded-xl font-bold text-xs hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Log Out Account
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto custom-scrollbar pt-6 space-y-8 max-w-4xl mx-auto w-full">
            
            {/* Sticky Voice Call Banner at the top of the chat feed */}
            {isVoiceActive && (
              <div className="sticky top-0 bg-surface/75 backdrop-blur-md z-20 w-full border-b border-white/10 pb-4 pt-2 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    !isPaused
                      ? (isSpeaking ? 'bg-gradient-to-tr from-tertiary to-primary shadow-[0_0_10px_rgba(251,171,255,0.4)] animate-pulse' : 'bg-gradient-to-tr from-primary to-secondary shadow-[0_0_10px_rgba(192,193,255,0.4)]')
                      : 'bg-white/5 border border-white/10 text-on-surface-variant/40'
                  }`}>
                    <span className="material-symbols-outlined text-sm">
                      {isSpeaking ? 'volume_up' : (isListening ? 'mic' : 'graphic_eq')}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-label-caps text-primary uppercase tracking-wider">Voice Call Mode</h4>
                    <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">{callStatus}</p>
                  </div>
                </div>

                {/* Language Selector & Waves */}
                <div className="flex items-center gap-4">
                  {/* Speech Recognition Language Selector */}
                  <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
                    <button 
                      type="button"
                      onClick={() => {
                        setVoiceLang('hi-IN');
                        if (isVoiceActive && !isPaused && !isSpeaking && !loading) {
                          startRecognitionInstance();
                        }
                      }}
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg transition-all ${
                        voiceLang === 'hi-IN' 
                          ? 'bg-primary text-on-primary shadow-md font-extrabold' 
                          : 'text-on-surface-variant/60 hover:text-white'
                      }`}
                    >
                      Hindi
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setVoiceLang('en-IN');
                        if (isVoiceActive && !isPaused && !isSpeaking && !loading) {
                          startRecognitionInstance();
                        }
                      }}
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg transition-all ${
                        voiceLang === 'en-IN' 
                          ? 'bg-primary text-on-primary shadow-md font-extrabold' 
                          : 'text-on-surface-variant/60 hover:text-white'
                      }`}
                    >
                      Hinglish
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setVoiceLang('en-US');
                        if (isVoiceActive && !isPaused && !isSpeaking && !loading) {
                          startRecognitionInstance();
                        }
                      }}
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg transition-all ${
                        voiceLang === 'en-US' 
                          ? 'bg-primary text-on-primary shadow-md font-extrabold' 
                          : 'text-on-surface-variant/60 hover:text-white'
                      }`}
                    >
                      English
                    </button>
                  </div>

                  {!isPaused && isListening && (
                    <div className="flex items-center gap-1 h-6">
                      <div className="w-0.5 bg-secondary h-3 rounded animate-bounce" style={{ animationDuration: '0.8s' }}></div>
                      <div className="w-0.5 bg-primary h-5 rounded animate-bounce" style={{ animationDuration: '0.5s', animationDelay: '0.1s' }}></div>
                      <div className="w-0.5 bg-tertiary h-4 rounded animate-bounce" style={{ animationDuration: '0.6s', animationDelay: '0.2s' }}></div>
                      <div className="w-0.5 bg-secondary h-5 rounded animate-bounce" style={{ animationDuration: '0.7s', animationDelay: '0.3s' }}></div>
                      <div className="w-0.5 bg-primary h-2 rounded animate-bounce" style={{ animationDuration: '0.9s', animationDelay: '0.4s' }}></div>
                    </div>
                  )}
                  {!isPaused && isSpeaking && (
                    <div className="w-3 h-3 rounded-full bg-primary/40 border border-primary/60 animate-ping"></div>
                  )}
                  {isPaused && (
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">PAUSED</span>
                  )}
                </div>
              </div>
            )}
            
            {/* AI Welcome Message (Always at Top) */}
            <div className="flex flex-col items-start gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[14px]">
                  <span className="material-symbols-outlined text-primary text-xs" style={{ fontSize: '14px' }}>auto_awesome</span>
                </div>
                <span className="text-xs font-label-caps text-primary/70">Tera</span>
              </div>
              <div className="glass-card tera-glow p-5 rounded-2xl rounded-tl-none max-w-[80%] text-on-surface font-body-md text-body-md leading-relaxed">
                Good morning! I've prepared your mental sanctuary for today. How are you feeling this morning? I noticed your heart rate was slightly elevated during sleep—would you like to start with a 5-minute breathing exercise?
              </div>
            </div>

            {/* Daily Tasks Widget (Always at Top) */}
            <div className="flex flex-col items-start gap-3 w-full">
              <div className="glass-card p-6 rounded-3xl w-full max-w-md border-primary/20 bg-primary/5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-headline-md text-sm uppercase tracking-widest text-primary">Daily Focus</h3>
                  <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full">{remainingTasks} TASKS REMAINING</span>
                </div>
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <label 
                      key={task.id}
                      className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                    >
                      <input 
                        className="w-4 h-4 rounded border-primary/40 bg-transparent text-primary focus:ring-primary" 
                        type="checkbox"
                        checked={task.checked}
                        onChange={() => toggleTask(task.id)}
                      />
                      <span className={`text-sm font-body-md text-on-surface-variant ${task.checked ? 'line-through opacity-40' : ''}`}>
                        {task.text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Chat Messages List (from database) */}
            {messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <div 
                  key={m.id}
                  className={`flex flex-col gap-3 ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2">
                    {!isUser && (
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[14px]">
                        <span className="material-symbols-outlined text-primary text-xs" style={{ fontSize: '14px' }}>auto_awesome</span>
                      </div>
                    )}
                    <span className="text-xs font-label-caps text-on-surface-variant/50">
                      {isUser ? 'You' : 'Tera'}
                    </span>
                  </div>
                  
                  <div className={`glass-card p-5 rounded-2xl max-w-[80%] text-on-surface font-body-md text-body-md leading-relaxed ${
                    isUser 
                      ? 'rounded-tr-none border-white/5 text-on-surface-variant' 
                      : 'tera-glow rounded-tl-none border-l-4 border-l-primary/60'
                  }`}>
                    {m.content}
                  </div>
                </div>
              );
            })}

            {/* Live Interim Speech Transcription */}
            {isVoiceActive && !isPaused && isListening && voiceText && (
              <div className="flex flex-col items-end gap-3 w-full">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-label-caps text-secondary">You (Speaking...)</span>
                </div>
                <div className="glass-card p-5 rounded-2xl rounded-tr-none border border-secondary/20 text-on-surface bg-secondary/5 italic max-w-[80%] shadow-[0_0_15px_rgba(192,193,255,0.1)]">
                  {voiceText}
                </div>
              </div>
            )}

            {/* AI Thinking / Synthesizing State */}
            {loading && (
              <div className="flex items-center gap-4 text-primary/40 pl-2">
                <span className="material-symbols-outlined animate-spin text-sm">cycle</span>
                <span className="text-xs font-mono-technical">Tera is thinking...</span>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Floating Input Capsule */}
        <div className="fixed bottom-8 left-[calc(16rem+40px)] right-10 z-50">
          <div className="max-w-4xl mx-auto">
            <form 
              onSubmit={handleSendMessage}
              className="glass-card rounded-full p-2 pl-6 flex items-center gap-3 tera-glow group transition-all focus-within:ring-2 ring-primary/20"
            >
              <button 
                type="button" 
                className="text-on-surface-variant/60 hover:text-primary transition-colors"
                onClick={() => handleCreateSession()}
              >
                <span className="material-symbols-outlined">add_circle</span>
              </button>
              
              <input 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant/40 font-body-md outline-none border-0" 
                placeholder="Share your thoughts with Tera..." 
                type="text"
              />
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Voice Companion Controls Bar */}
                <div className="flex items-center gap-1.5 mr-2 pr-2 border-r border-white/10">
                  {/* Play Button */}
                  <button 
                    type="button"
                    onClick={startVoiceMode}
                    disabled={isVoiceActive && !isPaused}
                    title="Start Voice Companion"
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      isVoiceActive && !isPaused
                        ? 'bg-white/5 text-on-surface-variant/30 cursor-not-allowed' 
                        : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/35 hover:scale-105 active:scale-95'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                  </button>

                  {/* Pause Button */}
                  <button 
                    type="button"
                    onClick={pauseVoiceMode}
                    disabled={!isVoiceActive || isPaused}
                    title="Pause Voice Companion"
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      !isVoiceActive || isPaused
                        ? 'bg-white/5 text-on-surface-variant/30 cursor-not-allowed' 
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/35 hover:scale-105 active:scale-95'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">pause</span>
                  </button>

                  {/* Stop Button */}
                  <button 
                    type="button"
                    onClick={stopVoiceMode}
                    disabled={!isVoiceActive && callStatus === 'Call Ended'}
                    title="Stop Voice Companion"
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      !isVoiceActive && callStatus === 'Call Ended'
                        ? 'bg-white/5 text-on-surface-variant/30 cursor-not-allowed' 
                        : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/35 hover:scale-105 active:scale-95'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">stop</span>
                  </button>
                </div>

                {/* Voice Call Live Status Indicator */}
                {isVoiceActive && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mr-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-secondary animate-pulse' : (isSpeaking ? 'bg-tertiary animate-pulse' : 'bg-primary')}`}></div>
                    <span className="text-[10px] font-label-caps text-on-surface-variant/80 uppercase tracking-wider">
                      {isListening ? 'Listening' : (isSpeaking ? 'Speaking' : 'Live')}
                    </span>
                  </div>
                )}
                
                <button 
                  type="submit"
                  disabled={!inputValue.trim() || loading}
                  className="bg-primary hover:bg-primary-container text-on-primary w-12 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined">send</span>
                </button>
              </div>
            </form>
            
            {/* Input Capsule Footer Badges */}
            <div className="mt-3 flex justify-center gap-6">
              <span className="text-[10px] font-label-caps text-on-surface-variant/30 flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">lock</span>
                End-to-End Encrypted
              </span>
              <span className="text-[10px] font-label-caps text-on-surface-variant/30 flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                Deep Context Memory Active
              </span>
            </div>
          </div>
        </div>

        {/* Decorative Ambient Glow Orbs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary/10 rounded-full blur-[120px] pointer-events-none"></div>
      </>
    );
  };

  const renderConnectionsTab = () => {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <header className="flex justify-between items-center w-full px-10 h-20 bg-transparent z-30">
          <div>
            <h2 className="font-headline-md text-[28px] font-bold text-primary tracking-tight italic">Digital Connections</h2>
            <p className="text-on-surface-variant/50 text-xs mt-1 uppercase tracking-widest font-mono-technical">Powering Tera's Deep Memory</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-1.5 rounded-full bg-primary/5 border border-primary/20 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              <span className="text-[10px] font-bold text-primary uppercase">Bridge Active</span>
            </div>
          </div>
        </header>

        <div className="p-10 max-w-6xl mx-auto space-y-10">
          {/* Main Hero Card */}
          <section className="glass-card p-10 rounded-[3rem] relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <div className="relative z-10 max-w-2xl">
              <h3 className="text-3xl font-black text-white mb-4 leading-tight italic">Link your digital life to Tera.</h3>
              <p className="text-on-surface-variant/80 text-sm leading-relaxed mb-8">
                By connecting your accounts, Tera can help you track conversations, manage schedules, and remember details from your phone calls, emails, and social circles. 
                <span className="block mt-2 text-primary font-bold">Your data is processed locally and never leaves your PC.</span>
              </p>
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant/40">
                  <span className="material-symbols-outlined text-sm">security</span>
                  End-to-End Privacy
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant/40">
                  <span className="material-symbols-outlined text-sm">sync</span>
                  Real-time Sync
                </div>
              </div>
            </div>
            <div className="absolute right-[-5%] top-[-20%] w-80 h-80 bg-primary/20 rounded-full blur-[100px] pointer-events-none"></div>
          </section>

          {/* Connection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Google Workspace */}
            <div className={`glass-card p-8 rounded-[2.5rem] border transition-all duration-500 ${connections.google.linked ? 'border-primary/40 bg-primary/5' : 'border-white/5 hover:border-white/20'}`}>
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                  <img src="https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png" className="w-6 h-6" alt="Google" />
                </div>
                {connections.google.linked && <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-3 py-1 rounded-full border border-green-500/20">CONNECTED</span>}
              </div>
              <h4 className="text-xl font-bold text-white mb-2">Google Workspace</h4>
              <p className="text-xs text-on-surface-variant/60 mb-8 leading-relaxed">Sync Gmail, Calendar, and Drive to manage meetings and project documents.</p>
              <button 
                onClick={() => handleLinkAccount('google')}
                disabled={connections.google.linked || connections.google.loading}
                className={`w-full py-3.5 rounded-2xl text-xs font-black tracking-widest transition-all ${
                  connections.google.linked 
                    ? 'bg-white/5 text-white/40 cursor-default' 
                    : 'bg-primary text-on-primary hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/20'
                }`}
              >
                {connections.google.loading ? 'LINKING...' : (connections.google.linked ? 'ACCOUNT LINKED' : 'LINK ACCOUNT')}
              </button>
            </div>

            {/* Meta Social */}
            <div className={`glass-card p-8 rounded-[2.5rem] border transition-all duration-500 ${connections.meta.linked ? 'border-secondary/40 bg-secondary/5' : 'border-white/5 hover:border-white/20'}`}>
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary text-2xl">diversity_3</span>
                </div>
                {connections.meta.linked && <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-3 py-1 rounded-full border border-green-500/20">CONNECTED</span>}
              </div>
              <h4 className="text-xl font-bold text-white mb-2">Meta Ecosystem</h4>
              <p className="text-xs text-on-surface-variant/60 mb-8 leading-relaxed">Connect Instagram & Facebook to keep Tera updated on your social life and doston ke updates.</p>
              <button 
                onClick={() => handleLinkAccount('meta')}
                disabled={connections.meta.linked || connections.meta.loading}
                className={`w-full py-3.5 rounded-2xl text-xs font-black tracking-widest transition-all ${
                  connections.meta.linked 
                    ? 'bg-white/5 text-white/40 cursor-default' 
                    : 'bg-secondary text-on-secondary hover:scale-[1.02] active:scale-95 shadow-lg shadow-secondary/20'
                }`}
              >
                {connections.meta.loading ? 'LINKING...' : (connections.meta.linked ? 'ACCOUNT LINKED' : 'LINK ACCOUNT')}
              </button>
            </div>

            {/* Phone & SMS */}
            <div className={`glass-card p-8 rounded-[2.5rem] border transition-all duration-500 ${connections.phone.linked ? 'border-tertiary/40 bg-tertiary/5' : 'border-white/5 hover:border-white/20'}`}>
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                  <span className="material-symbols-outlined text-tertiary text-2xl">phonelink_ring</span>
                </div>
                {connections.phone.linked && <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-3 py-1 rounded-full border border-green-500/20">CONNECTED</span>}
              </div>
              <h4 className="text-xl font-bold text-white mb-2">Phone & Call Logs</h4>
              <p className="text-xs text-on-surface-variant/60 mb-8 leading-relaxed">Export call history to Tera. "Aaj maine kis se baat ki?"—Tera will know the answer.</p>
              <button 
                onClick={() => handleLinkAccount('phone')}
                disabled={connections.phone.linked || connections.phone.loading}
                className={`w-full py-3.5 rounded-2xl text-xs font-black tracking-widest transition-all ${
                  connections.phone.linked 
                    ? 'bg-white/5 text-white/40 cursor-default' 
                    : 'bg-tertiary text-on-tertiary hover:scale-[1.02] active:scale-95 shadow-lg shadow-tertiary/20'
                }`}
              >
                {connections.phone.loading ? 'LINKING...' : (connections.phone.linked ? 'ACCOUNT LINKED' : 'LINK ACCOUNT')}
              </button>
            </div>

            {/* LinkedIn Professional */}
            <div className={`glass-card p-8 rounded-[2.5rem] border transition-all duration-500 ${connections.linkedin.linked ? 'border-blue-500/40 bg-blue-500/5' : 'border-white/5 hover:border-white/20'}`}>
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400 fill-current" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </div>
                {connections.linkedin.linked && <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-3 py-1 rounded-full border border-green-500/20">CONNECTED</span>}
              </div>
              <h4 className="text-xl font-bold text-white mb-2">LinkedIn Connection</h4>
              <p className="text-xs text-on-surface-variant/60 mb-8 leading-relaxed">Connect LinkedIn to automate job applications, track status updates, and publish daily AI posts.</p>
              <button 
                onClick={() => handleLinkAccount('linkedin')}
                disabled={connections.linkedin.linked || connections.linkedin.loading}
                className={`w-full py-3.5 rounded-2xl text-xs font-black tracking-widest transition-all ${
                  connections.linkedin.linked 
                    ? 'bg-white/5 text-white/40 cursor-default' 
                    : 'bg-blue-600 text-white hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-500/20'
                }`}
              >
                {connections.linkedin.loading ? 'LINKING...' : (connections.linkedin.linked ? 'ACCOUNT LINKED' : 'LINK ACCOUNT')}
              </button>
            </div>

            {/* YouTube Creator */}
            <div className={`glass-card p-8 rounded-[2.5rem] border transition-all duration-500 ${connections.youtube.linked ? 'border-red-500/40 bg-red-500/5' : 'border-white/5 hover:border-white/20'}`}>
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-500 text-2xl">video_library</span>
                </div>
                {connections.youtube.linked && <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-3 py-1 rounded-full border border-green-500/20">CONNECTED</span>}
              </div>
              <h4 className="text-xl font-bold text-white mb-2">YouTube Center</h4>
              <p className="text-xs text-on-surface-variant/60 mb-8 leading-relaxed">Connect YouTube to publish videos, track viewer feedback, and analyze channel metrics.</p>
              <button 
                onClick={() => handleLinkAccount('youtube')}
                disabled={connections.youtube.linked || connections.youtube.loading}
                className={`w-full py-3.5 rounded-2xl text-xs font-black tracking-widest transition-all ${
                  connections.youtube.linked 
                    ? 'bg-white/5 text-white/40 cursor-default' 
                    : 'bg-red-600 text-white hover:scale-[1.02] active:scale-95 shadow-lg shadow-red-500/20'
                }`}
              >
                {connections.youtube.loading ? 'LINKING...' : (connections.youtube.linked ? 'ACCOUNT LINKED' : 'LINK ACCOUNT')}
              </button>
            </div>

            {/* Microsoft Workspace */}
            <div className={`glass-card p-8 rounded-[2.5rem] border transition-all duration-500 ${connections.microsoft.linked ? 'border-sky-500/40 bg-sky-500/5' : 'border-white/5 hover:border-white/20'}`}>
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sky-400 text-2xl">terminal</span>
                </div>
                {connections.microsoft.linked && <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-3 py-1 rounded-full border border-green-500/20">CONNECTED</span>}
              </div>
              <h4 className="text-xl font-bold text-white mb-2">Microsoft 365</h4>
              <p className="text-xs text-on-surface-variant/60 mb-8 leading-relaxed">Sync Outlook emails, Calendar meetings, and OneDrive docs directly to Tera.</p>
              <button 
                onClick={() => handleLinkAccount('microsoft')}
                disabled={connections.microsoft.linked || connections.microsoft.loading}
                className={`w-full py-3.5 rounded-2xl text-xs font-black tracking-widest transition-all ${
                  connections.microsoft.linked 
                    ? 'bg-white/5 text-white/40 cursor-default' 
                    : 'bg-sky-600 text-white hover:scale-[1.02] active:scale-95 shadow-lg shadow-sky-500/20'
                }`}
              >
                {connections.microsoft.loading ? 'LINKING...' : (connections.microsoft.linked ? 'ACCOUNT LINKED' : 'LINK ACCOUNT')}
              </button>
            </div>

            {/* GitHub developer */}
            <div className={`glass-card p-8 rounded-[2.5rem] border transition-all duration-500 ${connections.github && connections.github.linked ? 'border-primary/40 bg-primary/5' : 'border-white/5 hover:border-white/20'}`}>
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-2xl">developer_mode</span>
                </div>
                {connections.github && connections.github.linked && <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-3 py-1 rounded-full border border-green-500/20">CONNECTED</span>}
              </div>
              <h4 className="text-xl font-bold text-white mb-2">GitHub Center</h4>
              <p className="text-xs text-on-surface-variant/60 mb-8 leading-relaxed">Connect GitHub to manage code repositories, track pull requests, and audit commit activities.</p>
              <button 
                onClick={() => handleLinkAccount('github')}
                disabled={connections.github && (connections.github.linked || connections.github.loading)}
                className={`w-full py-3.5 rounded-2xl text-xs font-black tracking-widest transition-all ${
                  connections.github && connections.github.linked 
                    ? 'bg-white/5 text-white/40 cursor-default' 
                    : 'bg-primary text-white hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/20'
                }`}
              >
                {connections.github && connections.github.loading ? 'LINKING...' : (connections.github && connections.github.linked ? 'ACCOUNT LINKED' : 'LINK ACCOUNT')}
              </button>
            </div>

          </div>

          {/* Deep Insight Note */}
          <div className="p-8 rounded-[2rem] bg-white/2 border border-white/5 flex items-center gap-6">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary">info</span>
            </div>
            <p className="text-xs text-on-surface-variant/50 leading-relaxed italic">
              "When you link your phone logs, I can remember your conversations better. I'll summarize your calls and store the key takeaways in our shared memory." 
              <span className="block mt-1 font-bold">— Tera Reflection</span>
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderHomeTab = () => {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Top App Bar */}
        <header className="flex justify-between items-center w-full px-10 h-16 bg-transparent z-30">
          <div className="flex items-center gap-4">
            <span className="font-headline-md text-headline-md text-primary text-[24px] font-semibold">Dashboard</span>
          </div>
          <div className="flex items-center gap-6">
            <button className="material-symbols-outlined text-on-surface-variant hover:opacity-80 transition-opacity">notifications</button>
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20">
              <img 
                alt="User Avatar" 
                className="w-full h-full object-cover" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDswykIKSPyr9CUaZ5rC6vHv303aFYM8YzDbc2FPrTVFK9542avAohcqDTPSQU2cqC4Gk_iSfM_Mb7JhxjuvU8RaNzov4R4E0B5iJn0lqJIeGuiTrFUnbUHKI4inM6U1jM277KXgxLA1jGaiDR2J1c9QL9TqCKvKPmsmR-ZOT8x8oaNZzt5ZmTQ5xPoJkKYbn5kCiQZvT1YJCbY3YXbVJllWuEwhLyHNYI9xtLujgRvYD9ikeY-DYxGsDmDFARjwDyImk4wcSJzn-T8"
              />
            </div>
          </div>
        </header>

        {/* Bento Grid Layout */}
        <div className="p-10 grid grid-cols-12 gap-[24px] max-w-7xl mx-auto w-full pb-20">
          {/* Hero Bento Box (8 cols) */}
          <section className="col-span-12 lg:col-span-8 glass-card rounded-[32px] p-8 relative overflow-hidden group">
            <div className="relative z-10 h-full flex flex-col justify-between min-h-[260px]">
              <div>
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-[12px] font-semibold mb-6">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  AI SANCTUARY ACTIVE
                </div>
                <h2 className="font-display-lg text-[32px] font-bold text-on-surface max-w-lg leading-tight">
                  {getDynamicGreeting()} Your mind is like a clear sky today.
                </h2>
              </div>
              <div className="flex items-center gap-6 mt-8">
                <button 
                  onClick={() => setActiveTab('chat')}
                  className="bg-primary text-on-primary px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
                >
                  Continue Reflection
                </button>
                <p className="text-on-surface-variant/60 font-mono text-[14px]">7:42 AM • Tuesday, Oct 24</p>
              </div>
            </div>
            {/* Ambient Background Glow inside section */}
            <div className="absolute right-0 bottom-0 w-48 h-48 bg-primary/10 rounded-full blur-[60px] pointer-events-none"></div>
          </section>

          {/* Current Mood Widget (4 cols) */}
          <section className="col-span-12 md:col-span-6 lg:col-span-4 glass-card rounded-[32px] p-8 flex flex-col items-center justify-center text-center">
            <span className="text-[12px] font-semibold text-on-surface-variant/60 mb-4 uppercase tracking-widest">Current Mood</span>
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-secondary/20 flex items-center justify-center mb-6 relative">
                <span className="material-symbols-outlined text-secondary text-5xl">waves</span>
                <div className="absolute inset-0 rounded-full border-2 border-secondary/30 animate-ping"></div>
              </div>
            </div>
            <h3 className="font-headline-md text-2xl font-bold text-secondary">Calm &amp; Productive</h3>
            <p className="text-on-surface-variant/70 text-sm mt-2 max-w-[200px]">Your focus flow has been consistent for 45 minutes.</p>
          </section>

          {/* Daily Progress Widget (4 cols) */}
          <section className="col-span-12 md:col-span-6 lg:col-span-4 glass-card rounded-[32px] p-8">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[12px] font-semibold text-on-surface-variant/60 uppercase">Daily Progress</span>
              <span className="text-primary font-mono text-[14px]">70%</span>
            </div>
            <div className="space-y-6">
              <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="absolute top-0 left-0 h-full bg-primary rounded-full shadow-[0_0_10px_rgba(192,193,255,0.5)]" style={{ width: '70%' }}></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-xs text-on-surface-variant/50 block">Mindfulness</span>
                  <div className="text-lg font-bold text-on-surface mt-1">12 min</div>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-xs text-on-surface-variant/50 block">Journaling</span>
                  <div className="text-lg font-bold text-on-surface mt-1">3 entries</div>
                </div>
              </div>
            </div>
          </section>

          {/* Journal Entry Prompt (8 cols) */}
          <section className="col-span-12 lg:col-span-8 glass-card rounded-[32px] p-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8">
              <span className="material-symbols-outlined text-tertiary text-4xl opacity-40">edit_note</span>
            </div>
            <div className="max-w-xl">
              <h3 className="font-headline-md text-2xl font-semibold text-on-surface mb-2">Daily Reflection</h3>
              <p className="text-on-surface-variant mb-6 text-sm">What is one thing that made you smile today, even if it was just for a second?</p>
              <div className="relative group">
                <textarea 
                  value={homeJournal}
                  onChange={(e) => setHomeJournal(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-on-surface focus:outline-none focus:ring-2 focus:ring-tertiary/50 transition-all min-h-[140px] placeholder:text-on-surface-variant/30 text-sm" 
                  placeholder="Type your thoughts here..."
                ></textarea>
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <button 
                    onClick={handleSaveJournal}
                    className="bg-tertiary/20 text-tertiary hover:bg-tertiary hover:text-on-tertiary px-6 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
                  >
                    {journalSaved ? 'Saved! ✓' : 'Save Reflection'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  };

  const renderReflectionsTab = () => {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Top Header Bar */}
        <header className="flex justify-between items-center w-full px-10 h-16 bg-transparent z-30">
          <div>
            <h2 className="font-headline-md text-[24px] font-semibold text-primary">Untangling</h2>
            <p className="text-on-surface-variant/70 text-xs mt-0.5">Untangling the complexities of your mind.</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-on-surface-variant hover:opacity-80 transition-opacity">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-xs font-label-caps text-primary uppercase tracking-wider">AI Ready</span>
            </div>
          </div>
        </header>

        {/* Bento Grid Container */}
        <div className="p-10 grid grid-cols-12 gap-[24px] max-w-7xl mx-auto w-full pb-20">
          {/* Progress Analytics Card (4 columns) */}
          <section className="col-span-12 lg:col-span-4 glass-card p-8 rounded-3xl flex flex-col justify-between ai-glow-cyan">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-headline-md text-lg font-semibold">Untangling Progress</h3>
                <span className="material-symbols-outlined text-secondary">analytics</span>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant/80">Cognitive Clarity</span>
                    <span className="text-secondary font-bold">84%</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-secondary shadow-[0_0_12px_rgba(76,215,246,0.6)]" style={{ width: '84%' }}></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant/80">Problem Resolution</span>
                    <span className="text-primary font-bold">62%</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary shadow-[0_0_12px_rgba(192,193,255,0.6)]" style={{ width: '62%' }}></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant/80">Mental Space</span>
                    <span className="text-tertiary font-bold">45%</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-tertiary shadow-[0_0_12px_rgba(251,171,255,0.6)]" style={{ width: '45%' }}></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-white/5">
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Your cognitive load has decreased by <span className="text-secondary font-bold">12%</span> this week. Focus is intensifying around professional goal-setting.
              </p>
            </div>
          </section>

          {/* Central Insight Card (8 columns) */}
          <section className="col-span-12 lg:col-span-8 glass-card p-8 rounded-3xl relative overflow-hidden ai-glow-purple">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-tertiary/10 rounded-full blur-[100px]"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-tertiary/20 flex items-center justify-center text-tertiary">
                  <span className="material-symbols-outlined">auto_awesome</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-xl font-semibold">Core Pattern Analysis</h3>
                  <p className="text-on-surface-variant/80 text-xs">Tera Insight #42-B</p>
                </div>
              </div>
              <p className="text-[16px] leading-relaxed text-on-surface mb-8 max-w-2xl">
                "We've detected a recurring 'tangle' regarding <span className="text-tertiary font-semibold underline decoration-tertiary/30">Future Uncertainty</span>. Most of your logic-blocks are intersecting here. Suggestion: Prioritize 'Actionable Steps' over 'Possibility Mapping' for the next 48 hours."
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-on-surface-variant uppercase mb-1">Root Cause</p>
                  <p className="text-sm font-semibold">Decision Paralysis</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-on-surface-variant uppercase mb-1">Impact Level</p>
                  <p className="text-sm font-semibold text-red-400">Significant</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-on-surface-variant uppercase mb-1">Tera Recommendation</p>
                  <p className="text-sm font-semibold text-secondary">Micro-Journaling</p>
                </div>
              </div>
            </div>
          </section>

          {/* Individual Uljhan Cards */}
          <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[24px]">
            {/* Card 1 */}
            <div className="glass-card p-6 rounded-3xl flex flex-col justify-between group">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-[10px] font-semibold uppercase tracking-wider border border-secondary/20">Analysis</span>
                  <button className="text-on-surface-variant/50 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </div>
                <h4 className="font-headline-md text-[18px] font-semibold mb-2">Project X Deadline</h4>
                <p className="text-xs text-on-surface-variant/70 mb-6 leading-relaxed">Anxiety surrounding the final delivery phase and resource allocation.</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant/60">Complexity</span>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(76,215,246,0.8)]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(76,215,246,0.8)]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(76,215,246,0.8)]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
                  </div>
                </div>
                <button 
                  onClick={() => handleCreateSession('Project X Deadline')}
                  className="w-full py-2.5 rounded-xl border border-white/10 text-xs font-semibold hover:bg-white/5 transition-colors"
                >
                  Untangle Now
                </button>
              </div>
            </div>

            {/* Card 2 */}
            <div className="glass-card p-6 rounded-3xl flex flex-col justify-between group">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="px-3 py-1 rounded-full bg-tertiary/10 text-tertiary text-[10px] font-semibold uppercase tracking-wider border border-tertiary/20">Processing</span>
                  <button className="text-on-surface-variant/50 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </div>
                <h4 className="font-headline-md text-[18px] font-semibold mb-2">Social Friction</h4>
                <p className="text-xs text-on-surface-variant/70 mb-6 leading-relaxed">Interpreting recent dialogue with the lead developer regarding team culture.</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant/60">Complexity</span>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-tertiary shadow-[0_0_8px_rgba(251,171,255,0.8)]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-tertiary shadow-[0_0_8px_rgba(251,171,255,0.8)]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
                  </div>
                </div>
                <button 
                  onClick={() => handleCreateSession('Social Friction')}
                  className="w-full py-2.5 rounded-xl border border-white/10 text-xs font-semibold hover:bg-white/5 transition-colors"
                >
                  Untangle Now
                </button>
              </div>
            </div>

            {/* Card 3 */}
            <div className="glass-card p-6 rounded-3xl flex flex-col justify-between group">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider border border-primary/20">Resolved</span>
                  <button className="text-on-surface-variant/50 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </div>
                <h4 className="font-headline-md text-[18px] font-semibold mb-2">Health Routine</h4>
                <p className="text-xs text-on-surface-variant/70 mb-6 leading-relaxed">Maintaining daily meditation consistency during stressful weeks.</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant/60">Complexity</span>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(192,193,255,0.8)]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
                  </div>
                </div>
                <button 
                  onClick={() => handleCreateSession('Health Routine')}
                  className="w-full py-2.5 rounded-xl border border-white/10 text-xs font-semibold hover:bg-white/5 transition-colors"
                >
                  View Log
                </button>
              </div>
            </div>

            {/* Card 4 */}
            <div className="glass-card p-6 rounded-3xl flex flex-col justify-between group">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-[10px] font-semibold uppercase tracking-wider border border-secondary/20">New</span>
                  <button className="text-on-surface-variant/50 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </div>
                <h4 className="font-headline-md text-[18px] font-semibold mb-2">Skill Upgrade</h4>
                <p className="text-xs text-on-surface-variant/70 mb-6 leading-relaxed">Learning React and Node fullstack architecture for project delivery.</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant/60">Complexity</span>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(76,215,246,0.8)]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(76,215,246,0.8)]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(76,215,246,0.8)]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(76,215,246,0.8)]"></div>
                  </div>
                </div>
                <button 
                  onClick={() => handleCreateSession('Skill Upgrade')}
                  className="w-full py-2.5 rounded-xl border border-white/10 text-xs font-semibold hover:bg-white/5 transition-colors"
                >
                  Untangle Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAssistantTab = () => {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Top App Bar */}
        <header className="flex justify-between items-center w-full px-10 h-16 bg-transparent z-30">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">auto_awesome</span>
            <h2 className="font-headline-md text-[24px] font-semibold text-primary">My Assistant</h2>
          </div>
          <div className="flex items-center gap-6">
            <button className="text-on-surface-variant hover:opacity-80 transition-opacity">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-surface-container overflow-hidden">
              <img 
                alt="User Avatar" 
                className="w-full h-full object-cover" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDswykIKSPyr9CUaZ5rC6vHv303aFYM8YzDbc2FPrTVFK9542avAohcqDTPSQU2cqC4Gk_iSfM_Mb7JhxjuvU8RaNzov4R4E0B5iJn0lqJIeGuiTrFUnbUHKI4inM6U1jM277KXgxLA1jGaiDR2J1c9QL9TqCKvKPmsmR-ZOT8x8oaNZzt5ZmTQ5xPoJkKYbn5kCiQZvT1YJCbY3YXbVJllWuEwhLyHNYI9xtLujgRvYD9ikeY-DYxGsDmDFARjwDyImk4wcSJzn-T8"
              />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <section className="p-10 pt-4 max-w-7xl mx-auto w-full pb-20">
          {/* Header Context */}
          <div className="mb-10">
            <p className="font-mono text-primary uppercase text-xs mb-2 tracking-widest">Daily Overview</p>
            <h3 className="font-display-lg text-[32px] font-bold text-on-surface">{getDynamicGreeting()}</h3>
            <p className="text-on-surface-variant/80 text-sm max-w-2xl mt-3 leading-relaxed">
              Your sanctuary is optimized for focus today. I've prepared your agenda and balanced your cognitive load.
            </p>
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-12 gap-[24px]">
            {/* Today's Focus Card (Large Widget) */}
            <div className="col-span-12 lg:col-span-8 glass-card rounded-3xl p-8 flex flex-col justify-between overflow-hidden relative min-h-[360px] ai-glow-purple">
              <div className="absolute top-0 right-0 p-8">
                <span className="material-symbols-outlined text-primary/10 text-8xl">lightbulb</span>
              </div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full mb-6">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  <span className="text-xs font-semibold">Priority Focus</span>
                </div>
                <h4 className="font-headline-md text-3xl font-bold text-on-surface mb-4 leading-tight">
                  Finalize the 'Sanctuary' UI Framework
                </h4>
                <p className="text-on-surface-variant/70 text-sm max-w-md leading-relaxed">
                  Collaborative session with the design team at 2:00 PM. AI research insights are ready for review.
                </p>
              </div>
              <div className="flex items-center gap-4 mt-8 relative z-10">
                <button 
                  onClick={() => handleCreateSession("UI Framework Discussion")}
                  className="px-8 py-3 bg-primary text-on-primary font-bold rounded-xl hover:shadow-[0_0_20px_rgba(192,193,255,0.4)] transition-all active:scale-95"
                >
                  Start Session
                </button>
                <button className="px-6 py-3 border border-white/10 rounded-xl hover:bg-white/5 transition-all text-xs font-semibold">
                  View Resources
                </button>
              </div>
            </div>

            {/* Productivity Score (Glowing Ring) */}
            <div className="col-span-12 lg:col-span-4 glass-card rounded-3xl p-8 flex flex-col items-center justify-center text-center min-h-[360px] ai-glow-cyan relative overflow-hidden">
              <div className="relative w-40 h-40 flex items-center justify-center">
                {/* Progress Ring SVG */}
                <svg className="w-full h-full -rotate-90">
                  <circle className="text-white/5" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor" strokeWidth="8"></circle>
                  <circle className="text-secondary drop-shadow-[0_0_10px_rgba(76,215,246,0.6)]" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor" stroke-dasharray="440" stroke-dashoffset="110" stroke-width="8"></circle>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-on-surface">82</span>
                  <span className="text-xs font-semibold text-on-surface-variant/60 uppercase tracking-widest mt-0.5">Flow Score</span>
                </div>
                <div className="absolute inset-0 rounded-full bg-secondary/5 blur-2xl animate-pulse"></div>
              </div>
              <div className="mt-6">
                <p className="text-on-surface font-semibold">Peak Performance</p>
                <p className="text-on-surface-variant/70 text-xs mt-1">You are 15% more focused than yesterday.</p>
              </div>
            </div>

            {/* To-Do List Card */}
            <div className="col-span-12 lg:col-span-6 glass-card rounded-3xl p-8 flex flex-col justify-between min-h-[360px]">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h4 className="font-headline-md text-lg font-bold">Daily Rituals</h4>
                  <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">{remainingAssistantTasks} REMAINING</span>
                </div>
                <div className="space-y-4 max-h-[180px] overflow-y-auto custom-scrollbar pr-2">
                  {assistantTasks.map((t) => (
                    <label key={t.id} className="flex items-center gap-4 group cursor-pointer">
                      <div className="relative flex-shrink-0">
                        <input 
                          type="checkbox" 
                          className="peer hidden" 
                          checked={t.checked} 
                          onChange={() => toggleAssistantTask(t.id)} 
                        />
                        <div className="w-6 h-6 border-2 border-primary/30 rounded-lg peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                          <span className="material-symbols-outlined text-on-primary text-sm peer-checked:block hidden" style={{ fontSize: '16px', fontWeight: 'bold' }}>check</span>
                        </div>
                      </div>
                      <span className={`text-sm transition-all ${t.checked ? 'text-on-surface-variant/50 line-through' : 'text-on-surface group-hover:text-primary'}`}>
                        {t.text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <button 
                onClick={handleAddAssistantTask}
                className="mt-6 flex items-center gap-2 text-primary font-semibold text-sm hover:opacity-80 transition-opacity justify-start w-fit"
              >
                <span className="material-symbols-outlined">add</span>
                Add Task
              </button>
            </div>

            {/* Calendar Widget */}
            <div className="col-span-12 lg:col-span-6 glass-card rounded-3xl p-8 min-h-[360px] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h4 className="font-headline-md text-lg font-bold">Agenda</h4>
                    <p className="text-xs text-on-surface-variant/50">Wednesday, Oct 24</p>
                  </div>
                  <button className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-sm">calendar_month</span>
                  </button>
                </div>
                <div className="space-y-6">
                  <div className="flex gap-4 items-start relative pl-4 border-l border-primary/40">
                    <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 bg-primary rounded-full"></div>
                    <div>
                      <p className="text-[10px] font-mono text-primary uppercase">10:00 - 11:00 AM</p>
                      <p className="text-sm font-semibold text-on-surface mt-1">Internal Sync - UI Engine</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start relative pl-4 border-l border-white/10">
                    <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 bg-white/20 rounded-full"></div>
                    <div>
                      <p className="text-[10px] font-mono text-on-surface-variant/50 uppercase">02:00 - 03:30 PM</p>
                      <p className="text-sm font-semibold text-on-surface/80 mt-1">Client Presentation</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  };

  const renderGrowthTab = () => {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <header className="flex justify-between items-center w-full px-10 h-16 bg-transparent z-30">
          <div>
            <h2 className="font-headline-md text-[24px] font-semibold text-primary">Growth Hub</h2>
            <p className="text-on-surface-variant/70 text-xs mt-0.5">Track your long-term goals and cognitive evolution.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-xs font-label-caps text-primary uppercase tracking-wider">Growth Mode</span>
            </div>
          </div>
        </header>

        <div className="p-10 grid grid-cols-12 gap-[24px] max-w-7xl mx-auto w-full pb-20">
          {/* Main Goal Progress Card */}
          <section className="col-span-12 lg:col-span-8 glass-card p-8 rounded-3xl relative overflow-hidden ai-glow-purple">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-tertiary/20 flex items-center justify-center text-tertiary">
                  <span className="material-symbols-outlined">insights</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-xl font-semibold">Active Development: Fullstack Mastery</h3>
                  <p className="text-on-surface-variant/80 text-xs">Target completion: July 2026</p>
                </div>
              </div>
              <p className="text-sm text-on-surface-variant/80 mb-6 leading-relaxed">
                You've completed 75% of your React & Node fullstack architectural learnings. The next milestone is deploying the PostgreSQL container and optimizing Sequelize transaction logs.
              </p>
              <div className="space-y-4">
                <div className="flex justify-between text-xs uppercase tracking-wider text-on-surface-variant/60">
                  <span>Progress Milestone</span>
                  <span>75% Completed</span>
                </div>
                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-tertiary shadow-[0_0_12px_rgba(251,171,255,0.6)]" style={{ width: '75%' }}></div>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Metrics */}
          <section className="col-span-12 lg:col-span-4 glass-card p-8 rounded-3xl flex flex-col justify-between ai-glow-cyan">
            <div>
              <h3 className="font-headline-md text-lg font-semibold mb-6 flex items-center justify-between">
                <span>Growth Score</span>
                <span className="material-symbols-outlined text-secondary">trending_up</span>
              </h3>
              <div className="text-center py-4">
                <p className="text-5xl font-bold text-secondary">880</p>
                <p className="text-xs text-on-surface-variant/60 mt-2">Level 4 Mind Pioneer</p>
              </div>
            </div>
            <button className="w-full py-2.5 rounded-xl border border-secondary/20 text-secondary text-xs font-semibold hover:bg-secondary/10 transition-colors">
              View Growth History
            </button>
          </section>

          {/* Sub-goals Bento Layout */}
          <div className="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-[24px]">
            <div className="glass-card p-6 rounded-3xl flex flex-col justify-between">
              <div>
                <span className="material-symbols-outlined text-primary mb-4 text-3xl">menu_book</span>
                <h4 className="font-headline-md text-base font-semibold mb-2">Cognitive Reading</h4>
                <p className="text-xs text-on-surface-variant/70 leading-relaxed">Goal: 2 books per month. Currently reading: 'Thinking, Fast and Slow'.</p>
              </div>
              <span className="text-[11px] text-primary/70 font-semibold mt-4">50% completed</span>
            </div>

            <div className="glass-card p-6 rounded-3xl flex flex-col justify-between">
              <div>
                <span className="material-symbols-outlined text-secondary mb-4 text-3xl">self_improvement</span>
                <h4 className="font-headline-md text-base font-semibold mb-2">Meditation Streak</h4>
                <p className="text-xs text-on-surface-variant/70 leading-relaxed">Goal: 15 minutes daily. Current streak: 12 days continuous.</p>
              </div>
              <span className="text-[11px] text-secondary/70 font-semibold mt-4">80% completed</span>
            </div>

            <div className="glass-card p-6 rounded-3xl flex flex-col justify-between">
              <div>
                <span className="material-symbols-outlined text-tertiary mb-4 text-3xl">fitness_center</span>
                <h4 className="font-headline-md text-base font-semibold mb-2">Physical Discipline</h4>
                <p className="text-xs text-on-surface-variant/70 leading-relaxed">Goal: 4 workouts/week. Consistency level holds high.</p>
              </div>
              <span className="text-[11px] text-tertiary/70 font-semibold mt-4">100% completed</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderHealthTab = () => {
    const handleAddRoutine = (e) => {
      e.preventDefault();
      if (!newRoutineInput.trim()) return;
      setRoutines(prev => [
        ...prev,
        { id: Date.now(), text: newRoutineInput.trim(), checked: false }
      ]);
      setNewRoutineInput('');
    };

    const toggleRoutine = (id) => {
      setRoutines(prev => prev.map(r => r.id === id ? { ...r, checked: !r.checked } : r));
    };

    const handleAddDietLog = (e) => {
      e.preventDefault();
      if (!newDietInput.trim()) return;
      setDietLogs(prev => [...prev, newDietInput.trim()]);
      setNewDietInput('');
    };

    const handleLogSickness = (e) => {
      e.preventDefault();
      if (!newSicknessInput.trim()) return;
      setHealthStatus(`Sickness Alert: ${newSicknessInput.trim()}`);
      setNewSicknessInput('');
    };

    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <header className="flex justify-between items-center w-full px-10 h-16 bg-transparent z-30">
          <div>
            <h2 className="font-headline-md text-[24px] font-semibold text-primary">Health & Wellness</h2>
            <p className="text-on-surface-variant/70 text-xs mt-0.5">Harmonizing mind, body, and daily wellness statistics.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 border border-secondary/20">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              <span className="text-xs font-label-caps text-secondary uppercase tracking-wider">Health Synchronized</span>
            </div>
          </div>
        </header>

        <div className="p-10 grid grid-cols-12 gap-[24px] max-w-7xl mx-auto w-full pb-20">
          {/* Main Focus: Breathing / Meditation */}
          <section className="col-span-12 lg:col-span-7 glass-card p-8 rounded-3xl flex flex-col justify-between relative overflow-hidden ai-glow-cyan">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-secondary text-4xl">air</span>
                <div>
                  <h3 className="font-headline-md text-xl font-semibold">Respiration Exercise</h3>
                  <p className="text-on-surface-variant/80 text-xs">Interactive box-breathing tool</p>
                </div>
              </div>
              <p className="text-sm text-on-surface-variant/80 leading-relaxed mb-8">
                Perform a 5-minute breathing session to restore focus and reduce cognitive load. Tera AI will dynamically monitor heart rate variability predictions.
              </p>
            </div>
            <button className="w-full lg:w-max px-8 py-3 bg-secondary text-on-secondary font-bold rounded-xl hover:shadow-[0_0_20px_rgba(76,215,246,0.4)] transition-all active:scale-95">
              Start Session (5m)
            </button>
          </section>

          {/* Quick Metrics grid */}
          <div className="col-span-12 lg:col-span-5 grid grid-cols-2 gap-4">
            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
              <span className="material-symbols-outlined text-secondary text-2xl">bedtime</span>
              <div>
                <p className="text-xs text-on-surface-variant/60 uppercase">Sleep Quality</p>
                <p className="text-2xl font-bold">7.5 hrs</p>
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
              <span className="material-symbols-outlined text-primary text-2xl">favorite</span>
              <div>
                <p className="text-xs text-on-surface-variant/60 uppercase">Avg Pulse</p>
                <p className="text-2xl font-bold">68 BPM</p>
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
              <span className="material-symbols-outlined text-tertiary text-2xl">water_drop</span>
              <div>
                <p className="text-xs text-on-surface-variant/60 uppercase">Hydration</p>
                <p className="text-2xl font-bold">2.4 / 3 L</p>
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
              <span className="material-symbols-outlined text-secondary text-2xl">footprint</span>
              <div>
                <p className="text-xs text-on-surface-variant/60 uppercase">Daily Steps</p>
                <p className="text-2xl font-bold">8,450</p>
              </div>
            </div>
          </div>

          {/* Interactive Routine & Sickness Bento Grid (12 cols) */}
          <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-[24px]">
            {/* Daily Routine Tracker */}
            <section className="glass-card p-8 rounded-3xl ai-glow-cyan">
              <h3 className="font-headline-md text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">assignment</span>
                <span>Routine Manager</span>
              </h3>
              
              <form onSubmit={handleAddRoutine} className="flex gap-2 mb-6">
                <input 
                  type="text" 
                  value={newRoutineInput}
                  onChange={(e) => setNewRoutineInput(e.target.value)}
                  placeholder="Add routine (e.g. Eat dinner by 8 PM)"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-on-surface focus:outline-none focus:border-secondary/50"
                />
                <button type="submit" className="bg-secondary/20 hover:bg-secondary/35 text-secondary border border-secondary/30 px-4 py-2 rounded-xl text-xs font-bold transition-all">
                  Add
                </button>
              </form>

              <div className="space-y-3 max-h-52 overflow-y-auto pr-2 custom-scrollbar">
                {routines.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={r.checked}
                      onChange={() => toggleRoutine(r.id)}
                      className="w-4 h-4 rounded border-white/20 bg-transparent text-secondary focus:ring-0 cursor-pointer"
                    />
                    <span className={`text-xs ${r.checked ? 'line-through text-on-surface-variant/40' : 'text-on-surface-variant/80'}`}>{r.text}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Diet & Sickness Logger */}
            <section className="glass-card p-8 rounded-3xl ai-glow-purple flex flex-col justify-between">
              <div>
                <h3 className="font-headline-md text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary">restaurant_menu</span>
                  <span>Diet & Health Logs</span>
                </h3>

                {/* Status indicator */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/15 mb-4 text-xs">
                  <span className="text-on-surface-variant/60">Current Health State: </span>
                  <span className="font-semibold text-tertiary">{healthStatus}</span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Diet Logger Form */}
                  <form onSubmit={handleAddDietLog} className="flex gap-2">
                    <input 
                      type="text" 
                      value={newDietInput}
                      onChange={(e) => setNewDietInput(e.target.value)}
                      placeholder="Log meals (e.g. Rice, Oats)"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-on-surface focus:outline-none focus:border-tertiary/50"
                    />
                    <button type="submit" className="bg-tertiary/20 hover:bg-tertiary/35 text-tertiary border border-tertiary/30 px-3 py-2 rounded-xl text-xs font-bold transition-all">
                      Log Meal
                    </button>
                  </form>

                  {/* Sickness Logger Form */}
                  <form onSubmit={handleLogSickness} className="flex gap-2">
                    <input 
                      type="text" 
                      value={newSicknessInput}
                      onChange={(e) => setNewSicknessInput(e.target.value)}
                      placeholder="Sickness (e.g. Fever, Headache)"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-on-surface focus:outline-none focus:border-red-400/50"
                    />
                    <button type="submit" className="bg-red-500/20 hover:bg-red-500/35 text-red-400 border border-red-500/30 px-3 py-2 rounded-xl text-xs font-bold transition-all">
                      Log Sick
                    </button>
                  </form>
                </div>
              </div>

              {/* Recent Diet Logs list */}
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-[10px] text-on-surface-variant/40 uppercase mb-2">Today's Meals</p>
                <div className="space-y-1 max-h-20 overflow-y-auto custom-scrollbar">
                  {dietLogs.map((log, idx) => (
                    <p key={idx} className="text-xs text-on-surface-variant/70">• {log}</p>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  };

  const renderRelationshipTab = () => {
    const handleAddRelationshipLog = (e) => {
      e.preventDefault();
      if (!newRelationshipInput.trim()) return;
      
      const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      setRelationshipLogs(prev => [
        `${dateStr}: ${newRelationshipInput.trim()}`,
        ...prev
      ]);
      setNewRelationshipInput('');
    };

    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <header className="flex justify-between items-center w-full px-10 h-16 bg-transparent z-30">
          <div>
            <h2 className="font-headline-md text-[24px] font-semibold text-primary">Relationship Support</h2>
            <p className="text-on-surface-variant/70 text-xs mt-0.5">Nurturing interpersonal connections and resolving social blockages.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-xs font-label-caps text-primary uppercase tracking-wider">Social Synchronized</span>
            </div>
          </div>
        </header>

        <div className="p-10 grid grid-cols-12 gap-[24px] max-w-7xl mx-auto w-full pb-20">
          {/* Main Relationship Log */}
          <section className="col-span-12 lg:col-span-8 glass-card p-8 rounded-3xl relative overflow-hidden ai-glow-purple">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-tertiary text-4xl">group</span>
                <div>
                  <h3 className="font-headline-md text-xl font-semibold">Active Circle Dynamics</h3>
                  <p className="text-on-surface-variant/80 text-xs">Tera relationship support panel</p>
                </div>
              </div>
              <p className="text-sm text-on-surface-variant/80 leading-relaxed mb-6">
                You have marked 2 interactions this week with team lead and mentor. No active blockages detected. Tera suggests scheduling a coffee catch-up with the development team to keep collaboration smooth.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-xs text-on-surface-variant/60 uppercase">Team Alignment</p>
                  <p className="text-sm font-semibold text-green-400">Excellent</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-xs text-on-surface-variant/60 uppercase">Active Tangles</p>
                  <p className="text-sm font-semibold text-secondary">None</p>
                </div>
              </div>
            </div>
          </section>

          {/* Quick tips list */}
          <section className="col-span-12 lg:col-span-4 glass-card p-8 rounded-3xl flex flex-col justify-between ai-glow-cyan">
            <div>
              <h3 className="font-headline-md text-lg font-semibold mb-6 flex items-center justify-between">
                <span>Social Insights</span>
                <span className="material-symbols-outlined text-secondary">tips_and_updates</span>
              </h3>
              <ul className="space-y-4 text-xs text-on-surface-variant/80 leading-relaxed">
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Practice active listening during the UI presentation.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-secondary font-bold">•</span>
                  <span>Acknowledge feedback from lead developer proactively.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-tertiary font-bold">•</span>
                  <span>Check in with colleagues regarding team deliverables.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Interactive Relationship Talk Logger */}
          <section className="col-span-12 glass-card p-8 rounded-3xl ai-glow-purple">
            <h3 className="font-headline-md text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">forum</span>
              <span>Relationship Talk & Dynamics Log</span>
            </h3>
            
            <form onSubmit={handleAddRelationshipLog} className="flex gap-4 mb-6">
              <input 
                type="text" 
                value={newRelationshipInput}
                onChange={(e) => setNewRelationshipInput(e.target.value)}
                placeholder="Log friendship updates (e.g. Made a new friend. Unsure if they are good...)"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary/50"
              />
              <button type="submit" className="bg-primary text-on-primary font-bold px-6 py-3 rounded-xl hover:scale-105 active:scale-95 transition-transform">
                Log Dynamic
              </button>
            </form>

            <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {relationshipLogs.map((log, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <p className="text-xs text-on-surface-variant leading-relaxed">{log}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  };

  const renderVoiceTab = () => {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col justify-center items-center h-full pb-20 relative">
        <header className="flex justify-between items-center w-full px-10 h-16 bg-transparent z-30 absolute top-0">
          <div>
            <h2 className="font-headline-md text-[24px] font-semibold text-primary">Voice Companion</h2>
            <p className="text-on-surface-variant/70 text-xs mt-0.5">Always Connected With Tera</p>
          </div>
        </header>

        <div className="flex flex-col items-center justify-center space-y-10 max-w-xl text-center px-6 mt-16">
          {/* Animated Waveform / Pulsating Circle */}
          <div className="relative flex items-center justify-center min-h-[240px]">
            {isVoiceActive && (
              <>
                {/* Glowing pulse effect while Tera is speaking */}
                {isSpeaking && (
                  <div className="absolute w-64 h-64 rounded-full bg-primary/20 border-2 border-primary/30 blur-2xl animate-pulse"></div>
                )}
                {/* Listening wave blur */}
                {isListening && (
                  <div className="absolute w-56 h-56 rounded-full bg-secondary/10 border border-secondary/20 blur-xl animate-pulse"></div>
                )}
              </>
            )}
            
            <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 z-10 ${
              isVoiceActive && !isPaused
                ? (isSpeaking ? 'bg-gradient-to-tr from-tertiary to-primary shadow-[0_0_45px_rgba(251,171,255,0.5)] scale-105' : 'bg-gradient-to-tr from-primary to-secondary shadow-[0_0_45px_rgba(192,193,255,0.5)]')
                : 'bg-white/5 border border-white/10 text-on-surface-variant/40'
            }`}>
              <span className="material-symbols-outlined text-5xl">
                {isSpeaking ? 'volume_up' : (isListening ? 'mic' : 'graphic_eq')}
              </span>
            </div>
          </div>

          <div>
            <h3 className="font-display-lg text-2xl font-bold text-on-surface">
              {callStatus}
            </h3>
            <p className="text-on-surface-variant/70 text-sm mt-3 leading-relaxed">
              {isVoiceActive && !isPaused
                ? "Speak naturally. Tara will listen, answer back aloud, and automatically resume listening. Click Pause or Stop to control."
                : isPaused
                ? "Your hands-free continuous call is currently on hold. Click Play to resume talking."
                : "Start a continuous call with Tara. She will listen to you and speak back automatically without needing any clicks."}
            </p>
          </div>

          {/* Transcript Box or Wave Animation */}
          {isVoiceActive && !isPaused && (
            <div className="w-full flex flex-col items-center gap-4">
              {/* Wave Animation while listening */}
              {isListening && (
                <div className="flex items-center gap-1.5 h-12 justify-center">
                  <div className="w-1.5 bg-secondary h-8 rounded animate-bounce" style={{ animationDuration: '0.8s' }}></div>
                  <div className="w-1.5 bg-primary h-12 rounded animate-bounce" style={{ animationDuration: '0.5s', animationDelay: '0.1s' }}></div>
                  <div className="w-1.5 bg-tertiary h-10 rounded animate-bounce" style={{ animationDuration: '0.6s', animationDelay: '0.2s' }}></div>
                  <div className="w-1.5 bg-secondary h-12 rounded animate-bounce" style={{ animationDuration: '0.7s', animationDelay: '0.3s' }}></div>
                  <div className="w-1.5 bg-primary h-6 rounded animate-bounce" style={{ animationDuration: '0.9s', animationDelay: '0.4s' }}></div>
                </div>
              )}
              <div className="w-full glass-card p-4 rounded-2xl min-h-[80px] flex items-center justify-center bg-white/5 border border-white/10 max-w-md">
                <p className="text-sm italic text-on-surface/80">
                  {voiceText || (isListening ? "Waiting for you to speak..." : "Waiting...")}
                </p>
              </div>
            </div>
          )}

          {/* Voice Controls Bar */}
          <div className="flex items-center gap-6 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 shadow-2xl z-10">
            {/* Play Button */}
            <button 
              onClick={startVoiceMode}
              disabled={isVoiceActive && !isPaused}
              title="Start voice mode"
              className={`p-4 rounded-full flex items-center justify-center transition-all ${
                isVoiceActive && !isPaused
                  ? 'bg-white/5 text-on-surface-variant/30 cursor-not-allowed' 
                  : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/35 hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(74,222,128,0.2)]'
              }`}
            >
              <span className="material-symbols-outlined text-2xl">play_arrow</span>
            </button>

            {/* Pause Button */}
            <button 
              onClick={pauseVoiceMode}
              disabled={!isVoiceActive || isPaused}
              title="Pause voice mode"
              className={`p-4 rounded-full flex items-center justify-center transition-all ${
                !isVoiceActive || isPaused
                  ? 'bg-white/5 text-on-surface-variant/30 cursor-not-allowed' 
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/35 hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(251,191,36,0.2)]'
              }`}
            >
              <span className="material-symbols-outlined text-2xl">pause</span>
            </button>

            {/* Stop Button */}
            <button 
              onClick={stopVoiceMode}
              disabled={!isVoiceActive && callStatus === 'Call Ended'}
              title="Stop and reset"
              className={`p-4 rounded-full flex items-center justify-center transition-all ${
                !isVoiceActive && callStatus === 'Call Ended'
                  ? 'bg-white/5 text-on-surface-variant/30 cursor-not-allowed' 
                  : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/35 hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(248,113,113,0.2)]'
              }`}
            >
              <span className="material-symbols-outlined text-2xl">stop</span>
            </button>
          </div>

          {/* Speech Synthesis Indicator */}
          {isVoiceActive && (
            <div className="flex items-center gap-1.5 h-6">
              <div className={`w-1 bg-primary h-3 rounded ${isSpeaking || isListening ? 'animate-pulse' : ''}`}></div>
              <div className={`w-1 bg-secondary h-6 rounded ${isSpeaking || isListening ? 'animate-pulse' : ''}`} style={{ animationDelay: '0.2s' }}></div>
              <div className={`w-1 bg-tertiary h-4 rounded ${isSpeaking || isListening ? 'animate-pulse' : ''}`} style={{ animationDelay: '0.4s' }}></div>
            </div>
          )}

          {/* Daily Voice Summaries section */}
          <div className="w-full max-w-md mt-10 text-left space-y-4">
            <h4 className="text-xs font-label-caps text-on-surface-variant/40 tracking-widest uppercase border-b border-white/5 pb-2">
              Daily Voice Summaries
            </h4>
            {Object.keys(dailySummaries).length === 0 ? (
              <p className="text-xs text-on-surface-variant/40 italic">No daily summaries recorded yet.</p>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {Object.entries(dailySummaries).map(([date, summary]) => (
                  <div key={date} className="glass-card p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/20 transition-all">
                    <h5 className="text-sm font-semibold text-primary mb-2 flex items-center justify-between">
                      <span>{date} Summary</span>
                      <span className="material-symbols-outlined text-xs text-on-surface-variant/40">calendar_month</span>
                    </h5>
                    <ul className="list-disc pl-5 text-xs text-on-surface-variant/80 space-y-1">
                      {summary.split('\n').filter(line => line.trim()).map((line, idx) => (
                        <li key={idx}>{line.replace(/^\*\s*/, '').replace(/^-\s*/, '')}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen w-screen bg-surface text-on-surface overflow-y-auto p-4 select-none relative">
        {/* Decorative ambient blur blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[100px] animate-pulse delay-700"></div>

        <div className="relative w-full max-w-md bg-white/5 backdrop-blur-3xl border border-white/10 p-8 rounded-3xl shadow-2xl flex flex-col gap-6 z-10 transition-all duration-300">
          
          {/* Logo / Title */}
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="relative w-16 h-16 flex items-center justify-center rotate-45 mb-2">
              <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl"></div>
              <svg width="48" height="48" viewBox="0 0 40 40" fill="none" className="-rotate-45">
                <path d="M16 10C16 10 10 14 10 20C10 26 16 30 16 30" stroke="url(#logo_grad_1)" strokeWidth="3" strokeLinecap="round" />
                <path d="M24 10C24 10 30 14 30 20C24 26 24 30 24 30" stroke="url(#logo_grad_2)" strokeWidth="3" strokeLinecap="round" />
                <path d="M20 12V32" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="20" cy="10" r="3" fill="white" className="animate-pulse" />
                <defs>
                  <linearGradient id="logo_grad_1" x1="10" y1="10" x2="16" y2="30" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#c0c1ff" /><stop offset="1" stopColor="#8083ff" />
                  </linearGradient>
                  <linearGradient id="logo_grad_2" x1="30" y1="10" x2="24" y2="30" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#fbabff" /><stop offset="1" stopColor="#e14ef6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-[#b9beff] to-secondary bg-clip-text text-transparent">
              Tera AI Assistant
            </h1>
            <p className="text-xs text-on-surface-variant/60 font-medium">
              Apna personal, secure, aur isolated database system
            </p>
          </div>

          {authError && (
            <div className="bg-error/10 border border-error/20 text-error rounded-2xl p-4 text-xs font-semibold text-center">
              {authError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleTraditionalAuth} className="flex flex-col gap-4">
            {authMode === 'signup' && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider">Your Name</label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="e.g. Vaishnavi"
                    className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-1 ring-primary/50 outline-none transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider">Your Interests</label>
                  <textarea
                    value={authInterests}
                    onChange={(e) => setAuthInterests(e.target.value)}
                    placeholder="e.g. Agentic AI, Antigravity CLI..."
                    rows={2}
                    className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs focus:ring-1 ring-primary/50 outline-none resize-none transition-all"
                  />
                </div>
              </>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-1 ring-primary/50 outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider">Password</label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-1 ring-primary/50 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="mt-2 w-full py-3.5 bg-primary hover:bg-primary/90 text-on-primary rounded-2xl font-bold text-sm shadow-xl shadow-primary/10 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <span className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin"></span>
              ) : authMode === 'signup' ? 'Sign Up & Create DB' : 'Log In & Load DB'}
            </button>
          </form>

          {/* Social Sign In Separator */}
          <div className="flex items-center gap-4 py-2">
            <div className="h-[1px] bg-white/10 flex-1"></div>
            <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Or login with</span>
            <div className="h-[1px] bg-white/10 flex-1"></div>
          </div>

          {/* Google Sign In Containers */}
          <div className="flex flex-col gap-2">
            <div id="google-signin-btn" className="w-full flex justify-center"></div>
            
            <button
              onClick={handleMockGoogleLogin}
              type="button"
              className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-on-surface rounded-2xl font-semibold text-xs transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6c-.28 1.5-1.11 2.76-2.39 3.62v3h3.86c2.26-2.09 3.67-5.17 3.67-8.83z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.86-3c-1.08.72-2.45 1.16-4.1 1.16-3.15 0-5.81-2.13-6.76-5.01H1.28v3.1c1.97 3.92 6.01 6.66 10.72 6.66z" />
                <path fill="#FBBC05" d="M5.24 14.24c-.25-.72-.39-1.5-.39-2.3s.14-1.58.39-2.3V6.54H1.28C.46 8.17 0 10.01 0 12s.46 3.83 1.28 5.46l3.96-3.22z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.96 1.19 15.24 0 12 0 7.28 0 3.24 2.74 1.28 6.66l3.96 3.22c.95-2.88 3.61-5.13 6.76-5.13z" />
              </svg>
              Google Sign-In (Simulated Dev Mode)
            </button>
          </div>

          {/* Toggle Login/Signup */}
          <div className="text-center mt-2 text-xs">
            <span className="text-on-surface-variant/60">
              {authMode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
            </span>
            <button
              onClick={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')}
              className="text-primary hover:underline font-bold"
            >
              {authMode === 'signup' ? 'Log In' : 'Sign Up'}
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (

    <div className="flex h-screen w-screen bg-surface text-on-surface overflow-hidden">
      
      {/* Side Navigation Bar */}
      <aside className="flex flex-col h-screen fixed left-0 top-0 z-40 bg-surface/40 backdrop-blur-2xl w-64 rounded-r-xl border-r border-white/10 shadow-2xl">
        <div className="p-6 flex flex-col h-full">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-4 mb-10 px-2 py-4 group cursor-pointer relative">
            <div className="relative">
              {/* Symmetrical Nexus Icon (Meaning: AI as a reflection of your potential) */}
              <div className="relative w-12 h-12 flex items-center justify-center transition-all duration-700 group-hover:rotate-[180deg]">
                {/* Glow Background */}
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl group-hover:bg-secondary/20 transition-all duration-700"></div>
                
                {/* Custom SVG Logo: "The Reflection T" */}
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10">
                  {/* Left Reflection */}
                  <path d="M16 10C16 10 10 14 10 20C10 26 16 30 16 30" stroke="url(#logo_grad_1)" strokeWidth="3" strokeLinecap="round" className="opacity-80 group-hover:opacity-100 transition-opacity" />
                  {/* Right Reflection */}
                  <path d="M24 10C24 10 30 14 30 20C24 26 24 30 24 30" stroke="url(#logo_grad_2)" strokeWidth="3" strokeLinecap="round" className="opacity-80 group-hover:opacity-100 transition-opacity" />
                  {/* Central Pillar (Forms the T) */}
                  <path d="M20 12V32" stroke="white" strokeWidth="2.5" strokeLinecap="round" className="drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" />
                  {/* Sanctuary Core */}
                  <circle cx="20" cy="10" r="3" fill="white" className="animate-pulse shadow-[0_0_10px_white]" />
                  
                  <defs>
                    <linearGradient id="logo_grad_1" x1="10" y1="10" x2="16" y2="30" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#c0c1ff" />
                      <stop offset="1" stopColor="#8083ff" />
                    </linearGradient>
                    <linearGradient id="logo_grad_2" x1="30" y1="10" x2="24" y2="30" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#fbabff" />
                      <stop offset="1" stopColor="#e14ef6" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Status Ring */}
              <div className="absolute inset-0 border border-white/5 rounded-full scale-125 group-hover:scale-150 group-hover:opacity-0 transition-all duration-1000"></div>
            </div>
            
            <div className="flex flex-col">
              <h1 className="text-[26px] tracking-[-0.04em] font-black italic bg-clip-text text-transparent bg-gradient-to-br from-white via-primary to-secondary leading-none">
                TERA
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1 h-1 rounded-full bg-secondary animate-pulse"></span>
                <p className="text-on-surface-variant/40 text-[8px] font-mono-technical uppercase tracking-[0.4em]">
                  SANCTUARY
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar px-1">
            <button 
              onClick={() => setActiveTab('home')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all rounded-xl text-left text-xs font-medium ${
                activeTab === 'home' 
                  ? 'bg-primary/10 text-primary font-bold' 
                  : 'text-on-surface-variant/70 hover:text-on-surface hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-lg">home</span>
              <span className="font-body-md">Home</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all rounded-xl text-left text-xs font-medium ${
                activeTab === 'chat' 
                  ? 'bg-primary/10 text-primary font-bold' 
                  : 'text-on-surface-variant/70 hover:text-on-surface hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-lg">chat_bubble</span>
              <span className="font-body-md">Chat</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('reflections')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all rounded-xl text-left text-xs font-medium ${
                activeTab === 'reflections' 
                  ? 'bg-primary/10 text-primary font-bold' 
                  : 'text-on-surface-variant/70 hover:text-on-surface hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-lg">psychology</span>
              <span className="font-body-md">Untangling</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('assistant')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all rounded-xl text-left text-xs font-medium ${
                activeTab === 'assistant' 
                  ? 'bg-primary/10 text-primary font-bold' 
                  : 'text-on-surface-variant/70 hover:text-on-surface hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-lg">support_agent</span>
              <span className="font-body-md">My Assistant</span>
            </button>

            <button 
              onClick={() => setActiveTab('growth')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all rounded-xl text-left text-xs font-medium ${
                activeTab === 'growth' 
                  ? 'bg-primary/10 text-primary font-bold' 
                  : 'text-on-surface-variant/70 hover:text-on-surface hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-lg">insights</span>
              <span className="font-body-md">Growth Hub</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('health')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all rounded-xl text-left text-xs font-medium ${
                activeTab === 'health' 
                  ? 'bg-primary/10 text-primary font-bold' 
                  : 'text-on-surface-variant/70 hover:text-on-surface hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-lg">self_improvement</span>
              <span className="font-body-md">Health & Wellness</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('relationship')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all rounded-xl text-left text-xs font-medium ${
                activeTab === 'relationship' 
                  ? 'bg-primary/10 text-primary font-bold' 
                  : 'text-on-surface-variant/70 hover:text-on-surface hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-lg">groups</span>
              <span className="font-body-md">Relationship Support</span>
            </button>

            <button 
              onClick={() => setActiveTab('connections')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all rounded-xl text-left text-xs font-medium ${
                activeTab === 'connections' 
                  ? 'bg-primary/10 text-primary font-bold' 
                  : 'text-on-surface-variant/70 hover:text-on-surface hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-lg">hub</span>
              <span className="font-body-md">Digital Connections</span>
            </button>

            {/* Consolidated Session History */}
            {(activeTab === 'chat' || activeTab === 'home') && (
              <div className="mt-6 pt-6 border-t border-white/5 px-2">
                <p className="text-[10px] font-semibold text-on-surface-variant/40 mb-3 tracking-widest uppercase">Session History</p>
                {sessionsLoading ? (
                  <div className="flex justify-center py-2">
                    <span className="material-symbols-outlined animate-spin text-primary/60 text-xs">cycle</span>
                  </div>
                ) : sessions.length === 0 ? (
                  <p className="text-[11px] text-on-surface-variant/30 italic px-2">No history yet</p>
                ) : (
                  <div className="space-y-1.5 custom-scrollbar max-h-60 overflow-y-auto pr-1">
                    {sessions.map((s) => {
                      const isActive = currentSession?.id === s.id;
                      return (
                        <div 
                          key={s.id}
                          onClick={() => {
                            setCurrentSession(s);
                            if (activeTab !== 'chat') {
                              setActiveTab('chat');
                            }
                          }}
                          className={`group cursor-pointer p-2.5 rounded-xl hover:bg-white/5 transition-all flex items-center justify-between border border-transparent ${
                            isActive ? 'bg-white/5 border-white/10 text-primary' : 'text-on-surface-variant/80 hover:text-on-surface'
                          }`}
                        >
                          <div className="flex flex-col min-w-0 flex-1 pr-2">
                            <span className="text-xs font-medium truncate">{s.title}</span>
                            <span className="text-[9px] text-on-surface-variant/40 mt-0.5">
                              {formatTimeAgo(s.createdAt)}
                            </span>
                          </div>
                          <button 
                            onClick={(e) => handleDeleteSession(e, s.id)}
                            className="opacity-0 group-hover:opacity-100 text-on-surface-variant/40 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-all"
                            title="Delete session"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>
 
          {/* New Session Button */}
          <div className="mt-auto pt-4 border-t border-white/5">
            <button 
              onClick={() => handleCreateSession()}
              className="w-full bg-primary/10 hover:bg-primary/15 text-primary border border-primary/20 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              New Session
            </button>
          </div>

        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-64 flex-1 h-screen flex flex-col relative overflow-hidden">
        
        {/* Render Tab Contents */}
        {activeTab === 'chat' && renderChatTab()}
        {activeTab === 'home' && renderHomeTab()}
        {activeTab === 'reflections' && renderReflectionsTab()}
        {activeTab === 'assistant' && renderAssistantTab()}
        {activeTab === 'growth' && renderGrowthTab()}
        {activeTab === 'health' && renderHealthTab()}
        {activeTab === 'relationship' && renderRelationshipTab()}
        {activeTab === 'connections' && renderConnectionsTab()}
        {activeTab === 'voice' && renderVoiceTab()}

      </main>

    </div>
  );
}

export default App;
