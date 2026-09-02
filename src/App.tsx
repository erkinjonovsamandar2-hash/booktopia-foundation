import { useEffect, lazy, Suspense, useState } from "react";
import { BrowserRouter, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import logoImg from "@/assets/Logo-blue.png";
import { useData } from "@/context/DataContext";

import { DataProvider } from "@/context/DataContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

import AnimatedRoutes from "@/components/AnimatedRoutes";
import PageTransition from "@/components/PageTransition";
import GlobalEffects from "@/components/GlobalEffects";
import IntroSplash from "@/components/IntroSplash";
import Navbar from "@/components/Navbar";
import ScrollToTop from "@/components/ScrollToTop";
import ErrorBoundary from "@/components/ErrorBoundary";
import MiniCart from "@/components/MiniCart";
import { CartProvider } from "@/context/CartContext";

// ── STATIC IMPORTS (critical path — must be instant for FCP) ─────────────────
import Index from "./pages/Index";

// ── LAZY IMPORTS (non-critical — split into separate JS chunks) ──────────────
const BlogPage = lazy(() => import("./pages/BlogPage"));
const BlogPostDetail = lazy(() => import("./pages/BlogPostDetail"));
const LibraryPage = lazy(() => import("./pages/LibraryPage"));
const QuizPage = lazy(() => import("./pages/QuizPage"));
const SpotlightPage = lazy(() => import("./pages/SpotlightPage"));
const BookDetails = lazy(() => import("./pages/BookDetails"));
const About = lazy(() => import("./pages/About"));
const BizHaqimizda = lazy(() => import("./pages/BizHaqimizda"));
const TeamPage = lazy(() => import("./pages/TeamPage"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminModeSelect = lazy(() => import("./pages/admin/AdminModeSelect"));
const BookManager = lazy(() => import("./pages/admin/BookManager"));
const BlogManager = lazy(() => import("./pages/admin/BlogManager"));
const QuizManager = lazy(() => import("./pages/admin/QuizManager"));
const SiteSettingsManager = lazy(() => import("./pages/admin/SiteSettingsManager"));
const AdminUsersManager = lazy(() => import("./pages/admin/AdminUsersManager"));
const NewBookManager = lazy(() => import("./pages/admin/NewBookManager"));
const AdminReviews = lazy(() => import("@/pages/AdminReviews"));
const TeamManager = lazy(() => import("./pages/admin/TeamManager"));
const HeroOrderManager = lazy(() => import("./pages/admin/HeroOrderManager"));
const Hamkorlar = lazy(() => import("./pages/Hamkorlar"));
const PartnerManager = lazy(() => import("./pages/admin/PartnerManager"));
const CuratedLibraryManager = lazy(() => import("./pages/admin/CuratedLibraryManager"));
// Bot Sales
const BotLayout = lazy(() => import("./pages/admin/bot/BotLayout"));
const OrdersManager = lazy(() => import("./pages/admin/bot/OrdersManager"));
const BotCustomers = lazy(() => import("./pages/admin/bot/BotCustomers"));
const BotStats = lazy(() => import("./pages/admin/bot/BotStats"));
const BotBroadcast = lazy(() => import("./pages/admin/bot/BotBroadcast"));
const BotBooksManager = lazy(() => import("./pages/admin/bot/BotBooksManager"));

const queryClient = new QueryClient();

// ── Active theme ──────────────────────────────────────────────────────────────
const ACTIVE_THEME = 2;

// ── Suspense Fallback ─────────────────────────────────────────────────────────
// Minimal branded fallback rendered while a lazy chunk is downloading.
// Intentionally lightweight — no heavy imports, pure Tailwind + CSS animation.
const SuspenseFallback = () => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 transition-colors duration-500">
    <div className="relative flex items-center justify-center">
      <span
        className="absolute inline-flex h-16 w-16 rounded-full bg-primary/20 animate-ping"
        style={{ animationDuration: "1.4s" }}
      />
      <img
        src={logoImg}
        alt="Booktopia"
        className="relative h-12 w-auto object-contain opacity-90"
      />
    </div>
    <div className="w-32 h-[2px] rounded-full bg-border overflow-hidden">
      <div
        className="h-full bg-primary rounded-full animate-pulse"
        style={{ width: "60%" }}
      />
    </div>
    <p className="font-serif text-xs tracking-[0.3em] uppercase text-muted-foreground">
      Yuklanmoqda…
    </p>
  </div>
);

// ── Auth Guard ────────────────────────────────────────────────────────────────
const RequireAdmin = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, isAdminLoading, adminCheckFailed, recheckAdmin, loading, signOut, ensureAuth } = useAuth();
  // Wake the auth bootstrap now that we're on an admin route. Auth stays dormant
  // while browsing public pages, so this is where it actually initializes.
  useEffect(() => { ensureAuth(); }, [ensureAuth]);
  // Show spinner during initial session load OR while role is being fetched
  if (loading || isAdminLoading)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Yuklanmoqda…
      </div>
    );
  if (!user) return <Navigate to="/admin/login" replace />;
  // The role check never completed. Saying "no permission" here would blame the
  // admin for a server that did not answer, so say what actually happened.
  if (adminCheckFailed)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center gap-4 px-6">
        <p className="text-destructive font-medium">Server javob bermadi.</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Huquqlaringizni tekshirib bo'lmadi. Internet aloqasini tekshiring va qayta urinib ko'ring.
        </p>
        <button
          onClick={() => { void recheckAdmin(); }}
          className="mt-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Qayta urinish
        </button>
      </div>
    );
  if (!isAdmin)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center gap-4">
        <p className="text-destructive font-medium">Ruxsat yo'q. Admin huquqi talab qilinadi.</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Bu hisob uchun admin huquqi berilmagan.
        </p>
        <button
          onClick={() => signOut()}
          className="mt-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Tizimdan chiqish
        </button>
      </div>
    );
  return <>{children}</>;
};

// ── Lazy route wrapper ────────────────────────────────────────────────────────
// Each lazy route gets its own tightly-scoped Suspense boundary.
// This is the KEY architectural fix:
//
// BEFORE (broken):
//   <Suspense>                          ← wraps entire Routes tree
//     <AnimatePresence mode="wait">     ← sees Suspense fallback + Routes = 2 children → freeze
//       <Routes>
//         <Route element={<LazyPage/>}/>
//       </Routes>
//     </AnimatePresence>
//   </Suspense>
//
// AFTER (fixed):
//   <AnimatePresence mode="wait">       ← always sees exactly ONE child: <Routes>
//     <Routes key={pathname}>
//       <Route element={
//         <Suspense fallback={...}>     ← scoped to THIS route only
//           <PageTransition>
//             <LazyPage/>
//           </PageTransition>
//         </Suspense>
//       }/>
//     </Routes>
//   </AnimatePresence>
//
// AnimatePresence now always has exactly one direct child (<Routes>).
// Suspense boundaries are isolated per-route — they never compete with
// the AnimatePresence animation pipeline.
const Lazy = ({
  component: Component,
}: {
  component: React.ComponentType;
}) => (
  <Suspense fallback={<SuspenseFallback />}>
    <PageTransition>
      <Component />
    </PageTransition>
  </Suspense>
);

// Applies the primary-color theme override. No longer gates rendering on data
// load — every section renders immediately and shows its own skeleton while
// data streams in (Hero, BookOfTheMonth, YangiNashrlar all handle empty state).
// The old full-screen splash blocked the entire app — including the navbar and
// every non-home route — behind 4 Supabase queries, which was the single
// biggest cause of perceived slowness.
const AppLoader = ({ children }: { children: React.ReactNode }) => {
  const { siteSettings } = useData();

  // Apply primary color override via data attribute
  useEffect(() => {
    const color = siteSettings.theme?.primary_color ?? "blue";
    document.documentElement.dataset.primary = color;
  }, [siteSettings.theme?.primary_color]);

  return <>{children}</>;
};

// ── Inner app — needs useLocation which requires BrowserRouter context ────────
const AppInner = () => {
  const location = useLocation();
  const isAdminArea = location.pathname.startsWith("/admin");

  return (
    <>
      {/* Brief branded intro overlay — non-blocking; the app renders underneath */}
      <IntroSplash />
      <ScrollToTop />
      <GlobalEffects />
      <Navbar />
      {/* The storefront cart is for shoppers. Inside the admin it is noise, and
          a floating "1 · 65 000 so'm" over a dashboard reads like data. */}
      {!isAdminArea && <MiniCart />}

      {/* FIX: AnimatePresence wraps AnimatedRoutes DIRECTLY as its only child.
          No Suspense between AnimatePresence and Routes — the pipeline can
          now track a single stable child through every navigation.          */}
      <AnimatePresence mode="wait">
        <AnimatedRoutes>

          {/* STATIC — no Suspense needed, eagerly loaded */}
          <Route
            path="/"
            element={
              <PageTransition>
                <Index />
              </PageTransition>
            }
          />

          {/* LAZY — public pages */}
          <Route path="/about" element={<Lazy component={About} />} />
          <Route path="/biz-haqimizda" element={<Lazy component={BizHaqimizda} />} />
          <Route path="/blog" element={<Lazy component={BlogPage} />} />
          <Route path="/blog/:slug" element={<Lazy component={BlogPostDetail} />} />
          <Route path="/team" element={<Lazy component={TeamPage} />} />
          <Route path="/library" element={<Lazy component={LibraryPage} />} />
          <Route path="/book/:id" element={<Lazy component={BookDetails} />} />
          <Route path="/quiz" element={<Lazy component={QuizPage} />} />
          <Route path="/spotlight" element={<Lazy component={SpotlightPage} />} />
          <Route path="/hamkorlar" element={<Lazy component={Hamkorlar} />} />

          {/* LAZY — legal pages */}
          <Route
            path="/maxfiylik"
            element={
              <Suspense fallback={<SuspenseFallback />}>
                <PageTransition>
                  <PrivacyPolicy />
                </PageTransition>
              </Suspense>
            }
          />
          <Route
            path="/shartlar" /* Already mapped as /shartlar in footer */
            element={
              <Suspense fallback={<SuspenseFallback />}>
                <PageTransition>
                  <TermsOfUse />
                </PageTransition>
              </Suspense>
            }
          />
          <Route
            path="/oferta"
            element={
              <Suspense fallback={<SuspenseFallback />}>
                <PageTransition>
                  <LegalPage title="Ommaviy Oferta">
                    <p>Ushbu oferta kitob mahsulotlarini sotib olish bo'yicha rasmiy taklif hisoblanadi...</p>
                  </LegalPage>
                </PageTransition>
              </Suspense>
            }
          />

          {/* LAZY — admin (heaviest chunk, gated behind auth) */}
          <Route
            path="/admin/login"
            element={<Lazy component={AdminLogin} />}
          />
          {/* Mode select (after login) */}
          <Route
            path="/admin/select"
            element={
              <Suspense fallback={<SuspenseFallback />}>
                <RequireAdmin>
                  <AdminModeSelect />
                </RequireAdmin>
              </Suspense>
            }
          />

          {/* CMS Admin */}
          <Route
            path="/admin"
            element={
              <Suspense fallback={<SuspenseFallback />}>
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              </Suspense>
            }
          >
            <Route index element={<Lazy component={BookManager} />} />
            <Route path="new-books" element={<Lazy component={NewBookManager} />} />
            <Route path="blog" element={<Lazy component={BlogManager} />} />
            <Route path="quiz" element={<Lazy component={QuizManager} />} />
            <Route path="settings" element={<Lazy component={SiteSettingsManager} />} />
            <Route path="users" element={<Lazy component={AdminUsersManager} />} />
            <Route path="reviews" element={<Lazy component={AdminReviews} />} />
            <Route path="team" element={<Lazy component={TeamManager} />} />
            <Route path="hero-order" element={<Lazy component={HeroOrderManager} />} />
            <Route path="partners" element={<Lazy component={PartnerManager} />} />
            <Route path="curated" element={<Lazy component={CuratedLibraryManager} />} />
          </Route>

          {/* Bot Sales Admin */}
          <Route
            path="/admin/bot"
            element={
              <Suspense fallback={<SuspenseFallback />}>
                <RequireAdmin>
                  <BotLayout />
                </RequireAdmin>
              </Suspense>
            }
          >
            <Route index element={<Lazy component={OrdersManager} />} />
            <Route path="books" element={<Lazy component={BotBooksManager} />} />
            <Route path="customers" element={<Lazy component={BotCustomers} />} />
            <Route path="stats" element={<Lazy component={BotStats} />} />
            <Route path="broadcast" element={<Lazy component={BotBroadcast} />} />
          </Route>

          <Route path="*" element={<Lazy component={NotFound} />} />

        </AnimatedRoutes>
      </AnimatePresence>
    </>
  );
};

// ── App ───────────────────────────────────────────────────────────────────────
const App = () => {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("theme-1", "theme-2", "theme-3");
    html.classList.add(`theme-${ACTIVE_THEME}`);
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <DataProvider>
            <LanguageProvider>
              <TooltipProvider>
                <CartProvider>
                  <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
                    <Toaster />
                    <Sonner />
                    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                      <AppLoader>
                        <AppInner />
                      </AppLoader>
                    </BrowserRouter>
                  </div>
                </CartProvider>
              </TooltipProvider>
            </LanguageProvider>
          </DataProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;