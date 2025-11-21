import React, { useState } from 'react';
import { motion } from 'framer-motion';
import AuthService from '../services/AuthService';
import '../styles/Auth.css';

interface ForgotPasswordProps {
  onBackToLogin: () => void;
}

const RECOVERY_STEPS = [
  { title: 'Identifica tu cuenta', detail: 'Ingresa tu usuario o apodo registrado.' },
  { title: 'Crea nueva contraseña', detail: 'Debe tener entre 5 y 15 caracteres.' },
  { title: 'Confirma el cambio', detail: 'Guarda y vuelve a iniciar sesión con la nueva contraseña.' }
];

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBackToLogin }) => {
  const [identifier, setIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [serverMessage, setServerMessage] = useState('');

  const authService = AuthService.getInstance();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedIdentifier = identifier.trim();
    const trimmedPassword = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedIdentifier) {
      setServerMessage('Necesitamos tu usuario o apodo para continuar.');
      setStatus('error');
      return;
    }

    if (trimmedPassword.length < 5 || trimmedPassword.length > 15) {
      setServerMessage('La nueva contraseña debe tener entre 5 y 15 caracteres.');
      setStatus('error');
      return;
    }

    if (trimmedPassword !== trimmedConfirm) {
      setServerMessage('Las contraseñas no coinciden.');
      setStatus('error');
      return;
    }

    setStatus('sending');
    setServerMessage('');

    const response = await authService.changePassword(trimmedIdentifier, trimmedPassword);

    setStatus(response.success ? 'success' : 'error');
    setServerMessage(response.message);

    if (response.success) {
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <motion.div
      className="auth-container"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="auth-card recovery-card">
        <motion.div className="auth-header" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="auth-icon">🔐</div>
          <h1 className="auth-title">Recupera tu acceso</h1>
          <p className="auth-subtitle">Sin drama, te ayudamos en segundos.</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="input-label">Usuario o apodo</label>
          <div className="input-wrapper">
            <span className="input-icon">👤</span>
            <input
              type="text"
              className="auth-input"
              placeholder="ej: playerPro o gamerLegend"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <label className="input-label">Nueva contraseña</label>
          <div className="input-wrapper">
            <span className="input-icon">🔒</span>
            <input
              type="password"
              className="auth-input"
              placeholder="Ingresa tu nueva contraseña"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={5}
              maxLength={15}
              required
            />
          </div>
          <span className="input-hint">5-15 caracteres, evita espacios vacíos</span>

          <label className="input-label">Confirma tu contraseña</label>
          <div className="input-wrapper">
            <span className="input-icon">✅</span>
            <input
              type="password"
              className="auth-input"
              placeholder="Repite tu nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={5}
              maxLength={15}
              required
            />
          </div>

          {serverMessage && (
            <motion.div
              className={`recovery-feedback ${status}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {serverMessage}
            </motion.div>
          )}

          <motion.button
            type="submit"
            className="auth-button primary"
            disabled={status === 'sending'}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {status === 'sending' ? 'Procesando...' : 'Actualizar contraseña'}
          </motion.button>

          <button type="button" className="ghost-link" onClick={onBackToLogin}>
            ← Volver al inicio de sesión
          </button>
        </form>

        <div className="recovery-steps">
          {RECOVERY_STEPS.map((step, index) => (
            <div key={step.title} className="recovery-step">
              <span className="step-index">{index + 1}</span>
              <div>
                <h4>{step.title}</h4>
                <p>{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="auth-background">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
      </div>
    </motion.div>
  );
};

export default ForgotPassword;
