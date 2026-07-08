import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { BiomassEntry, UserProfile } from "../types";

export const dataService = {
  // Helper to generate dynamic localStorage keys
  getEntriesKey(userId: string): string {
    return userId && userId !== "demo-guest" 
      ? `greenloop_entries_${userId}` 
      : "greenloop_entries";
  },

  getProfileKey(userId: string): string {
    return userId && userId !== "demo-guest" 
      ? `greenloop_profile_${userId}` 
      : "greenloop_profile";
  },

  // Save a new biomass entry
  async saveEntry(userId: string, entry: Omit<BiomassEntry, "id">): Promise<BiomassEntry> {
    const id = "entry_" + Math.random().toString(36).substr(2, 9);
    const newEntry: BiomassEntry = { ...entry, id };

    // 1. Save to local storage
    try {
      const localEntries = this.getLocalEntries(userId);
      localEntries.unshift(newEntry);
      localStorage.setItem(this.getEntriesKey(userId), JSON.stringify(localEntries));
    } catch (e) {
      console.error("Local storage save error", e);
    }

    // 2. Save to Firestore if user is authenticated and not a demo guest
    if (userId && userId !== "demo-guest") {
      const path = `users/${userId}/entries/${id}`;
      try {
        await setDoc(doc(db, "users", userId, "entries", id), {
          category: entry.category,
          weight: entry.weight,
          biogas: entry.biogas,
          electricity: entry.electricity,
          lpgOffset: entry.lpgOffset,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    }

    return newEntry;
  },

  // Get all entries
  async getEntries(userId: string): Promise<BiomassEntry[]> {
    if (!userId || userId === "demo-guest") {
      return this.getLocalEntries(userId);
    }

    const path = `users/${userId}/entries`;
    try {
      const querySnapshot = await getDocs(collection(db, "users", userId, "entries"));
      const firebaseEntries: BiomassEntry[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Convert Firestore Timestamp to epoch number if applicable
        const createdAtTime = data.createdAt && typeof data.createdAt.toMillis === "function" 
          ? data.createdAt.toMillis() 
          : (data.createdAt ? new Date(data.createdAt).getTime() : Date.now());
          
        firebaseEntries.push({
          id: docSnap.id,
          category: data.category,
          weight: data.weight,
          biogas: data.biogas,
          electricity: data.electricity,
          lpgOffset: data.lpgOffset,
          createdAt: createdAtTime,
        });
      });

      // Sort newest first
      firebaseEntries.sort((a, b) => b.createdAt - a.createdAt);

      // Cache to local storage
      localStorage.setItem(this.getEntriesKey(userId), JSON.stringify(firebaseEntries));
      return firebaseEntries;
    } catch (error) {
      console.warn("Firestore entries fetch failed, using local storage fallback", error);
      return this.getLocalEntries(userId);
    }
  },

  // Delete a logged entry
  async deleteEntry(userId: string, entryId: string): Promise<void> {
    // 1. Delete from local storage
    try {
      const localEntries = this.getLocalEntries(userId);
      const filtered = localEntries.filter((e) => e.id !== entryId);
      localStorage.setItem(this.getEntriesKey(userId), JSON.stringify(filtered));
    } catch (e) {
      console.error("Local storage delete error", e);
    }

    // 2. Delete from Firestore
    if (userId && userId !== "demo-guest") {
      const path = `users/${userId}/entries/${entryId}`;
      try {
        await deleteDoc(doc(db, "users", userId, "entries", entryId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }
  },

  // Save/Update user profile
  async saveProfile(userId: string, profile: UserProfile): Promise<void> {
    // 1. Save to local storage
    try {
      localStorage.setItem(this.getProfileKey(userId), JSON.stringify(profile));
    } catch (e) {
      console.error("Local storage profile save error", e);
    }

    // 2. Save to Firestore
    if (userId && userId !== "demo-guest") {
      const path = `users/${userId}`;
      try {
        const docRef = doc(db, "users", userId);
        
        // Check if we have a cached createdAt for this user
        const cachedCreatedAtStr = localStorage.getItem(`greenloop_profile_createdAt_${userId}`);
        
        if (cachedCreatedAtStr) {
          // Document exists and we know its createdAt!
          // We can write it directly without any server getDoc, which is completely offline-friendly!
          const cachedCreatedAt = parseInt(cachedCreatedAtStr, 10);
          await setDoc(docRef, {
            displayName: profile.displayName,
            email: profile.email,
            avatarUrl: profile.avatarUrl,
            lastCalculation: profile.lastCalculation || null,
            createdAt: new Date(cachedCreatedAt),
            updatedAt: serverTimestamp()
          });
        } else {
          // We don't have a cached createdAt. Let's try to read it, but handle errors gracefully
          let existingCreatedAt = null;
          try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.createdAt) {
                existingCreatedAt = data.createdAt;
                // Cache it for future offline use
                const createdAtMs = typeof data.createdAt.toMillis === "function"
                  ? data.createdAt.toMillis()
                  : new Date(data.createdAt).getTime();
                localStorage.setItem(`greenloop_profile_createdAt_${userId}`, String(createdAtMs));
              }
            }
          } catch (getErr) {
            console.warn("getDoc in saveProfile failed (possibly offline):", getErr);
          }

          if (existingCreatedAt) {
            await setDoc(docRef, {
              displayName: profile.displayName,
              email: profile.email,
              avatarUrl: profile.avatarUrl,
              lastCalculation: profile.lastCalculation || null,
              createdAt: existingCreatedAt,
              updatedAt: serverTimestamp()
            });
          } else {
            // Document doesn't exist yet, or we couldn't fetch it and have no cache.
            // Assume it's a new document creation
            await setDoc(docRef, {
              displayName: profile.displayName,
              email: profile.email,
              avatarUrl: profile.avatarUrl,
              lastCalculation: profile.lastCalculation || null,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }
  },

  // Get user profile
  async getProfile(userId: string, defaultEmail = ""): Promise<UserProfile> {
    const defaultProfile: UserProfile = {
      displayName: defaultEmail ? defaultEmail.split("@")[0] : "Eco Hero",
      email: defaultEmail,
      avatarUrl: "avatar-seedling", // Default avatar identifier
    };

    if (!userId || userId === "demo-guest") {
      const local = localStorage.getItem(this.getProfileKey(userId));
      if (local) {
        try {
          return JSON.parse(local);
        } catch (_) {}
      }
      return defaultProfile;
    }

    const path = `users/${userId}`;
    try {
      const docSnap = await getDoc(doc(db, "users", userId));
      if (docSnap.exists()) {
        const data = docSnap.data();
        const profile: UserProfile = {
          displayName: data.displayName || defaultProfile.displayName,
          email: data.email || defaultProfile.email,
          avatarUrl: data.avatarUrl || defaultProfile.avatarUrl,
          lastCalculation: data.lastCalculation || undefined
        };
        localStorage.setItem(this.getProfileKey(userId), JSON.stringify(profile));
        return profile;
      } else {
        // Document doesn't exist yet, save the default one in the background
        this.saveProfile(userId, defaultProfile).catch((err) => {
          console.warn("Silent profile save failed in background:", err);
        });
        return defaultProfile;
      }
    } catch (error) {
      console.warn("Firestore profile fetch failed, using local storage fallback", error);
      const local = localStorage.getItem(this.getProfileKey(userId));
      if (local) {
        try {
          return JSON.parse(local);
        } catch (_) {}
      }
      return defaultProfile;
    }
  },

  // Helper for direct localStorage reads
  getLocalEntries(userId: string = ""): BiomassEntry[] {
    const key = this.getEntriesKey(userId);
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch (e) {
      return [];
    }
  }
};
