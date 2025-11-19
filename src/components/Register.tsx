import React, { useState } from 'react';
import { motion } from 'framer-motion';
import AuthService from '../services/AuthService';
import '../styles/Auth.css';

interface RegisterProps {
  onRegisterSuccess: () => void;
  onSwitchToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onRegisterSuccess, onSwitchToLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const authService = AuthService.getInstance();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (username.includes(' ') || password.includes(' ') || confirmPassword.includes(' ') || nickname.includes(' ')) {
      setError('Ningún campo puede contener espacios');
      setLoading(false);
      return;
    }

    const sanitizedUsername = username.trim();
    const sanitizedPassword = password.trim();
    const sanitizedConfirm = confirmPassword.trim();
    const sanitizedNickname = nickname.trim();

    if (!sanitizedUsername || !sanitizedPassword || !sanitizedConfirm || !sanitizedNickname) {
      setError('Ningún campo puede estar vacío o contener solo espacios');
      setLoading(false);
      return;
    }

    setUsername(sanitizedUsername);
    setPassword(sanitizedPassword);
    setConfirmPassword(sanitizedConfirm);
    setNickname(sanitizedNickname);

    // Validaciones del lado del cliente
    if (sanitizedUsername.length < 5 || sanitizedUsername.length > 15) {
      setError('El usuario debe tener entre 5 y 15 caracteres');
      setLoading(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(sanitizedUsername)) {
      setError('El usuario solo puede contener letras, números y guiones bajos');
      setLoading(false);
      return;
    }

    if (sanitizedPassword.length < 5 || sanitizedPassword.length > 15) {
      setError('La contraseña debe tener entre 5 y 15 caracteres');
      setLoading(false);
      return;
    }

    if (sanitizedPassword !== sanitizedConfirm) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    if (sanitizedNickname.length < 5 || sanitizedNickname.length > 15) {
      setError('El apodo debe tener entre 5 y 15 caracteres');
      setLoading(false);
      return;
    }

    const response = await authService.register(sanitizedUsername, sanitizedPassword, sanitizedNickname);
    setLoading(false);

    if (response.success) {
      onRegisterSuccess();
    } else {
      setError(response.message);
    }
  };

  return (
    <motion.div
      className="auth-container"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="auth-card register-card">
        <motion.div
          className="auth-header"
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="auth-icon">✨</div>
          <h1 className="auth-title">¡Únete a la diversión!</h1>
          <p className="auth-subtitle">Crea tu cuenta y empieza a jugar</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="auth-form">
          <motion.div
            className="input-group"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <label className="input-label">Usuario</label>
            <div className="input-wrapper">
              <span className="input-icon">👤</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="auth-input"
                placeholder="Elige tu usuario"
                minLength={5}
                maxLength={15}
                required
              />
            </div>
            <span className="input-hint">5-15 caracteres (letras, números, _)</span>
          </motion.div>

          <motion.div
            className="input-group"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            <label className="input-label">Apodo</label>
            <div className="input-wrapper">
              <span className="input-icon">🎭</span>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="auth-input"
                placeholder="Tu apodo en el juego"
                minLength={5}
                maxLength={15}
                required
              />
            </div>
            <span className="input-hint">5-15 caracteres</span>
          </motion.div>

          <motion.div
            className="input-group"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <label className="input-label">Contraseña</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
                placeholder="Crea una contraseña"
                minLength={5}
                maxLength={15}
                required
              />
            </div>
            <span className="input-hint">5-15 caracteres</span>
          </motion.div>

          <motion.div
            className="input-group"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            <label className="input-label">Confirmar Contraseña</label>
            <div className="input-wrapper">
              <span className="input-icon">🔐</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="auth-input"
                placeholder="Repite tu contraseña"
                minLength={5}
                maxLength={15}
                required
              />
            </div>
          </motion.div>

          {error && (
            <motion.div
              className="error-message text-gray-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              ⚠️ {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            className="auth-button primary"
            disabled={loading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {loading ? (
              <span className="loading-spinner">⌛</span>
            ) : (
              '🎮 Crear Cuenta'
            )}
          </motion.button>
        </form>

        <motion.div
          className="auth-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <p className="auth-link-text">
            ¿Ya tienes cuenta?{' '}
            <button onClick={onSwitchToLogin} className="auth-link-button">
              Inicia sesión aquí
            </button>
          </p>
        </motion.div>
      </div>

      <div className="auth-background">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
        <div className="floating-shape shape-4"></div>
      </div>
    </motion.div>
  );
};

export default Register;
