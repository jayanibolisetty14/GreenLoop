import React, { useState } from "react";
import { BiomassEntry, WasteCategory } from "../types";
import { Search, SlidersHorizontal, Trash2, Calendar, Flame, Zap, ArrowUpDown, ShieldAlert, Inbox } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HistoryViewProps {
  entries: BiomassEntry[];
  onDeleteEntry: (entryId: string) => Promise<void>;
}

export default function HistoryView({ entries, onDeleteEntry }: HistoryViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'weight_desc'>('newest');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Categories list for pills
  const filtersList = ["All", "Vegetable Waste", "Fruit Waste", "Food Waste", "Garden Waste", "Paper"];

  // Filter & Search Logic
  const filteredEntries = entries.filter((e) => {
    const matchesSearch = e.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === "All" || e.category === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  // Sorting Logic
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    if (sortBy === 'newest') return b.createdAt - a.createdAt;
    if (sortBy === 'oldest') return a.createdAt - b.createdAt;
    if (sortBy === 'weight_desc') return b.weight - a.weight;
    return 0;
  });

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
  };

  const handleConfirmDelete = async (id: string) => {
    await onDeleteEntry(id);
    setDeletingId(null);
  };

  return (
    <div id="history_view" className="space-y-6 pb-24">
      
      {/* Header */}
      <div>
        <h1 className="font-sans text-2xl font-bold tracking-tight text-natural-dark">
          Prediction History
        </h1>
        <p className="text-sm text-natural-dark/65 mt-1 font-medium">
          Track historical logs of organic loads and generated biogas energy stats.
        </p>
      </div>

      {/* Filters and Search Container */}
      <div className="rounded-[2rem] bg-natural-cream p-5 border border-natural-border/70 shadow-sm space-y-4">
        
        {/* Search Input bar */}
        <div className="relative rounded-xl shadow-xs">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Search className="h-4.5 w-4.5 text-natural-dark/40" />
          </div>
          <input
            id="history_search_input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search waste type..."
            className="block w-full rounded-xl border border-natural-border bg-natural-bg py-3.5 pl-10 pr-4 text-sm text-natural-dark placeholder-natural-dark/40 focus:border-natural-primary focus:bg-white focus:ring-1 focus:ring-natural-primary focus:outline-none"
          />
        </div>

        {/* Filter pills horizontal carousel */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide select-none">
          {filtersList.map((filter) => (
            <button
              id={`filter_pill_${filter.replace(/\s+/g, '_')}`}
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`whitespace-nowrap px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                selectedFilter === filter
                  ? "bg-natural-primary border-natural-primary text-white shadow-xs"
                  : "bg-natural-bg border-natural-border/50 text-natural-dark/70 hover:bg-natural-cream/60"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Sorting selection bar */}
        <div className="flex items-center justify-between pt-1 border-t border-natural-border/50 text-xs">
          <span className="text-natural-dark/50 font-semibold uppercase tracking-wider text-[10px] font-mono">Sorting Options</span>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-natural-dark/50" />
            <select
              id="history_sort_select"
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-transparent font-bold text-natural-dark focus:outline-none focus:ring-1 focus:ring-natural-primary rounded px-1 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="weight_desc">Highest Weight</option>
            </select>
          </div>
        </div>

      </div>

      {/* Logs List Section */}
      <div className="space-y-4">
        {sortedEntries.length === 0 ? (
          <div id="history_empty_state" className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-[2rem] bg-natural-cream border border-natural-border/70 shadow-xs">
            <div className="rounded-2xl bg-natural-bg p-4 text-natural-primary/40 mb-3 border border-natural-border/40">
              <Inbox className="h-8 w-8" />
            </div>
            <h3 className="font-sans text-sm font-bold text-natural-dark">No logs registered matching your filters</h3>
            <p className="text-xs text-natural-dark/50 mt-1 max-w-xs leading-relaxed font-mono">
              Write some inputs first! Go to the "Add" or "Scan" tab to submit your raw waste entries.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {sortedEntries.map((e) => {
                const formattedDate = new Date(e.createdAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                });

                const isConfirmingDelete = deletingId === e.id;

                return (
                  <motion.div
                    id={`history_item_${e.id}`}
                    key={e.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="rounded-[2rem] bg-natural-cream border border-natural-border/60 p-5 shadow-xs relative overflow-hidden"
                  >
                    {/* Header: Category and Date */}
                    <div className="flex items-start justify-between mb-3.5">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-natural-primary bg-natural-bg border border-natural-border/50 px-2.5 py-0.5 rounded-full tracking-wider font-mono">
                          {e.category}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-natural-dark/50 font-semibold mt-1.5 font-mono">
                          <Calendar className="h-3 w-3 shrink-0" />
                          <span>{formattedDate}</span>
                        </div>
                      </div>

                      {/* Delete Option */}
                      {!isConfirmingDelete ? (
                        <button
                          id={`delete_btn_${e.id}`}
                          onClick={() => handleDeleteClick(e.id)}
                          className="rounded-lg p-1.5 text-natural-dark/30 hover:text-red-600 hover:bg-[#FCEBEB] cursor-pointer transition-all"
                          title="Delete record"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-[#FCEBEB] border border-[#F4D2D2] rounded-lg p-1">
                          <button
                            id={`confirm_delete_${e.id}`}
                            onClick={() => handleConfirmDelete(e.id)}
                            className="bg-red-600 hover:bg-red-700 text-[10px] font-bold text-white px-2 py-1 rounded cursor-pointer"
                          >
                            Delete
                          </button>
                          <button
                            id={`cancel_delete_${e.id}`}
                            onClick={() => setDeletingId(null)}
                            className="text-natural-dark/50 hover:text-natural-dark text-[10px] font-bold px-1.5 py-1 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Stats summary section */}
                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-natural-border/40 text-xs">
                      
                      {/* Weight logged */}
                      <div>
                        <span className="text-[10px] text-natural-dark/50 uppercase font-bold tracking-wider font-mono">Mass</span>
                        <p id={`val_wt_${e.id}`} className="font-sans font-extrabold text-natural-dark mt-0.5 text-sm">{e.weight.toFixed(1)} kg</p>
                      </div>

                      {/* Methane biogas yield */}
                      <div>
                        <span className="text-[10px] text-natural-primary uppercase font-bold tracking-wider flex items-center gap-0.5 font-mono">
                          <Flame className="h-3 w-3 shrink-0" /> Biogas
                        </span>
                        <p id={`val_bg_${e.id}`} className="font-mono font-bold text-natural-dark mt-0.5 text-xs">{e.biogas.toFixed(3)} m³</p>
                      </div>

                      {/* Electricity generated */}
                      <div>
                        <span className="text-[10px] text-natural-accent uppercase font-bold tracking-wider flex items-center gap-0.5 font-mono">
                          <Zap className="h-3 w-3 shrink-0" /> Power
                        </span>
                        <p id={`val_el_${e.id}`} className="font-mono font-bold text-natural-dark mt-0.5 text-xs">{e.electricity.toFixed(1)} kWh</p>
                      </div>

                    </div>

                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

    </div>
  );
}
