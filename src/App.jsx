import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Settings, Wallet, Volume2, Database, Trash2, HelpCircle, 
  Key, RefreshCw, Layers, Award, BarChart3, AlertTriangle, Eye, EyeOff,
  Plus, MessageSquare
} from 'lucide-react';
import VoiceOrb from './components/VoiceOrb';
import ExpenseCharts from './components/ExpenseCharts';
import ExpenseList from './components/ExpenseList';
import { analyzeExpenseSentence, formatResponseSpeech } from './utils/gemini';
import './App.css';

export default function App() {
  // --- State Variables ---
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('SPENDWISE_GEMINI_KEY') || '');
  const [showKey, setShowKey] = useState(false);
  const [expenses, setExpenses] = useState(() => {
    const saved = localStorage.getItem('SPENDWISE_EXPENSES');
    return saved ? JSON.parse(saved) : [];
  });

  // UI Tabs & Manual Input
  const [activeTab, setActiveTab] = useState('voice'); // 'voice' | 'manual'
  const [manualAmount, setManualAmount] = useState('');
  const [manualCategory, setManualCategory] = useState('groceries');
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [manualNote, setManualNote] = useState('');

  // Assistant & Voice States
  const [orbState, setOrbState] = useState('idle'); // 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'
  const [recLanguage, setRecLanguage] = useState('en-US'); // 'en-US' | 'te-IN'
  const [selectedVoiceName, setSelectedVoiceName] = useState('');
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechPitch, setSpeechPitch] = useState(1.0);
  const [availableVoices, setAvailableVoices] = useState([]);
  
  // Real-time transcriptions & logs
  const [transcript, setTranscript] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [botReply, setBotReply] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // References
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const speechUtteranceRef = useRef(null);

  // --- Initialize Speech Recognition & Synthesis ---
  useEffect(() => {
    // 1. Configure Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = recLanguage;

      recognition.onstart = () => {
        setOrbState('listening');
        setTranscript('');
        setParsedData(null);
        setErrorMessage('');
      };

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setTranscript(final || interim);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setOrbState('error');
          setErrorMessage(`Speech recognition error: ${event.error}`);
        } else {
          setOrbState('idle');
        }
      };

      recognition.onend = () => {
        setOrbState((prev) => {
          // If we finished recording and have transcript, start thinking
          if (prev === 'listening') {
            return 'thinking';
          }
          return prev;
        });
      };

      recognitionRef.current = recognition;
    }

    // 2. Fetch Speech Synthesis Voices
    const loadVoices = () => {
      if (synthRef.current) {
        const voices = synthRef.current.getVoices();
        setAvailableVoices(voices);
        // Default voice selection logic
        if (voices.length > 0 && !selectedVoiceName) {
          const teVoice = voices.find(v => v.lang.includes('TE') || v.lang.includes('te'));
          const enVoice = voices.find(v => v.lang.includes('EN') || v.lang.includes('en'));
          setSelectedVoiceName(teVoice?.name || enVoice?.name || voices[0].name);
        }
      }
    };

    loadVoices();
    if (synthRef.current) {
      synthRef.current.onvoiceschanged = loadVoices;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [recLanguage]);

  // Sync expenses to local storage
  useEffect(() => {
    localStorage.setItem('SPENDWISE_EXPENSES', JSON.stringify(expenses));
  }, [expenses]);

  // Trigger Gemini Analysis when transcription stops and is ready
  useEffect(() => {
    if (orbState === 'thinking' && transcript) {
      handleAnalyzeSpeech(transcript);
    }
  }, [orbState, transcript]);

  // --- Core Speech Synthesis (TTS) Helper ---
  const speakText = async (text, forceLanguageCode = null) => {
    if (!synthRef.current) return;
    
    // Stop any active speak
    synthRef.current.cancel();
    setOrbState('speaking');

    // Telugu Translation check
    let speechText = text;
    const isTeluguInput = recLanguage === 'te-IN';
    if (isTeluguInput && apiKey) {
      try {
        speechText = await formatResponseSpeech(apiKey, text, 'te');
      } catch (err) {
        console.error("Failed to translate voice response to Telugu:", err);
      }
    }

    const utterance = new SpeechSynthesisUtterance(speechText);
    speechUtteranceRef.current = utterance;
    
    // Find selected voice object
    const voice = availableVoices.find(v => v.name === selectedVoiceName);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = isTeluguInput ? 'te-IN' : 'en-US';
    }

    utterance.rate = speechRate;
    utterance.pitch = speechPitch;

    utterance.onend = () => {
      setOrbState('idle');
    };

    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      setOrbState('idle');
    };

    synthRef.current.speak(utterance);
  };

  // --- Trigger/Stop Voice Recording ---
  const handleToggleMic = () => {
    if (!apiKey) {
      setErrorMessage("Please enter a Google Gemini API Key in Settings first.");
      setShowSettings(true);
      return;
    }

    // Stop speaking if active
    if (orbState === 'speaking') {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      setOrbState('idle');
      return;
    }

    if (orbState === 'listening') {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } else {
      setTranscript('');
      setParsedData(null);
      setErrorMessage('');
      setBotReply('');
      try {
        if (recognitionRef.current) {
          recognitionRef.current.lang = recLanguage;
          recognitionRef.current.start();
        } else {
          setErrorMessage("Speech Recognition is not supported by your current browser. Try Chrome/Edge.");
        }
      } catch (err) {
        console.error("Mic start failed", err);
      }
    }
  };

  // --- NLP & Intent Processing ---
  const handleAnalyzeSpeech = async (sentence) => {
    try {
      const data = await analyzeExpenseSentence(apiKey, sentence);
      setParsedData(data);

      let responseText = "";

      switch (data.intent) {
        case 'add_expense':
          if (data.amount) {
            const newExpense = {
              id: Date.now(),
              amount: Number(data.amount),
              category: data.category || 'others',
              date: data.date || new Date().toISOString().split('T')[0],
              note: data.note || sentence
            };
            setExpenses(prev => [newExpense, ...prev]);
            responseText = `Logged ${newExpense.amount} rupees for ${newExpense.category}.`;
          } else {
            responseText = "I heard the expense, but couldn't extract the amount. Please say it again clearly, specifying the amount.";
          }
          break;

        case 'get_summary':
          const summaryText = calculateSummaryText();
          responseText = summaryText;
          break;

        case 'delete_expense':
          responseText = "To delete an expense, please click the trash icon next to that transaction in the records list.";
          break;

        case 'clear_all':
          setExpenses([]);
          responseText = "I have cleared all your recorded expenses. Your database is now empty.";
          break;

        case 'chat':
          responseText = data.chatResponse || "Hello! Let me know if you have any questions about budgeting or saving.";
          break;

        case 'help':
          responseText = data.chatResponse || "I can track your expenses. Speak something like: 'spent 300 on food today' or Telugu 'ఈరోజు groceries కి 500 ఖర్చు'. I will record it, categorize it, and provide voice breakdowns when you ask.";
          break;

        default:
          responseText = "I couldn't classify that command. Try saying 'spent 150 on groceries' or 'give me a summary'.";
          break;
      }

      setBotReply(responseText);
      speakText(responseText);
    } catch (error) {
      console.error(error);
      setOrbState('error');
      setErrorMessage(error.message || "An error occurred during transaction processing.");
    }
  };

  // --- Summarization Helper ---
  const calculateSummaryText = () => {
    if (expenses.length === 0) {
      return "You have no recorded expenses yet.";
    }
    const total = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    
    // Group by category
    const catGroups = expenses.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount);
      return acc;
    }, {});
    
    const sorted = Object.entries(catGroups).sort((a, b) => b[1] - a[1]);
    const topCategory = sorted[0]?.[0] || 'none';
    const topAmount = sorted[0]?.[1] || 0;

    return `Your total expenses are ${total} rupees. Your highest category is ${topCategory} at ${topAmount} rupees.`;
  };

  // --- Quick CRUD Operations ---
  const handleDeleteExpense = (id) => {
    const deleted = expenses.find(e => e.id === id);
    setExpenses(prev => prev.filter(item => item.id !== id));
    
    if (deleted) {
      const confirmMsg = `Deleted transaction of ${deleted.amount} rupees for ${deleted.category}.`;
      setBotReply(confirmMsg);
      speakText(confirmMsg);
    }
  };

  const handleAddManualExpense = (e) => {
    e.preventDefault();
    if (!manualAmount || isNaN(manualAmount) || Number(manualAmount) <= 0) {
      setErrorMessage("Please enter a valid amount greater than zero.");
      return;
    }

    const newExpense = {
      id: Date.now(),
      amount: Number(manualAmount),
      category: manualCategory,
      date: manualDate || new Date().toISOString().split('T')[0],
      note: manualNote.trim() || `${manualCategory} manual log`
    };

    setExpenses(prev => [newExpense, ...prev]);

    // Reset manual form fields
    setManualAmount('');
    setManualCategory('groceries');
    setManualDate(new Date().toISOString().split('T')[0]);
    setManualNote('');
    setErrorMessage('');

    // Synthesize response feedback
    const responseText = `Added expense of ${newExpense.amount} rupees for ${newExpense.category} manually.`;
    setBotReply(responseText);
    speakText(responseText);
  };

  const handleSaveApiKey = (keyInput) => {
    const trimmed = keyInput.trim();
    localStorage.setItem('SPENDWISE_GEMINI_KEY', trimmed);
    setApiKey(trimmed);
    setErrorMessage('');
  };

  const handleClearApiKey = () => {
    localStorage.removeItem('SPENDWISE_GEMINI_KEY');
    setApiKey('');
    setParsedData(null);
  };

  // Compute period-based summaries
  const getPeriodStats = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Define 7 days ago limit
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Define start of current calendar month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const spentToday = expenses
      .filter(e => e.date === todayStr)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const spentThisWeek = expenses
      .filter(e => {
        if (!e.date) return false;
        const d = new Date(e.date);
        return d >= sevenDaysAgo && d <= now;
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const spentThisMonth = expenses
      .filter(e => {
        if (!e.date) return false;
        const d = new Date(e.date);
        return d >= firstDayOfMonth && d <= now;
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return { spentToday, spentThisWeek, spentThisMonth };
  };

  const { spentToday, spentThisWeek, spentThisMonth } = getPeriodStats();
  const categoriesCount = new Set(expenses.map(e => e.category)).size;

  return (
    <div className="app-layout">
      {/* 1. Header Navigation */}
      <header className="app-header glass-panel">
        <div className="header-brand">
          <div className="logo-glow">
            <Wallet className="text-primary" size={24} />
          </div>
          <h1>Spend<span className="text-gradient">Wise</span></h1>
          <span className="beta-tag">VOICE AI</span>
        </div>

        {/* Global Summary Statistics widgets - period-based summaries */}
        <div className="header-stats">
          <div className="stat-widget">
            <span className="stat-label">Spent Today</span>
            <span className="stat-value text-glow">₹{spentToday.toLocaleString()}</span>
          </div>
          <div className="stat-widget border-left">
            <span className="stat-label">This Week</span>
            <span className="stat-value text-glow">₹{spentThisWeek.toLocaleString()}</span>
          </div>
          <div className="stat-widget border-left">
            <span className="stat-label">This Month</span>
            <span className="stat-value text-glow">₹{spentThisMonth.toLocaleString()}</span>
          </div>
        </div>

        <button 
          onClick={() => setShowSettings(!showSettings)} 
          className={`btn-settings ${showSettings ? 'active' : ''}`}
          aria-label="Toggle Settings Sidebar"
        >
          <Settings size={20} />
        </button>
      </header>

      {/* 2. Main Content Grid */}
      <div className="app-body">
        
        {/* Main Dashboard Panel */}
        <main className="dashboard-content">
          
          {/* Left Column: Voice Control & Manual Hub */}
          <section className="dashboard-column voice-hub">
            <div className="glass-panel voice-console-card">
              
              {/* Sliding Tab Switcher */}
              <div className="card-tabs border-bottom">
                <button 
                  onClick={() => {
                    setActiveTab('voice');
                    setErrorMessage('');
                  }} 
                  className={`tab-btn ${activeTab === 'voice' ? 'active' : ''}`}
                >
                  <Mic size={14} /> AI Assistant
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('manual');
                    setErrorMessage('');
                  }} 
                  className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
                >
                  <Plus size={14} /> Manual Log
                </button>
              </div>

              {activeTab === 'voice' ? (
                <>
                  {/* Animated Orb Component */}
                  <VoiceOrb 
                    state={orbState}
                    isMuted={!apiKey}
                    onToggleMic={handleToggleMic}
                    transcript={transcript}
                  />

                  {/* Error Callout */}
                  {errorMessage && (
                    <div className="error-callout">
                      <AlertTriangle size={16} />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* AI Text Response bubble */}
                  {botReply && (
                    <div className="assistant-bubble glass-panel">
                      <div className="bubble-header">
                        <Volume2 size={14} className="text-cyan" />
                        <span>Response Speech:</span>
                      </div>
                      <p className="bubble-text">{botReply}</p>
                    </div>
                  )}

                  {/* Structured JSON display */}
                  {parsedData && (
                    <div className="structured-data-display glass-panel">
                      <div className="bubble-header border-bottom">
                        <Database size={14} className="text-secondary" />
                        <span>Parsed NLP Entities:</span>
                      </div>
                      <pre className="json-pre">
                        {JSON.stringify(parsedData, null, 2)}
                      </pre>
                    </div>
                  )}
                </>
              ) : (
                /* Manual Expense Input Form */
                <form onSubmit={handleAddManualExpense} className="manual-form">
                  <div className="form-group">
                    <label className="form-label">Spent Amount (₹)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 250" 
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                      className="drawer-input"
                      required 
                      min="1"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select 
                      value={manualCategory}
                      onChange={(e) => setManualCategory(e.target.value)}
                      className="drawer-select"
                    >
                      <option value="groceries">Groceries</option>
                      <option value="food">Food & Dining</option>
                      <option value="fuel">Fuel & Transport</option>
                      <option value="bills">Utility Bills</option>
                      <option value="travel">Travel & Trips</option>
                      <option value="shopping">Shopping & Clothes</option>
                      <option value="entertainment">Entertainment & Movies</option>
                      <option value="medical">Medical & Health</option>
                      <option value="others">Others</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input 
                      type="date" 
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      className="drawer-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description / Note</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Grocery items at supermarket" 
                      value={manualNote}
                      onChange={(e) => setManualNote(e.target.value)}
                      className="drawer-input"
                    />
                  </div>

                  {errorMessage && (
                    <div className="error-callout" style={{ marginTop: '0' }}>
                      <AlertTriangle size={16} />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}>
                    <Plus size={14} /> Log Transaction
                  </button>
                </form>
              )}
            </div>
          </section>

          {/* Right Column: Analytics & Ledger */}
          <section className="dashboard-column stats-ledger">
            {/* SVG Charts */}
            <ExpenseCharts expenses={expenses} />
            
            {/* Ledger Records Table */}
            <ExpenseList 
              expenses={expenses} 
              onDeleteExpense={handleDeleteExpense} 
            />
          </section>
        </main>
      </div>

      {/* 3. Sliding Settings Drawer */}
      <aside className={`settings-drawer glass-panel ${showSettings ? 'open' : ''}`}>
        <div className="drawer-header border-bottom">
          <div className="drawer-title">
            <Settings className="text-primary" size={18} />
            <h2>Configurations</h2>
          </div>
          <button onClick={() => setShowSettings(false)} className="btn-close-drawer">×</button>
        </div>

        <div className="drawer-body">
          {/* Section A: Gemini Key */}
          <div className="drawer-section">
            <label className="section-label">
              <Key size={14} /> Gemini API Credentials
            </label>
            
            {apiKey ? (
              <div className="key-configured-status">
                <span className="key-badge">Active Connection</span>
                <button onClick={handleClearApiKey} className="btn-clear-key">Disconnect</button>
              </div>
            ) : (
              <div className="key-input-container">
                <div className="password-input-wrapper">
                  <input
                    type={showKey ? 'text' : 'password'}
                    placeholder="Enter GOOGLE_API_KEY..."
                    className="drawer-input"
                    id="gemini-key-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveApiKey(e.target.value);
                    }}
                  />
                  <button 
                    onClick={() => setShowKey(!showKey)} 
                    className="password-toggle-btn"
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="input-hint">Paste your key and press Enter. Get it free from Google AI Studio.</p>
              </div>
            )}
          </div>

          {/* Section B: Speech Recognition Settings */}
          <div className="drawer-section border-top">
            <label className="section-label">🗣️ Listening Preferences</label>
            <div className="form-group">
              <span className="form-label">Input Language</span>
              <select
                value={recLanguage}
                onChange={(e) => setRecLanguage(e.target.value)}
                className="drawer-select"
              >
                <option value="en-US">English (US)</option>
                <option value="te-IN">Telugu (తెలుగు)</option>
              </select>
              <p className="input-hint">Select the language you will speak in.</p>
            </div>
          </div>

          {/* Section C: Voice Synthesis (TTS) Settings */}
          <div className="drawer-section border-top">
            <label className="section-label">🔊 Speech Response Settings</label>
            
            <div className="form-group">
              <span className="form-label">System Voice</span>
              <select
                value={selectedVoiceName}
                onChange={(e) => setSelectedVoiceName(e.target.value)}
                className="drawer-select"
              >
                {availableVoices.length === 0 ? (
                  <option>Loading browser voices...</option>
                ) : (
                  availableVoices.map(v => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="form-group">
              <span className="form-label">Speaking Speed: {speechRate}x</span>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="drawer-slider"
              />
            </div>

            <div className="form-group">
              <span className="form-label">Speaking Pitch: {speechPitch}</span>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={speechPitch}
                onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                className="drawer-slider"
              />
            </div>
          </div>

          {/* Section D: Database Actions */}
          <div className="drawer-section border-top">
            <label className="section-label text-red">Danger Area</label>
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to clear all your saved expenses? This cannot be undone.")) {
                  setExpenses([]);
                  setParsedData(null);
                  setBotReply('');
                  speakText("Cleared all saved expenses.");
                }
              }}
              className="btn-danger-action"
            >
              <Database size={14} style={{ marginRight: '6px' }} />
              Clear Local Database
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
