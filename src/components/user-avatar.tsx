import { initialsOf, type AvatarSubject } from "@/lib/auth";
import { cn } from "@/lib/utils";

const TONE_CLASSES = {
  primary: "bg-gradient-to-br from-primary via-primary to-primary-hover text-primary-foreground",
  success: "bg-gradient-to-br from-success via-success to-success/90 text-success-foreground",
} as const;

/**
 * The user's uploaded photo if they have one, else the same colored-initials
 * chip used everywhere in the app. One component so a new avatar shows up in
 * the sidebar, topbar, and account menu the moment it's uploaded, instead of
 * each surface guessing at its own fallback.
 */
export function UserAvatar({
  user,
  size = "size-9",
  tone = "primary",
  className,
}: {
  user: AvatarSubject | null;
  size?: string;
  tone?: keyof typeof TONE_CLASSES;
  className?: string;
}) {
  if (user?.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a Cloudflare R2 URL, not a local asset Next can optimise
      <img
        src={user.avatar_url}
        alt=""
        className={cn(size, "shrink-0 rounded-xl object-cover shadow-sm", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        size,
        "flex shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-sm",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {initialsOf(user)}
    </div>
  );
}
