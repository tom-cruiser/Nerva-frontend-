"use client";

import React, { useState } from 'react';
import Link from 'next/link';

const DEPLOYMENTS = [
  {
    category: "GROCERY",
    status: "LIVE",
    city: "Northfield Grocers",
    subtitle: "412 stores · Midwest region",
    storeCount: "412",
    terminals: "3,120",
    before: "340ms",
    after: "4ms",
    partners: ["Custom Kiosk POS", "SAP Sync"],
  },
  {
    category: "APPAREL",
    status: "LIVE",
    city: "Vantage Apparel Co.",
    subtitle: "88 stores · Coastal flagship",
    storeCount: "88",
    terminals: "740",
    before: "290ms",
    after: "6ms",
    partners: ["Shopify POS Bridge", "NetSuite ERP"],
  },
  {
    category: "FUEL & C-STORE",
    status: "LIVE",
    city: "Anchor Fuel Marts",
    subtitle: "1,204 stores · National fleet",
    storeCount: "1,204",
    terminals: "9,650",
    before: "410ms",
    after: "3ms",
    partners: ["Pump Controller API", "Loyalty Vault"],
  },
  {
    category: "PHARMACY",
    status: "PILOT",
    city: "Loop Pharmacy Group",
    subtitle: "24 stores · Regulatory pilot",
    storeCount: "24",
    terminals: "160",
    before: "380ms",
    after: "5ms",
    partners: ["HIPAA Ledger", "Script Sync"],
  },
];

const ROADMAP = [
  { name: "Corebridge Retail", eta: "Aug 2026", size: "560 stores", region: "Southeast" },
  { name: "Halcyon Home Goods", eta: "Sep 2026", size: "310 stores", region: "Pacific NW" },
];

const TESTIMONIALS = [
  { quote: "We stopped losing transactions during outages the week we switched over.", name: "Dana Iqbal", role: "VP Infrastructure, Northfield Grocers" },
  { quote: "The sync engine handled our Black Friday load without anyone paging me.", name: "Marcus Well", role: "Director of Retail Systems, Vantage Apparel" },
  { quote: "Rollout to 1,200 sites took six weeks. I expected six months.", name: "Priya Chandran", role: "COO, Anchor Fuel Marts" },
];

function DeploymentCard({ d }: { d: typeof DEPLOYMENTS[number] }) {
  return (
    <div className="glass-card rounded-3xl p-6 hover-lift flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-5">
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#0052ff] bg-[#0052ff]/8 px-2.5 py-1 rounded-full">
            {d.category}
          </span>
          <span className={`text-[10px] font-mono font-bold tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
            d.status === "LIVE" ? "text-emerald-600 bg-emerald-500/10" : "text-amber-600 bg-amber-500/10"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${d.status === "LIVE" ? "bg-emerald-500" : "bg-amber-500"} status-pulse`} />
            {d.status}
          </span>
        </div>

        <h3 className="text-xl font-extrabold text-[#0b1e33] mb-1">{d.city}</h3>
        <p className="text-sm text-slate-500 font-medium mb-5">{d.subtitle}</p>

        <div className="grid grid-cols-2 gap-3 mb-5 text-xs font-mono">
          <div className="bg-slate-50 rounded-xl px-3 py-2.5">
            <div className="text-slate-400">STORES</div>
            <div className="text-[#0b1e33] font-bold text-sm">{d.storeCount}</div>
          </div>
          <div className="bg-slate-50 rounded-xl px-3 py-2.5">
            <div className="text-slate-400">TERMINALS</div>
            <div className="text-[#0b1e33] font-bold text-sm">{d.terminals}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-5">
          {d.partners.map((p) => (
            <span key={p} className="text-[10px] font-mono text-slate-500 border border-slate-200 rounded-full px-2.5 py-1">
              {p}
            </span>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-baseline justify-between">
        <span className="text-xs font-mono text-slate-400">Avg sync latency</span>
        <span className="text-sm font-mono font-bold text-[#0052ff]">
          <span className="text-slate-300 line-through mr-1.5">{d.before}</span>
          {d.after}
        </span>
      </div>
    </div>
  );
}

export default function MarketingLandingPage() {
  const [activeTab, setActiveTab] = useState<'sync' | 'security'>('sync');

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden selection:bg-[#0052ff]/10">

      {/* FLOATING HEADER */}
      <div className="fixed top-6 left-0 right-0 w-[92%] max-w-7xl mx-auto z-50 flex items-center justify-between pointer-events-none">
        <div className="
          pointer-events-auto flex items-center gap-3 px-6 py-3.5 rounded-[2rem]
          bg-white/85 backdrop-blur-2xl
          border-t border-l border-white/80 border-b border-r border-slate-200/60
          shadow-[0_35px_70px_-15px_rgba(0,82,255,0.28),0_18px_36px_-10px_rgba(0,82,255,0.15),0_6px_16px_-4px_rgba(11,30,51,0.18),inset_0_2px_4px_0_rgba(255,255,255,0.9),inset_0_-2px_6px_0_rgba(11,30,51,0.06)]
          transition-all duration-300 ease-out
          hover:-translate-y-1.5 hover:scale-105
          hover:shadow-[0_45px_85px_-15px_rgba(0,82,255,0.38),0_20px_40px_-8px_rgba(0,82,255,0.2),0_10px_24px_-6px_rgba(11,30,51,0.2),inset_0_2px_4px_0_rgba(255,255,255,1),inset_0_-2px_6px_0_rgba(11,30,51,0.08)]
        ">
          <span className="font-mono text-lg font-extrabold tracking-tight text-[#0b1e33] flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0052ff] status-pulse" />
            NERVA<span className="text-[#0052ff]">.</span>
          </span>
        </div>

        <nav className="
          pointer-events-auto flex items-center gap-6 md:gap-8 pl-6 pr-3 py-2 rounded-full
          bg-white/75 backdrop-blur-xl
          border-t border-l border-white/80 border-b border-r border-slate-200/60
          shadow-[0_25px_50px_-12px_rgba(0,82,255,0.12),0_4px_12px_-4px_rgba(11,30,51,0.05),inset_0_1px_1px_0_rgba(255,255,255,0.8)]
          transition-all duration-300 ease-out
          hover:shadow-[0_30px_55px_-10px_rgba(0,82,255,0.18)]
        ">
          <div className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-slate-500">
            <a href="#deployments" className="hover:text-[#0052ff] transition-colors duration-200">Deployments</a>
            <a href="#telemetry" className="hover:text-[#0052ff] transition-colors duration-200">Telemetry</a>
            <a href="#docs" className="hover:text-[#0052ff] transition-colors duration-200">Core API</a>
          </div>
          <span className="hidden md:inline-block w-px h-5 bg-slate-200" aria-hidden="true" />
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-[#0052ff] transition">
              Sign In
            </Link>
            <Link href="/admin" className="px-5 py-2.5 bg-[#0052ff] text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-[0_8px_20px_-6px_rgba(0,82,255,0.4)] hover:bg-blue-700 transition-all duration-200 hover:scale-[1.03]">
              Open Console
            </Link>
          </div>
        </nav>
      </div>

      {/* HERO */}
      <main className="relative pt-48 pb-24 px-6 max-w-7xl mx-auto flex flex-col items-center">
        <div className="fade-up inline-flex items-center gap-2 px-4 py-2 badge-tier rounded-full text-xs font-mono mb-8 font-bold">
          <span className="telemetry-dot bg-[#0052ff] status-pulse"></span>
          SYSTEM OPERATIONAL :: V2.0.4-LTS
        </div>

        <h1 className="fade-up text-5xl md:text-8xl font-extrabold text-center tracking-tight leading-none max-w-5xl mb-6 text-[#0b1e33]">
          The offline-first <br />
          <span className="gradient-text">Retail Operating System.</span>
        </h1>

        <p className="fade-up text-lg md:text-xl text-slate-500 text-center max-w-2xl font-medium leading-relaxed mb-12">
          Synchronize inventory, transactions, and telemetry instantly — even when the grid goes completely dark. Live across 1,700+ stores today.
        </p>

        <div className="fade-up flex flex-col sm:flex-row gap-4 mb-20 w-full justify-center max-w-md">
          <Link href="/admin" className="px-8 py-4 bg-[#0052ff] text-white font-bold rounded-xl text-center shadow-lg hover:bg-blue-700 hover-lift flex items-center justify-center gap-2">
            <span className="material-symbols-outlined">rocket_launch</span>
            Open Console
          </Link>
          <a href="#deployments" className="px-8 py-4 bg-white text-slate-700 font-bold rounded-xl text-center border border-slate-200 hover:bg-slate-50 transition shadow-sm hover-lift flex items-center justify-center gap-2">
            View Deployments
          </a>
        </div>

        {/* PRESS / TRUST STRIP */}
        <div className="fade-up w-full mb-24">
          <p className="text-center text-[11px] font-mono font-bold tracking-widest text-slate-400 mb-6">
            RUNNING IN PRODUCTION AT
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-slate-400 font-bold text-sm tracking-wide">
            <span>Northfield Grocers</span>
            <span>Vantage Apparel Co.</span>
            <span>Corebridge Retail</span>
            <span>Anchor Fuel Marts</span>
            <span>Loop Pharmacy Group</span>
          </div>
        </div>

        {/* DEPLOYMENT GRID (replaces feature grid) */}
        <section id="deployments" className="w-full">
          <div className="mb-10">
            <h2 className="text-3xl font-extrabold text-[#0b1e33] mb-3">Live deployments</h2>
            <p className="text-slate-500 text-sm max-w-lg font-medium">Real fleets, real latency numbers. Every deployment below is running Nerva's sync engine right now.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {DEPLOYMENTS.map((d) => (
              <DeploymentCard key={d.city} d={d} />
            ))}
          </div>
        </section>

        {/* STATS STRIP */}
        <section className="w-full mt-24 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass-card rounded-3xl p-8 text-center">
            <div className="text-4xl font-extrabold text-[#0052ff] mb-2">12%</div>
            <p className="text-sm text-slate-500 font-medium">of pilot deployments reach general availability inside 90 days</p>
          </div>
          <div className="glass-card rounded-3xl p-8 text-center">
            <div className="text-4xl font-extrabold text-[#0052ff] mb-2">58</div>
            <p className="text-sm text-slate-500 font-medium">integrity checks run on every terminal, every sync cycle</p>
          </div>
          <div className="glass-card rounded-3xl p-8 text-center">
            <div className="text-4xl font-extrabold text-[#0052ff] mb-2">$140K</div>
            <p className="text-sm text-slate-500 font-medium">avg. infra spend avoided per deployment in year one</p>
          </div>
        </section>

        {/* COMPARISON MARQUEE */}
        <section className="w-full mt-24 overflow-hidden rounded-3xl bg-[#0b1e33] py-10">
          <div className="marquee-track flex whitespace-nowrap text-2xl md:text-4xl font-extrabold text-white/20">
            {Array(6).fill(0).map((_, i) => (
              <span key={i} className="mx-8 flex items-center gap-8">
                Others give you a dashboard.
                <span className="text-[#4d8dff]">We give you an operating system.</span>
              </span>
            ))}
          </div>
        </section>

        {/* VISUAL ENGINE / TABBED TERMINAL DEMO */}
        <section id="telemetry" className="w-full mt-24 max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-[#0b1e33] mb-4">Under the Hood</h2>
            <p className="text-slate-500 text-sm max-w-lg mx-auto font-medium">Inspect how the engine pipeline balances load and monitors terminal telemetry across your retail fleet.</p>
          </div>

          <div className="glass-card rounded-3xl overflow-hidden shadow-xl border border-slate-200">
            <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <span className="ml-4 font-mono text-xs text-slate-500">nerva-terminal-stream.sh</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setActiveTab('sync')} className={`px-3 py-1 rounded text-xs font-mono font-bold transition ${activeTab === 'sync' ? 'bg-[#0052ff]/10 text-[#0052ff]' : 'text-slate-400'}`}>
                  Sync.log
                </button>
                <button onClick={() => setActiveTab('security')} className={`px-3 py-1 rounded text-xs font-mono font-bold transition ${activeTab === 'security' ? 'bg-[#0052ff]/10 text-[#0052ff]' : 'text-slate-400'}`}>
                  SecOps.log
                </button>
              </div>
            </div>

            <div className="p-6 bg-slate-950 font-mono text-xs text-slate-300 min-h-[220px] flex flex-col justify-between">
              {activeTab === 'sync' && (
                <div className="space-y-2">
                  <p className="text-slate-500">[2026-07-15 11:32:01] <span className="text-[#0052ff]">INFO:</span> Initializing synchronization thread #4...</p>
                  <p className="text-slate-500">[2026-07-15 11:32:02] <span className="text-[#0052ff]">INFO:</span> Local operational records matching hashes: 100%</p>
                  <p className="text-slate-300">[2026-07-15 11:32:03] <span className="text-yellow-400">WARN:</span> Connection offline. Redirecting transaction ledger to fallback buffer.</p>
                  <p className="text-emerald-400">[2026-07-15 11:32:04] SUCCESS: Saved tx_99218 to local offline buffer. System state: stable.</p>
                </div>
              )}
              {activeTab === 'security' && (
                <div className="space-y-2">
                  <p className="text-slate-500">[2026-07-15 11:30:15] <span className="text-purple-400">SECURE:</span> Initializing secure memory space.</p>
                  <p className="text-purple-300">[2026-07-15 11:30:16] KEYRING: Mounted local database key via client hardware storage.</p>
                  <p className="text-slate-500">[2026-07-15 11:30:17] Integrity validation passing for system assets.</p>
                </div>
              )}
              <div className="mt-8 pt-4 border-t border-slate-900 flex justify-between text-slate-500 text-[10px]">
                <span>STREAM: ACTIVE</span>
                <span>DESKTOP APP: CONNECTED</span>
                <span>BUFFERS: CLEAN</span>
              </div>
            </div>
          </div>
        </section>

        {/* ROADMAP / COMING SOON */}
        <section className="w-full mt-24">
          <div className="mb-10">
            <h2 className="text-3xl font-extrabold text-[#0b1e33] mb-3">See what's coming next</h2>
            <p className="text-slate-500 text-sm max-w-lg font-medium">Get early access to onboarding for these fleets before general rollout.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ROADMAP.map((r) => (
              <div key={r.name} className="glass-card rounded-3xl p-8 flex items-center justify-between hover-lift">
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full">
                    COMING SOON
                  </span>
                  <h3 className="text-xl font-extrabold text-[#0b1e33] mt-4 mb-1">{r.name}</h3>
                  <p className="text-sm text-slate-500 font-medium">{r.size} · {r.region} · ETA {r.eta}</p>
                </div>
                <button className="shrink-0 px-5 py-3 bg-[#0b1e33] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#0052ff] transition">
                  Join Waitlist
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="w-full mt-24 grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="glass-card rounded-3xl p-8">
              <p className="text-[#0b1e33] font-medium leading-relaxed mb-6">"{t.quote}"</p>
              <div className="text-xs font-mono">
                <div className="font-bold text-[#0b1e33]">{t.name}</div>
                <div className="text-slate-400">{t.role}</div>
              </div>
            </div>
          ))}
        </section>

        {/* PUNCHLINE BEFORE FOOTER */}
        <div className="w-full mt-32 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-[#0b1e33]">
            Why Sync Less,<br />When You Can <span className="text-[#0052ff]">Nerva</span>
          </h2>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white pt-16 pb-10 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10 mb-12 text-xs">
          <div>
            <div className="font-mono font-extrabold text-[#0b1e33] mb-4">EXPLORE</div>
            <ul className="space-y-2 text-slate-500 font-medium">
              <li><a href="#deployments" className="hover:text-[#0052ff]">Deployments</a></li>
              <li><a href="#telemetry" className="hover:text-[#0052ff]">Telemetry</a></li>
              <li><a href="#docs" className="hover:text-[#0052ff]">Core API</a></li>
              <li><Link href="/admin" className="hover:text-[#0052ff]">Console</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-mono font-extrabold text-[#0b1e33] mb-4">COMPANY</div>
            <ul className="space-y-2 text-slate-500 font-medium">
              <li><a href="#" className="hover:text-[#0052ff]">Our Story</a></li>
              <li><a href="#" className="hover:text-[#0052ff]">Careers</a></li>
              <li><a href="#" className="hover:text-[#0052ff]">Partners</a></li>
            </ul>
          </div>
          <div>
            <div className="font-mono font-extrabold text-[#0b1e33] mb-4">CONTACT</div>
            <ul className="space-y-2 text-slate-500 font-medium">
              <li>Sales: sales@nerva.systems</li>
              <li>Support: ops@nerva.systems</li>
            </ul>
          </div>
          <div>
            <div className="font-mono font-extrabold text-[#0b1e33] mb-4">LEGAL</div>
            <ul className="space-y-2 text-slate-500 font-medium">
              <li><a href="#" className="hover:text-[#0052ff]">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#0052ff]">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-slate-100 pt-6 text-center text-xs text-slate-400 font-mono">
          &copy; {new Date().getFullYear()} Nerva Intelligence Systems. Operating with extreme local resilience.
        </div>
      </footer>

      <style>{`
        .marquee-track {
          animation: marquee 28s linear infinite;
          width: max-content;
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track { animation: none; }
        }
      `}</style>
    </div>
  );
}