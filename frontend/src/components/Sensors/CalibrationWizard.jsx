import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader, Beaker, Droplets } from 'lucide-react';
import { api } from '../../utils/api';

/**
 * Calibration Wizard
 * Schritt-für-Schritt Kalibrierungs-Assistent für EC und pH Sensoren
 */
const CalibrationWizard = ({ sensorType, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [calibrationData, setCalibrationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calibrating, setCalibrating] = useState(false);
  const [currentPoint, setCurrentPoint] = useState(null);
  const [customValue, setCustomValue] = useState('');

  // EC Calibration Steps
  const ecSteps = [
    { point: 'dry', label: 'Trockenkalibrierung', description: 'Sensor vollständig trocknen', referenceValue: null },
    { point: 'low', label: 'Niedrig (1413 µS/cm)', description: '1.413 mS/cm Kalibrierlösung', referenceValue: 1.413 },
    { point: 'high', label: 'Hoch (12880 µS/cm)', description: '12.88 mS/cm Kalibrierlösung', referenceValue: 12.88 }
  ];

  // pH Calibration Steps
  const phSteps = [
    { point: 'mid', label: 'Mittelpunkt (pH 7.0)', description: 'pH 7.0 Pufferlösung', referenceValue: 7.0 },
    { point: 'low', label: 'Niedrig (pH 4.0)', description: 'pH 4.0 Pufferlösung', referenceValue: 4.0 },
    { point: 'high', label: 'Hoch (pH 10.0)', description: 'pH 10.0 Pufferlösung (optional)', referenceValue: 10.0 }
  ];

  const steps = sensorType === 'ec' ? ecSteps : phSteps;

  // Fetch calibration status
  const fetchCalibration = async () => {
    try {
      const response = await api.get(`/sensors/calibration/${sensorType}`);
      if (response.data.success) {
        setCalibrationData(response.data.data);

        // Find first uncalibrated step
        let firstUncalibrated = 0;
        if (sensorType === 'ec') {
          if (response.data.data.ecCalibration.dry.calibrated) firstUncalibrated++;
          if (response.data.data.ecCalibration.low.calibrated) firstUncalibrated++;
          if (response.data.data.ecCalibration.high.calibrated) firstUncalibrated++;
        } else {
          if (response.data.data.phCalibration.mid.calibrated) firstUncalibrated++;
          if (response.data.data.phCalibration.low.calibrated) firstUncalibrated++;
          if (response.data.data.phCalibration.high.calibrated) firstUncalibrated++;
        }
        setCurrentStep(Math.min(firstUncalibrated, steps.length - 1));
      }
    } catch (error) {
      console.error('❌ Error fetching calibration:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalibration();
  }, [sensorType]);

  // Start calibration for current point
  const startCalibration = async () => {
    setCalibrating(true);
    const step = steps[currentStep];
    const referenceValue = customValue ? parseFloat(customValue) : step.referenceValue;

    try {
      const response = await api.post(`/sensors/calibration/${sensorType}/start`, {
        point: step.point,
        referenceValue
      });

      if (response.data.success) {
        setCurrentPoint(step.point);

        // Wait for ESP32 to complete calibration (simulated)
        setTimeout(async () => {
          // In real implementation, ESP32 would send calibration result via MQTT
          // For now, we just save with a mock measured value
          await saveCalibration(referenceValue, referenceValue);
        }, 3000);
      }
    } catch (error) {
      console.error('❌ Error starting calibration:', error);
      setCalibrating(false);
    }
  };

  // Save calibration point
  const saveCalibration = async (referenceValue, measuredValue) => {
    const step = steps[currentStep];

    try {
      const response = await api.post(`/sensors/calibration/${sensorType}/save`, {
        point: step.point,
        referenceValue,
        measuredValue,
        slope: sensorType === 'ph' ? 59.16 : undefined // Mock slope
      });

      if (response.data.success) {
        setCalibrationData(response.data.data);
        setCalibrating(false);
        setCurrentPoint(null);
        setCustomValue('');

        // Move to next step
        if (currentStep < steps.length - 1) {
          setCurrentStep(currentStep + 1);
        } else {
          // Calibration complete
          if (onComplete) onComplete();
        }
      }
    } catch (error) {
      console.error('❌ Error saving calibration:', error);
      setCalibrating(false);
    }
  };

  // Skip current step
  const skipStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Reset calibration
  const resetCalibration = async () => {
    if (!confirm(`Möchtest du die ${sensorType.toUpperCase()}-Kalibrierung wirklich zurücksetzen?`)) return;

    try {
      const response = await api.post(`/sensors/calibration/${sensorType}/reset`);
      if (response.data.success) {
        setCurrentStep(0);
        fetchCalibration();
      }
    } catch (error) {
      console.error('❌ Error resetting calibration:', error);
    }
  };

  // Check if step is completed
  const isStepCompleted = (stepIndex) => {
    if (!calibrationData) return false;

    const step = steps[stepIndex];
    if (sensorType === 'ec') {
      return calibrationData.ecCalibration[step.point]?.calibrated || false;
    } else {
      return calibrationData.phCalibration[step.point]?.calibrated || false;
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  const currentStepData = steps[currentStep];
  const isCurrentStepCompleted = isStepCompleted(currentStep);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {sensorType === 'ec' ? (
            <Droplets className="text-blue-500" size={24} />
          ) : (
            <Beaker className="text-purple-500" size={24} />
          )}
          <h2 className="text-xl font-semibold">
            {sensorType === 'ec' ? 'EC' : 'pH'} Kalibrierung
          </h2>
        </div>

        <button
          onClick={resetCalibration}
          className="text-sm text-red-500 hover:text-red-600"
        >
          Zurücksetzen
        </button>
      </div>

      {/* Progress Steps */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => (
            <div key={idx} className="flex-1 flex items-center">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  isStepCompleted(idx)
                    ? 'bg-green-500 text-white'
                    : idx === currentStep
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}>
                  {isStepCompleted(idx) ? <CheckCircle size={20} /> : idx + 1}
                </div>
                <div className="text-xs text-center mt-2 text-gray-600 dark:text-gray-400">
                  {step.label}
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-2 ${
                  isStepCompleted(idx) ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                }`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Current Step Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-blue-500 mt-0.5" />
          <div>
            <div className="font-medium text-blue-700 dark:text-blue-300 mb-1">
              Schritt {currentStep + 1}: {currentStepData.label}
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {currentStepData.description}
            </div>
            {currentStepData.referenceValue && (
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                Referenzwert: {currentStepData.referenceValue} {sensorType === 'ec' ? 'mS/cm' : ''}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Reference Value (Optional) */}
      {currentStepData.referenceValue && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Eigener Referenzwert (optional)
          </label>
          <input
            type="number"
            step="0.01"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder={currentStepData.referenceValue.toString()}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={startCalibration}
          disabled={calibrating || isCurrentStepCompleted}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {calibrating ? (
            <>
              <Loader size={20} className="animate-spin" />
              Kalibriere...
            </>
          ) : isCurrentStepCompleted ? (
            <>
              <CheckCircle size={20} />
              Abgeschlossen
            </>
          ) : (
            'Kalibrierung starten'
          )}
        </button>

        {currentStep < steps.length - 1 && (
          <button
            onClick={skipStep}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Überspringen
          </button>
        )}
      </div>

      {/* Calibration Status */}
      {calibrationData && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Status: {calibrationData.status.isValid ? (
              <span className="text-green-500 font-medium">✓ Kalibriert</span>
            ) : (
              <span className="text-yellow-500 font-medium">⚠ Nicht vollständig kalibriert</span>
            )}
          </div>
          {calibrationData.status.lastCalibration && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Letzte Kalibrierung: {new Date(calibrationData.status.lastCalibration).toLocaleString('de-DE')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CalibrationWizard;
