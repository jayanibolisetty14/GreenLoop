import React, { useState } from "react";
import { auth } from "../firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  sendPasswordResetEmail,
  updateProfile
} from "firebase/auth";
import { Leaf, Mail, Lock, User, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

interface LoginViewProps {
  onAuthSuccess: (userId: string, email: string, displayName: string) => void;
}

export default function LoginView({ onAuthSuccess }: LoginViewProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isUnauthorizedDomainError = (err: any) => {
    return err && (
      err.code === "auth/unauthorized-domain" || 
      (err.message && (err.message.includes("auth/unauthorized-domain") || err.message.includes("unauthorized-domain")))
    );
  };

  // Sign In with Email/Password
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      onAuthSuccess(user.uid, user.email || "", user.displayName || user.email?.split("@")[0] || "Eco Hero");
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.message || "";
      const errCode = err?.code || "";
      
      if (isUnauthorizedDomainError(err)) {
        setError("unauthorized-domain");
      } else if (
        errCode === "auth/user-not-found" || 
        errCode === "auth/wrong-password" || 
        errCode === "auth/invalid-credential" ||
        errMsg.includes("user-not-found") ||
        errMsg.includes("wrong-password") ||
        errMsg.includes("invalid-credential")
      ) {
        setError("Invalid email or password.");
      } else if (errCode === "auth/invalid-email" || errMsg.includes("invalid-email")) {
        setError("Invalid email address format.");
      } else {
        let cleanMsg = errMsg;
        if (cleanMsg.startsWith("Firebase: ")) {
          cleanMsg = cleanMsg.replace("Firebase: ", "");
        }
        setError(cleanMsg || "An error occurred during sign-in.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Register with Email/Password
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      // Update display name
      await updateProfile(user, { displayName });
      onAuthSuccess(user.uid, user.email || "", displayName);
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.message || "";
      const errCode = err?.code || "";
      
      if (isUnauthorizedDomainError(err)) {
        setError("unauthorized-domain");
      } else if (errCode === "auth/email-already-in-use" || errMsg.includes("email-already-in-use")) {
        setError("This email is already in use. Try signing in instead.");
      } else if (errCode === "auth/invalid-email" || errMsg.includes("invalid-email")) {
        setError("Invalid email address format.");
      } else if (errCode === "auth/weak-password" || errMsg.includes("weak-password")) {
        setError("Password is too weak. Must be at least 6 characters.");
      } else {
        let cleanMsg = errMsg;
        if (cleanMsg.startsWith("Firebase: ")) {
          cleanMsg = cleanMsg.replace("Firebase: ", "");
        }
        setError(cleanMsg || "An error occurred during registration.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Popup
  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      // Enforce account selection prompt
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      onAuthSuccess(user.uid, user.email || "", user.displayName || user.email?.split("@")[0] || "Eco Hero");
    } catch (err: any) {
      console.error(err);
      if (isUnauthorizedDomainError(err)) {
        setError("unauthorized-domain");
      } else if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message || "Failed to sign in with Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Reset Password Flow
  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address to reset your password.");
      return;
    }
    setError(null);
    setInfoMessage(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setInfoMessage("Password reset email sent. Please check your inbox!");
    } catch (err: any) {
      if (isUnauthorizedDomainError(err)) {
        setError("unauthorized-domain");
      } else {
        setError(err.message || "Failed to send reset email.");
      }
    }
  };

  return (
    <div id="login_container" className="flex min-h-screen flex-col justify-center bg-natural-bg px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        
        {/* App Logo & Header */}
        <div className="mb-8 text-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-natural-primary shadow-lg shadow-stone-200"
          >
            <Leaf className="h-9 w-9 text-white" />
          </motion.div>
          
          <motion.h1 
            initial={{ y: -5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05, duration: 0.15 }}
            className="mt-4 font-sans text-3xl font-extrabold tracking-tight text-natural-dark"
          >
            GreenLoop
          </motion.h1>
          
          <motion.p 
            initial={{ y: -5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.15 }}
            className="mx-auto mt-2 max-w-xs text-sm text-natural-dark/75 font-medium"
          >
            Convert organic kitchen waste into clean biogas & electricity
          </motion.p>
        </div>

        {/* Auth Card */}
        <motion.div 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.15 }}
          className="rounded-[2rem] bg-natural-cream p-8 shadow-xl shadow-stone-200/40 border border-natural-border/70"
        >
          {/* Status Messages */}
          {error && (
            error === "unauthorized-domain" ? (
              <div id="auth_error_unauthorized" className="mb-6 rounded-2xl bg-[#FFF9E6] p-4 text-xs text-stone-800 border border-amber-200 shadow-xs space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-amber-900">Domain Authorization Required</h4>
                    <p className="mt-1 text-stone-700 leading-relaxed">
                      Your Firebase project (<code className="bg-amber-150/70 px-1 py-0.5 rounded font-bold font-mono">greenloop-app1</code>) does not recognize this application's domain.
                    </p>
                  </div>
                </div>
                
                <div className="rounded-xl bg-white/85 p-3 border border-amber-200/50 space-y-2">
                  <p className="font-semibold text-amber-900">How to authorize this domain:</p>
                  <ol className="list-decimal pl-4 space-y-1 text-stone-700">
                    <li>Go to the <a href="https://console.firebase.google.com/project/greenloop-app1/authentication/settings" target="_blank" rel="noopener noreferrer" className="font-bold underline text-natural-primary hover:text-natural-dark">Firebase Console Settings</a>.</li>
                    <li>Under <strong>Authorized domains</strong>, click <strong>Add domain</strong>.</li>
                    <li>Copy and add the following current host:
                      <div className="mt-1.5 flex items-center justify-between bg-stone-50 p-2 rounded border border-stone-250/60">
                        <code id="current_domain_code" className="font-mono font-bold text-natural-dark select-all">{window.location.hostname}</code>
                        <button 
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.hostname);
                            alert("Copied to clipboard!");
                          }}
                          className="text-[10px] bg-natural-primary text-white font-bold px-2 py-1 rounded hover:bg-natural-primary/95"
                        >
                          Copy
                        </button>
                      </div>
                    </li>
                  </ol>
                </div>
                <p className="text-[11px] text-amber-800/80 italic">
                  Once added, refresh this page and try signing in again!
                </p>

              </div>
            ) : (
              <div id="auth_error" className="mb-4 flex items-start gap-2.5 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-100">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <span>{error}</span>
              </div>
            )
          )}

          {infoMessage && (
            <div id="auth_info" className="mb-4 flex items-start gap-2.5 rounded-xl bg-natural-bg p-3 text-xs text-natural-dark/80 border border-natural-border">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-natural-primary mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          <h2 className="text-xl font-bold text-natural-dark mb-6">
            {isRegister ? "Create Account" : "Sign In"}
          </h2>

          <form onSubmit={isRegister ? handleEmailSignUp : handleEmailSignIn} className="space-y-4">
            
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-natural-dark/60 mb-1.5 uppercase tracking-wider font-mono">
                  Your Name
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <User className="h-4.5 w-4.5 text-natural-dark/40" />
                  </div>
                  <input
                    id="register_name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="block w-full rounded-xl border border-natural-border bg-white py-3 pl-10 pr-4 text-sm text-natural-dark placeholder-stone-400 focus:border-natural-primary focus:bg-white focus:ring-1 focus:ring-natural-primary focus:outline-none"
                    placeholder="Jane Doe"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-natural-dark/60 mb-1.5 uppercase tracking-wider font-mono">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-4.5 w-4.5 text-natural-dark/40" />
                </div>
                <input
                  id="auth_email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-natural-border bg-white py-3 pl-10 pr-4 text-sm text-natural-dark placeholder-stone-400 focus:border-natural-primary focus:bg-white focus:ring-1 focus:ring-natural-primary focus:outline-none"
                  placeholder="name@domain.com"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-natural-dark/60 uppercase tracking-wider font-mono">
                  Password
                </label>
                {!isRegister && (
                  <button
                    id="forgot_password_btn"
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs font-medium text-natural-primary hover:text-natural-dark hover:underline"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4.5 w-4.5 text-natural-dark/40" />
                </div>
                <input
                  id="auth_password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-natural-border bg-white py-3 pl-10 pr-4 text-sm text-natural-dark placeholder-stone-400 focus:border-natural-primary focus:bg-white focus:ring-1 focus:ring-natural-primary focus:outline-none"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              id="submit_auth_btn"
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center rounded-xl bg-natural-primary py-3 font-semibold text-white shadow-md shadow-stone-200 hover:bg-natural-primary/95 focus:outline-none focus:ring-2 focus:ring-natural-primary focus:ring-offset-2 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : isRegister ? (
                "Get Started →"
              ) : (
                "Sign In →"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-natural-border"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-natural-cream px-3 text-natural-dark/50 uppercase font-bold font-mono">Or continue with</span>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            id="google_signin_btn"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-natural-border bg-white py-3 font-semibold text-natural-dark hover:bg-natural-bg transition-all cursor-pointer shadow-sm"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" width="24" height="24">
              <g transform="matrix(1, 0, 0, 1, 0, 0)">
                <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.48C21.68,11.76 21.56,11.4 21.35,11.1z" fill="#4285F4" />
                <path d="M12,20.58c2.58,0 4.75,-0.85 6.33,-2.3l-3.3,-2.58c-0.92,0.62 -2.1,0.98 -3.03,0.98 -2.33,0 -4.3,-1.58 -5,-3.7H3.54v2.68C5.19,18.9 8.36,20.58 12,20.58z" fill="#34A853" />
                <path d="M7,12.98c-0.18,-0.52 -0.28,-1.08 -0.28,-1.65s0.1,-1.13 0.28,-1.65V7.01H3.54C2.92,8.23 2.58,9.6 2.58,11.05s0.34,2.82 0.96,4.04l3.46,-2.11C7,12.98,7,12.98,7,12.98z" fill="#FBBC05" />
                <path d="M12,4.83c1.4,0 2.67,0.48 3.67,1.43l2.75,-2.75C16.75,1.9 14.58,1.05 12,1.05 8.36,1.05 5.19,2.73 3.54,6.01L7,8.12C7.7,6.4 9.67,4.83 12,4.83z" fill="#EA4335" />
              </g>
            </svg>
            <span>Continue with Google</span>
          </button>



          {/* Toggle Register/Login */}
          <div className="mt-6 text-center text-sm text-natural-dark/65">
            {isRegister ? (
              <p>
                Already have an account?{" "}
                <button
                  id="toggle_login_btn"
                  type="button"
                  onClick={() => setIsRegister(false)}
                  className="font-bold text-natural-primary hover:text-natural-dark hover:underline"
                >
                  Sign In
                </button>
              </p>
            ) : (
              <p>
                Don't have an account?{" "}
                <button
                  id="toggle_register_btn"
                  type="button"
                  onClick={() => setIsRegister(true)}
                  className="font-bold text-natural-primary hover:text-natural-dark hover:underline"
                >
                  Register
                </button>
              </p>
            )}
          </div>

        </motion.div>
      </div>
    </div>
  );
}
