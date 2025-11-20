import React, { useState } from 'react';
import { motion } from 'framer-motion';
import AuthService from '../services/AuthService';
import '../styles/Auth.css';

interface ForgotPasswordProps {
  onBackToLogin: () => void;
}

const RECOVERY_CHANNELS = [
  {
    id: 'email',
    label: 'Correo de verificación',
    description: 'Enviaremos un enlace para restablecer tu contraseña.'
  },
  {
    id: 'code',
    label: 'Código temporal',
    description: 'Recibirás un código de 6 dígitos para validar tu identidad.'
  }
];

const RECOVERY_STEPS = [
  { title: 'Confirma tus datos', detail: 'Ingresa tu usuario o correo asociado.' },
  { title: 'Verifica tu identidad', detail: 'Revisa tu bandeja o app autenticadora.' },
  { title: 'Crea nueva contraseña', detail: 'Usa una clave segura de 8+ caracteres.' }
];

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBackToLogin }) => {
  const [identifier, setIdentifier] = useState('');
  const [channel, setChannel] = useState<'email' | 'code'>('email');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [serverMessage, setServerMessage] = useState('');

  const authService = AuthService.getInstance();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!identifier.trim()) {
      setServerMessage('Necesitamos tu usuario o correo para continuar.');
      setStatus('error');
      return;
    }

    setStatus('sending');
    setServerMessage('');

    const response = await authService.requestPasswordReset(identifier.trim(), channel);

    setStatus(response.success ? 'success' : 'error');
    setServerMessage(response.message);
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
          <label className="input-label">Usuario o correo</label>
          <div className="input-wrapper">
            <span className="input-icon">📧</span>
            <input
              type="text"
              className="auth-input"
              placeholder="ej: playerPro o tu@email.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className="channel-selector">
            {RECOVERY_CHANNELS.map((option) => (
              <button
                type="button"
                key={option.id}
                className={`channel-pill ${channel === option.id ? 'active' : ''}`}
                onClick={() => setChannel(option.id as 'email' | 'code')}
              >
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </button>
            ))}
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
            {status === 'sending' ? 'Procesando...' : 'Generar instrucciones'}
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
