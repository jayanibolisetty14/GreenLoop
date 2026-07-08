import React, { useState, useEffect } from "react";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { onSnapshot, collection, doc } from "firebase/firestore";
import { dataService } from "./lib/dataService";
import { UserProfile, BiomassEntry, AppScreen, WasteCategory } from "./types";

// Views
import LoginView from "./components/LoginView";
import HomeView from "./components/HomeView";
import ScanView from "./components/ScanView";
import AddView from "./components/AddView";
import ProfileView from "./components/ProfileView";
import AnalyticsView from "./components/AnalyticsView";
import HistoryView from "./components/HistoryView";

// Icons for Bottom Navigation
import { Home, Scan, PlusCircle, User, BarChart2, Leaf } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<{ uid: string; email: string; displayName: string } | null>(() => {
    try {
      const stored = localStorage.getItem("greenloop_auth_user");
      return stored ? JSON.parse(stored) : null;
    } catch (_) {
      return null;
    }
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem("greenloop_auth_user");
      if (stored) {
        const { uid } = JSON.parse(stored);
        const profile = localStorage.getItem(`greenloop_profile_${uid}`);
        return profile ? JSON.parse(profile) : null;
      }
    } catch (_) {}
    return null;
  });
  const [entries, setEntries] = useState<BiomassEntry[]>(() => {
    try {
      const stored = localStorage.getItem("greenloop_auth_user");
      if (stored) {
        const { uid } = JSON.parse(stored);
        const storedEntries = localStorage.getItem(`greenloop_entries_${uid}`);
        return storedEntries ? JSON.parse(storedEntries) : [];
      }
    } catch (_) {}
    return [];
  });
  const [activeScreen, setActiveScreen] = useState<AppScreen>("home");
  const [routedCategory, setRoutedCategory] = useState<WasteCategory | null>(null);
  const [authChecking, setAuthChecking] = useState(false);
  const [isLoadingSecondary, setIsLoadingSecondary] = useState(false);

  // Initialize Firebase Auth listener
  useEffect(() => {
    let unsubscribeEntries: (() => void) | null = null;
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      // Clean up previous listeners if they exist
      if (unsubscribeEntries) {
        unsubscribeEntries();
        unsubscribeEntries = null;
      }
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (user) {
        const uid = user.uid;
        const email = user.email || "";
        const displayName = user.displayName || email.split("@")[0] || "Eco Hero";
        
        const authUserObj = { uid, email, displayName };
        setCurrentUser(authUserObj);
        localStorage.setItem("greenloop_auth_user", JSON.stringify(authUserObj));
        setAuthChecking(false);

        // Fetch initial profile/entries from cache first for zero delay (scoped to uid)
        let hasCache = false;
        try {
          const profileKey = dataService.getProfileKey(uid);
          const entriesKey = dataService.getEntriesKey(uid);
          const cachedProfile = localStorage.getItem(profileKey);
          if (cachedProfile) {
            setUserProfile(JSON.parse(cachedProfile));
            hasCache = true;
          } else {
            setUserProfile({
              displayName,
              email,
              avatarUrl: "avatar-seedling"
            });
          }
          const cachedEntries = localStorage.getItem(entriesKey);
          if (cachedEntries) {
            const parsed = JSON.parse(cachedEntries);
            setEntries(parsed);
            hasCache = true;
            console.log(`[DEBUG AUTH] Loaded ${parsed.length} cached entries for UID: ${uid}`);
          } else {
            setEntries([]);
          }
        } catch (_) {}

        // If we have cached data, background fetch silently without showing skeleton animations
        setIsLoadingSecondary(!hasCache);

        // Set up real-time snapshot listener for profile
        unsubscribeProfile = onSnapshot(doc(db, "users", uid), (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            const profile: UserProfile = {
              displayName: data.displayName || displayName,
              email: data.email || email,
              avatarUrl: data.avatarUrl || "avatar-seedling",
              lastCalculation: data.lastCalculation || undefined
            };
            setUserProfile(profile);
            localStorage.setItem(dataService.getProfileKey(uid), JSON.stringify(profile));

            // Store the createdAt timestamp in localStorage!
            if (data.createdAt) {
              const createdAtMs = typeof data.createdAt.toMillis === "function"
                ? data.createdAt.toMillis()
                : new Date(data.createdAt).getTime();
              localStorage.setItem(`greenloop_profile_createdAt_${uid}`, String(createdAtMs));
            }
          } else {
            // Profile doc doesn't exist yet, save it silently in the background
            dataService.saveProfile(uid, {
              displayName,
              email,
              avatarUrl: "avatar-seedling"
            }).catch((err) => {
              console.warn("Silent profile creation failed:", err);
            });
          }
        }, (error) => {
          console.warn("Profile snapshot listener failed:", error);
        });

        // Set up real-time snapshot listener for entries
        unsubscribeEntries = onSnapshot(collection(db, "users", uid, "entries"), (querySnapshot) => {
          const list: BiomassEntry[] = [];
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const createdAtTime = data.createdAt && typeof data.createdAt.toMillis === "function" 
              ? data.createdAt.toMillis() 
              : (data.createdAt ? new Date(data.createdAt).getTime() : Date.now());
              
            list.push({
              id: docSnap.id,
              category: data.category,
              weight: data.weight,
              biogas: data.biogas,
              electricity: data.electricity,
              lpgOffset: data.lpgOffset,
              createdAt: createdAtTime,
            });
          });
          
          list.sort((a, b) => b.createdAt - a.createdAt);
          setEntries(list);
          localStorage.setItem(dataService.getEntriesKey(uid), JSON.stringify(list));
          setIsLoadingSecondary(false);
          console.log(`[DEBUG AUTH] Real-time fetched ${list.length} entries for UID: ${uid}`);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${uid}/entries`);
          setIsLoadingSecondary(false);
        });

      } else {
        // Fallback to anonymous local state/localStorage
        setCurrentUser(null);
        localStorage.removeItem("greenloop_auth_user");
        setAuthChecking(false);
        setIsLoadingSecondary(true);
        try {
          const [localProfile, localList] = await Promise.all([
            dataService.getProfile(""),
            dataService.getEntries("")
          ]);
          setUserProfile(localProfile);
          setEntries(localList);
          console.log(`[DEBUG AUTH] Loaded fallback anonymous state: ${localList.length} entries`);
        } catch (_) {
        } finally {
          setIsLoadingSecondary(false);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeEntries) unsubscribeEntries();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  // Set auth state on successful login/register
  const handleAuthSuccess = async (userId: string, email: string, displayName: string) => {
    const authUserObj = { uid: userId, email, displayName };
    setCurrentUser(authUserObj);
    localStorage.setItem("greenloop_auth_user", JSON.stringify(authUserObj));
    
    // Fetch initial profile/entries from cache first for zero delay (scoped to uid)
    try {
      const profileKey = dataService.getProfileKey(userId);
      const entriesKey = dataService.getEntriesKey(userId);
      const cachedProfile = localStorage.getItem(profileKey);
      if (cachedProfile) {
        setUserProfile(JSON.parse(cachedProfile));
      } else {
        setUserProfile({
          displayName,
          email,
          avatarUrl: "avatar-seedling"
        });
      }
      const cachedEntries = localStorage.getItem(entriesKey);
      if (cachedEntries) {
        setEntries(JSON.parse(cachedEntries));
      } else {
        setEntries([]);
      }
    } catch (_) {}

    setActiveScreen("home");
    setAuthChecking(false);
  };

  // Sign out
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      localStorage.removeItem("greenloop_auth_user");
      // Load local state profiles & entries on logout
      const localProfile = await dataService.getProfile("");
      setUserProfile(localProfile);
      const localList = await dataService.getEntries("");
      setEntries(localList);
      setActiveScreen("home");
    } catch (err) {
      console.error("Sign-out failed", err);
    }
  };

  // Handle saving user profile changes
  const handleSaveProfile = async (displayName: string, avatarUrl: string) => {
    if (!userProfile) return;
    const updatedProfile: UserProfile = {
      ...userProfile,
      displayName,
      avatarUrl
    };
    
    setUserProfile(updatedProfile);
    const userId = currentUser ? currentUser.uid : "";
    
    // Save to Firestore asynchronously to avoid any UI loading delay
    dataService.saveProfile(userId, updatedProfile).catch((err) => {
      console.warn("Async background profile save failed:", err);
    });
  };

  const handleSaveLastCalculation = async (calc: {
    category: WasteCategory | null;
    weight: number;
    biogas: number;
    electricity: number;
    lpgOffset: number;
  }) => {
    if (!userProfile) return;
    const updatedProfile: UserProfile = {
      ...userProfile,
      lastCalculation: calc
    };
    setUserProfile(updatedProfile);
    const userId = currentUser ? currentUser.uid : "";
    
    dataService.saveProfile(userId, updatedProfile).catch((err) => {
      console.warn("Async background last calculation save failed:", err);
    });
  };

  // Add new biomass waste log
  const handleAddEntry = async (entryData: Omit<BiomassEntry, "id">) => {
    const userId = currentUser ? currentUser.uid : "";
    const newEntry = await dataService.saveEntry(userId, entryData);
    setEntries(prev => [newEntry, ...prev]);
    setActiveScreen("home");
  };

  // Delete logged entry
  const handleDeleteEntry = async (entryId: string) => {
    const userId = currentUser ? currentUser.uid : "";
    await dataService.deleteEntry(userId, entryId);
    setEntries(prev => prev.filter(e => e.id !== entryId));
  };

  // Callback to handle image camera classification auto-routing
  const handleCameraAutoRoute = (category: WasteCategory) => {
    setRoutedCategory(category);
    setActiveScreen("add");
  };

  // Main navigation action routing
  const navigateTo = (screen: AppScreen) => {
    setActiveScreen(screen);
  };

  // Loading indicator for checking credentials
  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-natural-bg p-4">
        <div className="text-center space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-natural-primary text-white animate-pulse">
            <Leaf className="h-6 w-6" />
          </div>
          <p className="text-xs font-bold text-natural-dark/60 tracking-wide font-mono">Syncing GreenLoop accounts...</p>
        </div>
      </div>
    );
  }

  // Enforce Authenticated Sign-In Gate
  if (!currentUser) {
    return <LoginView onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-natural-bg text-natural-dark font-sans flex flex-col justify-between">
      
      {/* Centered Desktop Frame Container (mobile-first layout) */}
      <div className="w-full max-w-md mx-auto bg-natural-bg min-h-screen flex flex-col justify-between relative shadow-xl shadow-stone-200/50 border-x border-natural-border/60">
        
        {/* Top Mini Branding Status bar */}
        <header className="px-5 py-4 bg-natural-cream/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between border-b border-natural-border/60">
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => navigateTo("home")}>
            <Leaf className="h-5.5 w-5.5 text-natural-primary" />
            <span className="font-sans text-sm font-black tracking-tight text-natural-dark uppercase">GreenLoop</span>
          </div>
          
          <div className="flex items-center gap-2">
            {isLoadingSecondary && (
              <div className="flex items-center gap-1 text-[10px] text-natural-dark/45 font-mono font-bold animate-pulse" title="Syncing data in background...">
                <div className="h-2.5 w-2.5 animate-spin rounded-full border-1.5 border-natural-primary border-t-transparent" />
                <span>Syncing</span>
              </div>
            )}
            
            {/* Active stats shortcut indicators */}
            {entries.length > 0 && (
              <div className="flex items-center gap-1.5 bg-natural-cream border border-natural-border rounded-lg px-2 py-0.5 text-[10px] font-bold text-natural-primary">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span>Bio-Reactor Active</span>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Content Views Render Panel */}
        <main className="flex-1 px-5 pt-6 pb-28 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeScreen === "home" && (
              <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <HomeView 
                  username={userProfile?.displayName || currentUser.displayName} 
                  userProfile={userProfile} 
                  entries={entries} 
                  isLoading={isLoadingSecondary}
                  onNavigate={navigateTo} 
                />
              </motion.div>
            )}

            {activeScreen === "scan" && (
              <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ScanView onAutoRoute={handleCameraAutoRoute} onNavigate={navigateTo} />
              </motion.div>
            )}

            {activeScreen === "add" && (
              <motion.div key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AddView 
                  initialCategory={routedCategory} 
                  lastCalculation={userProfile?.lastCalculation}
                  onSaveLastCalculation={handleSaveLastCalculation}
                  onAddEntry={handleAddEntry} 
                />
              </motion.div>
            )}

            {activeScreen === "profile" && (
              <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ProfileView 
                  userProfile={userProfile || {
                    displayName: currentUser.displayName,
                    email: currentUser.email,
                    avatarUrl: "avatar-seedling"
                  }} 
                  entries={entries} 
                  onSaveProfile={handleSaveProfile} 
                  onLogout={handleLogout} 
                />
              </motion.div>
            )}

            {activeScreen === "analytics" && (
              <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AnalyticsView entries={entries} />
              </motion.div>
            )}

            {activeScreen === "history" && (
              <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <HistoryView entries={entries} onDeleteEntry={handleDeleteEntry} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Mobile bottom tab-bar navigation (4 tabs only: Home | Scan | Add | Profile) */}
        <nav className="absolute bottom-5 left-4 right-4 z-40 bg-natural-cream/95 backdrop-blur-md border border-natural-border rounded-2xl shadow-lg px-2.5 py-2 flex justify-between items-center">
          
          {/* Tab 1: Home */}
          <button
            id="tab_nav_home"
            onClick={() => navigateTo("home")}
            className={`flex flex-col items-center gap-1 flex-1 py-1 cursor-pointer transition-all ${
              activeScreen === "home" ? "text-natural-primary scale-105 font-bold" : "text-stone-400 hover:text-stone-600"
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px] font-bold">Home</span>
          </button>

          {/* Tab 2: Scan */}
          <button
            id="tab_nav_scan"
            onClick={() => navigateTo("scan")}
            className={`flex flex-col items-center gap-1 flex-1 py-1 cursor-pointer transition-all ${
              activeScreen === "scan" ? "text-natural-primary scale-105 font-bold" : "text-stone-400 hover:text-stone-600"
            }`}
          >
            <Scan className="h-5 w-5" />
            <span className="text-[10px] font-bold">Scan</span>
          </button>

          {/* Tab 3: Add */}
          <button
            id="tab_nav_add"
            onClick={() => {
              setRoutedCategory(null); // reset routed
              navigateTo("add");
            }}
            className={`flex flex-col items-center gap-1 flex-1 py-1 cursor-pointer transition-all ${
              activeScreen === "add" ? "text-natural-primary scale-105 font-bold" : "text-stone-400 hover:text-stone-600"
            }`}
          >
            <PlusCircle className="h-5 w-5" />
            <span className="text-[10px] font-bold">Add</span>
          </button>

          {/* Tab 4: Profile */}
          <button
            id="tab_nav_profile"
            onClick={() => navigateTo("profile")}
            className={`flex flex-col items-center gap-1 flex-1 py-1 cursor-pointer transition-all ${
              activeScreen === "profile" ? "text-natural-primary scale-105 font-bold" : "text-stone-400 hover:text-stone-600"
            }`}
          >
            <User className="h-5 w-5" />
            <span className="text-[10px] font-bold">Profile</span>
          </button>

        </nav>

      </div>

    </div>
  );
}
