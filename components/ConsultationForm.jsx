import React, { useState, useEffect, useRef } from 'react';

const SYMPTOMS_PRESETS = [
  'Fever', 'Headache', 'Cough', 'Fatigue', 'Nausea',
  'Chest pain', 'Shortness of breath', 'Dizziness', 'Joint pain', 'Rash',
];

export default function ConsultationForm({ consultationId, initialData = {}, onSave }) {
  const [form, setForm] = useState({
    symptoms: '',
    duration: '',
    notes: '',
    vitalSigns: '',
    ...initialData,
  });

  const autoSaveRef = useRef(null);

  const handle = (field) => (e) => {
    const val = e.target.value;
    setForm(prev => {
      const next = { ...prev, [field]: val };
      // Debounced auto-save
      clearTimeout(autoSaveRef.current);
      autoSaveRef.current = setTimeout(() => onSave?.(next), 1500);
      return next;
    });
  };

  const addSymptom = (symptom) => {
    setForm(prev => {
      const cur = prev.symptoms;
      const val = cur ? `${cur}, ${symptom}` : symptom;
      const next = { ...prev, symptoms: val };
      clearTimeout(autoSaveRef.current);
      autoSaveRef.current = setTimeout(() => onSave?.(next), 1500);
      return next;
    });
  };

  useEffect(() => {
    return () => clearTimeout(autoSaveRef.current);
  }, []);

  return (
    <div className="consult-form-area">
      <div className="consult-form-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>📝 Guided Medical Form</span>
          <span style={{ fontSize: 11, color: 'var(--success)', background: 'var(--success-dim)', padding: '2px 8px', borderRadius: 999 }}>Auto-saving</span>
        </div>
      </div>

      <div className="consult-form-body">
        {/* Symptoms */}
        <div className="form-section">
          <div className="form-section-title">🤒 Presenting Symptoms</div>
          <textarea
            id="form-symptoms"
            className="form-textarea"
            placeholder="Describe patient's chief complaints..."
            value={form.symptoms}
            onChange={handle('symptoms')}
            style={{ minHeight: 70 }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
            {SYMPTOMS_PRESETS.map(s => (
              <button
                key={s}
                type="button"
                className="tag"
                style={{ cursor: 'pointer', background: 'var(--accent-dim)', color: 'var(--accent-bright)', border: '1px solid var(--accent-dim)', borderRadius: 'var(--radius-sm)', padding: '3px 10px', fontSize: 11.5 }}
                onClick={() => addSymptom(s)}
              >
                + {s}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="form-section">
          <div className="form-section-title">⏱️ Duration & Onset</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Duration of symptoms</label>
              <input
                id="form-duration"
                className="form-input"
                placeholder="e.g. 3 days, 2 weeks"
                value={form.duration}
                onChange={handle('duration')}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Vital Signs</label>
              <input
                id="form-vitals"
                className="form-input"
                placeholder="BP, HR, Temp, SpO2..."
                value={form.vitalSigns}
                onChange={handle('vitalSigns')}
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="form-section">
          <div className="form-section-title">🗒️ Clinical Notes</div>
          <textarea
            id="form-notes"
            className="form-textarea"
            placeholder="Additional notes, observations, examination findings..."
            value={form.notes}
            onChange={handle('notes')}
            style={{ minHeight: 90 }}
          />
        </div>

        {/* Quick form tips */}
        <div style={{
          background: 'var(--accent-dim)', border: '1px solid var(--accent-dim)',
          borderRadius: 'var(--radius-md)', padding: '12px 14px'
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-bright)', marginBottom: 6 }}>💡 Patient Info (auto-loaded from left panel)</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Patient's medical history, allergies, and medications are visible on the left sidebar. Use this to inform your assessment before submitting the disposition.
          </div>
        </div>
      </div>
    </div>
  );
}
