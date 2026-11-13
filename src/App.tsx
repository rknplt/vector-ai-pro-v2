import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import RedeemCode from "./pages/RedeemCode";
import Install from "./pages/Install";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import SharedChat from "./pages/SharedChat";

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("RootErrorBoundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#090d16",
          color: "#f8fafc",
          padding: "24px",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif"
        }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "12px", color: "#a855f7" }}>
            Vector AI Pro
          </h2>
          <p style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "20px", maxWidth: "360px" }}>
            Uygulama yüklenirken bir sorun oluştu. Lütfen yeniden başlatın.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: "10px 20px",
              backgroundColor: "#7c3aed",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Yeniden Başlat
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient();

const AppInner = () => {
  useSessionTimeout();
  return (
    <>
      <Toaster />
      <Sonner />
      <AnnouncementBanner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/redeem-code" element={<RedeemCode />} />
          <Route path="/install" element={<Install />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/shared/:token" element={<SharedChat />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <RootErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <AuthProvider>
            <AppInner />
          </AuthProvider>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </RootErrorBoundary>
);

export default App;
