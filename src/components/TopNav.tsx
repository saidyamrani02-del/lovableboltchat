import { Menu } from "lucide-react";
import { Button } from "./ui/button";

interface TopNavProps {
  onMenuToggle: () => void;
}

const TopNav = ({ onMenuToggle }: TopNavProps) => {
  const handleMenuToggle = () => {
    onMenuToggle();
    const overlay = document.getElementById("menu-overlay");
    const slideMenu = document.getElementById("slide-menu");
    if (overlay && slideMenu) {
      const isOpen = !slideMenu.classList.contains("-translate-x-full");
      if (isOpen) {
        overlay.classList.add("opacity-0", "pointer-events-none");
      } else {
        overlay.classList.remove("opacity-0", "pointer-events-none");
      }
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-card border-b border-border max-w-md mx-auto">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMenuToggle}
            className="h-8 w-8"
            data-menu-button
          >
            <Menu className="h-5 w-5 text-foreground" />
          </Button>
          <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            VideoCalls
          </h1>
        </div>
      </div>
    </header>
  );
};

export default TopNav;