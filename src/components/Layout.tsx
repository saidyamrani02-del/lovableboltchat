import { ReactNode, useState } from "react";
import React from "react";
import { Home, LayoutDashboard, Settings } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import TopNav from "./TopNav";
import SlideMenu from "./SlideMenu";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const [filters, setFilters] = useState({
    gender: "all",
    onlineOnly: false,
    ageSort: "low-to-high",
    region: "all-regions",
  });

  const toggleSlideMenu = () => {
    const slideMenu = document.getElementById("slide-menu");
    if (slideMenu) {
      slideMenu.classList.toggle("-translate-x-full");
    }
  };

  const navItems = [
    { icon: Home, label: "Feed", path: "/" },
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <div className="min-h-screen bg-background dark">
      {/* Overlay */}
      <div
        id="menu-overlay"
        className="fixed inset-0 bg-black/50 z-40 opacity-0 pointer-events-none transition-opacity"
        onClick={toggleSlideMenu}
      />
      <SlideMenu filters={filters} onFiltersChange={setFilters} />
      <TopNav onMenuToggle={toggleSlideMenu} />
      
      {/* Main Content - Mobile-first with max-width on desktop */}
      <main className="max-w-md mx-auto pb-20 pt-16">
        {React.cloneElement(children as React.ReactElement, { filters })}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border max-w-md mx-auto">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;