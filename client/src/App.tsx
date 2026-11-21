import { lazy, Suspense } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppShell from "@/components/AppShell";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

const Home = lazy(() => import("@/pages/Home"));
const NOVA = lazy(() => import("@/pages/NOVA"));
const ImageStudio = lazy(() => import("@/pages/ImageStudio"));
const ImageStudioHistory = lazy(() => import("@/pages/ImageStudioHistory"));
const Explorer = lazy(() => import("@/pages/Explorer"));
const LiveIntelligence = lazy(() => import("@/pages/LiveIntelligence"));
const Laboratory = lazy(() => import("@/pages/Laboratory"));
const Research = lazy(() => import("@/pages/Research"));
const Visualization = lazy(() => import("@/pages/Visualization"));
const Knowledge = lazy(() => import("@/pages/Knowledge"));
const Learning = lazy(() => import("@/pages/Learning"));
const Library = lazy(() => import("@/pages/Library"));
const SignIn = lazy(() => import("@/pages/SignIn"));

function RouteLoading() {
  return (
    <div className="page-loading" role="status" aria-live="polite" aria-busy="true">
      <span className="route-loader-orbit" aria-hidden="true"><i /></span>
      <strong>TBA_TE_EDITZZZ</strong>
      <span>Opening this scientific workspace</span>
    </div>
  );
}

function Router() {
  const [location] = useLocation();

  if (location === "/signin") {
    return <Suspense fallback={<RouteLoading />}><SignIn /></Suspense>;
  }

  return (
    <AppShell>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location}
          className="route-stage"
          initial={{ opacity: 0, y: 10, filter: "blur(3px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -5, filter: "blur(2px)" }}
          transition={{ duration: 0.27, ease: [0.22, 1, 0.36, 1] }}
        >
          <Suspense fallback={<RouteLoading />}>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/nova" component={NOVA} />
                  <Route path="/image-studio/history" component={ImageStudioHistory} />
              <Route path="/image-studio" component={ImageStudio} />
              <Route path="/discoveries" component={Research} />
              <Route path="/explorer" component={Explorer} />
              <Route path="/laboratory" component={Laboratory} />
              <Route path="/live" component={LiveIntelligence} />
              <Route path="/research" component={Research} />
              <Route path="/visualization" component={Visualization} />
              <Route path="/knowledge" component={Knowledge} />
              <Route path="/learning" component={Learning} />
              <Route path="/library" component={Library} />
              <Route path="/404" component={NotFound} />
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </AppShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <ThemeProvider defaultTheme="dark" switchable>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </MotionConfig>
    </ErrorBoundary>
  );
}
