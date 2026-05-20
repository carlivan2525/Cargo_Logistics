import { Info, Server, Globe, Database, Layers } from 'lucide-react';

const stack = [
  { icon: Layers,   label: 'Frontend',  value: 'React + Vite + Tailwind CSS' },
  { icon: Server,   label: 'Backend',   value: 'Node.js + Express' },
  { icon: Database, label: 'Database',  value: 'MongoDB + Mongoose' },
  { icon: Globe,    label: 'Deployment',value: 'Vercel' },
];

function About() {
  return (
    <div className="flex justify-center">
    <div className="w-full max-w-xl space-y-4">
      <div className="bg-card border border-app rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Info size={15} className="text-blue-400" />
          <span className="font-semibold text-sm text-app">System Information</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs py-2 border-b border-app">
            <span className="text-gray-500">System Name</span>
            <span className="text-app font-medium">CarGO Logistics EDI</span>
          </div>
          <div className="flex justify-between text-xs py-2 border-b border-app">
            <span className="text-gray-500">Version</span>
            <span className="text-app font-mono">1.0.0</span>
          </div>
          <div className="flex justify-between text-xs py-2">
            <span className="text-gray-500">EDI Standards</span>
            <span className="text-app">ANSI X12 — 204, 990, 214, 210</span>
          </div>
        </div>
      </div>

      <div className="bg-card border border-app rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Layers size={15} className="text-blue-400" />
          <span className="font-semibold text-sm text-app">Tech Stack</span>
        </div>
        <div className="space-y-2">
          {stack.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center justify-between text-xs py-2 border-b border-app last:border-0">
              <div className="flex items-center gap-2 text-gray-500">
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
  );
}

export default About;
