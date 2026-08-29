import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import LoadingSplash from "@/components/LoadingSplash";
import { useData } from "@/context/DataContext";

// Show the branded splash once per browser session.
const SPLASH_KEY = "introSplashShown";

// Timing guardrails — the whole point is that this is a brief intro, NOT the
// old blocking gate. It caps HARD so it can never stall the app again.
const MIN_MS = 900;   // floor: avoid an ugly flash on very fast loads
const MAX_MS = 2500;  // ceiling: reveal no matter what (was effectively 8s before)

/**
 * Non-blocking intro splash.
 *
 * Unlike the old splash, this does NOT gate rendering — the whole app renders
 * underneath from the first frame (sections show their own skeletons). This is
 * purely a fixed overlay on top that fades out as soon as the initial data is
 * ready (after a short minimum), or at MAX_MS at the latest. Either way it can
 * never block the page: worst case it just covers a fully-rendering page for a
 * couple of seconds.
 */
const IntroSplash = () => {
  const { loading } = useData();

  const [show, setShow] = useState(() => {
    if (typeof window === "undefined") return false;
    // Don't intro-splash admin/bot areas — only the public site.
    if (window.location.pathname.startsWith("/admin")) return false;
    return sessionStorage.getItem(SPLASH_KEY) !== "true";
  });
  const [minPassed, setMinPassed] = useState(false);

  useEffect(() => {
    if (!show) return;
    sessionStorage.setItem(SPLASH_KEY, "true");
    const minT = setTimeout(() => setMinPassed(true), MIN_MS);
    const maxT = setTimeout(() => setShow(false), MAX_MS);
    return () => {
      clearTimeout(minT);
      clearTimeout(maxT);
    };
  }, [show]);

  // Reveal as soon as data is ready — but never before the minimum.
  useEffect(() => {
    if (show && minPassed && !loading) setShow(false);
  }, [show, minPassed, loading]);

  return (
    <AnimatePresence>{show && <LoadingSplash key="intro" />}</AnimatePresence>
  );
};

export default IntroSplash;
