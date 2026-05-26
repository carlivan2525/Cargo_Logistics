import { useState } from 'react';
import { Eye, EyeOff, X, Check } from 'lucide-react';
import logo from '../assets/CarGO-logo.png';
import { api } from '../api';

const rajdhani = { fontFamily: 'Rajdhani, sans-serif', fontWeight: 700 };

function Login({ onLogin }) {
  const [modal, setModal] = useState(null); // null | 'login' | 'about'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loadingState, setLoadingState] = useState(null); // null | 'loading' | 'success'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoadingState('loading');
    try {
      const data = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', data.token);
      setLoadingState('success');
      setTimeout(() => onLogin(data.username), 1500);
    } catch (err) {
      setLoadingState(null);
      alert('Invalid credentials. Try again.');
    }
  };

  const closeModal = () => {
    if (loadingState) return; // don't close while logging in
    setModal(null);
  };

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden flex flex-col"
      style={{ backgroundImage: "url('/loginbg.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 bg-black/70 pointer-events-none" />

      {/* Centered Hero */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4">
        <img src={logo} alt="CarGO Logo" className="h-20 w-auto object-contain mb-4 drop-shadow-xl" />

        <h1 className="text-4xl mb-2" style={{ ...rajdhani, color: '#ffffff', textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
          CarGO Logistics
        </h1>

        <p className="text-sm text-white/80 tracking-widest uppercase mb-10" style={{ textShadow: '0 1px 10px rgba(0,0,0,0.9)' }}>
          Moving freight forward, every mile.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => setModal('login')}
            className="px-7 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition cursor-pointer border-none"
          >
            Login
          </button>
          <button
            onClick={() => setModal('about')}
            className="px-7 py-2.5 rounded-lg text-sm font-semibold text-white border border-white/30 bg-white/10 hover:bg-white/20 transition cursor-pointer backdrop-blur-sm"
          >
            About
          </button>
        </div>
      </div>

      {/* Modal Backdrop */}
      {modal && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeModal}
        >
          {/* Modal Box */}
          <div
            className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: 'linear-gradient(160deg, #0f1623 0%, #1a2236 60%, #0f1623 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-2.5">
                <img src={logo} alt="CarGO Logo" className="h-7 w-auto object-contain" />
                <span style={{ ...rajdhani, fontSize: '0.95rem', color: '#ffffff' }}>CarGO Logistics</span>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-white transition cursor-pointer bg-transparent border-none p-1 rounded-md hover:bg-white/10"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>

            {/* Login Form */}
            {modal === 'login' && (
              <div className="px-8 py-8">
                <p className="text-[10px] text-gray-600 tracking-[0.2em] uppercase mb-1">Welcome back</p>
                <h2 className="text-xl font-semibold text-white mb-8">Sign in to your account</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="username" className="text-xs font-medium text-gray-400 uppercase tracking-wider">Username</label>
                    <input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="px-3.5 py-2.5 rounded-lg text-sm text-white placeholder-gray-600 outline-none transition"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="password" className="text-xs font-medium text-gray-400 uppercase tracking-wider">Password</label>
                    <div className="relative flex items-center">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 pr-10 rounded-lg text-sm text-white placeholder-gray-600 outline-none transition"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 text-gray-500 hover:text-gray-300 transition cursor-pointer bg-transparent border-none p-0"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="mt-3 w-full py-2.5 text-white font-semibold rounded-lg text-sm transition cursor-pointer border-none"
                    style={{ background: 'linear-gradient(90deg, #2563eb, #1d4ed8)' }}
                  >
                    Login
                  </button>
                </form>
                <a href="#" className="block text-center mt-3 text-xs text-gray-500 hover:text-blue-400 transition hover:underline">
                  Forgot Password?
                </a>
              </div>
            )}

            {/* About Content */}
            {modal === 'about' && (
              <div className="px-8 py-8">
                <p className="text-[10px] text-gray-600 tracking-[0.2em] uppercase mb-1">Who we are</p>
                <h2 className="text-xl font-semibold text-white mb-5">CarGO Logistics Services</h2>
                <p className="text-sm text-gray-400 leading-relaxed mb-3">
                  CarGO is a logistics management platform built to streamline freight operations, from load tendering and shipment tracking to EDI transmissions and invoicing.
                </p>
                <p className="text-sm text-gray-400 leading-relaxed mb-6">
                  Designed for logistics teams who need real-time visibility and seamless partner communication, all in one place.
                </p>
                <div className="pt-5 space-y-3 text-xs" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex justify-between"><span className="text-gray-600">System</span><span className="text-gray-300">CarGO Logistics EDI</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Version</span><span className="text-gray-300">1.0.0</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Year</span><span className="text-gray-300">2026 CarGO Logistics Services</span></div>
                </div>
              </div>
            )}

            {/* Loading / Success Overlay */}
            {loadingState && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-2xl" style={{ background: 'rgba(10,14,26,0.92)', backdropFilter: 'blur(4px)' }}>
                {loadingState === 'loading' && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-blue-500 animate-spin" />
                    <p className="text-sm text-gray-400 tracking-widest uppercase">Signing in...</p>
                  </div>
                )}
                {loadingState === 'success' && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                      <Check size={28} className="text-green-400" strokeWidth={2.5} />
                    </div>
                    <p className="text-sm text-green-400 tracking-widest uppercase">Success</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
