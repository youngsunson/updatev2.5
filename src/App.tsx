// src/App.tsx
import { useState, useCallback, useRef } from 'react';

// ============ IMPORTS FROM UTILS ============
import { normalize } from './utils/normalize';
import { callGeminiJson } from './utils/api';
import {
  getTextFromWord,
  highlightMultipleInWord,
  highlightInWord,
  replaceInWord,
  clearHighlights
} from './utils/word';

// ============ IMPORTS FROM PROMPTS ============
import { buildTonePrompt, getToneName, TONE_OPTIONS } from './prompts/tone';
import { buildStylePrompt, STYLE_OPTIONS } from './prompts/style';
import {
  buildMainPrompt,
  DOC_TYPE_CONFIG,
  getDocTypeLabel,
  DocType
} from './prompts/core';

// ============ TYPE DEFINITIONS ============
export interface Correction {
  wrong: string;
  suggestions: string[];
  position?: number;
}

export interface ToneSuggestion {
  current: string;
  suggestion: string;
  reason: string;
  position?: number;
}

export interface StyleSuggestion {
  current: string;
  suggestion: string;
  type: string;
  position?: number;
}

export interface StyleMixingCorrection {
  current: string;
  suggestion: string;
  type: string;
  position?: number;
}

export interface StyleMixing {
  detected: boolean;
  recommendedStyle?: string;
  reason?: string;
  corrections?: StyleMixingCorrection[];
}

export interface PunctuationIssue {
  issue: string;
  currentSentence: string;
  correctedSentence: string;
  explanation: string;
  position?: number;
}

export interface EuphonyImprovement {
  current: string;
  suggestions: string[];
  reason: string;
  position?: number;
}

export interface ContentAnalysis {
  contentType: string;
  description?: string;
  missingElements?: string[];
  suggestions?: string[];
}

type SectionKey = 'spelling' | 'tone' | 'style' | 'mixing' | 'punctuation' | 'euphony' | 'content';
type ViewFilter = 'all' | 'spelling' | 'punctuation';

// ============ MAIN COMPONENT ============
function App() {
  // Settings State
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [selectedModel, setSelectedModel] = useState(
    localStorage.getItem('gemini_model') || 'gemini-2.5-flash'
  );
  const [docType, setDocType] = useState<DocType>(
    (localStorage.getItem('doc_type') as DocType) || 'generic'
  );

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeModal, setActiveModal] = useState<
    'none' | 'settings' | 'instructions' | 'tone' | 'style' | 'doctype' | 'mainMenu'
  >('none');

  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [collapsedSections, setCollapsedSections] = useState<Record<SectionKey, boolean>>({
    spelling: false,
    tone: false,
    style: false,
    mixing: false,
    punctuation: false,
    euphony: false,
    content: false
  });

  // Selection State
  const [selectedTone, setSelectedTone] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<'none' | 'sadhu' | 'cholito'>('none');

  // Data State
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [toneSuggestions, setToneSuggestions] = useState<ToneSuggestion[]>([]);
  const [styleSuggestions, setStyleSuggestions] = useState<StyleSuggestion[]>([]);
  const [languageStyleMixing, setLanguageStyleMixing] = useState<StyleMixing | null>(null);
  const [punctuationIssues, setPunctuationIssues] = useState<PunctuationIssue[]>([]);
  const [euphonyImprovements, setEuphonyImprovements] = useState<EuphonyImprovement[]>([]);
  const [contentAnalysis, setContentAnalysis] = useState<ContentAnalysis | null>(null);

  const [stats, setStats] = useState({ totalWords: 0, errorCount: 0, accuracy: 100 });

  // Debounce ref
  const highlightTimeoutRef = useRef<any>(null);

  // ============ HELPERS ============
  const showMessage = useCallback((text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  // Removed unused 'delay' function here

  const saveSettings = useCallback(() => {
    localStorage.setItem('gemini_api_key', apiKey);
    localStorage.setItem('gemini_model', selectedModel);
    localStorage.setItem('doc_type', docType);
    showMessage('সেটিংস সংরক্ষিত হয়েছে! ✓', 'success');
    setActiveModal('none');
  }, [apiKey, selectedModel, docType, showMessage]);

  const toggleSection = useCallback((key: SectionKey) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ============ DEBOUNCED HIGHLIGHT ============
  const handleHighlight = useCallback((text: string, color: string, position?: number) => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = setTimeout(() => {
      highlightInWord(text, color, position);
    }, 300);
  }, []);

  // ============ REPLACE HANDLER ============
  const handleReplace = useCallback(async (oldText: string, newText: string, position?: number) => {
    const success = await replaceInWord(oldText, newText, position);

    if (success) {
      const target = normalize(oldText.trim());
      const isNotMatch = (textToCheck: string) => normalize(textToCheck) !== target;

      setCorrections(prev => prev.filter(c => isNotMatch(c.wrong)));
      setToneSuggestions(prev => prev.filter(t => isNotMatch(t.current)));
      setStyleSuggestions(prev => prev.filter(s => isNotMatch(s.current)));
      setEuphonyImprovements(prev => prev.filter(e => isNotMatch(e.current)));
      setPunctuationIssues(prev => prev.filter(p => isNotMatch(p.currentSentence)));

      setLanguageStyleMixing(prev => {
        if (!prev || !prev.corrections) return prev;
        const filtered = prev.corrections.filter(c => isNotMatch(c.current));
        return filtered.length > 0 ? { ...prev, corrections: filtered } : null;
      });

      showMessage(`সংশোধিত হয়েছে ✓`, 'success');
    } else {
      showMessage(`শব্দটি ডকুমেন্টে খুঁজে পাওয়া যায়নি।`, 'error');
    }
  }, [showMessage]);

  // ============ DISMISS HANDLER ============
  const dismissSuggestion = useCallback((
    type: 'spelling' | 'tone' | 'style' | 'mixing' | 'punct' | 'euphony',
    textToDismiss: string
  ) => {
    const target = normalize(textToDismiss);
    const isNotMatch = (t: string) => normalize(t) !== target;

    switch (type) {
      case 'spelling':
        setCorrections(prev => prev.filter(c => isNotMatch(c.wrong)));
        break;
      case 'tone':
        setToneSuggestions(prev => prev.filter(t => isNotMatch(t.current)));
        break;
      case 'style':
        setStyleSuggestions(prev => prev.filter(s => isNotMatch(s.current)));
        break;
      case 'mixing':
        setLanguageStyleMixing(prev => {
          if (!prev || !prev.corrections) return prev;
          const filtered = prev.corrections.filter(c => isNotMatch(c.current));
          return filtered.length > 0 ? { ...prev, corrections: filtered } : null;
        });
        break;
      case 'punct':
        setPunctuationIssues(prev => prev.filter(p => isNotMatch(p.currentSentence)));
        break;
      case 'euphony':
        setEuphonyImprovements(prev => prev.filter(e => isNotMatch(e.current)));
        break;
    }
  }, []);

  // ============ API LOGIC (OPTIMIZED & PARALLEL) ============
  
  // 1. Main Check Helper
  const performMainCheck = async (text: string) => {
    const prompt = buildMainPrompt(text, docType);
    const result = await callGeminiJson(prompt, apiKey, selectedModel, { temperature: 0.1 });
    if (!result) return null;

    const spelling = (result.spellingErrors || []).map((e: any) => ({ ...e, position: e.position ?? 0 }));
    setCorrections(spelling);
    setPunctuationIssues((result.punctuationIssues || []).map((p: any) => ({ ...p, position: p.position ?? 0 })));
    setEuphonyImprovements((result.euphonyImprovements || []).map((e: any) => ({ ...e, position: e.position ?? 0 })));
    
    let mixing = result.languageStyleMixing || null;
    if (mixing && mixing.corrections) {
      mixing.corrections = mixing.corrections.map((c: any) => ({ ...c, position: c.position ?? 0 }));
    }
    setLanguageStyleMixing(mixing);

    // Stats
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const errorCount = spelling.length;
    setStats({
      totalWords: words,
      errorCount,
      accuracy: words > 0 ? Math.round(((words - errorCount) / words) * 100) : 100
    });

    return spelling;
  };

  // 2. Tone Check Helper
  const performToneCheck = async (text: string) => {
    const prompt = buildTonePrompt(text, selectedTone);
    const result = await callGeminiJson(prompt, apiKey, selectedModel, { temperature: 0.2 });
    if (!result) return null;

    const tones = (result.toneConversions || []).map((t: any) => ({ ...t, position: t.position ?? 0 }));
    setToneSuggestions(tones);
    return tones;
  };

  // 3. Style Check Helper
  const performStyleCheck = async (text: string) => {
    const prompt = buildStylePrompt(text, selectedStyle);
    const result = await callGeminiJson(prompt, apiKey, selectedModel, { temperature: 0.2 });
    if (!result) return null;

    const styles = (result.styleConversions || []).map((s: any) => ({ ...s, position: s.position ?? 0 }));
    setStyleSuggestions(styles);
    return styles;
  };

  // 4. Content Analysis Helper
  const analyzeContentLogic = async (text: string) => {
    const cfg = DOC_TYPE_CONFIG[docType];
    const prompt = `
Role: ${cfg.roleInstruction}
Task: Analyze the content structure briefly.

INPUT: """${text}"""

OUTPUT JSON:
{
  "contentType": "Type in Bangla (1-2 words)",
  "description": "Short description in Bangla",
  "missingElements": ["Missing element 1 in Bangla", "Missing element 2 in Bangla"],
  "suggestions": ["Suggestion 1 in Bangla"]
}
`;
    const result = await callGeminiJson(prompt, apiKey, selectedModel, { temperature: 0.4 });
    if (result) setContentAnalysis(result);
  };

  // ============ MAIN EXECUTION FUNCTION ============
  const checkSpelling = useCallback(async () => {
    if (!apiKey) {
      showMessage('অনুগ্রহ করে প্রথমে API Key দিন', 'error');
      setActiveModal('settings');
      return;
    }

    const text = await getTextFromWord();
    if (!text || text.trim().length === 0) {
      showMessage('টেক্সট নির্বাচন করুন বা কার্সার রাখুন', 'error');
      return;
    }

    setIsLoading(true);
    setLoadingText('বিশ্লেষণ করা হচ্ছে...'); 

    // Reset UI
    setCorrections([]);
    setToneSuggestions([]);
    setStyleSuggestions([]);
    setLanguageStyleMixing(null);
    setPunctuationIssues([]);
    setEuphonyImprovements([]);
    setContentAnalysis(null);
    setStats({ totalWords: 0, errorCount: 0, accuracy: 100 });
    await clearHighlights();

    try {
      // Parallel Execution with Staggered Start (Rate Limit Safe)
      const tasks: Promise<any>[] = [];

      // 1. Main Check (Starts immediately)
      tasks.push(performMainCheck(text));

      // 2. Tone Check (Starts after 200ms)
      if (selectedTone) {
        tasks.push(new Promise(resolve => setTimeout(resolve, 200)).then(() => performToneCheck(text)));
      } else {
        tasks.push(Promise.resolve([]));
      }

      // 3. Style Check (Starts after 400ms)
      if (selectedStyle !== 'none') {
        tasks.push(new Promise(resolve => setTimeout(resolve, 400)).then(() => performStyleCheck(text)));
      } else {
        tasks.push(Promise.resolve([]));
      }

      // 4. Content Analysis (Starts after 600ms)
      tasks.push(new Promise(resolve => setTimeout(resolve, 600)).then(() => analyzeContentLogic(text)));

      // Wait for all results
      const results = await Promise.all(tasks);
      
      const spellingResult = results[0] || [];
      const toneResult = results[1] || [];
      const styleResult = results[2] || [];

      // Batch Highlight
      setLoadingText('হাইলাইট করা হচ্ছে...');
      
      const highlightItems: Array<{ text: string; color: string; position?: number }> = [];
      
      spellingResult.forEach((i: Correction) => highlightItems.push({ text: i.wrong, color: '#fee2e2', position: i.position }));
      toneResult.forEach((i: ToneSuggestion) => highlightItems.push({ text: i.current, color: '#fef3c7', position: i.position }));
      styleResult.forEach((i: StyleSuggestion) => highlightItems.push({ text: i.current, color: '#ccfbf1', position: i.position }));

      if (highlightItems.length > 0) {
        await highlightMultipleInWord(highlightItems);
      }

    } catch (error: any) {
      console.error(error);
      showMessage(error?.message || 'ত্রুটি হয়েছে।', 'error');
    } finally {
      setIsLoading(false);
      setLoadingText('');
    }
  }, [apiKey, selectedModel, docType, selectedTone, selectedStyle, showMessage]);

  const shouldShowSection = (key: SectionKey) => {
    if (viewFilter === 'all') return true;
    if (viewFilter === 'spelling') return key === 'spelling';
    if (viewFilter === 'punctuation') return key === 'punctuation';
    return true;
  };

  // ============ UI RENDER ============
  return (
    <div className="app-container">
      {/* Header */}
      <div className="header-section">
        <div className="header-top">
          <button className="menu-btn header-menu-btn" onClick={() => setActiveModal('mainMenu')}>☰</button>
          <div className="app-title">
            <h1>🌟 ভাষা মিত্র</h1>
            <p>বাংলা বানান ও ব্যাকরণ পরীক্ষক</p>
          </div>
          <div className="header-spacer" />
        </div>

        <div className="toolbar">
          <div className="toolbar-top">
            <button onClick={checkSpelling} disabled={isLoading} className="btn-check">
              {isLoading ? '⏳ অপেক্ষা করুন...' : '🔍 পরীক্ষা করুন'}
            </button>
          </div>
          <div className="toolbar-bottom">
            <div className="view-filter">
              <button className={viewFilter === 'all' ? 'active' : ''} onClick={() => setViewFilter('all')}>সব</button>
              <button className={viewFilter === 'spelling' ? 'active' : ''} onClick={() => setViewFilter('spelling')}>শুধু বানান</button>
              <button className={viewFilter === 'punctuation' ? 'active' : ''} onClick={() => setViewFilter('punctuation')}>বিরামচিহ্ন</button>
            </div>
          </div>
        </div>
      </div>

      {/* Selection Tags */}
      {(selectedTone || selectedStyle !== 'none' || docType !== 'generic') && (
        <div className="selection-display">
          {selectedTone && (
            <span className="selection-tag tone-tag">
              {getToneName(selectedTone)} <button onClick={() => setSelectedTone('')}>✕</button>
            </span>
          )}
          {selectedStyle !== 'none' && (
            <span className="selection-tag style-tag">
              {selectedStyle === 'sadhu' ? '📜 সাধু' : '💬 চলিত'} <button onClick={() => setSelectedStyle('none')}>✕</button>
            </span>
          )}
          {docType && (
            <span className="selection-tag doc-type-tag">
              📂 {getDocTypeLabel(docType)} <button onClick={() => setDocType('generic')}>✕</button>
            </span>
          )}
        </div>
      )}

      {/* Content Area */}
      <div className="content-area">
        {isLoading && (
          <div className="loading-box">
            <div className="loader"></div>
            <p>{loadingText}</p>
          </div>
        )}

        {message && <div className={`message-box ${message.type}`}>{message.text}</div>}

        {!isLoading && stats.totalWords === 0 && !message && (
          <div className="empty-state">
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✨</div>
            <p>সাজেশন এখানে দেখা যাবে</p>
          </div>
        )}

        {/* Stats */}
        {stats.totalWords > 0 && (
          <div className="stats-grid">
            <div className="stat-card"><div className="val" style={{color:'#667eea'}}>{stats.totalWords}</div><div className="lbl">শব্দ</div></div>
            <div className="stat-card"><div className="val" style={{color:'#dc2626'}}>{stats.errorCount}</div><div className="lbl">ভুল</div></div>
            <div className="stat-card"><div className="val" style={{color:'#16a34a'}}>{stats.accuracy}%</div><div className="lbl">শুদ্ধতা</div></div>
          </div>
        )}

        {/* --- SECTIONS --- */}
        
        {/* Content Analysis */}
        {contentAnalysis && shouldShowSection('content') && (
          <>
            <div className="section-header">
              <h3>📋 কনটেন্ট বিশ্লেষণ</h3>
              <button className="collapse-btn" onClick={() => toggleSection('content')}>{collapsedSections.content ? '➕' : '➖'}</button>
            </div>
            {!collapsedSections.content && (
              <>
                <div className="analysis-card content-analysis">
                  <h3>{contentAnalysis.contentType}</h3>
                  <p>{contentAnalysis.description}</p>
                </div>
                {contentAnalysis.missingElements?.length ? (
                  <div className="analysis-card missing-analysis">
                    <h3>⚠️ যা যোগ করুন</h3>
                    <ul>{contentAnalysis.missingElements.map((e,i) => <li key={i}>{e}</li>)}</ul>
                  </div>
                ) : null}
              </>
            )}
          </>
        )}

        {/* Spelling */}
        {corrections.length > 0 && shouldShowSection('spelling') && (
          <>
            <div className="section-header">
              <h3>📝 বানান ভুল</h3>
              <span className="section-badge" style={{background:'#fee2e2',color:'#dc2626'}}>{corrections.length}</span>
              <button className="collapse-btn" onClick={() => toggleSection('spelling')}>{collapsedSections.spelling ? '➕' : '➖'}</button>
            </div>
            {!collapsedSections.spelling && corrections.map((c, i) => (
              <div key={i} className="suggestion-card error-card" onMouseEnter={() => handleHighlight(c.wrong, '#fee2e2', c.position)}>
                <button className="dismiss-btn" onClick={() => dismissSuggestion('spelling', c.wrong)}>✕</button>
                <div className="wrong-word">❌ {c.wrong}</div>
                {c.suggestions.map((s, j) => (
                  <button key={j} className="suggestion-btn success-btn" onClick={() => handleReplace(c.wrong, s, c.position)}>✓ {s}</button>
                ))}
              </div>
            ))}
          </>
        )}

        {/* Tone */}
        {toneSuggestions.length > 0 && shouldShowSection('tone') && (
          <>
            <div className="section-header">
              <h3>💬 টোন রূপান্তর</h3>
              <span className="section-badge" style={{background:'#fef3c7',color:'#92400e'}}>{getToneName(selectedTone)}</span>
              <button className="collapse-btn" onClick={() => toggleSection('tone')}>{collapsedSections.tone ? '➕' : '➖'}</button>
            </div>
            {!collapsedSections.tone && toneSuggestions.map((t, i) => (
              <div key={i} className="suggestion-card warning-card" onMouseEnter={() => handleHighlight(t.current, '#fef3c7', t.position)}>
                <button className="dismiss-btn" onClick={() => dismissSuggestion('tone', t.current)}>✕</button>
                <div className="wrong-word" style={{color:'#b45309'}}>💡 {t.current}</div>
                <div className="reason">{t.reason}</div>
                <button className="suggestion-btn warning-btn" onClick={() => handleReplace(t.current, t.suggestion, t.position)}>✨ {t.suggestion}</button>
              </div>
            ))}
          </>
        )}

        {/* Style */}
        {styleSuggestions.length > 0 && shouldShowSection('style') && (
          <>
            <div className="section-header">
              <h3>📝 ভাষারীতি</h3>
              <button className="collapse-btn" onClick={() => toggleSection('style')}>{collapsedSections.style ? '➕' : '➖'}</button>
            </div>
            {!collapsedSections.style && styleSuggestions.map((s, i) => (
              <div key={i} className="suggestion-card info-card" onMouseEnter={() => handleHighlight(s.current, '#ccfbf1', s.position)}>
                <button className="dismiss-btn" onClick={() => dismissSuggestion('style', s.current)}>✕</button>
                <div style={{fontWeight:600,marginBottom:4}}>🔄 {s.current}</div>
                <button className="suggestion-btn info-btn" onClick={() => handleReplace(s.current, s.suggestion, s.position)}>➜ {s.suggestion}</button>
              </div>
            ))}
          </>
        )}

        {/* Mixing (Auto) */}
        {languageStyleMixing?.detected && selectedStyle === 'none' && shouldShowSection('mixing') && (
          <>
            <div className="section-header">
              <h3>🔄 মিশ্রণ সনাক্ত</h3>
              <button className="collapse-btn" onClick={() => toggleSection('mixing')}>{collapsedSections.mixing ? '➕' : '➖'}</button>
            </div>
            {!collapsedSections.mixing && languageStyleMixing.corrections?.map((c, i) => (
              <div key={i} className="suggestion-card purple-card-light" onMouseEnter={() => handleHighlight(c.current, '#e9d5ff', c.position)}>
                <button className="dismiss-btn" onClick={() => dismissSuggestion('mixing', c.current)}>✕</button>
                <div style={{fontWeight:600,marginBottom:4}}>🔄 {c.current}</div>
                <button className="suggestion-btn purple-btn" onClick={() => handleReplace(c.current, c.suggestion, c.position)}>➜ {c.suggestion}</button>
              </div>
            ))}
          </>
        )}

        {/* Punctuation */}
        {punctuationIssues.length > 0 && shouldShowSection('punctuation') && (
          <>
            <div className="section-header">
              <h3>🔤 বিরাম চিহ্ন</h3>
              <button className="collapse-btn" onClick={() => toggleSection('punctuation')}>{collapsedSections.punctuation ? '➕' : '➖'}</button>
            </div>
            {!collapsedSections.punctuation && punctuationIssues.map((p, i) => (
              <div key={i} className="suggestion-card orange-card" onMouseEnter={() => handleHighlight(p.currentSentence, '#ffedd5')}>
                <button className="dismiss-btn" onClick={() => dismissSuggestion('punct', p.currentSentence)}>✕</button>
                <div className="wrong-word" style={{color:'#ea580c'}}>⚠️ {p.issue}</div>
                <div className="reason">{p.explanation}</div>
                <button className="suggestion-btn orange-btn" onClick={() => handleReplace(p.currentSentence, p.correctedSentence)}>✓ {p.correctedSentence}</button>
              </div>
            ))}
          </>
        )}

        {/* Euphony */}
        {euphonyImprovements.length > 0 && shouldShowSection('euphony') && (
          <>
            <div className="section-header">
              <h3>🎵 শ্রুতিমধুরতা</h3>
              <button className="collapse-btn" onClick={() => toggleSection('euphony')}>{collapsedSections.euphony ? '➕' : '➖'}</button>
            </div>
            {!collapsedSections.euphony && euphonyImprovements.map((e, i) => (
              <div key={i} className="suggestion-card" style={{borderLeft:'4px solid #db2777'}} onMouseEnter={() => handleHighlight(e.current, '#fce7f3', e.position)}>
                <button className="dismiss-btn" onClick={() => dismissSuggestion('euphony', e.current)}>✕</button>
                <div className="wrong-word" style={{color:'#db2777'}}>🎵 {e.current}</div>
                <div className="reason">{e.reason}</div>
                {e.suggestions.map((s, j) => (
                  <button key={j} className="suggestion-btn" style={{background:'#fce7f3',color:'#9f1239'}} onClick={() => handleReplace(e.current, s, e.position)}>♪ {s}</button>
                ))}
              </div>
            ))}
          </>
        )}

      </div>
      
      {/* Footer */}
      <div className="footer">
        <p>Developed by: হিমাদ্রি বিশ্বাস</p>
      </div>

      {/* ============ MODALS (Simplified for brevity) ============ */}
      
      {/* Main Menu Modal */}
      {activeModal === 'mainMenu' && (
        <div className="modal-overlay" onClick={() => setActiveModal('none')}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header menu-header"><h3>☰ মেনু</h3><button onClick={() => setActiveModal('none')}>✕</button></div>
            <div className="modal-body">
              <div className="option-item" onClick={() => setActiveModal('tone')}><div className="opt-icon">🗣️</div><div><div className="opt-title">টোন</div><div className="opt-desc">{selectedTone ? getToneName(selectedTone) : 'সেট নেই'}</div></div></div>
              <div className="option-item" onClick={() => setActiveModal('style')}><div className="opt-icon">📝</div><div><div className="opt-title">ভাষারীতি</div><div className="opt-desc">{selectedStyle === 'none' ? 'স্বয়ংক্রিয়' : selectedStyle}</div></div></div>
              <div className="option-item" onClick={() => setActiveModal('doctype')}><div className="opt-icon">📂</div><div><div className="opt-title">ডকুমেন্ট টাইপ</div><div className="opt-desc">{getDocTypeLabel(docType)}</div></div></div>
              <div className="option-item" onClick={() => setActiveModal('settings')}><div className="opt-icon">⚙️</div><div><div className="opt-title">সেটিংস</div></div></div>
              <div className="option-item" onClick={() => setActiveModal('instructions')}><div className="opt-icon">❓</div><div><div className="opt-title">নির্দেশিকা</div></div></div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {activeModal === 'settings' && (
        <div className="modal-overlay" onClick={() => setActiveModal('none')}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header settings-header"><h3>⚙️ সেটিংস</h3><button onClick={() => setActiveModal('none')}>✕</button></div>
            <div className="modal-body">
              <label>🔑 Google Gemini API Key</label>
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="API Key" />
              <label>🤖 AI Model</label>
              <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              </select>
              <button onClick={saveSettings} className="btn-primary-full">✓ সংরক্ষণ</button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions Modal */}
      {activeModal === 'instructions' && (
        <div className="modal-overlay" onClick={() => setActiveModal('none')}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header instructions-header"><h3>🎯 নির্দেশিকা</h3><button onClick={() => setActiveModal('none')}>✕</button></div>
            <div className="modal-body"><p>১. সেটিংস থেকে API Key দিন।<br/>২. টেক্সট সিলেক্ট করুন।<br/>৩. পরীক্ষা করুন বাটনে ক্লিক করুন।</p></div>
          </div>
        </div>
      )}

      {/* Tone Modal */}
      {activeModal === 'tone' && (
        <div className="modal-overlay" onClick={() => setActiveModal('none')}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header tone-header"><h3>💬 টোন</h3><button onClick={() => setActiveModal('none')}>✕</button></div>
            <div className="modal-body">
              {TONE_OPTIONS.map(opt => (
                <div key={opt.id} className={`option-item ${selectedTone === opt.id ? 'selected' : ''}`} onClick={() => { setSelectedTone(opt.id); setActiveModal('none'); }}>
                  <div className="opt-icon">{opt.icon}</div><div><div className="opt-title">{opt.title}</div><div className="opt-desc">{opt.desc}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Style Modal */}
      {activeModal === 'style' && (
        <div className="modal-overlay" onClick={() => setActiveModal('none')}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header style-header"><h3>📝 ভাষারীতি</h3><button onClick={() => setActiveModal('none')}>✕</button></div>
            <div className="modal-body">
              {STYLE_OPTIONS.map(opt => (
                <div key={opt.id} className={`option-item ${selectedStyle === opt.id ? 'selected' : ''}`} onClick={() => { setSelectedStyle(opt.id); setActiveModal('none'); }}>
                  <div className="opt-icon">{opt.icon}</div><div><div className="opt-title">{opt.title}</div><div className="opt-desc">{opt.desc}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DocType Modal */}
      {activeModal === 'doctype' && (
        <div className="modal-overlay" onClick={() => setActiveModal('none')}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header style-header"><h3>📂 ডকুমেন্ট টাইপ</h3><button onClick={() => setActiveModal('none')}>✕</button></div>
            <div className="modal-body">
              {['generic', 'academic', 'official', 'marketing', 'social'].map((dt: any) => (
                <div key={dt} className={`option-item ${docType === dt ? 'selected' : ''}`} onClick={() => { setDocType(dt); setActiveModal('none'); }}>
                  <div className="opt-icon">📂</div><div><div className="opt-title">{getDocTypeLabel(dt)}</div><div className="opt-desc">{DOC_TYPE_CONFIG[dt as DocType].description}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
