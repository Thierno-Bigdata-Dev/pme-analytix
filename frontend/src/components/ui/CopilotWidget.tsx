import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, Sparkles } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
}

const KNOWLEDGE_BASE = [
  {
    keywords: ['syscohada', 'norme', 'comptabilité', 'loi'],
    response: "Le **SYSCOHADA** est le Système Comptable Ouest Africain. PME Analytix garantit que vos états financiers (Bilan, Compte de Résultat) générés ici respectent stricto sensu cette réglementation, vous évitant tout redressement fiscal ! 📝"
  },
  {
    keywords: ['wave', 'orange', 'ecobank', 'partenaire', 'banque', 'connecter'],
    response: "Nous sommes intégrés avec les principaux acteurs financiers de l'UEMOA ! 🤝\nVous pouvez lier vos comptes **Wave**, **Orange Money** ou votre banque (**Ecobank**, **UBA**) directement via la section Paramètres > Intégrations API pour synchroniser vos transactions en temps réel."
  },
  {
    keywords: ['bfr', 'trésorerie', 'dso', 'optimiser', 'cash'],
    response: "💡 **Conseil Trésorerie** : Votre Besoin en Fonds de Roulement (BFR) est l'argent nécessaire pour faire tourner la PME au quotidien.\nPour l'optimiser via la plateforme : surveillez le délai de paiement client (DSO) dans l'onglet Vue Globale et utilisez nos Alertes pour relancer les factures en retard !"
  },
  {
    keywords: ['xgboost', 'score', 'ia', 'intelligence', 'prédiction', 'prophet'],
    response: "🧠 **Notre IA (XGBoost & Prophet)** analyse vos flux historiques pour anticiper vos risques de découvert (Score de Crédit) et projeter votre trésorerie à 90 jours. C'est l'outil parfait pour anticiper et convaincre votre banquier !"
  },
  {
    keywords: ['qui', 'doit', 'argent', 'impayé', 'retard', 'créance'],
    response: "🔍 **Analyse des Créances** :\nD'après vos factures récentes, voici les principaux retards :\n- **Entreprise A** : 1 250 000 FCFA (Retard 45j)\n- **Client B** : 450 000 FCFA (Retard 12j)\n\n👉 *Astuce : Vous pouvez générer une relance automatique par IA depuis la carte DSO sur votre tableau de bord.*"
  }
];

const SUGGESTIONS = [
  "Qui me doit de l'argent ?",
  "Générer mon bilan OHADA",
  "Comment connecter Wave ?",
  "Qu'est-ce que le SYSCOHADA ?"
];

export const CopilotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Proactive opening
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsOpen(true);
      setMessages([
        {
          id: '1',
          sender: 'bot',
          text: "Bonjour ! 👋 Je suis PME AI, votre Copilote expert en finance. Je peux vous guider sur l'utilisation de la plateforme, la gestion de votre trésorerie ou nos partenaires bancaires. Comment puis-je vous aider ?"
        }
      ]);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const simulateResponse = (userText: string) => {
    setIsTyping(true);
    
    // Simple NLP simulation
    const normalizedText = userText.toLowerCase();
    let botReply = "Désolé, je ne suis pas sûr de comprendre. Pouvez-vous reformuler ? Vous pouvez me poser des questions sur la gestion de trésorerie, SYSCOHADA, ou nos intégrations bancaires.";
    
    for (const entry of KNOWLEDGE_BASE) {
      if (entry.keywords.some(kw => normalizedText.includes(kw))) {
        botReply = entry.response;
        break;
      }
    }

    // Simulate thinking delay (1s to 2.5s)
    setTimeout(() => {
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'bot', text: botReply }]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1500);
  };

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    
    // Add user message
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text }]);
    setInputValue('');
    
    // Trigger bot
    simulateResponse(text);
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="hover-scale"
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary) 0%, #1d4ed8 100%)',
          border: 'none',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 25px rgba(59,130,246,0.3)',
          cursor: 'pointer',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          position: 'relative'
        }}
        aria-label="Ouvrir l'assistant IA"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        {!isOpen && messages.length === 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0, width: '12px', height: '12px',
            backgroundColor: 'var(--danger)', borderRadius: '50%',
            border: '2px solid #0b0f19'
          }} />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div 
          className="glass-card" 
          style={{
            position: 'absolute',
            bottom: '72px',
            right: 0,
            width: '380px',
            height: '540px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            animation: 'modal-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
        >
          {/* Header */}
          <div style={{ 
            padding: '16px 20px', 
            background: 'linear-gradient(90deg, rgba(31,41,55,0.9) 0%, rgba(17,24,39,0.95) 100%)', 
            borderBottom: '1px solid var(--card-border)', 
            display: 'flex', 
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Bot size={20} />
            </div>
            <div style={{ flexGrow: 1 }}>
              <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '10.5pt', display: 'flex', alignItems: 'center', gap: '6px' }}>
                PME AI Copilot <Sparkles size={14} color="#60a5fa" />
              </span>
              <span style={{ fontSize: '8pt', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <span style={{ width: '6px', height: '6px', background: 'var(--success)', borderRadius: '50%', display: 'inline-block' }}></span>
                Expertise Financière
              </span>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div style={{ flexGrow: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(11, 15, 25, 0.95)' }}>
            {messages.map((m) => (
              <div 
                key={m.id} 
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  background: m.sender === 'user' ? 'linear-gradient(135deg, var(--primary) 0%, #1d4ed8 100%)' : 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  border: m.sender === 'user' ? 'none' : '1px solid var(--card-border)',
                  padding: '12px 16px',
                  borderRadius: m.sender === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  maxWidth: '85%',
                  fontSize: '9.5pt',
                  lineHeight: 1.5,
                  textAlign: 'left',
                  boxShadow: m.sender === 'user' ? '0 4px 12px rgba(59,130,246,0.2)' : 'none',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {/* Basic markdown bold parser */}
                {m.text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} style={{ color: m.sender === 'user' ? '#fff' : '#60a5fa' }}>{part.slice(2, -2)}</strong>;
                  }
                  return <span key={i}>{part}</span>;
                })}
              </div>
            ))}
            
            {isTyping && (
              <div style={{
                alignSelf: 'flex-start',
                background: 'rgba(255,255,255,0.05)',
                padding: '12px 16px',
                borderRadius: '16px 16px 16px 2px',
                display: 'flex',
                gap: '4px',
                alignItems: 'center'
              }}>
                <span className="typing-dot" style={{ animationDelay: '0ms' }}></span>
                <span className="typing-dot" style={{ animationDelay: '150ms' }}></span>
                <span className="typing-dot" style={{ animationDelay: '300ms' }}></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Chips Area */}
          {!isTyping && messages.length > 0 && messages[messages.length - 1].sender === 'bot' && (
            <div style={{ padding: '0 16px 12px 16px', display: 'flex', gap: '8px', overflowX: 'auto', background: 'rgba(11, 15, 25, 0.95)' }} className="hide-scrollbar">
              {SUGGESTIONS.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(suggestion)}
                  style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: '#60a5fa',
                    padding: '6px 12px',
                    borderRadius: '100px',
                    fontSize: '8pt',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = 'var(--primary)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                    e.currentTarget.style.color = '#60a5fa';
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(inputValue); }} 
            style={{ 
              padding: '16px', 
              borderTop: '1px solid var(--card-border)', 
              background: 'rgba(31, 41, 55, 0.95)', 
              display: 'flex', 
              gap: '12px' 
            }}
          >
            <input 
              type="text" 
              placeholder="Ex: Qu'est-ce que le BFR ?"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              style={{ 
                flexGrow: 1, 
                padding: '10px 16px', 
                background: 'rgba(0,0,0,0.2)', 
                border: '1px solid var(--card-border)', 
                borderRadius: '100px', 
                color: '#f8fafc', 
                fontSize: '9.5pt',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--card-border)'}
            />
            <button 
              type="submit" 
              disabled={!inputValue.trim() || isTyping}
              style={{ 
                width: '40px', height: '40px', 
                borderRadius: '50%',
                background: inputValue.trim() ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                border: 'none', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s ease'
              }}
            >
              <Send size={18} style={{ marginLeft: '2px' }} />
            </button>
          </form>
        </div>
      )}
      
      {/* Required CSS for dots and scrollbar */}
      <style dangerouslySetInnerHTML={{__html: `
        .typing-dot {
          width: 6px; height: 6px;
          background: var(--text-secondary);
          border-radius: 50%;
          animation: typing-bounce 1.4s infinite ease-in-out both;
        }
        @keyframes typing-bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
};
