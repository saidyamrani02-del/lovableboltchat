import { X, Filter, Info, FileText, Shield } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Separator } from "./ui/separator";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { useAuth } from "@/hooks/useAuth";

interface SlideMenuProps {
  filters: {
    gender: string;
    onlineOnly: boolean;
    ageSort: string;
    region: string;
  };
  onFiltersChange: (filters: any) => void;
}

const SlideMenu = ({ filters, onFiltersChange }: SlideMenuProps) => {
  const { profile } = useAuth();

  const closeMenu = () => {
    const slideMenu = document.getElementById("slide-menu");
    const overlay = document.getElementById("menu-overlay");
    slideMenu?.classList.add("-translate-x-full");
    overlay?.classList.add("opacity-0", "pointer-events-none");
  };

  const tanzanianRegions = [
    "All Regions", "Dar es Salaam", "Mwanza", "Arusha", "Dodoma", "Mbeya",
    "Morogoro", "Tanga", "Kilimanjaro", "Tabora", "Kigoma"
  ];

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div
      id="slide-menu"
      className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-card border-r border-border z-50 transform -translate-x-full transition-transform duration-300 overflow-y-auto"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Menu</h2>
          <Button variant="ghost" size="icon" onClick={closeMenu}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 mb-6 p-3 bg-muted rounded-lg">
          <Avatar className="h-12 w-12">
            <AvatarImage src={profile?.profile_picture_url} />
            <AvatarFallback>
              {profile?.username?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">
              {profile?.full_name || "Guest User"}
            </p>
            <p className="text-xs text-muted-foreground">
              {profile ? `${calculateAge(profile.date_of_birth)} yrs` : "Sign in to continue"}
            </p>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Filters Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Feed Filters</h3>
          </div>

          <div className="space-y-3">
            {/* Gender Filter */}
            <div>
              <Label className="text-sm">Gender</Label>
              <Select
                value={filters.gender}
                onValueChange={(value) =>
                  onFiltersChange({ ...filters, gender: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Online Status */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="online"
                checked={filters.onlineOnly}
                onCheckedChange={(checked) =>
                  onFiltersChange({ ...filters, onlineOnly: checked as boolean })
                }
              />
              <Label htmlFor="online" className="text-sm">
                Show online only
              </Label>
            </div>

            {/* Age Sort */}
            <div>
              <Label className="text-sm">Sort by Age</Label>
              <Select
                value={filters.ageSort}
                onValueChange={(value) =>
                  onFiltersChange({ ...filters, ageSort: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low-to-high">Low to High</SelectItem>
                  <SelectItem value="high-to-low">High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Region Filter */}
            <div>
              <Label className="text-sm">Region</Label>
              <Select
                value={filters.region}
                onValueChange={(value) =>
                  onFiltersChange({ ...filters, region: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tanzanianRegions.map((region) => (
                    <SelectItem
                      key={region}
                      value={region.toLowerCase().replace(/\s+/g, "-")}
                    >
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Footer Links */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <a href="/about" className="hover:text-foreground transition-colors">
            <Info className="h-3 w-3 inline mr-1" />
            About
          </a>
          <a href="/terms" className="hover:text-foreground transition-colors">
            <FileText className="h-3 w-3 inline mr-1" />
            Terms
          </a>
          <a href="/privacy" className="hover:text-foreground transition-colors">
            <Shield className="h-3 w-3 inline mr-1" />
            Privacy
          </a>
        </div>
      </div>
    </div>
  );
};

export default SlideMenu;