import { Info, Server, Globe, Database, Layers, Truck, FileText, BarChart2, Users, Zap, Shield } from 'lucide-react';

const stack = [
  { icon: Layers,   label: 'Frontend',  value: 'React + Vite + Tailwind CSS' },
  { icon: Server,   label: 'Backend',   value: 'Node.js + Express' },
  { icon: Database, label: 'Database',  value: 'MongoDB + Mongoose' },
  { icon: Globe,    label: 'Deployment',value: 'Vercel' },
];

const services = [
  { icon: Truck,     title: 'Shipment Management',  desc: 'Track and manage shipments end-to-end with real-time status updates.' },
  { icon: FileText,  title: 'EDI Processing',        desc: 'Full ANSI X12 EDI support including 204, 990, 214, 210, 820, and 997 transactions.' },
  { icon: BarChart2, title: 'Analytics & Reports',   desc: 'Gain insights into your logistics operations with built-in reporting tools.' },
  { icon: Users,     title: 'Partner Network',       desc: 'Manage carriers, brokers, and trading partners from a single platform.' },
  { icon: Zap,       title: 'Load Tendering',        desc: 'Automate load tender workflows and reduce manual processing time.' },
  { icon: Shield,    title: 'Secure & Reliable',     desc: 'Role-based access control and secure data handling across all operations.' },
];

function About() {
  return (
    <div className="w-full">

      {/* ── What We Offer ── dark elevated bg */}
      <section style={{ backgroundColor: 'var(--elevated-bg)' }} className="w-full py-14 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-2 text-center">
            What We Offer
          </p>
          <h2 className="text-2xl font-bold text-app text-center mb-10">
            Platform Services
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-card border border-app rounded-xl p-5 space-y-3"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Icon size={16} className="text-blue-400" />
                </div>
                <p className="text-sm font-semibold text-app">{title}</p>
                <p className="text-xs text-muted-app leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About the Platform ── near-black bg */}
      <section style={{ backgroundColor: 'var(--app-bg)' }} className="w-full py-14 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-2 text-center">
            About the Platform
          </p>
          <h2 className="text-2xl font-bold text-app text-center mb-4">
            Built for Real-World Logistics
          </h2>
          <p className="text-sm text-muted-app text-center max-w-xl mx-auto mb-12 leading-relaxed">
            CarGO Logistics EDI is an all-in-one platform designed to streamline
            freight operations — from load tendering to invoice settlement —
            with full EDI compliance built in from the ground up.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* System Info */}
            <div className="bg-card border border-app rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Info size={15} className="text-blue-400" />
                <span className="font-semibold text-sm text-app">System Information</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs py-2 border-b border-app">
                  <span className="text-muted-app">System Name</span>
                  <span className="text-app font-medium">CarGO Logistics EDI</span>
                </div>
                <div className="flex justify-between text-xs py-2 border-b border-app">
                  <span className="text-muted-app">Version</span>
                  <span className="text-app font-mono">1.0.0</span>
                </div>
                <div className="flex justify-between text-xs py-2">
                  <span className="text-muted-app">EDI Standards</span>
                  <span className="text-app">ANSI X12 — 204, 990, 214, 210, 820, 997</span>
                </div>
              </div>
            </div>

            {/* Tech Stack */}
            <div className="bg-card border border-app rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Layers size={15} className="text-blue-400" />
                <span className="font-semibold text-sm text-app">Tech Stack</span>
              </div>
              <div className="space-y-2">
                {stack.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between text-xs py-2 border-b border-app last:border-0">
                    <div className="flex items-center gap-2 text-muted-app">
                      <Icon size={12} />
                      <span>{label}</span>
                    </div>
                    <span className="text-app font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── dark elevated, subtle */}
      <footer style={{ backgroundColor: 'var(--elevated-bg)' }} className="w-full border-t border-app py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-blue-400" />
            <span className="text-sm font-semibold text-app">CarGO Logistics EDI</span>
          </div>
          <p className="text-xs text-muted-app">
            © {new Date().getFullYear()} CarGO. All rights reserved.
          </p>
          <p className="text-xs text-muted-app">
            v1.0.0 · ANSI X12 Compliant
          </p>
        </div>
      </footer>

    </div>
  );
}

export default About;
