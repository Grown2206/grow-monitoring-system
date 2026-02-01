import React, { useState } from 'react';
import { FileText, Download, Loader2, X, Check, Calendar, BarChart3, Leaf } from 'lucide-react';
import { useTheme } from '../../theme';

/**
 * PDF Export Component
 * Generiert einen druckbaren/PDF-fähigen Report
 */
const PDFExport = ({ data, stats, growScore, timeRange, onClose }) => {
  const { currentTheme: theme } = useTheme();
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generatePDF = () => {
    setGenerating(true);

    // Create print-friendly content
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Grow Report - ${new Date().toLocaleDateString('de-DE')}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #1f2937;
            line-height: 1.5;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            padding-bottom: 30px;
            border-bottom: 3px solid #10b981;
            margin-bottom: 30px;
          }
          .header h1 {
            font-size: 28px;
            color: #059669;
            margin-bottom: 8px;
          }
          .header p {
            color: #6b7280;
            font-size: 14px;
          }
          .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
          }
          .stat-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 15px;
            text-align: center;
          }
          .stat-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #6b7280;
            margin-bottom: 5px;
          }
          .stat-value {
            font-size: 24px;
            font-weight: 800;
            color: #111827;
          }
          .stat-unit {
            font-size: 12px;
            color: #9ca3af;
            margin-left: 2px;
          }
          .stat-range {
            font-size: 10px;
            color: #9ca3af;
            margin-top: 5px;
          }
          .score-section {
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            border-radius: 16px;
            padding: 25px;
            text-align: center;
          }
          .score-value {
            font-size: 64px;
            font-weight: 900;
            color: #059669;
          }
          .score-label {
            font-size: 14px;
            color: #047857;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .score-breakdown {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #a7f3d0;
          }
          .breakdown-item {
            text-align: center;
          }
          .breakdown-value {
            font-size: 20px;
            font-weight: 700;
            color: #065f46;
          }
          .breakdown-label {
            font-size: 11px;
            color: #047857;
          }
          .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          .data-table th {
            background: #f3f4f6;
            padding: 10px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #e5e7eb;
          }
          .data-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #e5e7eb;
          }
          .data-table tr:nth-child(even) {
            background: #f9fafb;
          }
          .insights-list {
            list-style: none;
          }
          .insights-list li {
            padding: 12px 15px;
            background: #f0fdf4;
            border-left: 4px solid #10b981;
            margin-bottom: 10px;
            border-radius: 0 8px 8px 0;
          }
          .insights-list li.warning {
            background: #fffbeb;
            border-left-color: #f59e0b;
          }
          .insights-list li.error {
            background: #fef2f2;
            border-left-color: #ef4444;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #9ca3af;
            font-size: 11px;
          }
          @media print {
            body { padding: 20px; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🌱 Grow Monitoring Report</h1>
          <p>Zeitraum: Letzte ${timeRange} Stunden • Generiert am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')}</p>
        </div>

        ${growScore ? `
        <div class="section">
          <div class="score-section">
            <div class="score-label">Grow Score</div>
            <div class="score-value">${growScore.total}</div>
            <div class="score-breakdown">
              <div class="breakdown-item">
                <div class="breakdown-value">${growScore.breakdown?.stability || 0}/40</div>
                <div class="breakdown-label">Stabilität</div>
              </div>
              <div class="breakdown-item">
                <div class="breakdown-value">${growScore.breakdown?.range || 0}/30</div>
                <div class="breakdown-label">Optimal Range</div>
              </div>
              <div class="breakdown-item">
                <div class="breakdown-value">${growScore.breakdown?.anomaly || 0}/30</div>
                <div class="breakdown-label">Anomalie-Frei</div>
              </div>
            </div>
          </div>
        </div>
        ` : ''}

        ${stats ? `
        <div class="section">
          <h2 class="section-title">📊 Klimastatistiken</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Temperatur Ø</div>
              <div class="stat-value">${stats.temp?.avg?.toFixed(1) || 0}<span class="stat-unit">°C</span></div>
              <div class="stat-range">${stats.temp?.min?.toFixed(1) || 0}° - ${stats.temp?.max?.toFixed(1) || 0}°</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Luftfeuchte Ø</div>
              <div class="stat-value">${stats.humidity?.avg?.toFixed(0) || 0}<span class="stat-unit">%</span></div>
              <div class="stat-range">${stats.humidity?.min?.toFixed(0) || 0}% - ${stats.humidity?.max?.toFixed(0) || 0}%</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">VPD Ø</div>
              <div class="stat-value">${stats.vpd?.avg?.toFixed(2) || 0}<span class="stat-unit">kPa</span></div>
              <div class="stat-range">${stats.vpd?.min?.toFixed(2) || 0} - ${stats.vpd?.max?.toFixed(2) || 0}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Licht Ø</div>
              <div class="stat-value">${stats.lux?.avg?.toFixed(0) || 0}<span class="stat-unit">lx</span></div>
              <div class="stat-range">DLI: ${((stats.lux?.avg * 18 * 0.0036) / 1000).toFixed(1)} mol/m²/d</div>
            </div>
          </div>
        </div>
        ` : ''}

        <div class="section">
          <h2 class="section-title">🧠 KI-Insights</h2>
          <ul class="insights-list">
            ${stats?.temp?.avg >= 20 && stats?.temp?.avg <= 28 ?
              '<li>✅ Temperatur im optimalen Bereich für gesundes Wachstum</li>' :
              '<li class="warning">⚠️ Temperatur außerhalb des optimalen Bereichs</li>'}
            ${stats?.humidity?.avg >= 50 && stats?.humidity?.avg <= 70 ?
              '<li>✅ Luftfeuchtigkeit perfekt eingestellt</li>' :
              '<li class="warning">⚠️ Luftfeuchtigkeit sollte angepasst werden</li>'}
            ${stats?.vpd?.avg >= 0.8 && stats?.vpd?.avg <= 1.2 ?
              '<li>✅ VPD im Sweet Spot für maximale Transpiration</li>' :
              '<li class="warning">⚠️ VPD-Wert nicht optimal</li>'}
            ${stats?.temp?.max > 30 ?
              '<li class="error">🔥 Temperatur-Maximum zu hoch - Hitzestress möglich</li>' : ''}
          </ul>
        </div>

        <div class="section">
          <h2 class="section-title">📈 Datenauszug (letzte 10 Messungen)</h2>
          <table class="data-table">
            <thead>
              <tr>
                <th>Zeitpunkt</th>
                <th>Temp (°C)</th>
                <th>RLF (%)</th>
                <th>VPD (kPa)</th>
                <th>Lux</th>
              </tr>
            </thead>
            <tbody>
              ${data.slice(-10).reverse().map(d => `
                <tr>
                  <td>${new Date(d.timestamp).toLocaleString('de-DE')}</td>
                  <td>${d.temp?.toFixed(1) || '-'}</td>
                  <td>${d.humidity?.toFixed(0) || '-'}</td>
                  <td>${d.vpd?.toFixed(2) || '-'}</td>
                  <td>${d.lux?.toFixed(0) || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>Generiert von GrowMonitor Pro • ${data.length} Datenpunkte ausgewertet</p>
          <p>© ${new Date().getFullYear()} Grow Monitoring System</p>
        </div>
      </body>
      </html>
    `;

    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();

    // Auto-trigger print dialog
    setTimeout(() => {
      printWindow.print();
      setGenerating(false);
      setGenerated(true);
    }, 500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl border overflow-hidden"
        style={{
          backgroundColor: theme.bg.card,
          borderColor: theme.border.default,
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
        }}
      >
        {/* Header */}
        <div
          className="p-5 border-b"
          style={{
            background: `linear-gradient(135deg, ${theme.accent.color}20 0%, transparent 100%)`,
            borderColor: theme.border.default
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="p-2.5 rounded-xl"
                style={{ backgroundColor: `${theme.accent.color}20` }}
              >
                <FileText size={22} style={{ color: theme.accent.color }} />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: theme.text.primary }}>
                  PDF Report
                </h2>
                <p className="text-xs" style={{ color: theme.text.muted }}>
                  Exportiere deinen Grow-Report
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors hover:bg-black/10"
              style={{ color: theme.text.muted }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Preview Info */}
          <div
            className="p-4 rounded-xl border"
            style={{ backgroundColor: theme.bg.hover, borderColor: theme.border.default }}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: theme.text.primary }}>
              Der Report enthält:
            </h3>
            <ul className="space-y-2 text-sm" style={{ color: theme.text.secondary }}>
              <li className="flex items-center gap-2">
                <Check size={14} style={{ color: '#10b981' }} />
                Grow Score & Breakdown
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} style={{ color: '#10b981' }} />
                Klimastatistiken (Temp, RLF, VPD, Lux)
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} style={{ color: '#10b981' }} />
                KI-basierte Insights & Empfehlungen
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} style={{ color: '#10b981' }} />
                Datenauszug der letzten Messungen
              </li>
            </ul>
          </div>

          {/* Time Range Info */}
          <div className="flex items-center gap-2 text-sm" style={{ color: theme.text.muted }}>
            <Calendar size={14} />
            <span>Zeitraum: Letzte {timeRange} Stunden • {data.length} Datenpunkte</span>
          </div>

          {/* Success Message */}
          {generated && (
            <div
              className="p-3 rounded-xl flex items-center gap-2 text-sm"
              style={{ backgroundColor: '#10b98120', color: '#10b981' }}
            >
              <Check size={16} />
              PDF wurde im Druckdialog geöffnet. Speichere als PDF.
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="p-4 border-t flex gap-3"
          style={{ borderColor: theme.border.default }}
        >
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ backgroundColor: theme.bg.hover, color: theme.text.secondary }}
          >
            Abbrechen
          </button>
          <button
            onClick={generatePDF}
            disabled={generating}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: theme.accent.color, color: '#fff' }}
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generiere...
              </>
            ) : (
              <>
                <Download size={16} />
                PDF erstellen
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PDFExport;
