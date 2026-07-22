// filepath: src/pages/Index.tsx
// @refresh reset
import { lazy, Suspense } from "react";
import Hero from "@/components/Hero";
import YangiNashrlar from "@/components/YangiNashrlar";
import BookOfTheMonth from "@/components/BookOfTheMonth";
import Blog from "@/components/Blog";
import Footer from "@/components/Footer";

// ── Lazy-load every section that sits below the fold ──────────────────────────
// Keeps the initial JS bundle lean — these chunks download in parallel and are
// ready before the user scrolls to them on any reasonable connection.
const AmirTemurSection = lazy(() => import("@/components/AmirTemurSection"));
const CuratedLibrary = lazy(() => import("@/components/CuratedLibrary"));
const Taassurotlar = lazy(() => import("@/components/Taassurotlar"));
const QuickActions = lazy(() => import("@/components/QuickActions"));

// Minimal height placeholder — prevents CLS while chunk downloads
const SectionFallback = () => <div className="w-full h-32 bg-transparent" aria-hidden />;

const Divider = () => (
  <div className="w-full h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
);

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col min-h-screen">
        <main className="flex-1">
          {/* ── Above the fold — statically bundled. Each section renders its
              own skeleton while data streams in, so nothing blocks paint. ── */}
          <Hero />
          <Divider />
          <BookOfTheMonth />
          <Divider />
          <YangiNashrlar />
          <Divider />

          {/* ── Below the fold — code-split, loaded in parallel ── */}

          <Suspense fallback={<SectionFallback />}>
            <CuratedLibrary />
          </Suspense>
          <Divider />

          <Suspense fallback={<SectionFallback />}>
            <AmirTemurSection />
          </Suspense>
          <Divider />

          <Suspense fallback={<SectionFallback />}>
            <Taassurotlar />
          </Suspense>

          <Blog />

          <Suspense fallback={<SectionFallback />}>
            <QuickActions />
          </Suspense>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Index;
