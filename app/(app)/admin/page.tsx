'use client';
import React from 'react';

export default function DashboardPage() {
  return (
    <div className="flex-1 overflow-y-auto p-7 space-y-6">

      {/* Metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="glass-card rounded-2xl p-5 flex items-center justify-between hover-lift">
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-1.5">Total accounts</p>
            <p className="text-3xl font-extrabold text-zinc-900 tracking-tight">1,284</p>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50/80 px-2.5 py-0.5 rounded-full mt-2 inline-block border border-emerald-200/30">+12% MoM</span>
          </div>
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-full h-full metric-ring" viewBox="0 0 36 36">
              <path className="text-zinc-100" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="text-emerald-500" strokeDasharray="88,100" strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <span className="absolute text-[10px] font-bold font-mono text-emerald-600">88%</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 flex items-center justify-between hover-lift">
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-1.5">Enterprise tier</p>
            <p className="text-3xl font-extrabold text-zinc-900 tracking-tight">42</p>
            <span className="text-[11px] font-bold text-zinc-600 bg-zinc-100/80 px-2.5 py-0.5 rounded-full mt-2 inline-block border border-zinc-200/30">+3 active</span>
          </div>
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-full h-full metric-ring" viewBox="0 0 36 36">
              <path className="text-zinc-100" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="text-zinc-500" strokeDasharray="42,100" strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <span className="absolute text-[10px] font-bold font-mono text-zinc-600">42%</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 flex items-center justify-between hover-lift">
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-1.5">Active provisions</p>
            <p className="text-3xl font-extrabold text-amber-600 tracking-tight">8.4</p>
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50/80 px-2.5 py-0.5 rounded-full mt-2 inline-block border border-amber-200/30 status-pulse">load index</span>
          </div>
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-full h-full metric-ring" viewBox="0 0 36 36">
              <path className="text-zinc-100" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="text-amber-500" strokeDasharray="65,100" strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <span className="absolute text-[10px] font-bold font-mono text-amber-600">6.5</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 flex items-center justify-between hover-lift">
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-1.5">Capacity used</p>
            <p className="text-3xl font-extrabold text-[#0052ff] tracking-tight">24%</p>
            <span className="text-[11px] font-bold text-[#0052ff] bg-[#0052ff]/10 px-2.5 py-0.5 rounded-full mt-2 inline-block border border-[#0052ff]/20">optimal</span>
          </div>
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-full h-full metric-ring" viewBox="0 0 36 36">
              <path className="text-zinc-100" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="text-[#0052ff]" strokeDasharray="24,100" strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <span className="absolute text-[10px] font-bold font-mono text-[#0052ff]">24%</span>
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-[0_16px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60">
        <div className="px-6 py-4 border-b border-zinc-200/40 flex justify-between items-center bg-white/40">
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-600 flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-[#0052ff]" data-icon="database">database</span>
            Account metric engine
          </h2>
          <div className="flex gap-2.5">
            <button className="bg-[#0052ff] text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl hover:bg-[#0041cc] transition-all shadow-[0_4px_12px_rgba(0,82,255,0.25)] hover:shadow-[0_6px_20px_rgba(0,82,255,0.35)] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base" data-icon="add">add</span> New instance
            </button>
            <button className="border border-zinc-200/60 bg-white/60 text-zinc-500 p-2 rounded-xl hover:bg-zinc-50 transition-colors shadow-sm">
              <span className="material-symbols-outlined text-sm flex" data-icon="tune">tune</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/60 border-b border-zinc-200/30 text-zinc-500 text-[10px] font-bold uppercase tracking-[0.12em]">
                <th className="px-6 py-4">Account workspace</th>
                <th className="px-6 py-4">Allocation tier</th>
                <th className="px-6 py-4">Registration matrix</th>
                <th className="px-6 py-4">Provisioning status</th>
                <th className="px-6 py-4 text-right">Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100/60 text-xs font-medium text-zinc-700">
              {/* Row 1 */}
              <tr className="hover:bg-[#0052ff]/[0.02] table-row-glow transition-all cursor-default group">
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-zinc-900 font-bold text-sm tracking-tight flex items-center gap-2">
                      alex.chen@enterprise.io
                      <span className="bg-emerald-100/70 text-emerald-700 text-[8px] font-bold px-2 py-0.5 rounded-full border border-emerald-200/30">verified</span>
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">ID · ACC-94021</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 text-[9px] font-extrabold badge-tier rounded-full tracking-wider">ENTERPRISE</span>
                </td>
                <td className="px-6 py-4 text-zinc-500 font-semibold uppercase text-[11px] tracking-wide">Oct 12, 2023</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3 w-44">
                    <span className="text-[10px] font-bold font-mono text-emerald-600">100% · OK</span>
                    <div className="h-1.5 flex-1 bg-zinc-100/80 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-emerald-500 rounded-full w-full shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 hover:bg-zinc-100/80 rounded-xl text-zinc-400 hover:text-zinc-800 transition-colors" title="Upgrade"><span className="material-symbols-outlined text-base" data-icon="arrow_upward">arrow_upward</span></button>
                    <button className="p-1.5 hover:bg-zinc-100/80 rounded-xl text-zinc-400 hover:text-rose-600 transition-colors" title="Suspend"><span className="material-symbols-outlined text-base" data-icon="pause_circle">pause_circle</span></button>
                  </div>
                </td>
              </tr>
              {/* Row 2 */}
              <tr className="hover:bg-[#0052ff]/[0.02] table-row-glow transition-all cursor-default group">
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-zinc-900 font-bold text-sm tracking-tight flex items-center gap-2">
                      contact@urban-logistics.com
                      <span className="bg-amber-100/70 text-amber-700 text-[8px] font-bold px-2 py-0.5 rounded-full border border-amber-200/30">provisioning</span>
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">ID · ACC-88312</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 text-[9px] font-extrabold badge-professional rounded-full tracking-wider">PROFESSIONAL</span>
                </td>
                <td className="px-6 py-4 text-zinc-500 font-semibold uppercase text-[11px] tracking-wide">Nov 04, 2023</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3 w-44">
                    <span className="text-[10px] font-bold font-mono text-amber-600">65% · run</span>
                    <div className="h-1.5 flex-1 bg-zinc-100/80 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-amber-500 rounded-full w-[65%]"></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 hover:bg-zinc-100/80 rounded-xl text-zinc-400 hover:text-zinc-800 transition-colors" title="Upgrade"><span className="material-symbols-outlined text-base" data-icon="arrow_upward">arrow_upward</span></button>
                    <button className="p-1.5 hover:bg-zinc-100/80 rounded-xl text-zinc-400 hover:text-rose-600 transition-colors" title="Suspend"><span className="material-symbols-outlined text-base" data-icon="pause_circle">pause_circle</span></button>
                  </div>
                </td>
              </tr>
              {/* Row 3 */}
              <tr className="hover:bg-[#0052ff]/[0.02] table-row-glow transition-all cursor-default group">
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-zinc-900 font-bold text-sm tracking-tight flex items-center gap-2">
                      devops@nebula-core.io
                      <span className="bg-emerald-100/70 text-emerald-700 text-[8px] font-bold px-2 py-0.5 rounded-full border border-emerald-200/30">active</span>
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">ID · ACC-91204</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 text-[9px] font-extrabold badge-tier rounded-full tracking-wider">ENTERPRISE</span>
                </td>
                <td className="px-6 py-4 text-zinc-500 font-semibold uppercase text-[11px] tracking-wide">Sep 28, 2023</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3 w-44">
                    <span className="text-[10px] font-bold font-mono text-emerald-600">98% · OK</span>
                    <div className="h-1.5 flex-1 bg-zinc-100/80 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-emerald-500 rounded-full w-[98%] shadow-[0_0_8px_rgba(16,185,129,0.2)]"></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 hover:bg-zinc-100/80 rounded-xl text-zinc-400 hover:text-zinc-800 transition-colors"><span className="material-symbols-outlined text-base" data-icon="arrow_upward">arrow_upward</span></button>
                    <button className="p-1.5 hover:bg-zinc-100/80 rounded-xl text-zinc-400 hover:text-rose-600 transition-colors"><span className="material-symbols-outlined text-base" data-icon="pause_circle">pause_circle</span></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-3.5 bg-white/40 border-t border-zinc-200/30 flex justify-between items-center text-xs text-zinc-500 font-bold uppercase tracking-wider">
          <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#0052ff]/20"></span> Showing 3 of 1,284 metric points</p>
          <div className="flex items-center gap-1.5">
            <button className="p-1.5 rounded-xl border border-zinc-200/60 bg-white/60 hover:bg-zinc-50 transition-colors shadow-sm"><span className="material-symbols-outlined text-base flex" data-icon="chevron_left">chevron_left</span></button>
            <button className="px-3.5 py-1.5 rounded-xl bg-[#0052ff] text-white font-extrabold shadow-[0_2px_12px_rgba(0,82,255,0.2)]">1</button>
            <button className="px-3.5 py-1.5 rounded-xl hover:bg-zinc-100/70 transition-colors text-zinc-600">2</button>
            <button className="px-3.5 py-1.5 rounded-xl hover:bg-zinc-100/70 transition-colors text-zinc-600">3</button>
            <button className="p-1.5 rounded-xl border border-zinc-200/60 bg-white/60 hover:bg-zinc-50 transition-colors shadow-sm"><span className="material-symbols-outlined text-base flex" data-icon="chevron_right">chevron_right</span></button>
          </div>
        </div>
      </div>

      {/* Bottom row: telemetry log + mini chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 glass-card rounded-2xl p-5 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.06)] border border-white/60">
          <div className="flex justify-between items-center mb-4 border-b border-zinc-200/30 pb-3">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-[#0052ff]" data-icon="sync">sync</span> Telemetry real-time stream
            </h3>
            <button className="text-zinc-400 text-[10px] hover:text-zinc-800 transition-colors font-bold uppercase tracking-wider flex items-center gap-1">Expand <span className="material-symbols-outlined text-sm">open_in_full</span></button>
          </div>
          <div className="space-y-2.5 font-mono text-[11px] font-medium">
            <div className="flex items-start justify-between p-2.5 rounded-xl bg-zinc-50/50 border border-zinc-200/20 hover:bg-zinc-100/40 transition-colors">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-zinc-400 text-[10px]">[08:22:11]</span>
                <span className="text-amber-600 font-bold text-[10px] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/20">PROV_TRIGGERED</span>
                <span className="text-zinc-600 font-sans font-semibold text-xs">Urban Logistics · Phase 2</span>
              </div>
              <span className="text-zinc-400 text-[10px] font-mono">ID:8821</span>
            </div>
            <div className="flex items-start justify-between p-2.5 rounded-xl bg-zinc-50/50 border border-zinc-200/20 hover:bg-zinc-100/40 transition-colors">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-zinc-400 text-[10px]">[08:10:45]</span>
                <span className="text-emerald-600 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/20">UPGRADE_OK</span>
                <span className="text-zinc-600 font-sans font-semibold text-xs">Alex Chen → Enterprise</span>
              </div>
              <span className="text-zinc-400 text-[10px] font-mono">ROOT</span>
            </div>
            <div className="flex items-start justify-between p-2.5 rounded-xl bg-zinc-50/50 border border-zinc-200/20 hover:bg-zinc-100/40 transition-colors">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-zinc-400 text-[10px]">[07:58:02]</span>
                <span className="text-blue-600 font-bold text-[10px] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/20">SCALE_OUT</span>
                <span className="text-zinc-600 font-sans font-semibold text-xs">Nebula Core · replica 3</span>
              </div>
              <span className="text-zinc-400 text-[10px] font-mono">AUTO</span>
            </div>
          </div>
        </div>

        {/* Micro chart */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between shadow-[0_12px_40px_-12px_rgba(0,0,0,0.06)] border border-white/60">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-[#0052ff]" data-icon="show_chart">show_chart</span> Strain interval velocity
          </h3>
          <div className="relative h-28 w-full flex items-end gap-1.5 px-1 mt-4">
            <div className="flex-1 bg-zinc-100/70 h-[30%] hover:bg-zinc-300/50 transition-all rounded-t-md border border-white/20"></div>
            <div className="flex-1 bg-zinc-100/70 h-[45%] hover:bg-zinc-300/50 transition-all rounded-t-md"></div>
            <div className="flex-1 bg-zinc-100/70 h-[25%] hover:bg-zinc-300/50 transition-all rounded-t-md"></div>
            <div className="flex-1 bg-amber-400/30 h-[60%] hover:bg-amber-400/50 transition-all rounded-t-md border border-amber-200/30"></div>
            <div className="flex-1 bg-blue-500/20 h-[85%] hover:bg-blue-500/40 transition-all rounded-t-md border border-blue-200/30"></div>
            <div className="flex-1 bg-zinc-100/70 h-[40%] hover:bg-zinc-300/50 transition-all rounded-t-md"></div>
            <div className="flex-1 bg-[#0052ff] h-[95%] rounded-t-md shadow-[0_4px_20px_rgba(0,82,255,0.35)] border border-white/40"></div>
          </div>
          <div className="mt-3 flex justify-between text-[9px] text-zinc-400 font-mono font-bold tracking-widest">
            <span>08:00</span>
            <span className="text-[#0052ff] flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#0052ff] animate-pulse"></span> live</span>
            <span>09:00</span>
          </div>
        </div>
      </div>

    </div>
  );
}
