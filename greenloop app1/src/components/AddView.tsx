import React, { useState, useEffect } from "react";
import { Info, HelpCircle, AlertCircle, PlusCircle, CheckCircle2 } from "lucide-react";
import { WasteCategory, BiomassEntry } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface AddViewProps {
  initialCategory?: WasteCategory | null;
  lastCalculation?: {
    category: WasteCategory | null;
    weight: number;
    biogas: number;
    electricity: number;
    lpgOffset: number;
  } | null;
  onSaveLastCalculation: (calc: {
    category: WasteCategory | null;
    weight: number;
    biogas: number;
    electricity: number;
    lpgOffset: number;
  }) => Promise<void>;
  onAddEntry: (entry: Omit<BiomassEntry, "id">) => Promise<void>;
}

export const CONVERSION_FORMULAS = {
  biogas: 0.06,      // Biogas (m³) = Waste (kg) * 0.06
  electricity: 2.0,  // Electricity (kWh) = Biogas (m³) * 2
  lpg: 0.43          // LPG (kg) = Biogas (m³) * 0.43
};

export default function AddView({ 
  initialCategory = null, 
  lastCalculation = null, 
  onSaveLastCalculation, 
  onAddEntry 
}: AddViewProps) {
  const [category, setCategory] = useState<WasteCategory | null>(() => {
    return lastCalculation?.category || initialCategory || null;
  });
  const [weightText, setWeightText] = useState<string>(() => {
    if (lastCalculation && lastCalculation.weight > 0) {
      return String(lastCalculation.weight);
    }
    return "";
  });
  const [biogasYield, setBiogasYield] = useState<number>(() => {
    return lastCalculation?.biogas || 0;
  });
  const [electricityGenerated, setElectricityGenerated] = useState<number>(() => {
    return lastCalculation?.electricity || 0;
  });
  const [lpgOffset, setLpgOffset] = useState<number>(() => {
    return lastCalculation?.lpgOffset || 0;
  });

  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronize with external changes (e.g., when a user logs in / switches accounts)
  useEffect(() => {
    if (lastCalculation) {
      setCategory(lastCalculation.category);
      setWeightText(lastCalculation.weight > 0 ? String(lastCalculation.weight) : "");
      setBiogasYield(lastCalculation.biogas);
      setElectricityGenerated(lastCalculation.electricity);
      setLpgOffset(lastCalculation.lpgOffset);
    } else {
      setCategory(initialCategory || null);
      setWeightText("");
      setBiogasYield(0);
      setElectricityGenerated(0);
      setLpgOffset(0);
    }
  }, [lastCalculation, initialCategory]);

  const handleCalculate = async () => {
    setError(null);
    setSuccessMsg(false);
    if (!category) {
      setError("Please select a waste category first.");
      return;
    }
    const weight = parseFloat(weightText);
    if (isNaN(weight) || weight <= 0) {
      setError("Please enter a valid weight greater than 0 kg.");
      return;
    }
    if (weight > 1000) {
      setError("Weight cannot exceed 1000 kg per single batch.");
      return;
    }

    const calculatedBiogas = weight * CONVERSION_FORMULAS.biogas;
    const calculatedElectricity = calculatedBiogas * CONVERSION_FORMULAS.electricity;
    const calculatedLpg = calculatedBiogas * CONVERSION_FORMULAS.lpg;

    setBiogasYield(calculatedBiogas);
    setElectricityGenerated(calculatedElectricity);
    setLpgOffset(calculatedLpg);

    try {
      const entryData: Omit<BiomassEntry, "id"> = {
        category,
        weight,
        biogas: parseFloat(calculatedBiogas.toFixed(3)),
        electricity: parseFloat(calculatedElectricity.toFixed(2)),
        lpgOffset: parseFloat(calculatedLpg.toFixed(3)),
        createdAt: Date.now()
      };

      await onAddEntry(entryData);
      setSuccessMsg(true);

      // Save last calculation state to profile so it restores when they re-login
      await onSaveLastCalculation({
        category,
        weight,
        biogas: parseFloat(calculatedBiogas.toFixed(3)),
        electricity: parseFloat(calculatedElectricity.toFixed(2)),
        lpgOffset: parseFloat(calculatedLpg.toFixed(3))
      });

      // Fade out success message after 4 seconds
      setTimeout(() => {
        setSuccessMsg(false);
      }, 4000);

    } catch (err: any) {
      setError(err.message || "Failed to log biomass calculation.");
    }
  };

  const handleAddBiomass = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleCalculate();
  };

  const categoriesList: WasteCategory[] = [
    "Vegetable Waste",
    "Fruit Waste",
    "Food Waste",
    "Garden Waste",
    "Paper"
  ];

  return (
    <div id="add_view" className="space-y-6 pb-24">
      
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight text-natural-dark">
            Biomass Parameters
          </h1>
          <p className="text-sm text-natural-dark/65 mt-1 font-medium">
            Select waste type and enter weight to estimate energy output.
          </p>
        </div>
        
        {/* Help Info Button */}
        <button
          id="formulas_info_btn"
          type="button"
          onClick={() => setShowFormulaModal(true)}
          className="rounded-xl bg-natural-cream p-2 text-natural-primary hover:text-natural-dark hover:bg-natural-bg/50 cursor-pointer transition-all border border-natural-border/50"
          title="Conversion Formulas"
        >
          <HelpCircle className="h-5.5 w-5.5" />
        </button>
      </div>

      {/* Success Notification Banner */}
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            id="add_success_banner"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-start gap-2.5 rounded-[2rem] bg-natural-cream p-5 text-xs text-natural-dark border border-natural-border shadow-sm"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0 text-natural-primary" />
            <div>
              <p className="font-bold text-natural-primary">Biomass Batch Logged Successfully!</p>
              <p className="mt-0.5 text-natural-dark/75">Your total conversion stats, history logs, and analytics metrics have been updated in real-time.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form and Recalculator Panel */}
      <form onSubmit={handleAddBiomass} className="space-y-6">
        
        {/* Input parameters card */}
        <div className="rounded-[2rem] bg-natural-cream p-6 border border-natural-border/70 shadow-sm space-y-5">
          
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-100">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Waste Category Selection pills */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-natural-dark/60 mb-2.5 font-mono">
              Select Waste Category
            </label>
            <div className="flex flex-wrap gap-2">
              {categoriesList.map((cat) => (
                <button
                  id={`pill_${cat.replace(/\s+/g, '_')}`}
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3.5 py-2 text-xs font-bold rounded-full border transition-all cursor-pointer ${
                    category === cat
                      ? "bg-natural-primary border-natural-primary text-white shadow-md shadow-stone-200 scale-[1.02]"
                      : "bg-natural-bg border-natural-border/50 text-natural-dark/70 hover:bg-natural-bg/90"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Waste Weight input */}
          <div>
            <label htmlFor="weight_input" className="block text-xs font-bold uppercase tracking-wider text-natural-dark/60 mb-2 font-mono">
              Biomass Weight (kg)
            </label>
            <div className="relative rounded-xl shadow-xs">
              <input
                id="weight_input"
                type="number"
                step="0.1"
                min="0.1"
                max="1000"
                value={weightText}
                onChange={(e) => setWeightText(e.target.value)}
                placeholder="0.0"
                className="block w-full rounded-xl border border-natural-border bg-natural-bg py-3 pl-4 pr-12 text-sm text-natural-dark placeholder-natural-dark/40 focus:border-natural-primary focus:bg-white focus:ring-1 focus:ring-natural-primary focus:outline-none font-semibold"
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                <span className="text-xs font-bold text-natural-dark/50 font-mono">kg</span>
              </div>
            </div>
          </div>

          {/* Calculate Estimates Button */}
          <button
            id="calculate_estimates_btn"
            type="button"
            onClick={handleCalculate}
            className="w-full mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-natural-primary/50 bg-natural-cream hover:bg-[#EFF5EE] py-3 text-sm font-bold text-natural-primary active:scale-[0.98] transition-all cursor-pointer"
          >
            Calculate Estimates
          </button>

        </div>

        {/* Live AI Prediction Engine summary card */}
        <div id="recalc_panel" className="rounded-[2rem] bg-gradient-to-br from-[#2D452B] to-[#1C3020] p-6 text-[#E8ECE7] shadow-lg relative overflow-hidden border border-[#233822]">

          <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-[#A3BE8C] flex items-center gap-1.5 mb-4 font-mono">
            Estimated Generations
          </h3>

          <div className="space-y-4">
            
            {/* Row 1: Biogas */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <span className="text-xs text-[#E5E9F0]">Biogas Yield</span>
              </div>
              <div id="live_val_biogas" className="font-mono text-xl font-bold text-[#E5E9F0]">
                {biogasYield.toFixed(3)} m³
              </div>
            </div>

            {/* Row 2: Electricity */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <span className="text-xs text-[#E5E9F0]">Electricity Generated</span>
              </div>
              <div id="live_val_electricity" className="font-mono text-xl font-bold text-natural-accent">
                {electricityGenerated.toFixed(2)} kWh
              </div>
            </div>

            {/* Row 3: LPG Offset */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-[#E5E9F0]">Fossil LPG Equivalent</span>
              </div>
              <div id="live_val_lpg" className="font-mono text-xl font-bold text-[#8FBCBB]">
                {lpgOffset.toFixed(3)} kg
              </div>
            </div>

          </div>
        </div>

        {/* Submit Button */}
        <button
          id="add_biomass_submit"
          type="submit"
          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-natural-primary py-3.5 font-bold text-white shadow-md shadow-stone-200 hover:bg-natural-primary/95 active:scale-[0.98] transition-all cursor-pointer text-sm"
        >
          <PlusCircle className="h-4.5 w-4.5" /> Add Biomass Entry
        </button>

      </form>

      {/* HOW CONVERSIONS WORK MODAL */}
      <AnimatePresence>
        {showFormulaModal && (
          <div id="formulas_modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-[2rem] bg-natural-bg p-6 border border-natural-border shadow-2xl space-y-4 text-natural-dark"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-sans text-lg font-bold text-natural-dark">How Conversions Work</h3>
                  <p className="text-xs text-natural-dark/60 mt-0.5 font-mono">Estimated values based on AI waste classification and energy conversion formulas.</p>
                </div>
                <button
                  id="close_formulas_btn"
                  onClick={() => setShowFormulaModal(false)}
                  className="rounded-lg p-1 text-natural-dark/55 hover:bg-natural-cream cursor-pointer"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3.5 text-xs text-natural-dark leading-relaxed">
                
                <div className="p-3 bg-natural-cream rounded-xl border border-natural-border/50 space-y-2">
                  <p className="font-bold text-natural-dark">1. Biogas Yield Calculation</p>
                  <p className="font-mono text-[11px] text-natural-primary font-bold bg-natural-bg px-2 py-1 rounded inline-block">
                    Biogas (m³) = Biomass (kg) × 0.06
                  </p>
                  <p className="text-[10px] text-natural-dark/65">Estimates biogas output based on the selected waste type and its weight.</p>
                </div>

                <div className="p-3 bg-natural-cream rounded-xl border border-natural-border/50 space-y-2">
                  <p className="font-bold text-natural-dark">2. Green Electricity Generation</p>
                  <p className="font-mono text-[11px] text-natural-accent font-bold bg-natural-bg px-2 py-1 rounded inline-block">
                    Electricity (kWh) = Biogas (m³) × 2.0
                  </p>
                  <p className="text-[10px] text-natural-dark/65">Calculates estimated electricity generated from the predicted biogas volume.</p>
                </div>

                <div className="p-3 bg-natural-cream rounded-xl border border-natural-border/50 space-y-2">
                  <p className="font-bold text-natural-dark">3. Cooking LPG Replacement Offset</p>
                  <p className="font-mono text-[11px] text-[#4B6E80] font-bold bg-natural-bg px-2 py-1 rounded inline-block">
                    LPG Equivalent (kg) = Biogas (m³) × 0.43
                  </p>
                  <p className="text-[10px] text-natural-dark/65">Estimates the equivalent amount of LPG that can be replaced using biogas.</p>
                </div>

                <div className="p-3 bg-[#1C3020] text-[#EFF5EE] rounded-xl border border-[#233822] space-y-1">
                  <p className="font-bold text-white">Sample Energy Estimation (10 kg Waste):</p>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] font-mono">
                    <li>Waste Input = <span className="font-bold text-white">10.00 kg</span></li>
                    <li>Biogas = 10 × 0.06 = <span className="font-bold text-[#A3BE8C]">0.60 m³</span></li>
                    <li>Power = 0.60 × 2 = <span className="font-bold text-natural-accent">1.20 kWh</span></li>
                    <li>LPG Offset = 0.60 × 0.43 = <span className="font-bold text-[#8FBCBB]">0.26 kg</span></li>
                  </ul>
                </div>

              </div>

              <button
                id="close_formulas_footer_btn"
                onClick={() => setShowFormulaModal(false)}
                className="w-full py-2.5 bg-natural-primary hover:bg-natural-primary/95 font-semibold text-white text-xs rounded-xl cursor-pointer"
              >
                Got It, Thanks!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
