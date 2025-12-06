import { Video, Eye } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";

interface ProfileCardProps {
  profile: {
    id: string;
    username: string;
    age: number;
    profilePicture: string;
    isOnline: boolean;
    pricePerSecond: number;
    viewCount: number;
    region?: string;
  };
  onUsernameClick: () => void;
  onVideoCallClick: () => void;
}

const ProfileCard = ({ profile, onUsernameClick, onVideoCallClick }: ProfileCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow bg-card border-border">
      <div className="relative">
        {/* Profile Picture */}
        <div className="aspect-square relative bg-muted">
          <Avatar className="h-full w-full rounded-none">
            <AvatarImage src={profile.profilePicture} className="object-cover" />
            <AvatarFallback className="rounded-none text-4xl">
              {profile.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          {/* Online Status Badge */}
          <div className="absolute top-2 right-2">
            <Badge
              variant={profile.isOnline ? "default" : "secondary"}
              className={
                profile.isOnline
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-gray-500 hover:bg-gray-600"
              }
            >
              {profile.isOnline ? "Online" : "Offline"}
            </Badge>
          </div>

          {/* View Count */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
            <Eye className="h-3 w-3 text-white" />
            <span className="text-xs text-white">{profile.viewCount}</span>
          </div>
        </div>

        {/* Info Section */}
        <div className="p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <button
              onClick={onUsernameClick}
              className="font-semibold text-sm hover:text-primary transition-colors text-foreground"
            >
              @{profile.username}
            </button>
            <span className="text-xs text-muted-foreground">{profile.age} yrs</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-primary">
              Tsh {profile.pricePerSecond}/sec
            </span>
            {profile.region && (
              <span className="text-xs text-muted-foreground">{profile.region}</span>
            )}
          </div>

          <Button
            onClick={onVideoCallClick}
            className={`w-full text-primary-foreground ${
              profile.isOnline 
                ? 'bg-primary hover:bg-primary/90' 
                : 'bg-gray-400 cursor-not-allowed opacity-60'
            }`}
            size="sm"
            disabled={!profile.isOnline}
          >
            <Video className="h-4 w-4 mr-2" />
            {profile.isOnline ? 'Video Call' : 'Offline'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ProfileCard;
