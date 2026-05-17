import React, { useState } from 'react';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim() !== '') {
      onLogin(username);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-indigo-50 relative overflow-hidden">

      {/* Blobs */}
      <div className="absolute w-64 h-64 bg-blue-300 rounded-full opacity-40 -top-16 -left-16" />
      <div className="absolute w-80 h-80 bg-blue-500 rounded-full opacity-40 -bottom-20 -right-16" />

      {/* Card */}
      <div className="relative z-10 flex w-[860px] max-w-[95vw] min-h-[480px] rounded-2xl overflow-hidden shadow-2xl">

        {/* Left Panel */}
        <div className="hidden md:flex w-[38%] bg-gradient-to-br from-blue-400 to-blue-600 flex-col items-center justify-between p-10 text-white">

          {/* Brand */}
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-widest uppercase text-white m-0">Logistic</h1>
            <p className="text-xs opacity-75 mt-1">Managing your shipments, simplified.</p>
          </div>

          {/* Truck SVG */}
          <div className="flex-1 flex items-center justify-center py-4">
            <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-44">
              <rect x="10" y="90" width="180" height="6" rx="3" fill="rgba(255,255,255,0.2)" />
              <rect x="20" y="55" width="100" height="38" rx="6" fill="rgba(255,255,255,0.25)" />
              <rect x="120" y="65" width="50" height="28" rx="5" fill="rgba(255,255,255,0.3)" />
              <rect x="128" y="70" width="20" height="14" rx="3" fill="rgba(255,255,255,0.5)" />
              <circle cx="50" cy="93" r="9" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" />
              <circle cx="50" cy="93" r="4" fill="rgba(255,255,255,0.4)" />
              <circle cx="100" cy="93" r="9" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" />
              <circle cx="100" cy="93" r="4" fill="rgba(255,255,255,0.4)" />
              <circle cx="148" cy="93" r="9" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" />
              <circle cx="148" cy="93" r="4" fill="rgba(255,255,255,0.4)" />
              <circle cx="105" cy="30" r="12" fill="rgba(255,255,255,0.9)" />
              <circle cx="105" cy="30" r="5" fill="#3b82f6" />
              <line x1="105" y1="42" x2="105" y2="55" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeDasharray="3 2" />
            </svg>
          </div>

          {/* Feature */}
          <div className="text-center mb-3">
            <p className="text-sm font-semibold mb-1">Tracking</p>
            <p className="text-xs opacity-75 leading-relaxed">Real-time shipment tracking and delivery management at your fingertips.</p>
          </div>

          {/* Dots */}
          <div className="flex gap-1.5">
            <span className="w-5 h-2 bg-white rounded-full" />
            <span className="w-2 h-2 bg-white/40 rounded-full" />
            <span className="w-2 h-2 bg-white/40 rounded-full" />
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 bg-white flex items-center justify-center px-10 py-12">
          <div className="w-full max-w-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Log in to Logistic</h2>
            <p className="text-sm text-gray-500 mb-7">Login using your official credentials</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* Username */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="username" className="text-sm font-medium text-gray-700">Username</label>
                <input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:bg-white transition"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
                <div className="relative flex items-center">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-14 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-xs text-blue-500 font-medium cursor-pointer bg-transparent border-none"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="mt-1 w-full py-3 bg-blue-500 hover:bg-blue-600 active:scale-[0.98] text-white font-semibold rounded-lg text-sm transition cursor-pointer border-none"
              >
                Login
              </button>
            </form>

            <a href="#" className="block text-center mt-4 text-sm text-blue-500 hover:underline">
              Forgot Password?
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Login;
