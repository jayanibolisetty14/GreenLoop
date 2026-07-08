export interface AvatarTemplate {
  id: string;
  name: string;
  emoji: string;
  bgGradient: string;
}

export const AVATAR_TEMPLATES: AvatarTemplate[] = [
  { id: "avatar-seedling", name: "Green Leaf", emoji: "🌱", bgGradient: "from-emerald-400 to-teal-600" },
  { id: "avatar-sprout", name: "Sprouting Bud", emoji: "🍃", bgGradient: "from-green-300 to-emerald-500" },
  { id: "avatar-avocado", name: "Healthy Avocado", emoji: "🥑", bgGradient: "from-yellow-200 to-green-600" },
  { id: "avatar-lightning", name: "Energy Spark", emoji: "⚡", bgGradient: "from-amber-300 to-orange-500" },
  { id: "avatar-carrot", name: "Crispy Carrot", emoji: "🥕", bgGradient: "from-orange-400 to-red-500" },
  { id: "avatar-apple", name: "Sweet Apple", emoji: "🍎", bgGradient: "from-red-400 to-rose-600" },
  { id: "avatar-broccoli", name: "Super Broccoli", emoji: "🥦", bgGradient: "from-emerald-500 to-green-800" },
  { id: "avatar-sunflower", name: "Sunny Flower", emoji: "🌻", bgGradient: "from-amber-200 to-yellow-500" },
  { id: "avatar-battery", name: "Clean Bio-Battery", emoji: "🔋", bgGradient: "from-green-400 to-emerald-600" },
  { id: "avatar-earth", name: "Eco Earth", emoji: "🌎", bgGradient: "from-blue-400 to-emerald-500" },
  { id: "avatar-droplet", name: "Pure Water", emoji: "💧", bgGradient: "from-sky-400 to-blue-600" },
  { id: "avatar-farmer", name: "Eco Farmer", emoji: "🧑‍🌾", bgGradient: "from-yellow-400 to-teal-500" }
];

export function getAvatarById(id: string): AvatarTemplate {
  return AVATAR_TEMPLATES.find(a => a.id === id) || AVATAR_TEMPLATES[0];
}

export function getRandomAvatarExcept(currentId: string): AvatarTemplate {
  const filtered = AVATAR_TEMPLATES.filter(a => a.id !== currentId);
  const randomIndex = Math.floor(Math.random() * filtered.length);
  return filtered[randomIndex];
}
