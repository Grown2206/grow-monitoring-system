import React, { useState, useEffect } from 'react';
import { loadCalibration, saveCalibration, setSensorCalibration, resetCalibration } from '../utils/soilCalibration';

const SoilCalibrationWizard = ({ currentSensorData }) => {
  const [calibration, setCalibration] = useState(loadCalibration());
  const [activeSensor, setActiveSensor] = useState(1);
  const [calibrationStep, setCalibrationStep] = useState(null); // 'wet' oder 'dry'
  const [pendingValue, setPendingValue] = useState(null);

  // Lade aktuelle Kalibrierung beim Mount
  useEffect(() => {
    setCalibration(loadCalibration());
  }, []);

  // Aktueller Rohwert für den aktiven Sensor
  const currentRawValue = currentSensorData?.[activeSensor - 1] || 0;
  const sensorKey = `sensor${activeSensor}`;
  const sensorCalib = calibration[sensorKey];

  const startWetCalibration = () => {
    setCalibrationStep('wet');
    setPendingValue(currentRawValue);
  };

  const startDryCalibration = () => {
    setCalibrationStep('dry');
    setPendingValue(currentRawValue);
  };

  const confirmCalibration = () => {
    if (calibrationStep === 'wet') {
      // Nass = Min-Wert
      const newCalib = setSensorCalibration(activeSensor, pendingValue, sensorCalib.max);
      setCalibration(newCalib);
    } else if (calibrationStep === 'dry') {
      // Trocken = Max-Wert
      const newCalib = setSensorCalibration(activeSensor, sensorCalib.min, pendingValue);
      setCalibration(newCalib);
    }
    setCalibrationStep(null);
    setPendingValue(null);
  };

  const cancelCalibration = () => {
    setCalibrationStep(null);
    setPendingValue(null);
  };

  const handleResetAll = () => {
    if (window.confirm('Alle Sensoren auf Standard-Kalibrierung zurücksetzen?')) {
      const newCalib = resetCalibration();
      setCalibration(newCalib);
    }
  };

  const handleResetSensor = () => {
    if (window.confirm(`Sensor ${activeSensor} auf Standard-Kalibrierung zurücksetzen?`)) {
      const newCalib = setSensorCalibration(activeSensor, 1200, 4095);
      setCalibration(newCalib);
    }
  };

  return (
    <div className="soil-calibration-wizard">
      <h2>🌱 Bodensensor Kalibrierung</h2>
      <p className="description">
        Kalibriere jeden Sensor individuell für präzise Feuchtigkeitsmessung.
        <br />
        <strong>Anleitung:</strong> Sensor komplett nass machen → "Nass kalibrieren" → Sensor komplett trocknen → "Trocken kalibrieren"
      </p>

      {/* Sensor Auswahl */}
      <div className="sensor-selector">
        <label>Sensor auswählen:</label>
        <div className="sensor-buttons">
          {[1, 2, 3, 4, 5, 6].map((num) => (
            <button
              key={num}
              className={`sensor-btn ${activeSensor === num ? 'active' : ''}`}
              onClick={() => setActiveSensor(num)}
            >
              Sensor {num}
            </button>
          ))}
        </div>
      </div>

      {/* Aktueller Sensor Status */}
      <div className="sensor-status">
        <h3>Sensor {activeSensor} Status</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="label">Aktueller Rohwert:</span>
            <span className="value">{currentRawValue}</span>
          </div>
          <div className="status-item">
            <span className="label">Min (Nass):</span>
            <span className="value">{sensorCalib.min}</span>
          </div>
          <div className="status-item">
            <span className="label">Max (Trocken):</span>
            <span className="value">{sensorCalib.max}</span>
          </div>
          <div className="status-item">
            <span className="label">Berechnete Feuchtigkeit:</span>
            <span className="value">
              {Math.max(0, Math.min(100, Math.round(((sensorCalib.max - currentRawValue) / (sensorCalib.max - sensorCalib.min)) * 100)))}%
            </span>
          </div>
        </div>
      </div>

      {/* Kalibrierungs-Schritte */}
      {!calibrationStep ? (
        <div className="calibration-actions">
          <button className="calib-btn wet" onClick={startWetCalibration}>
            💧 Nass kalibrieren
          </button>
          <button className="calib-btn dry" onClick={startDryCalibration}>
            🔥 Trocken kalibrieren
          </button>
          <button className="calib-btn reset" onClick={handleResetSensor}>
            🔄 Sensor zurücksetzen
          </button>
        </div>
      ) : (
        <div className="calibration-confirm">
          <h3>
            {calibrationStep === 'wet' ? '💧 Nass-Kalibrierung' : '🔥 Trocken-Kalibrierung'}
          </h3>
          <p>
            {calibrationStep === 'wet'
              ? 'Stelle sicher, dass der Sensor komplett nass ist!'
              : 'Stelle sicher, dass der Sensor komplett trocken ist!'}
          </p>
          <div className="pending-value">
            <span className="label">
              {calibrationStep === 'wet' ? 'Neuer Min-Wert:' : 'Neuer Max-Wert:'}
            </span>
            <span className="value">{pendingValue}</span>
          </div>
          <div className="confirm-actions">
            <button className="confirm-btn" onClick={confirmCalibration}>
              ✅ Bestätigen
            </button>
            <button className="cancel-btn" onClick={cancelCalibration}>
              ❌ Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Alle Sensoren Übersicht */}
      <div className="all-sensors-overview">
        <h3>Alle Sensoren Übersicht</h3>
        <table className="calibration-table">
          <thead>
            <tr>
              <th>Sensor</th>
              <th>Min (Nass)</th>
              <th>Max (Trocken)</th>
              <th>Aktueller Wert</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6].map((num) => {
              const key = `sensor${num}`;
              const calib = calibration[key];
              const raw = currentSensorData?.[num - 1] || 0;
              return (
                <tr key={num} className={activeSensor === num ? 'active-row' : ''}>
                  <td>Sensor {num}</td>
                  <td>{calib.min}</td>
                  <td>{calib.max}</td>
                  <td>{raw}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Reset All */}
      <div className="reset-all-section">
        <button className="reset-all-btn" onClick={handleResetAll}>
          ⚠️ Alle Sensoren zurücksetzen
        </button>
      </div>

      <style jsx>{`
        .soil-calibration-wizard {
          background: #1e1e1e;
          border-radius: 8px;
          padding: 24px;
          color: #e0e0e0;
        }

        h2 {
          margin: 0 0 8px 0;
          color: #4caf50;
        }

        .description {
          margin: 0 0 24px 0;
          color: #b0b0b0;
          font-size: 14px;
          line-height: 1.6;
        }

        .sensor-selector {
          margin-bottom: 24px;
        }

        .sensor-selector label {
          display: block;
          margin-bottom: 12px;
          font-weight: 500;
        }

        .sensor-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .sensor-btn {
          padding: 10px 16px;
          border: 2px solid #444;
          background: #2a2a2a;
          color: #e0e0e0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
        }

        .sensor-btn:hover {
          border-color: #4caf50;
          background: #333;
        }

        .sensor-btn.active {
          border-color: #4caf50;
          background: #4caf50;
          color: white;
        }

        .sensor-status {
          background: #2a2a2a;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 24px;
        }

        .sensor-status h3 {
          margin: 0 0 16px 0;
          color: #4caf50;
          font-size: 18px;
        }

        .status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .status-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 12px;
          background: #1e1e1e;
          border-radius: 4px;
        }

        .status-item .label {
          color: #b0b0b0;
          font-size: 14px;
        }

        .status-item .value {
          color: #4caf50;
          font-weight: 600;
          font-size: 16px;
        }

        .calibration-actions {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .calib-btn {
          flex: 1;
          min-width: 150px;
          padding: 14px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .calib-btn.wet {
          background: #2196f3;
          color: white;
        }

        .calib-btn.wet:hover {
          background: #1976d2;
        }

        .calib-btn.dry {
          background: #ff9800;
          color: white;
        }

        .calib-btn.dry:hover {
          background: #f57c00;
        }

        .calib-btn.reset {
          background: #757575;
          color: white;
        }

        .calib-btn.reset:hover {
          background: #616161;
        }

        .calibration-confirm {
          background: #2a2a2a;
          border-radius: 6px;
          padding: 20px;
          margin-bottom: 24px;
          border: 2px solid #4caf50;
        }

        .calibration-confirm h3 {
          margin: 0 0 12px 0;
          color: #4caf50;
        }

        .calibration-confirm p {
          margin: 0 0 16px 0;
          color: #ffa726;
          font-weight: 500;
        }

        .pending-value {
          display: flex;
          justify-content: space-between;
          padding: 12px;
          background: #1e1e1e;
          border-radius: 4px;
          margin-bottom: 16px;
        }

        .pending-value .label {
          color: #b0b0b0;
        }

        .pending-value .value {
          color: #4caf50;
          font-weight: 600;
          font-size: 18px;
        }

        .confirm-actions {
          display: flex;
          gap: 12px;
        }

        .confirm-btn,
        .cancel-btn {
          flex: 1;
          padding: 12px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .confirm-btn {
          background: #4caf50;
          color: white;
        }

        .confirm-btn:hover {
          background: #43a047;
        }

        .cancel-btn {
          background: #f44336;
          color: white;
        }

        .cancel-btn:hover {
          background: #e53935;
        }

        .all-sensors-overview {
          margin-bottom: 24px;
        }

        .all-sensors-overview h3 {
          margin: 0 0 16px 0;
          color: #4caf50;
          font-size: 18px;
        }

        .calibration-table {
          width: 100%;
          border-collapse: collapse;
          background: #2a2a2a;
          border-radius: 6px;
          overflow: hidden;
        }

        .calibration-table th {
          background: #333;
          padding: 12px;
          text-align: left;
          color: #4caf50;
          font-weight: 600;
        }

        .calibration-table td {
          padding: 10px 12px;
          border-top: 1px solid #333;
          color: #e0e0e0;
        }

        .calibration-table tr.active-row {
          background: #1e1e1e;
          border-left: 3px solid #4caf50;
        }

        .reset-all-section {
          text-align: center;
        }

        .reset-all-btn {
          padding: 12px 24px;
          border: 2px solid #f44336;
          background: transparent;
          color: #f44336;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .reset-all-btn:hover {
          background: #f44336;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default SoilCalibrationWizard;
