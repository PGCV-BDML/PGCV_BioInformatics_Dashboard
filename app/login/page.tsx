export default function SignInPage() {
  return (
    <div className="min-h-screen w-full flex">
      {/* ── Left hero panel ───────────────────────────────────────────── */}
      <div className="hidden md:flex flex-1 bg-[#282560] relative overflow-hidden flex-col justify-between p-10">
        {/* Top-left radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 60% 40% at 0% 0%, rgba(90,43,237,0.35) 0%, rgba(45,22,119,0.18) 35%, transparent 70%)",
          }}
        />
        {/* Bottom-right radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 50% 40% at 100% 100%, rgba(7,216,255,0.12) 0%, rgba(4,108,128,0.06) 35%, transparent 70%)",
          }}
        />

        {/* Label */}
        <div className="relative z-10">
          <p className="text-[#07d8ff] text-[11px] tracking-[2.64px] uppercase font-optima">
            PGCV-BDML
          </p>

          {/* Heading - Switched to font-aileron */}
          <h1
            className="mt-5 text-[#f0e8f2] font-bold leading-[1.1] max-w-[560px] font-aileron"
            style={{ fontSize: "clamp(32px, 4vw, 52px)" }}
          >
            Bioinformatics Workflow Dashboard
          </h1>

          {/* Subtitle - Switched to font-aileron */}
          <p className="mt-6 text-[rgba(230,245,255,0.65)] leading-relaxed max-w-[480px] text-[15px] font-aileron">
            Internal workspace for service tracking, training, internships,
            collaborations, projects, accomplishments, documents, and
            repositories.
          </p>
        </div>

        {/* Logo box */}
        <div className="relative z-10 mt-10">
          <div className="bg-[rgba(7,216,255,0.06)] rounded-3xl border border-dashed border-[rgba(7,216,255,0.2)] flex items-center justify-center py-8 px-6 max-w-[606px]">
            <img
              src="/assets/PGC-VSF_Logo-W.png"
              alt="Philippine Genome Center Visayas logo"
              className="h-[142px] w-auto object-contain"
            />
          </div>
        </div>
      </div>

      {/* ── Right sign-in panel ───────────────────────────────────────── */}
      <div className="w-full md:w-[480px] flex-shrink-0 bg-[#e6f5ff] flex items-center justify-center p-8">
        <div
          className="bg-[#fffdf8] rounded-[28px] w-full max-w-[416px] p-[32px] relative"
          style={{
            boxShadow:
              "0px 24px 24px rgba(40,37,96,0.12), 0px 4px 8px rgba(40,37,96,0.08)",
            border: "0.8px solid rgba(23,33,38,0.14)",
          }}
        >
          {/* Internal access label */}
          <p className="text-[#2a7797] text-[11px] tracking-[2.16px] uppercase font-optima">
            Internal access
          </p>

          {/* Heading */}
          <h2 className="mt-3 text-[#172126] font-bold text-[44px] leading-[1.1] font-aileron">
            Sign in
          </h2>

          {/* Subtitle */}
          <p className="mt-4 text-[#4d6470] text-[14px] leading-6 max-w-[351px] font-aileron">
            Use your authorized Google account to access the dashboard.
          </p>

          {/* Sign-in button - Switched to font-quicksand layout token */}
          <button
            type="button"
            className="mt-8 w-full h-[52px] rounded-2xl flex items-center justify-center gap-3 text-white text-[14px] font-bold font-quicksand transition-opacity hover:opacity-90 active:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1071ff]"
            style={{
              backgroundImage:
                "linear-gradient(171.559deg, rgb(16,113,255) 0%, rgb(42,119,151) 100%)",
            }}
          >
            {/* Google SVG Graphic */}
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
            Sign in with Google
          </button>

          {/* Access notice */}
          <div className="mt-5 bg-[#e6f5ff] rounded-2xl p-4">
            <p className="text-[#172126] text-[14px] leading-6 font-aileron">
              For authorized PGCV-BDML users only. Contact your supervisor if
              you need access.
            </p>
          </div>

          {/* Privacy notice */}
          <div
            className="mt-5 pt-5 relative"
            style={{ borderTop: "0.8px solid rgba(23,33,38,0.12)" }}
          >
            <p className="text-[12px] leading-5 font-aileron">
              <span className="font-bold text-[#172126]">
                Data Privacy Notice.
              </span>{" "}
              <span className="text-[#65706f]">
                This dashboard stores internal operations records and limited
                participant data needed for training and internship
                administration. Access is restricted by role and activity may be
                logged for accountability.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
