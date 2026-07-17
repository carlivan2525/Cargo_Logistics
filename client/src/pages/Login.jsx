import { useState } from 'react';
import { Eye, EyeOff, Check } from 'lucide-react';
import { api } from '../api';

const rajdhani = { fontFamily: 'Rajdhani, sans-serif', fontWeight: 700 };

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loadingState, setLoadingState] = useState(null); // null | 'loading' | 'success' | 'error'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoadingState('loading');
    try {
      const data = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', data.token);
      setLoadingState('success');
      setTimeout(() => onLogin(data.username), 1500);
    } catch (err) {
      setLoadingState('error');
      setTimeout(() => setLoadingState(null), 1500);
    }
  };

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden flex items-center justify-center px-4"
      style={{ backgroundImage: "url('/loginbg.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/65 pointer-events-none" />

      {/* Glass card — two columns */}
      <div
        className="relative z-10 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex"
        style={{
          background: 'rgba(255, 255, 255, 0.07)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
      >
        {/* LEFT — About */}
        <div className="flex-1 px-8 py-10 flex flex-col justify-center items-start text-left">
          <h3 className="text-lg font-semibold text-white mb-4" style={rajdhani}>About</h3>
          <p className="text-xs text-white/50 leading-relaxed mb-6">
            CarGO is a full-stack Logistics Management System built to simulate real-world supply chain workflows using the ANSI X12 EDI standard. It automates end-to-end B2B data exchanges, freight transactions, and route tracking.
          </p>
          <div className="w-full space-y-1.5 text-xs pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div>
              <span className="text-white/30">System: </span>
              <span className="text-white/60">CarGO Logistics EDI</span>
            </div>
            <div>
              <span className="text-white/30">Version: </span>
              <span className="text-white/60">1.0.0</span>
            </div>
            <div>
              <span className="text-white/30">Year: </span>
              <span className="text-white/60">2026 CarGO Logistics Services</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)', margin: '24px 0' }} />

        {/* RIGHT — Login */}
        <div className="flex-1 px-8 py-10 flex flex-col justify-center">
          <h2 className="text-xl font-semibold text-white mb-7">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className="text-xs font-medium text-white/50 uppercase tracking-wider">
                Username
              </label>
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="px-3.5 py-2.5 rounded-lg text-sm text-white placeholder-white/25 outline-none transition focus:ring-1 focus:ring-blue-500/60"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-medium text-white/50 uppercase tracking-wider">
                Password
              </label>
              <div className="relative flex items-center">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg text-sm text-white placeholder-white/25 outline-none transition focus:ring-1 focus:ring-blue-500/60"
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-white/40 hover:text-white/80 transition cursor-pointer bg-transparent border-none p-0"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingState === 'loading' || loadingState === 'success'}
              className="mt-2 w-full py-2.5 text-white font-semibold rounded-lg text-sm transition-all duration-300 cursor-pointer border-none flex items-center justify-center gap-2 disabled:cursor-not-allowed"
              style={{
                background:
                  loadingState === 'success' ? 'linear-gradient(90deg, #16a34a, #15803d)' :
                  loadingState === 'error'   ? 'linear-gradient(90deg, #dc2626, #b91c1c)' :
                  'linear-gradient(90deg, #2563eb, #1d4ed8)',
              }}
            >
              {loadingState === 'loading' && (
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              )}
              {loadingState === 'success' && <Check size={16} strokeWidth={2.5} />}
              {loadingState === 'loading' ? 'Signing in...' :
               loadingState === 'success' ? 'Success' :
               loadingState === 'error'   ? 'Invalid credentials' :
               'Login'}
            </button>
          </form>

          <a href="#" className="block text-center mt-3 text-xs text-white/30 hover:text-blue-400 transition hover:underline">
            Forgot Password?
          </a>
        </div>
      </div>
    </div>
  );
}

export default Login;
