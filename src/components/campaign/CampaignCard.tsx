import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useImageLightbox } from "@/contexts/ImageLightboxContext";

interface CampaignCardProps {
  name: string;
  description: string | null;
  avatarUrl: string | null;
  itemCount: number;
  onClick: () => void;
}

export function CampaignCard({ name, description, avatarUrl, itemCount, onClick }: CampaignCardProps) {
  const { openLightbox } = useImageLightbox();

  return (
    <Card
      className="cursor-pointer border-border shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow"
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center gap-3 p-5 text-center">
        <Avatar
          className="h-14 w-14"
          onClick={(e) => {
            if (avatarUrl) {
              e.stopPropagation();
              openLightbox(avatarUrl, name);
            }
          }}
          style={avatarUrl ? { cursor: "zoom-in" } : undefined}
        >
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="text-xl font-display font-bold">{name[0]}</AvatarFallback>
        </Avatar>
        <div className="space-y-1 min-w-0 w-full">
          <h3 className="font-display font-bold text-sm truncate">{name}</h3>
          {description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
          )}
          <p className="text-xs text-muted-foreground">{itemCount} item{itemCount !== 1 ? "s" : ""}</p>
        </div>
      </CardContent>
    </Card>
  );
}
