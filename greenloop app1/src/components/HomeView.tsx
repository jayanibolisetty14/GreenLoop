import React from "react";
import { BiomassEntry, UserProfile, BadgeTier, calculateUserLevel } from "../types";
import { getAvatarById } from "../lib/avatarTemplates";
import { Flame, Zap, Scale, Layers, HelpCircle, Scan, PlusCircle, BarChart3, History, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

interface HomeViewProps {
  username: string;
  userProfile: UserProfile | null;
  entries: BiomassEntry[];
  isLoading?: boolean;
  onNavigate: (screen: 'home' | 'scan' | 'add' | 'profile' | 'analytics' | 'history') => void;
}

export default function HomeView({ username, userProfile, entries, isLoading = false, onNavigate }: HomeViewProps) {
  // Compute totals
  const totalWaste = entries.reduce((sum, e) => sum + e.weight, 0);
  const totalBiogas = entries.reduce((sum, e) => sum + e.biogas, 0);
  const totalElectricity = entries.reduce((sum, e) => sum + e.electricity, 0);
  const totalLPG = entries.reduce((sum, e) => sum + e.lpgOffset, 0);
  const totalEntries = entries.length;

  // Determine Badge Tier based on entries
  const levelInfo = calculateUserLevel(totalEntries);

  // Get active avatar
  const avatar = getAvatarById(userProfile?.avatarUrl || "avatar-seedling");

  // Time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div id="home_view" className="space-y-6 pb-24">
      
      {/* Dynamic Header Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight text-natural-dark animate-fade-in">
            {getGreeting()}, <span id="home_username" className="text-natural-primary">{username}</span>
          </h1>
          <div className="mt-1.5 flex items-center gap-2">
            {isLoading ? (
              <>
                <div className="h-5 w-24 bg-stone-200/75 animate-pulse rounded-full" />
                <div className="h-4 w-28 bg-stone-200/60 animate-pulse rounded-md" />
              </>
            ) : (
              <>
                <span id="user_badge" className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${levelInfo.badgeColor}`}>
                  {levelInfo.progressText}
                </span>
                <span className="text-xs text-natural-dark/50 font-medium font-mono">• {totalEntries} {totalEntries === 1 ? "Bio-load" : "Bio-loads"} logged</span>
              </>
            )}
          </div>
        </div>
        
        {/* Rounded Avatar with tap to Profile */}
        {isLoading ? (
          <div className="h-12 w-12 rounded-full bg-stone-200/80 border-2 border-white ring-2 ring-stone-200/60 animate-pulse" />
        ) : (
          <button 
            id="home_avatar_btn"
            onClick={() => onNavigate("profile")}
            className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr ${avatar.bgGradient} text-2xl shadow-md border-2 border-white ring-2 ring-natural-border hover:scale-105 active:scale-95 transition-all cursor-pointer`}
            title="Go to profile"
          >
            {avatar.emoji}
          </button>
        )}
      </div>

      {/* Energy Conversion Output Empty / Summary Banner */}
      {isLoading ? (
        <div className="rounded-[2rem] bg-gradient-to-tr from-stone-100 to-stone-200/40 p-6 border border-stone-200/60 animate-pulse space-y-3.5">
          <div className="h-5 w-48 bg-stone-200/80 rounded-md" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-stone-200/70 rounded" />
            <div className="h-4 w-5/6 bg-stone-200/60 rounded" />
          </div>
          <div className="pt-2 flex gap-3">
            <div className="h-6 w-28 bg-stone-200/75 rounded-md" />
            <div className="h-6 w-28 bg-stone-200/75 rounded-md" />
          </div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] bg-gradient-to-tr from-natural-cream to-[#ECEFE9] p-6 border border-natural-border/70 relative overflow-hidden shadow-sm"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-10">
            <LeafIconLarge />
          </div>

          <h2 className="font-sans text-base font-bold text-natural-dark flex items-center gap-1.5 mb-2">
            Clean Energy Overview
          </h2>

          {totalEntries === 0 ? (
            <div>
              <p id="empty_state_msg" className="text-sm text-natural-dark/80 leading-relaxed max-w-sm">
                No waste has been recorded yet. Start by scanning or adding your first waste entry.
              </p>
              <button
                id="cta_scan_btn"
                onClick={() => onNavigate("scan")}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-natural-primary px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-natural-primary/95 cursor-pointer active:scale-95 transition-all"
              >
                Scan First Waste <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-natural-dark/80 leading-relaxed">
                Your home bioreactor is converting <span className="font-bold text-natural-primary">{totalWaste.toFixed(1)} kg</span> of bio-waste into clean resources. 
                You have successfully offset <span className="font-bold text-natural-accent">{totalLPG.toFixed(2)} kg</span> of cooking gas!
              </p>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex items-center gap-1 text-xs font-semibold text-natural-primary bg-natural-bg px-2 py-1 rounded-md border border-natural-border/50">
                  <Flame className="h-3.5 w-3.5 text-natural-accent" /> Biogas: {totalBiogas.toFixed(2)} m³
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-natural-dark bg-natural-bg px-2 py-1 rounded-md border border-natural-border/50">
                  <Zap className="h-3.5 w-3.5 text-[#E6A15C]" /> Power: {totalElectricity.toFixed(1)} kWh
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* 2x2 Stats Dashboard */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-natural-dark/40 mb-3 font-mono">
          Energy Conversion Output
        </h3>
        
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl bg-gradient-to-tr from-stone-50 to-stone-100/40 p-4.5 border border-stone-200/50 animate-pulse space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-16 bg-stone-200/70 rounded" />
                    <div className="h-7 w-7 bg-stone-200/60 rounded-lg" />
                  </div>
                  <div className="h-8 w-24 bg-stone-200/80 rounded" />
                  <div className="h-3.5 w-28 bg-stone-200/50 rounded" />
                </div>
              ))}
            </div>
            
            {/* 5th Banner loading skeleton */}
            <div className="rounded-2xl bg-gradient-to-tr from-stone-50 to-stone-100/40 p-3.5 border border-stone-200/50 animate-pulse flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 bg-stone-200/60 rounded-lg" />
                <div className="space-y-1.5">
                  <div className="h-4 w-36 bg-stone-200/70 rounded" />
                  <div className="h-3 w-48 bg-stone-200/50 rounded" />
                </div>
              </div>
              <div className="h-8 w-12 bg-stone-200/80 rounded-xl" />
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              
              {/* Card 1: Total Waste */}
              <div id="stat_waste" className="rounded-2xl bg-natural-cream p-4.5 border border-natural-border/70 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-natural-dark/60">Total Waste</span>
                  <div className="rounded-lg bg-natural-bg p-1.5 text-natural-dark/40 border border-natural-border/40">
                    <Scale className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <div id="val_waste" className="font-sans text-2xl font-extrabold text-natural-dark">
                    {totalWaste.toFixed(1)} <span className="text-sm font-medium text-natural-dark/40">kg</span>
                  </div>
                  <span className="text-[10px] text-natural-dark/50 mt-1 block">Total biomass recorded by the user.</span>
                </div>
              </div>

              {/* Card 2: Biogas Generated */}
              <div id="stat_biogas" className="rounded-2xl bg-natural-cream p-4.5 border border-natural-border/70 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-natural-dark/60">Biogas Yield</span>
                  <div className="rounded-lg bg-natural-bg p-1.5 text-natural-primary border border-natural-border/40">
                    <Flame className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <div id="val_biogas" className="font-sans text-2xl font-extrabold text-natural-dark">
                    {totalBiogas.toFixed(2)} <span className="text-sm font-medium text-natural-dark/40">m³</span>
                  </div>
                  <span className="text-[10px] text-natural-dark/50 mt-1 block">Estimated biogas from recorded biomass.</span>
                </div>
              </div>

              {/* Card 3: Electricity */}
              <div id="stat_electricity" className="rounded-2xl bg-natural-cream p-4.5 border border-natural-border/70 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-natural-dark/60">Electricity</span>
                  <div className="rounded-lg bg-natural-bg p-1.5 text-natural-accent border border-natural-border/40">
                    <Zap className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <div id="val_electricity" className="font-sans text-2xl font-extrabold text-natural-dark">
                    {totalElectricity.toFixed(2)} <span className="text-sm font-medium text-natural-dark/40">kWh</span>
                  </div>
                  <span className="text-[10px] text-natural-dark/50 mt-1 block">Estimated electricity from predicted biogas.</span>
                </div>
              </div>

              {/* Card 4: Cooking LPG */}
              <div id="stat_lpg" className="rounded-2xl bg-natural-cream p-4.5 border border-natural-border/70 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-natural-dark/60">LPG Offset</span>
                  <div className="rounded-lg bg-natural-bg p-1.5 text-natural-primary border border-natural-border/40">
                    <Flame className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <div id="val_lpg" className="font-sans text-2xl font-extrabold text-natural-dark">
                    {totalLPG.toFixed(2)} <span className="text-sm font-medium text-natural-dark/40">kg</span>
                  </div>
                  <span className="text-[10px] text-natural-dark/50 mt-1 block">Estimated LPG savings based on biogas.</span>
                </div>
              </div>

            </div>

            {/* 5th Card: Total Entries Banner */}
            <div id="stat_entries" className="mt-4 rounded-2xl bg-natural-cream px-4 py-3 border border-natural-border/70 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-natural-bg p-1.5 text-natural-dark/40 border border-natural-border/40">
                  <Layers className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-natural-dark/80">Total Waste Entries</h4>
                  <p className="text-[10px] text-natural-dark/50">Total biomass records added by the user.</p>
                </div>
              </div>
              <div id="val_entries" className="font-sans text-lg font-black text-natural-dark bg-natural-bg px-3 py-1 rounded-xl border border-natural-border/70">
                {totalEntries}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-natural-dark/40 mb-3 font-mono">
          Quick Actions
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          
          <button
            id="action_scan"
            onClick={() => onNavigate("scan")}
            className="rounded-2xl bg-natural-cream p-4 border border-natural-border/50 shadow-sm hover:border-natural-primary transition-all text-left group cursor-pointer"
          >
            <div className="rounded-xl bg-natural-primary p-2.5 text-white w-fit group-hover:scale-110 transition-transform mb-3">
              <Scan className="h-5 w-5" />
            </div>
            <h4 className="font-sans text-sm font-bold text-natural-dark">Scan Waste</h4>
          </button>

          <button
            id="action_add"
            onClick={() => onNavigate("add")}
            className="rounded-2xl bg-natural-cream p-4 border border-natural-border/50 shadow-sm hover:border-natural-primary transition-all text-left group cursor-pointer"
          >
            <div className="rounded-xl bg-natural-primary/80 p-2.5 text-white w-fit group-hover:scale-110 transition-transform mb-3">
              <PlusCircle className="h-5 w-5" />
            </div>
            <h4 className="font-sans text-sm font-bold text-natural-dark">Add Waste</h4>
          </button>

          <button
            id="action_analytics"
            onClick={() => onNavigate("analytics")}
            className="rounded-2xl bg-natural-cream p-4 border border-natural-border/50 shadow-sm hover:border-natural-primary transition-all text-left group cursor-pointer"
          >
            <div className="rounded-xl bg-natural-accent p-2.5 text-white w-fit group-hover:scale-110 transition-transform mb-3">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h4 className="font-sans text-sm font-bold text-natural-dark">Analytics</h4>
          </button>

          <button
            id="action_history"
            onClick={() => onNavigate("history")}
            className="rounded-2xl bg-natural-cream p-4 border border-natural-border/50 shadow-sm hover:border-natural-primary transition-all text-left group cursor-pointer"
          >
            <div className="rounded-xl bg-[#4B6E80] p-2.5 text-white w-fit group-hover:scale-110 transition-transform mb-3">
              <History className="h-5 w-5" />
            </div>
            <h4 className="font-sans text-sm font-bold text-natural-dark">History</h4>
          </button>

        </div>
      </div>

    </div>
  );
}

// Inline small SVG assets to keep implementation standalone
function SparkleIcon() {
  return (
    <svg className="h-4.5 w-4.5 text-natural-primary animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  );
}

function LeafIconLarge() {
  return (
    <svg className="h-28 w-28 text-natural-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.58-1 11.1a7 7 0 0 1-7 6.9Z" />
      <path d="M9 22a1 1 0 0 1-1-1v-2" />
    </svg>
  );
}
