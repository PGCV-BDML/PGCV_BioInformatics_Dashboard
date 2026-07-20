"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function SignInPage() {
  const [currentYear, setCurrentYear] = useState<string>("2026");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear().toString());
  }, []);

  const handleSignInWithGoogle = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
    } catch (error) {
      console.error("Sign in failed:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-surface">
      {/* ── Left hero panel ───────────────────────────────────────────── */}
      <div className="hidden md:flex flex-1 bg-[#2a7797] relative overflow-hidden flex-col justify-between p-12">
        {/* ── Engineered DNA Double Helix Strands Field (Static Blueprint Design) ── */}
        <div
          className="absolute inset-y-0 right-0 w-1/2 pointer-events-none opacity-[0.75] mix-blend-screen select-none z-0 flex flex-col justify-around py-20 overflow-hidden"
          style={{
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, black 80%)",
            maskImage: "linear-gradient(to right, transparent 0%, black 80%)",
          }}
        >
          {[...Array(4)].map((_, helixIndex) => (
            <div
              key={helixIndex}
              className="relative w-full h-16 flex items-center"
              style={{
                transform: `translateY(${(helixIndex - 1.5) * 16}px)`,
              }}
            >
              {[...Array(12)].map((_, baseIndex) => {
                const angle = (baseIndex / 12) * Math.PI * 3.5;
                const positionX = (baseIndex / 11) * 100;

                const strandA_Y = Math.sin(angle) * 28;
                const strandB_Y = Math.sin(angle + Math.PI) * 28;
                const isFrontA = Math.cos(angle) > 0;

                return (
                  <div
                    key={baseIndex}
                    className="absolute top-1/2 flex flex-col items-center justify-center"
                    style={{
                      left: `${positionX}%`,
                      height: `${Math.abs(strandA_Y - strandB_Y)}px`,
                      transform: `translateY(${Math.min(strandA_Y, strandB_Y)}px)`,
                      width: "2px",
                    }}
                  >
                    {/* Top Node Layer */}
                    <div
                      className={`w-2 h-2 rounded-full absolute top-0 -translate-y-1/2 shadow-[0_0_6px_1px_rgba(7,216,255,0.6)] ${
                        isFrontA
                          ? "bg-[#07d8ff] z-20"
                          : "bg-white z-10 opacity-75"
                      }`}
                    />

                    {/* Connecting Vertical Bar Layer */}
                    <div className="w-[1px] h-full bg-gradient-to-b from-[#07d8ff] via-white/60 to-white opacity-60 origin-center" />

                    {/* Bottom Node Layer */}
                    <div
                      className={`w-2 h-2 rounded-full absolute bottom-0 translate-y-1/2 shadow-[0_0_6px_1px_rgba(7,216,255,0.6)] ${
                        !isFrontA
                          ? "bg-[#07d8ff] z-20"
                          : "bg-white z-10 opacity-75"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Ambient Top Subtle Overlay Glow */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 60% 50% at 20% 20%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 70%)",
          }}
        />

        {/* Content Layer */}
        <div className="relative z-10 w-full flex flex-col items-start pt-2">
          <div className="flex items-center gap-4 max-w-[560px] mb-6">
            {/* ponytail: UP logo asset not available — needs official file from PGC External Drive. Brand guide requires UP branch logo alongside PGCV logo. */}
            <img
              src="/assets/PGC-VSF_Logo-W.png"
              alt="Philippine Genome Center Visayas logo"
              className="h-12 w-auto object-contain select-none pointer-events-none flex-shrink-0"
            />
            <div className="w-[1px] h-8 bg-white/20 flex-shrink-0" />
            <p className="text-[#f0e8f2] text-[11px] tracking-[2.64px] uppercase font-quicksand font-bold leading-relaxed">
              PHILIPPINE GENOME CENTER VISAYAS - Bioinformatics and Data
              Management Laboratory
            </p>
          </div>

          <h1
            className="text-[#f0e8f2] font-bold leading-[1.15] max-w-[560px] font-aileron"
            style={{ fontSize: "clamp(30px, 3.8vw, 46px)" }}
          >
            Bioinformatics and Data Management Laboratory Workflow Dashboard
          </h1>

          <p className="mt-6 text-[rgba(230,245,255,0.8)] leading-relaxed max-w-[480px] text-[15px] font-quicksand">
            Internal workspace for service tracking, training, internships,
            collaborations, projects, accomplishments, documents, and
            repositories.
          </p>
        </div>

        <div className="text-[rgba(255,255,255,0.4)] text-[12px] font-quicksand relative z-10">
          © {currentYear} University of the Philippines - Philippine Genome Center Visayas. All rights reserved.
        </div>
      </div>

      {/* ── Right sign-in panel ───────────────────────────────────────── */}
      <div className="w-full md:w-[480px] flex-shrink-0 flex items-center justify-center p-6 md:p-8">
        <div
          className="bg-surface rounded-[28px] w-full max-w-[416px] p-6 sm:p-[32px] relative"
          style={{
            boxShadow:
              "0px 40px 64px -12px rgba(40, 37, 96, 0.16), 0px 16px 32px -8px rgba(40, 37, 96, 0.10), 0px 4px 16px rgba(40, 37, 96, 0.04)",
            border: "0.8px solid rgba(23,33,38,0.12)",
          }}
        >
          <p className="text-[#2a7797] text-[11px] tracking-[2.16px] uppercase font-quicksand font-bold">
            Internal access
          </p>

          <h2 className="mt-3 text-[#172126] font-bold text-[44px] leading-[1.1] font-aileron">
            Sign in
          </h2>

          <p className="mt-4 text-[#4d6470] text-[14px] leading-6 max-w-[351px] font-quicksand">
            Use your authorized Google account to access the dashboard.
          </p>

          <button
            type="button"
            disabled={isLoading}
            onClick={handleSignInWithGoogle}
            className="mt-8 w-full h-[52px] rounded-2xl flex items-center justify-center gap-3 text-white text-[14px] font-bold font-quicksand transition-opacity hover:opacity-95 active:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a7797] disabled:opacity-75 disabled:cursor-not-allowed"
            style={{
              backgroundImage:
                "linear-gradient(171.559deg, #388dae 0%, #2a7797 100%)",
            }}
          >
            {isLoading ? (
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M16.5 9.188c0-.563-.05-1.125-.15-1.688H9v3.188h4.2a3.6 3.6 0 0 1-1.575 2.362v1.95h2.55c1.5-1.388 2.325-3.45 2.325-5.812Z"
                  fill="#fff"
                  fillOpacity=".9"
                />
                <path
                  d="M9 16.5c2.1 0 3.863-.694 5.175-1.875l-2.55-1.95c-.712.47-1.612.75-2.625.75-2.025 0-3.75-1.35-4.35-3.188H2.025v2.025A7.5 7.5 0 0 0 9 16.5Z"
                  fill="#fff"
                  fillOpacity=".9"
                />
                <path
                  d="M4.65 10.237A4.47 4.47 0 0 1 4.425 9c0-.431.075-.844.225-1.237V5.737H2.025A7.5 7.5 0 0 0 1.5 9c0 1.219.3 2.363.825 3.338l2.325-1.1Z"
                  fill="#fff"
                  fillOpacity=".8"
                />
                <path
                  d="M9 4.575c1.125 0 2.138.394 2.925 1.144l2.213-2.213C12.862 2.306 11.1 1.5 9 1.5A7.5 7.5 0 0 0 2.025 5.738L4.35 7.762C4.95 5.925 6.675 4.575 9 4.575Z"
                  fill="#fff"
                  fillOpacity=".8"
                />
              </svg>
            )}
            {isLoading ? "Signing in..." : "Sign in with Google"}
          </button>

          <div className="mt-5 bg-brand-tint rounded-2xl p-4">
            <p className="text-[#172126] text-[14px] leading-6 font-quicksand">
              For authorized PGCV-BDML users only. Contact your supervisor if
              you need access.
            </p>
          </div>

          <div
            className="mt-5 pt-5 relative"
            style={{ borderTop: "0.8px solid rgba(23,33,38,0.12)" }}
          >
            <p className="text-[12px] leading-5 font-quicksand font-bold text-[#172126]">
              Data Privacy Notice
            </p>
            <div className="mt-2 space-y-1 text-[12px] leading-5 font-quicksand">
              <p>
                <span className="font-bold text-[#172126]">
                  Data collected:{" "}
                </span>
                <span className="text-[#65706f]">
                  Internal lab operations records; training and internship
                  participant data (name, email, assessment answers); and
                  activity logs for accountability.
                </span>
              </p>
              <p>
                <span className="font-bold text-[#172126]">Purpose: </span>
                <span className="text-[#65706f]">
                  Internal workflow management, training administration, and
                  compliance with the Philippine Data Privacy Act (RA 10173).
                </span>
              </p>
              <p>
                <span className="font-bold text-[#172126]">Retention: </span>
                <span className="text-[#65706f]">
                  Operations records retained per lab-defined policy; participant
                  data deleted upon request or automatically at end of
                  internship. {/* ponytail: "lab-defined" kept intentionally vague — check with supervisor */}
                </span>
              </p>
              <p>
                <span className="font-bold text-[#172126]">Access: </span>
                <span className="text-[#65706f]">
                  PGCV-BDML team members only, with role-based access controls.
                  All access is logged.
                </span>
              </p>
              <p>
                <span className="font-bold text-[#172126]">
                  Deletion requests:{" "}
                </span>
                <span className="text-[#65706f]">
                  Contact your supervisor or email{" "}
                </span>
                <a
                  href="mailto:bdml@pgcvisayas.upv.edu.ph"
                  className="text-[#65706f] underline underline-offset-2 decoration-dotted hover:text-[#2a7797] transition-colors"
                >
                  bdml@pgcvisayas.upv.edu.ph
                </a>
                <span className="text-[#65706f]">
                  . Data will be anonymized or deleted within 30 days.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
