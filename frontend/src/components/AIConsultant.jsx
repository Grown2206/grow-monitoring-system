import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, AlertCircle, CheckCircle2, MessageSquare, ChevronRight, Send, Leaf } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../theme';
import { api } from '../utils/api';

export default function AIConsultant() {
  const { sensorData } = useSocket();
  const { currentTheme } = useTheme();
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hallo! Ich bin dein Grow-Assistent. Ich analysiere deine Sensordaten. Wie kann ich helfen?' }
  ]);
  const [analyzing, setAnalyzing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sendHovered, setSendHovered] = useState(false);
  const [systemCheckHovered, setSystemCheckHovered] = useState(false);
  const [duengerplanHovered, setDuengerplanHovered] = useState(false);
  const [clearHovered, setClearHovered] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Einfache Regel-basierte Analyse
  const analyzeSystem = () => {
    setAnalyzing(true);
    // Simuliere Denkpause
    setTimeout(() => {
      let analysis = [];
      const { temp, humidity, lux } = sensorData || {};

      if (temp === undefined || humidity === undefined) {
        analysis.push("⚠️ **Keine Daten:** Ich empfange momentan keine Sensordaten. Ist der ESP32 verbunden?");
      } else {
        if (temp > 28) analysis.push("🚨 **Achtung Hitze:** Die Temperatur ist mit über 28°C sehr hoch. Prüfe deine Abluft oder erhöhe den Abstand der Lampe.");
        else if (temp < 18) analysis.push("❄️ **Zu kalt:** Unter 18°C verlangsamt sich das Wachstum erheblich. Vielleicht eine Heizmatte nutzen?");
        else analysis.push("✅ **Temperatur:** Perfekt im grünen Bereich.");

        if (humidity > 70) analysis.push("💧 **Hohe Luftfeuchte:** Über 70% RLF begünstigt Schimmel in der Blüte. Lüftung hochdrehen!");
        else if (humidity < 40) analysis.push("🌵 **Zu trocken:** Unter 40% RLF. Junge Pflanzen mögen das nicht. Luftbefeuchter?");
        else analysis.push("✅ **Luftfeuchtigkeit:** Optimal.");
      }

      const response = analysis.join('\n\n');
      setMessages(prev => [...prev, { role: 'user', text: 'Analysiere mein System' }, { role: 'ai', text: response }]);
      setAnalyzing(false);
    }, 1500);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsg = inputText;
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setAnalyzing(true);

    try {
      // Hier würde man idealerweise die echte AI API aufrufen
      // const response = await api.getConsultation({ prompt: userMsg, sensorData });

      // Mock Antwort für Demo
      setTimeout(() => {
        let aiResponse = "Das ist eine interessante Frage. Als einfacher Bot kann ich darauf noch nicht spezifisch antworten, aber ich lerne noch!";

        if (userMsg.toLowerCase().includes('dünger')) {
          aiResponse = "📅 **Dünge-Empfehlung:**\nAchte in der aktuellen Phase auf ausreichend Stickstoff (N). Bei Mangelerscheinungen (gelbe Blätter unten) Dosis leicht erhöhen.";
        } else if (userMsg.toLowerCase().includes('licht')) {
          aiResponse = "💡 **Licht-Tipp:**\nIn der Wachstumsphase sind 18 Stunden Licht optimal. In der Blüte reduzierst du auf 12 Stunden.";
        }

        setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
        setAnalyzing(false);
      }, 1000);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'ai', text: "Entschuldigung, ich konnte keine Verbindung zum Server herstellen." }]);
      setAnalyzing(false);
    }
  };

  return (
    <div
      className="h-[calc(100vh-140px)] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-500"
      style={{
        backgroundColor: currentTheme.bg.card,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: currentTheme.border.default
      }}
    >

      {/* Header */}
      <div
        className="p-4 flex items-center justify-between shadow-sm z-10"
        style={{
          backgroundColor: currentTheme.bg.main,
          borderBottomWidth: 1,
          borderBottomStyle: 'solid',
          borderBottomColor: currentTheme.border.default
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg shadow-lg"
            style={{
              background: `linear-gradient(to bottom right, ${currentTheme.accent.color}, ${currentTheme.accent.dark || currentTheme.accent.color})`,
              boxShadow: `0 4px 6px -1px ${currentTheme.accent.color}33`
            }}
          >
            <Bot style={{ color: '#ffffff' }} size={24} />
          </div>
          <div>
            <h2 className="font-bold" style={{ color: currentTheme.text.primary }}>GrowBot AI</h2>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: '#34d399' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#10b981' }}></span>
              Online & Bereit
            </div>
          </div>
        </div>
        <button
          onClick={() => setMessages([{ role: 'ai', text: 'Hallo! Ich bin dein Grow-Assistent. Wie kann ich helfen?' }])}
          onMouseEnter={() => setClearHovered(true)}
          onMouseLeave={() => setClearHovered(false)}
          className="text-xs"
          style={{ color: clearHovered ? currentTheme.text.secondary : currentTheme.text.muted }}
        >
          Chat leeren
        </button>
      </div>

      {/* Chat Area */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
        style={{ backgroundColor: currentTheme.bg.card + '80' }}
      >
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
            <div
              className={`
                max-w-[85%] md:max-w-[70%] rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-line shadow-md relative
                ${msg.role === 'user' ? 'rounded-tr-none ml-10' : 'rounded-tl-none mr-10'}
              `}
              style={msg.role === 'user'
                ? { backgroundColor: currentTheme.accent.color, color: '#ffffff' }
                : {
                    backgroundColor: currentTheme.bg.hover,
                    color: currentTheme.text.primary,
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: currentTheme.border.default
                  }
              }
            >
              {msg.role === 'ai' && <Bot size={16} className="absolute -left-8 top-0" style={{ color: currentTheme.text.muted }} />}
              {msg.text}
            </div>
          </div>
        ))}

        {analyzing && (
          <div className="flex justify-start animate-pulse">
            <div
              className="rounded-2xl rounded-tl-none p-4 flex items-center gap-2 text-sm"
              style={{
                backgroundColor: currentTheme.bg.hover,
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: currentTheme.border.default,
                color: currentTheme.text.secondary
              }}
            >
              <Sparkles size={16} className="animate-spin" style={{ color: currentTheme.accent.color }} />
              <span className="typing-dots">Analysiere...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        className="p-4"
        style={{
          backgroundColor: currentTheme.bg.main,
          borderTopWidth: 1,
          borderTopStyle: 'solid',
          borderTopColor: currentTheme.border.default
        }}
      >
        {/* Quick Actions */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={analyzeSystem}
            disabled={analyzing}
            onMouseEnter={() => setSystemCheckHovered(true)}
            onMouseLeave={() => setSystemCheckHovered(false)}
            className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: systemCheckHovered ? currentTheme.accent.color + '25' : currentTheme.accent.color + '15',
              color: currentTheme.accent.light || currentTheme.accent.color,
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: currentTheme.accent.color + '30'
            }}
          >
            <Sparkles size={14} /> System Check
          </button>
          <button
            onClick={() => setInputText('Erstelle einen Düngerplan für Woche 3')}
            onMouseEnter={() => setDuengerplanHovered(true)}
            onMouseLeave={() => setDuengerplanHovered(false)}
            className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: duengerplanHovered ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.1)',
              color: '#6ee7b7',
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: 'rgba(16,185,129,0.2)'
            }}
          >
            <Leaf size={14} /> Düngerplan
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="Stelle eine Frage an deinen Grow-Assistenten..."
            className="w-full rounded-xl pl-4 pr-12 py-3 outline-none transition-all"
            style={{
              backgroundColor: currentTheme.bg.card,
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: inputFocused ? currentTheme.accent.color : currentTheme.border.default,
              color: currentTheme.text.primary,
              boxShadow: inputFocused ? `0 0 0 1px ${currentTheme.accent.color}` : 'none'
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || analyzing}
            onMouseEnter={() => setSendHovered(true)}
            onMouseLeave={() => setSendHovered(false)}
            className="absolute right-2 top-2 p-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: sendHovered && inputText.trim() && !analyzing
                ? currentTheme.accent.light || currentTheme.accent.color
                : currentTheme.accent.color,
              color: '#ffffff'
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
