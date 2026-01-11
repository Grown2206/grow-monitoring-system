import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, AlertCircle, CheckCircle2, MessageSquare, ChevronRight, Send, Leaf } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { api } from '../utils/api';

export default function AIConsultant() {
  const { sensorData } = useSocket();
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hallo! Ich bin dein Grow-Assistent. Ich analysiere deine Sensordaten. Wie kann ich helfen?' }
  ]);
  const [analyzing, setAnalyzing] = useState(false);
  const [inputText, setInputText] = useState('');
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
    <div className="h-[calc(100vh-140px)] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg shadow-lg shadow-purple-900/20">
            <Bot className="text-white" size={24} />
          </div>
          <div>
            <h2 className="font-bold text-white">GrowBot AI</h2>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Online & Bereit
            </div>
          </div>
        </div>
        <button onClick={() => setMessages([{ role: 'ai', text: 'Hallo! Ich bin dein Grow-Assistent. Wie kann ich helfen?' }])} className="text-slate-500 hover:text-slate-300 text-xs">Chat leeren</button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50 scroll-smooth">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
            <div className={`
              max-w-[85%] md:max-w-[70%] rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-line shadow-md relative
              ${msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none ml-10' 
                : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none mr-10'}
            `}>
              {msg.role === 'ai' && <Bot size={16} className="absolute -left-8 top-0 text-slate-500" />}
              {msg.text}
            </div>
          </div>
        ))}
        
        {analyzing && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-none p-4 flex items-center gap-2 text-slate-400 text-sm">
              <Sparkles size={16} className="animate-spin text-purple-400" /> 
              <span className="typing-dots">Analysiere...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-950 border-t border-slate-800">
        {/* Quick Actions */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={analyzeSystem}
            disabled={analyzing}
            className="flex-shrink-0 flex items-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 px-3 py-1.5 rounded-lg text-xs font-medium border border-purple-500/20 transition-all"
          >
            <Sparkles size={14} /> System Check
          </button>
          <button 
            onClick={() => setInputText('Erstelle einen Düngerplan für Woche 3')}
            className="flex-shrink-0 flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-500/20 transition-all"
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
            placeholder="Stelle eine Frage an deinen Grow-Assistenten..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder:text-slate-600"
          />
          <button 
            onClick={handleSendMessage}
            disabled={!inputText.trim() || analyzing}
            className="absolute right-2 top-2 p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}