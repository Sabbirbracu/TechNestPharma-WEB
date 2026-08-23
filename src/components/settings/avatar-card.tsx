"use client";

import { useRef } from "react";
import { ImageIcon, ImagePlus, Loader2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useRemoveAvatar, useUploadAvatar } from "@/lib/queries";
import type { AuthUser } from "@/lib/auth";
import { SettingsCard } from "./settings-workspace";

/** Mirrors `settings.max_avatar_bytes` on the backend — checked here too so a
 *  too-large file never makes the round trip just to be rejected. */
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function AvatarCard({ user }: { user: AuthUser | null }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadAvatar = useUploadAvatar();
  const removeAvatar = useRemoveAvatar();

  function pickFile() {
    fileInput.current?.click();
  }

  async function onFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // lets the same file be re-picked after an error
    if (!file) return;

    if (!ALLOWED_TYPES.has(file.type)) {
      toast.error("Use a JPEG, PNG, WEBP, or GIF image");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error(`That image is too large — the limit is 5 MB`);
      return;
    }

    try {
      await uploadAvatar.mutateAsync(file);
      toast.success("Profile picture updated", { duration: 5000 });
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not upload that image",
      );
    }
  }

  async function onRemove() {
    try {
      await removeAvatar.mutateAsync();
      toast.success("Profile picture removed", { duration: 4000 });
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not remove the picture",
      );
    }
  }

  const busy = uploadAvatar.isPending || removeAvatar.isPending;

  return (
    <SettingsCard
      icon={ImageIcon}
      title="Profile Picture"
      description="Shown in the sidebar and wherever your name appears"
    >
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- either a Cloudflare R2 URL or a bundled static asset, neither of which Next needs to optimise */}
        <img
          src={user?.avatar_url || "/avatar-placeholder.svg"}
          alt=""
          className="size-20 shrink-0 rounded-full object-cover ring-1 ring-inset ring-border/60"
        />
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={pickFile} disabled={busy}>
              {uploadAvatar.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <ImagePlus className="size-3.5" strokeWidth={2.25} />
              )}
              {user?.avatar_url ? "Change photo" : "Upload photo"}
            </Button>
            {user?.avatar_url && (
              <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={busy}>
                {removeAvatar.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" strokeWidth={2.25} />
                )}
                Remove
              </Button>
            )}
          </div>
          <p className="text-[11px] font-medium text-muted-foreground">
            JPEG, PNG, WEBP, or GIF — up to 5 MB.
          </p>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={onFileSelected}
        />
      </div>
    </SettingsCard>
  );
}
