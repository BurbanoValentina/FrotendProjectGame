import React, { useState } from 'react';
import { motion } from 'framer-motion';
import AuthService from '../services/AuthService';
import '../styles/Auth.css';

interface LoginProps {
  onLoginSuccess: () => void;
  onSwitchToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onSwitchToRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const authService = AuthService.getInstance();
  const handleForgotPassword = () => {
    const supportEmail = 'soporte@gamechallenge.com';
    if (typeof window !== 'undefined') {
      window.open(`mailto:${supportEmail}?subject=Recuperar%20contraseña`, '_blank');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const sanitizedUsername = username.trim();
    const sanitizedPassword = password.trim();

    if (!sanitizedUsername || !sanitizedPassword) {
      setError('No se permiten campos vacíos o con solo espacios');
      setLoading(false);
      return;
    }

    setUsername(sanitizedUsername);
    setPassword(sanitizedPassword);

    // Validación del lado del cliente
    if (sanitizedUsername.length < 5 || sanitizedUsername.length > 15) {
      setError('El usuario debe tener entre 5 y 15 caracteres');
      setLoading(false);
      return;
    }

    if (sanitizedPassword.length < 5 || sanitizedPassword.length > 15) {
      setError('La contraseña debe tener entre 5 y 15 caracteres');
      setLoading(false);
      return;
    }

    const response = await authService.login(sanitizedUsername, sanitizedPassword);
    setLoading(false);

    if (response.success) {
      onLoginSuccess();
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
      <div className="auth-card">
        <motion.div
          className="auth-header"
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="auth-icon">🎮</div>
          <h1 className="auth-title">¡Bienvenido!</h1>
          <p className="auth-subtitle">Inicia sesión para jugar</p>
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
                placeholder="Ingresa tu usuario"
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
                placeholder="Ingresa tu contraseña"
                minLength={5}
                maxLength={15}
                required
              />
            </div>
            <span className="input-hint">5-15 caracteres</span>
          </motion.div>

          {error && (
            <motion.div
              className="error-message"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              ⚠️ {error}
            </motion.div>
          )}

          <motion.button
            type="button"
            className="forgot-password-button"
            onClick={handleForgotPassword}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            ¿Olvidaste tu contraseña?
          </motion.button>

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
              '🚀 Iniciar Sesión'
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
            ¿No tienes cuenta?{' '}
            <button onClick={onSwitchToRegister} className="auth-link-button">
              Regístrate aquí
            </button>
          </p>
        </motion.div>
      </div>

      <div className="auth-background">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
      </div>
    </motion.div>
  );
};

export default Login;
