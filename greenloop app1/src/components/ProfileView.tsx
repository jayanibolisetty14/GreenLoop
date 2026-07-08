import React, { useState } from "react";
import { UserProfile, BiomassEntry, calculateUserLevel } from "../types";
import { getAvatarById, getRandomAvatarExcept, AVATAR_TEMPLATES } from "../lib/avatarTemplates";
import { LogOut, Scale, Flame, Zap, Settings, BarChart2, Check, User, Globe, AlertCircle, Edit3 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ProfileViewProps {
  userProfile: UserProfile;
  entries: BiomassEntry[];
  onSaveProfile: (displayName: string, avatarUrl: string) => Promise<void>;
  onLogout: () => void;
}

export default function ProfileView({ userProfile, entries, onSaveProfile, onLogout }: ProfileViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'stats' | 'settings'>('stats');
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Modal Edit states
  const [editDisplayName, setEditDisplayName] = useState(userProfile.displayName);
  const [editAvatarUrl, setEditAvatarUrl] = useState(userProfile.avatarUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // App settings state
  const [language, setLanguage] = useState<'English'>('English');

  // Compute totals
  const totalWaste = entries.reduce((sum, e) => sum + e.weight, 0);
  const totalBiogas = entries.reduce((sum, e) => sum + e.biogas, 0);
  const totalElectricity = entries.reduce((sum, e) => sum + e.electricity, 0);
  const totalLPG = entries.reduce((sum, e) => sum + e.lpgOffset, 0);
  const levelInfo = calculateUserLevel(entries.length);

  const avatar = getAvatarById(userProfile.avatarUrl);
  const editAvatar = getAvatarById(editAvatarUrl);

  // Trigger profile updates
  const handleSaveProfile = async () => {
    setError(null);
    if (!editDisplayName.trim()) {
      setError("Display name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await onSaveProfile(editDisplayName, editAvatarUrl);
      setShowEditModal(false);
    } catch (err: any) {
      setError(err.message || "Failed to update profile changes.");
    } finally {
      setSaving(false);
    }
  };

  // Avatar random shuffler
  const handleShuffleAvatar = () => {
    const nextAvatar = getRandomAvatarExcept(editAvatarUrl);
    setEditAvatarUrl(nextAvatar.id);
  };

  // Open Edit Profile modal
  const handleOpenEdit = () => {
    setEditDisplayName(userProfile.displayName);
    setEditAvatarUrl(userProfile.avatarUrl);
    setError(null);
    setShowEditModal(true);
  };

  return (
    <div id="profile_view" className="space-y-6 pb-24">
      
      {/* Header Profile Summary */}
      <div className="rounded-[2rem] bg-natural-cream p-6 border border-natural-border/70 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
        
        {/* Dynamic Avatar Container with Verified Badge */}
        <div className="relative">
          <div className={`h-20 w-20 rounded-full bg-gradient-to-tr ${avatar.bgGradient} flex items-center justify-center text-4xl shadow-md border-4 border-white ring-4 ring-natural-primary/25`}>
            {avatar.emoji}
          </div>
          {/* Verified Checkmark Badge */}
          <span className="absolute bottom-0 right-0 inline-flex items-center justify-center rounded-full bg-natural-primary p-1 text-white border-2 border-white shadow-xs">
            <svg className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </span>
        </div>

        <h2 id="profile_username" className="font-sans text-xl font-bold text-natural-dark mt-4 flex items-center gap-1.5 justify-center">
          {userProfile.displayName}
          
          {/* Edit Profile trigger button */}
          <button 
            id="edit_profile_trigger"
            onClick={handleOpenEdit}
            className="text-natural-dark/50 hover:text-natural-primary rounded-lg p-1 cursor-pointer transition-all"
            title="Edit Profile"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
        </h2>

        <p id="profile_email" className="text-xs text-natural-dark/50 mt-1 font-semibold font-mono">{userProfile.email || "No email available"}</p>
        
        {/* Dynamic level badge */}
        <div className="mt-3.5">
          <span id="profile_user_level_badge" className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border ${levelInfo.badgeColor}`}>
            {levelInfo.progressText}
          </span>
        </div>
      </div>

      {/* Profile sub-tab selector (Biomass Status vs App Settings) */}
      <div className="grid grid-cols-2 bg-natural-cream/60 p-1 rounded-2xl border border-natural-border/50">
        <button
          id="tab_biomass_stats"
          onClick={() => setActiveSubTab('stats')}
          className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSubTab === 'stats'
              ? "bg-natural-primary text-white shadow-md border-natural-primary/10"
              : "text-natural-dark/60 hover:text-natural-dark"
          }`}
        >
          <BarChart2 className="h-4 w-4" /> Biomass Status
        </button>
        <button
          id="tab_app_settings"
          onClick={() => setActiveSubTab('settings')}
          className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSubTab === 'settings'
              ? "bg-natural-primary text-white shadow-md border-natural-primary/10"
              : "text-natural-dark/60 hover:text-natural-dark"
          }`}
        >
          <Settings className="h-4 w-4" /> App Settings
        </button>
      </div>

      {/* Render sub-view */}
      <AnimatePresence mode="wait">
        
        {/* STATS VIEW */}
        {activeSubTab === 'stats' && (
          <motion.div
            key="stats-subview"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-3.5">
              
              {/* Total waste processed */}
              <div className="rounded-2xl bg-natural-cream p-4 border border-natural-border/60 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-natural-bg p-2.5 text-natural-primary/70 border border-natural-border/40">
                    <Scale className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-natural-dark/65 uppercase tracking-wider font-mono">Total Waste Analyzed</h4>
                    <p className="text-[10px] text-natural-dark/40 font-mono">Total waste</p>
                  </div>
                </div>
                <div id="stat_total_waste" className="font-sans font-extrabold text-base text-natural-dark">{totalWaste.toFixed(1)} kg</div>
              </div>

              {/* Total Biogas yield */}
              <div className="rounded-2xl bg-natural-cream p-4 border border-natural-border/60 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-natural-bg p-2.5 text-natural-primary border border-natural-border/40">
                    <Flame className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-natural-primary uppercase tracking-wider font-mono">Estimated Biogas</h4>
                    <p className="text-[10px] text-natural-dark/40 font-mono">AI-predicted biogas output</p>
                  </div>
                </div>
                <div id="stat_total_biogas" className="font-sans font-extrabold text-base text-natural-dark">{totalBiogas.toFixed(3)} m³</div>
              </div>

              {/* Electricity generated */}
              <div className="rounded-2xl bg-natural-cream p-4 border border-natural-border/60 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-natural-bg p-2.5 text-natural-accent border border-natural-border/40">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-natural-accent uppercase tracking-wider font-mono">Estimated Electricity</h4>
                    <p className="text-[10px] text-natural-dark/40 font-mono">Estimated electricity generated</p>
                  </div>
                </div>
                <div id="stat_total_electricity" className="font-sans font-extrabold text-base text-natural-dark">{totalElectricity.toFixed(2)} kWh</div>
              </div>

              {/* Cooking LPG saved */}
              <div className="rounded-2xl bg-natural-cream p-4 border border-natural-border/60 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-natural-bg p-2.5 text-[#4B6E80] border border-natural-border/40">
                    <Flame className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#4B6E80] uppercase tracking-wider font-mono">Estimated LPG Savings</h4>
                    <p className="text-[10px] text-natural-dark/40 font-mono">LPG equivalent saved</p>
                  </div>
                </div>
                <div id="stat_total_lpg" className="font-sans font-extrabold text-base text-natural-dark">{totalLPG.toFixed(3)} kg</div>
              </div>

            </div>
          </motion.div>
        )}

        {/* SETTINGS VIEW */}
        {activeSubTab === 'settings' && (
          <motion.div
            key="settings-subview"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-4"
          >
            <div className="rounded-[2rem] bg-natural-cream p-5 border border-natural-border/70 shadow-sm space-y-5">
              
              {/* Language Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-natural-dark/60 mb-2.5 flex items-center gap-1.5 font-mono">
                  <Globe className="h-4 w-4" /> Language Setting
                </label>
                <div className="mt-2">
                  {(['English'] as const).map((lang) => (
                    <button
                      id={`lang_${lang}`}
                      key={lang}
                      type="button"
                      onClick={() => setLanguage(lang)}
                      className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl border flex items-center justify-between cursor-pointer transition-all bg-natural-bg border-natural-primary text-natural-primary`}
                    >
                      {lang}
                      <Check className="h-4 w-4 text-natural-primary" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Log Out button */}
              <div className="pt-4 border-t border-natural-border/50">
                <button
                  id="profile_logout_btn"
                  type="button"
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FCEBEB] hover:bg-[#F9DDDD] text-red-700 font-bold py-3 text-xs border border-[#F4D2D2] cursor-pointer transition-all"
                >
                  <LogOut className="h-4.5 w-4.5" /> Log Out Account
                </button>
              </div>

            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* EDIT PROFILE & AVATAR MODAL */}
      <AnimatePresence>
        {showEditModal && (
          <div id="profile_edit_modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-[2rem] bg-natural-bg p-6 border border-natural-border shadow-2xl space-y-5 text-natural-dark"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-sans text-lg font-bold text-natural-dark">Edit Profile & Avatar</h3>
                  <p className="text-xs text-natural-dark/60 mt-0.5 font-mono">Customize your profile and avatar.</p>
                </div>
                <button
                  id="close_edit_modal_btn"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-lg p-1 text-natural-dark/55 hover:bg-natural-cream cursor-pointer"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Error label */}
              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-100">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Avatar selection & Shuffler panel */}
              <div className="flex flex-col items-center gap-3 bg-natural-cream py-4.5 rounded-2xl border border-natural-border/50">
                
                {/* Selected avatar indicator */}
                <div className={`h-24 w-24 rounded-full bg-gradient-to-tr ${editAvatar.bgGradient} flex items-center justify-center text-5xl shadow-md border-4 border-white ring-4 ring-natural-primary/35`}>
                  {editAvatar.emoji}
                </div>

                {/* Shuffle Button */}
                <button
                  id="avatar_shuffle_btn"
                  type="button"
                  onClick={handleShuffleAvatar}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-natural-primary bg-natural-bg/90 hover:bg-natural-bg border border-natural-border/50 px-3 py-1.5 rounded-full cursor-pointer transition-all"
                >
                  <svg className="h-3.5 w-3.5 rotate-45 text-natural-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="16 3 21 3 21 8" />
                    <line x1="4" y1="20" x2="21" y2="3" />
                    <polyline points="21 16 21 21 16 21" />
                    <line x1="15" y1="15" x2="21" y2="21" />
                    <line x1="4" y1="4" x2="9" y2="9" />
                  </svg>
                  Shuffle Avatar
                </button>

                {/* Direct Selection Grid */}
                <div className="w-full px-4 pt-2 border-t border-natural-border/30">
                  <p className="text-[10px] font-bold text-natural-dark/50 uppercase tracking-wider font-mono text-center mb-2">Or select an avatar directly</p>
                  <div className="grid grid-cols-6 gap-2 justify-items-center max-h-24 overflow-y-auto p-1 bg-white/40 rounded-xl border border-natural-border/20">
                    {AVATAR_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setEditAvatarUrl(tpl.id)}
                        className={`h-9 w-9 rounded-full bg-gradient-to-tr ${tpl.bgGradient} flex items-center justify-center text-lg transition-all cursor-pointer hover:scale-110 active:scale-95 ${
                          editAvatarUrl === tpl.id 
                            ? "ring-2 ring-natural-primary ring-offset-2 scale-110 shadow-xs" 
                            : "opacity-80 hover:opacity-100"
                        }`}
                        title={tpl.name}
                      >
                        {tpl.emoji}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Editable Name Field */}
              <div>
                <label htmlFor="edit_username_input" className="block text-xs font-bold uppercase tracking-wider text-natural-dark/60 mb-2 flex items-center gap-1 font-mono">
                  <User className="h-3.5 w-3.5" /> Display Username
                </label>
                <input
                  id="edit_username_input"
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="Enter custom username"
                  className="block w-full rounded-xl border border-natural-border bg-natural-bg py-3 px-4 text-sm text-natural-dark placeholder-natural-dark/40 focus:border-natural-primary focus:bg-white focus:ring-1 focus:ring-natural-primary focus:outline-none"
                  disabled={saving}
                />
              </div>

              {/* Save changes button */}
              <button
                id="save_profile_changes_btn"
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-natural-primary hover:bg-natural-primary/95 font-bold text-white py-3 text-xs shadow-md shadow-stone-200 transition-all cursor-pointer"
              >
                {saving ? (
                  <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Save Profile Changes"
                )}
              </button>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
