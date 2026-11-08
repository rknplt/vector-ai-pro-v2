import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Menu, X, LogOut, Shield, User, LayoutDashboard, Ticket, Crown, Download, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, languageList, type Language } from "@/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  compact?: boolean;
}

const Header = ({ compact = false }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isAdmin, userPlan, signOut, isLoading } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const currentLang = languageList.find(l => l.code === language)!;

  const LanguageDropdown = ({ className = "" }: { className?: string }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={`gap-1.5 text-muted-foreground ${className}`}>
          <span className="text-base leading-none">{currentLang.flag}</span>
          <span className="text-xs">{language.toUpperCase()}</span>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
        {languageList.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code as Language)}
            className={language === lang.code ? "bg-accent" : ""}
          >
            <span className="text-base mr-2">{lang.flag}</span>
            <span>{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center glow-primary">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="absolute -inset-1 bg-gradient-primary opacity-30 blur-lg rounded-xl -z-10" />
            </div>
            <span className="text-xl font-bold gradient-text">Vector AI Pro</span>
          </div>

          {/* Desktop Navigation */}
          {!compact && (
            <nav className="hidden lg:flex items-center gap-5 2xl:gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                {t("nav.features")}
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                {t("nav.pricing")}
              </a>
              <a href="#chat" className="text-muted-foreground hover:text-foreground transition-colors">
                {t("nav.assistant")}
              </a>
              <a href="/install" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                <Download className="w-4 h-4" />
                {t("nav.download")}
              </a>
            </nav>
          )}

          {/* CTA Buttons */}
          <div className="hidden xl:flex items-center gap-2 2xl:gap-3">
            {/* Language Toggle */}
            <LanguageDropdown />

            {isLoading ? (
              <div className="w-8 h-8 animate-spin rounded-full border-b-2 border-primary"></div>
            ) : user ? (
              <>
                <Badge 
                  variant={userPlan === "plus" ? "default" : "secondary"}
                  className={userPlan === "plus" ? "bg-gradient-to-r from-primary to-accent" : ""}
                >
                  <Crown className="w-3 h-3 mr-1" />
                  {userPlan === "plus" ? "Plus" : t("nav.free")}
                </Badge>
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
                    <Shield className="w-4 h-4 2xl:mr-2" />
                    <span className="hidden 2xl:inline">{t("nav.admin")}</span>
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                  <LayoutDashboard className="w-4 h-4 2xl:mr-2" />
                  <span className="hidden 2xl:inline">{t("nav.dashboard")}</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
                  <User className="w-4 h-4 2xl:mr-2" />
                  <span className="hidden 2xl:inline">{t("nav.profile")}</span>
                </Button>
                {userPlan === "free" && (
                  <Button variant="outline" size="sm" onClick={() => navigate("/redeem-code")} className="border-primary/50 text-primary">
                    <Ticket className="w-4 h-4 mr-2" />
                    {t("nav.inviteCode")}
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 2xl:mr-2" />
                  <span className="hidden 2xl:inline">{t("nav.logout")}</span>
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
                  {t("nav.login")}
                </Button>
                <Button variant="hero" size="sm" onClick={() => navigate("/auth")}>
                  {t("nav.start")}
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 xl:hidden lg:gap-1">
            <LanguageDropdown className="p-2" />
            <button
              className="p-2 text-muted-foreground hover:text-foreground"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
          {isMenuOpen && (
          <div className="xl:hidden py-4 border-t border-border/30 animate-slide-up">
            <nav className="flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                {user ? (
                  <>
                    <div className="flex justify-center pb-2">
                      <Badge 
                        variant={userPlan === "plus" ? "default" : "secondary"}
                        className={userPlan === "plus" ? "bg-gradient-to-r from-primary to-accent" : ""}
                      >
                        <Crown className="w-3 h-3 mr-1" />
                        {userPlan === "plus" ? "Plus" : t("nav.free")}
                      </Badge>
                    </div>
                    {isAdmin && (
                      <Button variant="ghost" className="w-full" onClick={() => navigate("/admin")}>
                        <Shield className="w-4 h-4 mr-2" />
                        {t("nav.admin")}
                      </Button>
                    )}
                    <Button variant="ghost" className="w-full" onClick={() => navigate("/dashboard")}>
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      {t("nav.dashboard")}
                    </Button>
                    <Button variant="ghost" className="w-full" onClick={() => navigate("/profile")}>
                      <User className="w-4 h-4 mr-2" />
                      {t("nav.profile")}
                    </Button>
                    {userPlan === "free" && (
                      <Button variant="outline" className="w-full border-primary/50 text-primary" onClick={() => navigate("/redeem-code")}>
                        <Ticket className="w-4 h-4 mr-2" />
                        {t("nav.inviteCode")}
                      </Button>
                    )}
                    <Button variant="ghost" className="w-full" onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-2" />
                      {t("nav.logout")}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" className="w-full" onClick={() => navigate("/auth")}>
                      {t("nav.login")}
                    </Button>
                    <Button variant="hero" className="w-full" onClick={() => navigate("/auth")}>
                      {t("nav.start")}
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
