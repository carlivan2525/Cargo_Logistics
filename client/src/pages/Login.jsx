import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Check, Package, Truck, FileText, BarChart2, Globe, ShieldCheck } from 'lucide-react';
import { api } from '../api';

const rajdhani = { fontFamily: 'Rajdhani, sans-serif', fontWeight: 700 };

const NAV_LINKS = [
  { label: 'Home',     href: '#hero' },
  { label: 'Services', href: '#services' },
  { label: 'About',    href: '#about' },
];

const services = [
  {
    icon: Truck,
    title: 'Shipment Management',
    desc: 'Track and manage your freight from origin to destination with real-time updates and EDI-driven automation.',
  },
  {
    icon: FileText,
    title: 'EDI Transactions',
    desc: 'Full ANSI X12 EDI support — automate 204 Load Tenders, 214 Shipment Status, 210 Invoices, and more.',
  },
  {
    icon: Package,
    title: 'Load Tendering',
    desc: 'Send and receive load tender requests between carriers and brokers with structured acceptance workflows.',
  },
  {
    icon: BarChart2,
    title: 'Analytics & Reports',
    desc: 'Generate freight cost reports, invoice analytics, and shipment summaries to drive data-backed decisions.',
  },
  {
    icon: Globe,
    title: 'Partner Network',
    desc: 'Manage your carrier and broker partners with contact info, EDI IDs, and transaction history in one place.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure & Reliable',
    desc: 'JWT-based authentication, role-aware access control, and audit trails keep your logistics data safe.',
  },
];

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loadingState, setLoadingState] = useState(null);
  const [activeSection, setActiveSection] = useState('hero');
  const [loginHighlight, setLoginHighlight] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const highlightTimer = useRef(null);

  // Track which section is in view using scroll position
  useEffect(() => {
    // Must match the actual DOM order (top to bottom)
    const sectionIds = ['hero', 'services', 'about'];

    const getActiveSection = () => {
      const scrollY = window.scrollY + 120; // offset for fixed header
      setScrolled(window.scrollY > 60);
      // Go from bottom to top — first one whose offsetTop <= scrollY wins
      let current = 'hero';
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el && scrollY >= el.offsetTop) {
          current = sectionIds[i];
          break;
        }
      }
      setActiveSection(current);
    };

    getActiveSection();
    window.addEventListener('scroll', getActiveSection, { passive: true });
    return () => window.removeEventListener('scroll', getActiveSection);
  }, []);

  // Scroll to login card + trigger highlight for 5 seconds
  const handleScrollToLogin = (e) => {
    e.preventDefault();
    const el = document.getElementById('login-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // Clear any existing timer
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    setLoginHighlight(true);
    highlightTimer.current = setTimeout(() => setLoginHighlight(false), 5000);
  };

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
      className="w-full min-h-screen relative overflow-x-hidden"
      style={{ backgroundImage: "url('/loginbg.png')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}
    >
      {/* Persistent dark overlay */}
      <div className="fixed inset-0 bg-black/70 pointer-events-none z-0" />

      {/* ── HEADER ── */}
      <header className={`fixed top-0 left-0 right-0 z-50 flex justify-center px-4 transition-all duration-300 ${scrolled ? 'pt-3' : 'pt-5'}`}>
        <div
          className={`w-full max-w-5xl flex items-center justify-between rounded-2xl transition-all duration-300 ${scrolled ? 'px-5 py-2' : 'px-6 py-4'}`}
          style={{
            background: 'rgba(255, 255, 255, 0.07)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.13)',
            boxShadow: '0 4px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <img src="/CarGO-logo.png" alt="CarGO Logo" className={`w-auto transition-all duration-300 ${scrolled ? 'h-7' : 'h-9'}`} />
            <span className={`text-white leading-none transition-all duration-300 ${scrolled ? 'text-base' : 'text-xl'}`} style={rajdhani}>CarGO</span>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-7 text-sm">
            {NAV_LINKS.map(({ label, href }) => {
              const sectionId = href.replace('#', '');
              const isActive = activeSection === sectionId;
              return (
                <a
                  key={href}
                  href={href}
                  className="transition font-medium"
                  style={{ color: isActive ? '#3b82f6' : 'rgba(255,255,255,0.55)' }}
                >
                  {label}
                </a>
              );
            })}
          </nav>

          {/* CTA */}
          <a
            href="#login-section"
            onClick={handleScrollToLogin}
            className="hidden sm:inline-flex items-center px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition hover:opacity-90 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              boxShadow: '0 2px 12px rgba(37,99,235,0.4)',
            }}
          >
            Get Started
          </a>
        </div>
      </header>

      {/* ── HERO + LOGIN ── */}
      <section
        id="hero"
        className="relative z-10 w-full min-h-screen flex flex-col lg:flex-row items-center justify-center gap-12 px-6 pt-32 pb-20 max-w-6xl mx-auto"
        style={{ scrollMarginTop: '80px' }}
      >
        {/* Hero text */}
        <div className="flex-1 text-left max-w-lg">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-blue-300 mb-6"
            style={{ background: 'rgba(37,99,235,0.18)', border: '1px solid rgba(37,99,235,0.3)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            ANSI X12 EDI Platform
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4" style={rajdhani}>
            Logistics, <br />
            <span className="text-blue-400">Automated.</span>
          </h1>
          <p className="text-white/50 text-base leading-relaxed mb-8">
            CarGO connects carriers, brokers, and shippers through a unified EDI-driven platform — streamlining freight transactions, shipment tracking, and invoice management end-to-end.
          </p>
          <a
            href="#services"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition"
            style={{ background: 'rgba(37,99,235,0.25)', border: '1px solid rgba(37,99,235,0.4)' }}
          >
            Explore Services ↓
          </a>
        </div>

        {/* Login card */}
        <div
          id="login-section"
          className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
          style={{
            scrollMarginTop: '90px',
            background: 'rgba(255, 255, 255, 0.07)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: loginHighlight
              ? '1px solid rgba(59, 130, 246, 0.8)'
              : '1px solid rgba(255, 255, 255, 0.13)',
            boxShadow: loginHighlight
              ? '0 0 0 4px rgba(59,130,246,0.25), 0 8px 40px rgba(37,99,235,0.5), inset 0 1px 0 rgba(255,255,255,0.08)'
              : '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
            transition: 'border 0.4s ease, box-shadow 0.4s ease',
          }}
        >
          <div className="px-8 py-8">
            <h2 className="text-lg font-semibold text-white mb-1" style={rajdhani}>Sign in</h2>
            <p className="text-xs text-white/35 mb-6">Access your CarGO dashboard</p>

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
      </section>

      {/* ── SERVICES ── */}
      <section
        id="services"
        className="relative z-10 w-full py-20 px-6"
        style={{ background: 'rgba(0,0,0,0.35)', borderTop: '1px solid rgba(255,255,255,0.06)', scrollMarginTop: '80px' }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-blue-400 font-medium mb-2">What We Offer</p>
            <h2 className="text-3xl font-bold text-white" style={rajdhani}>Platform Services</h2>
            <p className="text-white/40 text-sm mt-2 max-w-md mx-auto">
              Everything you need to manage modern freight logistics — powered by EDI standards.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl p-6 flex flex-col gap-3 transition hover:scale-[1.02]"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(37,99,235,0.3)' }}
                >
                  <Icon size={18} className="text-blue-400" />
                </div>
                <h3 className="text-white font-semibold text-sm" style={rajdhani}>{title}</h3>
                <p className="text-white/40 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section
        id="about"
        className="relative z-10 w-full py-40 px-6"
        style={{ scrollMarginTop: '100px', minHeight: '100vh' }}
      >
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 text-left">
            <p className="text-xs uppercase tracking-widest text-blue-400 font-medium mb-2">About the Platform</p>
            <h2 className="text-3xl font-bold text-white mb-4" style={rajdhani}>Built for Real-World Logistics</h2>
            <p className="text-white/45 text-sm leading-relaxed mb-4">
              CarGO is a full-stack Logistics Management System designed to simulate and automate real-world supply chain workflows using the ANSI X12 EDI standard. It bridges the gap between carriers, brokers, and shippers through structured, automated data exchange.
            </p>
            <p className="text-white/45 text-sm leading-relaxed">
              The platform handles end-to-end B2B EDI transactions — from load tendering and shipment tracking to invoicing and freight rate management — all in a single unified system.
            </p>
          </div>
          <div
            className="w-full max-w-xs rounded-2xl p-6 flex flex-col gap-4"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.09)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            {[
              { label: 'System', value: 'CarGO Logistics EDI' },
              { label: 'Standard', value: 'ANSI X12 EDI' },
              { label: 'Version', value: '1.0.0' },
              { label: 'Stack', value: 'React · Node.js · MongoDB' },
              { label: 'Year', value: '2026' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center text-xs" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
                <span className="text-white/30">{label}</span>
                <span className="text-white/65 font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="relative z-10 w-full py-8 px-6"
        style={{
          background: 'rgba(0,0,0,0.45)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/CarGO-logo.png" alt="CarGO Logo" className="h-6 w-auto opacity-70" />
            <span className="text-white/50 text-sm" style={rajdhani}>CarGO Logistics</span>
          </div>
          <p className="text-white/25 text-xs text-center">
            © 2026 CarGO Logistics Services. ANSI X12 EDI Platform.
          </p>
          <div className="flex gap-5 text-xs text-white/30">
            <a href="#hero" className="hover:text-white/60 transition">Home</a>
            <a href="#services" className="hover:text-white/60 transition">Services</a>
            <a href="#about" className="hover:text-white/60 transition">About</a>
            <a
              href="#login-section"
              onClick={handleScrollToLogin}
              className="hover:text-white/60 transition"
            >
              Login
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Login;
