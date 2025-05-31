import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorFallback } from "./components/ErrorFallback";

// Tabs for our application
export enum AppTab {
  BRIEFING = "briefing",  // Making briefing the first tab
  CONTENT = "content",
  VISUAL = "visual",      // Adding visual tab for image generation
  FREE_PROMPT = "free-prompt"  // Adding free prompt RAG agent interface
}

// Page transition animations
export const pageTransition = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

function Router() {
  const [location] = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Switch key={location}>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary 
        FallbackComponent={ErrorFallback}
        onReset={() => {
          // Reset the state of your app here
          console.log("Error boundary reset");
          window.location.reload();
        }}
      >
        <Router />
      </ErrorBoundary>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;