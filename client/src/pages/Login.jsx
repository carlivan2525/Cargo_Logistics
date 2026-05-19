import { useState } from 'react';
import { Eye, EyeOff, Truck } from 'lucide-react';
import logo from '../assets/CarGO-logo.png';
import { api } from '../api';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', data.token);
      onLogin(data.username);
    } catch (err) {
      alert('Server error. Try again.');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-app relative overflow-hidden">

      {/* Background glow blobs */}
      <div className="absolute w-72 h-72 bg-blue-600/20 rounded-full blur-3xl -top-20 -left-20 pointer-events-none" />
      <div className="absolute w-96 h-96 bg-blue-800/20 rounded-full blur-3xl -bottom-24 -right-20 pointer-events-none" />

      {/* Card */}
      <div className="relative z-10 flex w-[860px] max-w-[95vw] min-h-[500px] rounded-2xl overflow-hidden shadow-2xl border border-app">

        {/* Left Panel */}
        <div className="hidden md:flex w-[38%] bg-card border-r border-app flex-col items-center justify-between p-10 text-white">

          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <img src={logo} alt="CarGO Logo" className="h-16 w-auto object-contain" />
            <p className="text-xs text-gray-400 mt-1 text-center">Managing your shipments, simplified.</p>
          </div>

          {/* Truck SVG illustration */}
          <div className="flex-1 flex items-center justify-center py-6">
            <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-44 opacity-80">
              <rect x="10" y="90" width="180" height="6" rx="3" fill="rgba(255,255,255,0.08)" />
              <rect x="20" y="55" width="100" height="38" rx="6" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <rect x="120" y="65" width="50" height="28" rx="5" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <rect x="128" y="70" width="20" height="14" rx="3" fill="rgba(96,165,250,0.3)" />
              <circle cx="50"  cy="93" r="9" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
              <circle cx="50"  cy="93" r="4" fill="rgba(96,165,250,0.6)" />
              <circle cx="100" cy="93" r="9" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
              <circle cx="100" cy="93" r="4" fill="rgba(96,165,250,0.6)" />
              <circle cx="148" cy="93" r="9" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
              <circle cx="148" cy="93" r="4" fill="rgba(96,165,250,0.6)" />
              <circle cx="105" cy="28" r="12" fill="rgba(96,165,250,0.2)" stroke="rgba(96,165,250,0.6)" strokeWidth="1.5" />
              <circle cx="105" cy="28" r="5"  fill="#60a5fa" />
              <line x1="105" y1="40" x2="105" y2="55" stroke="rgba(96,165,250,0.5)" strokeWidth="1.5" strokeDasharray="3 2" />
            </svg>
          </div>

          {/* Feature text */}
          <div className="text-center mb-3">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Truck size={13} className="text-blue-400" />
              <p className="text-sm font-semibold text-app">Real-time Tracking</p>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">Monitor shipments, manage EDI docs, and streamline logistics operations.</p>
          </div>

          {/* Dots */}
          <div className="flex gap-1.5">
            <span className="w-5 h-1.5 bg-blue-500 rounded-full" />
            <span className="w-1.5 h-1.5 bg-white/20 rounded-full" />
            <span className="w-1.5 h-1.5 bg-white/20 rounded-full" />
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 bg-card flex items-center justify-center px-10 py-12">
          <div className="w-full max-w-sm">

            {/* Mobile logo */}
            <div className="flex md:hidden justify-center mb-6">
              <img src={logo} alt="CarGO Logo" className="h-10 w-auto object-contain" />
            </div>

            <h2 className="text-xl font-semibold text-app mb-1">Log in to CarGO</h2>
            <p className="text-sm text-gray-500 mb-7">Login using your official credentials</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              <div className="flex flex-col gap-1.5">
                <label htmlFor="username" className="text-sm font-medium text-gray-300">Username</label>
                <input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="px-3.5 py-2.5 border border-app rounded-lg text-sm bg-input text-white placeholder-gray-600 outline-none focus:border-blue-500 focus:bg-hover transition"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-sm font-medium text-gray-300">Password</label>
                <div className="relative flex items-center">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 border border-app rounded-lg text-sm bg-input text-white placeholder-gray-600 outline-none focus:border-blue-500 focus:bg-hover transition"
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
                className="mt-1 w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold rounded-lg text-sm transition cursor-pointer border-none"
              >
                Login
              </button>
            </form>

            <a href="#" className="block text-center mt-4 text-sm text-blue-400 hover:text-blue-300 transition hover:underline">
              Forgot Password?
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Login;
