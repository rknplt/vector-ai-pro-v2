import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import ChatInterface from "@/components/ChatInterface";
import Footer from "@/components/Footer";

const Index = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Giriş yapılmışsa doğrudan TAM EKRAN ChatGPT / Native Mobil Uygulama arayüzü
  if (user) {
    return (
      <div className="h-[100dvh] max-h-[100dvh] flex flex-col bg-background overflow-hidden">
        <Header compact={true} />
        <main className="flex-1 w-full h-[calc(100dvh-4rem)] overflow-hidden pt-16">
          <ChatInterface fullScreen={true} />
        </main>
      </div>
    );
  }

  // Giriş yapılmamışsa Tanıtım / Landing Page
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <Features />
        <Pricing />
        <ChatInterface />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
