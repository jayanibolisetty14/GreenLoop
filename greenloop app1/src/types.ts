export type WasteCategory = 'Vegetable Waste' | 'Fruit Waste' | 'Food Waste' | 'Garden Waste' | 'Paper';

export interface BiomassEntry {
  id: string;
  category: WasteCategory;
  weight: number; // in kg
  biogas: number; // in m3
  electricity: number; // in kWh
  lpgOffset: number; // in kg
  createdAt: number; // Unix timestamp or Firestore timestamp converted to number
}

export interface UserProfile {
  displayName: string;
  email: string;
  avatarUrl: string; // URL/Image slug
  lastCalculation?: {
    category: WasteCategory | null;
    weight: number;
    biogas: number;
    electricity: number;
    lpgOffset: number;
  };
}

export type AppScreen = 'home' | 'scan' | 'add' | 'profile' | 'analytics' | 'history';

export type BadgeTier = '🌱 Seedling' | '🌿 Eco Explorer' | '🌳 Green Contributor' | '🌍 Sustainability Champion';

export interface LevelInfo {
  level: BadgeTier;
  progressText: string;
  badgeColor: string;
}

export function calculateUserLevel(totalEntries: number): LevelInfo {
  if (totalEntries <= 5) {
    return {
      level: '🌱 Seedling',
      progressText: `🌱 Seedling (${totalEntries}/5 entries)`,
      badgeColor: 'bg-[#EFF5EE] text-[#3D6B42] border-[#DCE8D9]'
    };
  } else if (totalEntries <= 15) {
    return {
      level: '🌿 Eco Explorer',
      progressText: `🌿 Eco Explorer (${totalEntries}/15 entries)`,
      badgeColor: 'bg-[#E5F3EE] text-[#1B5242] border-[#C2E3D6]'
    };
  } else if (totalEntries <= 30) {
    return {
      level: '🌳 Green Contributor',
      progressText: `🌳 Green Contributor (${totalEntries}/30 entries)`,
      badgeColor: 'bg-[#FCF5E3] text-[#7C5512] border-[#F6E3B8]'
    };
  } else {
    return {
      level: '🌍 Sustainability Champion',
      progressText: `🌍 Sustainability Champion (${totalEntries} entries)`,
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200'
    };
  }
}

