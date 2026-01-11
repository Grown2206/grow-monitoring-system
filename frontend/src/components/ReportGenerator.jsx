import React, { useState } from 'react';
import { Download, FileText, ChevronDown, FileSpreadsheet, FileJson } from 'lucide-react';

export default function ReportGenerator({ historyData, logs, plants, growScore }) {
  const [showMenu, setShowMenu] = useState(false);

  const generateCSV = () => {
    if (!historyData || historyData.length === 0) {
      alert("Keine Daten zum Exportieren vorhanden.");
      return;
    }

    const headers = [
      "Datum", "Uhrzeit", "Temperatur (°C)", "Luftfeuchte (%)", "VPD (kPa)",
      "Licht (lx)", "Tank (Raw)", "CO2/Gas (Raw)",
      "Boden 1", "Boden 2", "Boden 3", "Boden 4", "Boden 5", "Boden 6"
    ];

    const rows = historyData.map(entry => {
      const date = new Date(entry.timestamp);
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        entry.temp?.toFixed(2) || '',
        entry.humidity?.toFixed(2) || '',
        entry.vpd?.toFixed(2) || '',
        entry.lux || '',
        entry.tankLevel || '',
        entry.gasLevel || '',
        entry.soil1 || '',
        entry.soil2 || '',
        entry.soil3 || '',
        entry.soil4 || '',
        entry.soil5 || '',
        entry.soil6 || ''
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const fileName = `grow_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowMenu(false);
  };

  const generateJSON = () => {
    if (!historyData || historyData.length === 0) {
      alert("Keine Daten zum Exportieren vorhanden.");
      return;
    }

    const report = {
      exportDate: new Date().toISOString(),
      growScore: growScore || null,
      statistics: calculateStatistics(),
      plants: plants || [],
      historyData: historyData.slice(-1000), // Letzte 1000 Einträge
      logs: logs?.slice(-100) || [] // Letzte 100 Logs
    };

    const jsonContent = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", jsonContent);
    const fileName = `grow_report_${new Date().toISOString().split('T')[0]}.json`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowMenu(false);
  };

  const generateExcel = async () => {
    try {
      // Dynamisches Import für xlsx
      const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');

      const worksheetData = [
        ["Datum", "Uhrzeit", "Temp (°C)", "RLF (%)", "VPD (kPa)", "Lux", "Tank", "Gas",
         "Boden1", "Boden2", "Boden3", "Boden4", "Boden5", "Boden6"],
        ...historyData.map(entry => {
          const date = new Date(entry.timestamp);
          return [
            date.toLocaleDateString(),
            date.toLocaleTimeString(),
            entry.temp?.toFixed(2) || '',
            entry.humidity?.toFixed(2) || '',
            entry.vpd?.toFixed(2) || '',
            entry.lux || '',
            entry.tankLevel || '',
            entry.gasLevel || '',
            entry.soil1 || '',
            entry.soil2 || '',
            entry.soil3 || '',
            entry.soil4 || '',
            entry.soil5 || '',
            entry.soil6 || ''
          ];
        })
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sensor Data");

      // Optional: Pflanzen-Sheet
      if (plants && plants.length > 0) {
        const plantData = [
          ["Slot", "Name", "Sorte", "Typ", "Phase", "Alter (Tage)", "Höhe (cm)", "Health (%)"],
          ...plants.filter(p => p.stage !== 'Leer').map(p => [
            p.slotId,
            p.name,
            p.strain,
            p.type,
            p.stage,
            p.germinationDate ? Math.floor((new Date() - new Date(p.germinationDate)) / (1000 * 60 * 60 * 24)) : '',
            p.height || '',
            p.health || ''
          ])
        ];
        const plantSheet = XLSX.utils.aoa_to_sheet(plantData);
        XLSX.utils.book_append_sheet(workbook, plantSheet, "Plants");
      }

      XLSX.writeFile(workbook, `grow_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      setShowMenu(false);
    } catch (error) {
      console.error("Excel Export Error:", error);
      alert("Fehler beim Excel-Export. Versuche CSV stattdessen.");
    }
  };

  const calculateStatistics = () => {
    if (!historyData || historyData.length === 0) return null;

    const calcStats = (key) => {
      const values = historyData.map(d => d[key]).filter(v => v !== null && v !== undefined);
      if (values.length === 0) return { min: 0, max: 0, avg: 0 };
      return {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length
      };
    };

    return {
      temp: calcStats('temp'),
      humidity: calcStats('humidity'),
      vpd: calcStats('vpd'),
      lux: calcStats('lux'),
      dataPoints: historyData.length
    };
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-2.5 bg-slate-800 text-slate-400 hover:text-white rounded-xl hover:bg-emerald-600 transition-colors flex items-center gap-2 group"
        title="Daten exportieren"
      >
        <Download size={20} className="group-hover:animate-bounce" />
        <span className="hidden md:inline text-sm font-medium">Export</span>
        <ChevronDown size={16} className={`transition-transform ${showMenu ? 'rotate-180' : ''}`} />
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
            <button
              onClick={generateCSV}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors text-left text-white"
            >
              <FileSpreadsheet size={20} className="text-emerald-400" />
              <div>
                <div className="font-medium">CSV Export</div>
                <div className="text-xs text-slate-400">Excel-kompatibel</div>
              </div>
            </button>

            <button
              onClick={generateJSON}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors text-left text-white border-t border-slate-700"
            >
              <FileJson size={20} className="text-blue-400" />
              <div>
                <div className="font-medium">JSON Export</div>
                <div className="text-xs text-slate-400">Mit Statistiken</div>
              </div>
            </button>

            <button
              onClick={generateExcel}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors text-left text-white border-t border-slate-700"
            >
              <FileText size={20} className="text-purple-400" />
              <div>
                <div className="font-medium">Excel Export</div>
                <div className="text-xs text-slate-400">Multi-Sheet XLSX</div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}