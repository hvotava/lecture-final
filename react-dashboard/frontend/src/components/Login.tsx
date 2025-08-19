import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/app');
    } catch (error: any) {
      console.error('Login failed:', error);
      
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else if (error.response?.data?.errors) {
        setError(error.response.data.errors.map((e: any) => e.msg).join(', '));
      } else {
        setError('Přihlášení se nezdařilo. Zkuste to znovu.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-20 h-20 bg-accent/10 rounded-full blur-xl" />
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-accent/5 rounded-full blur-lg" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back to Home Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          onClick={handleBackToHome}
          className="flex items-center gap-2 text-muted hover:text-primary transition-colors mb-6 focus-ring rounded-lg p-2"
        >
          <ArrowLeft size={20} />
          <span className="text-medium">Zpět na hlavní stránku</span>
        </motion.button>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="card"
        >
          <div className="card-body">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-accent to-accent-dark rounded-xl flex items-center justify-center mx-auto mb-4">
                <Lock size={24} className="text-white" />
              </div>
              <h1 className="heading heading-2 text-primary mb-2">
                Přihlášení
              </h1>
              <p className="text-medium text-muted">
                Přihlaste se do svého účtu AI Lektor
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-error/10 border border-error/20 rounded-lg p-4 mb-6"
              >
                <p className="text-small text-error font-medium">{error}</p>
              </motion.div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-medium font-medium text-primary mb-2">
                  E-mailová adresa
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={20} className="text-muted" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-12 focus-ring"
                    placeholder="vas@email.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-medium font-medium text-primary mb-2">
                  Heslo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={20} className="text-muted" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-12 pr-12 focus-ring"
                    placeholder="Vaše heslo"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center focus-ring rounded-lg"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff size={20} className="text-muted hover:text-primary transition-colors" />
                    ) : (
                      <Eye size={20} className="text-muted hover:text-primary transition-colors" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`btn btn-primary w-full focus-ring ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Přihlašuji...</span>
                  </div>
                ) : (
                  'Přihlásit se'
                )}
              </button>
            </form>

            {/* Footer Links */}
            <div className="mt-8 text-center space-y-4">
              <div className="text-small text-muted">
                Nemáte účet?{' '}
                <Link 
                  to="/register" 
                  className="text-accent hover:text-accent-dark font-medium transition-colors focus-ring rounded px-1"
                >
                  Zaregistrujte se
                </Link>
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs text-muted">
                  Pokračováním souhlasíte s našimi podmínkami použití a zásadami ochrany osobních údajů.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Demo Credentials */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 card bg-gray-50"
        >
          <div className="card-body">
            <h3 className="heading heading-6 text-primary mb-3">Demo přístup</h3>
            <div className="space-y-2 text-small">
              <div>
                <span className="text-muted">Admin:</span>{' '}
                <span className="font-mono bg-white px-2 py-1 rounded">admin@example.com</span> / 
                <span className="font-mono bg-white px-2 py-1 rounded ml-1">admin123</span>
              </div>
              <div>
                <span className="text-muted">Uživatel:</span>{' '}
                <span className="font-mono bg-white px-2 py-1 rounded">user@example.com</span> / 
                <span className="font-mono bg-white px-2 py-1 rounded ml-1">user123</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login; 