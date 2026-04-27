"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "provender-public-images";
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const SIGNED_URL_TTL_SECONDS = 3600;

type Status = "idle" | "uploading" | "saved" | "removing" | "error";

// Two surfaces: the visible thumbnail (uses the signed URL passed in from the
// server component) and the "Upload" / "Remove" controls. After a successful
// upload we re-fetch a fresh signed URL via the client SDK so the preview
// updates without a full router.refresh — then we still call router.refresh()
// to re-read persons.attributes on the server (so the chip and the rest of
// the page pick up the new path on the next render).
//
// Path convention: avatars/{userId}/avatar.{ext}. We keep the userId as the
// folder name because the storage RLS policy in sql/12 requires
// (storage.foldername(name))[2] = auth.uid()::text. If the user uploads a
// new image with a different extension, we explicitly delete the previous
// path before storing the new one so we don't accumulate orphans.
export function AvatarUpload({
  userId,
  initialPath,
  initialSignedUrl,
  displayName,
}: {
  userId: string;
  initialPath: string | null;
  initialSignedUrl: string | null;
  displayName: string | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState<string | null>(initialPath);
  const [signedUrl, setSignedUrl] = useState<string | null>(initialSignedUrl);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Bumped on every successful re-upload so React swaps the <img> src and
  // the browser doesn't serve a cached version of the previous photo.
  const [cacheBuster, setCacheBuster] = useState<number>(Date.now());

  const supabase = createClient();
  const isBusy = status === "uploading" || status === "removing";

  function pickFile() {
    if (isBusy) return;
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setErrorMsg(null);

    if (!ALLOWED_MIME.has(file.type)) {
      setStatus("error");
      setErrorMsg("That file type isn't supported. Use JPEG, PNG, WebP, or GIF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setStatus("error");
      setErrorMsg("That image is over the 2 MB limit. Try a smaller one.");
      return;
    }

    setStatus("uploading");

    const ext = inferExtension(file);
    const newPath = `avatars/${userId}/avatar.${ext}`;

    // If the previous avatar lived at a different extension, remove it first
    // so the user doesn't end up with two files in their folder.
    if (path && path !== newPath) {
      await supabase.storage.from(BUCKET).remove([path]);
    }

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(newPath, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: "0",
      });

    if (uploadError) {
      setStatus("error");
      setErrorMsg(uploadError.message);
      return;
    }

    const { error: rpcError } = await supabase.rpc("fn_set_my_avatar", {
      p_path: newPath,
    });
    if (rpcError) {
      setStatus("error");
      setErrorMsg(rpcError.message);
      return;
    }

    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(newPath, SIGNED_URL_TTL_SECONDS);

    setPath(newPath);
    setSignedUrl(signed?.signedUrl ?? null);
    setCacheBuster(Date.now());
    setStatus("saved");

    // Refresh the server tree so the auth-chip and any other server-rendered
    // surface re-fetches the new avatar_path.
    router.refresh();
  }

  async function handleRemove() {
    if (isBusy || !path) return;
    setStatus("removing");
    setErrorMsg(null);

    const { error: removeError } = await supabase.storage
      .from(BUCKET)
      .remove([path]);
    if (removeError) {
      setStatus("error");
      setErrorMsg(removeError.message);
      return;
    }

    const { error: rpcError } = await supabase.rpc("fn_set_my_avatar", {
      p_path: null,
    });
    if (rpcError) {
      setStatus("error");
      setErrorMsg(rpcError.message);
      return;
    }

    setPath(null);
    setSignedUrl(null);
    setStatus("saved");
    router.refresh();
  }

  const initials = computeInitials(displayName);
  const displayUrl = signedUrl
    ? `${signedUrl}${signedUrl.includes("?") ? "&" : "?"}cb=${cacheBuster}`
    : null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-5">
      <div className="relative shrink-0">
        <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden border border-cream-shadow bg-cream-deep flex items-center justify-center">
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayUrl}
              alt="Profile photo"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="font-display text-[28px] sm:text-[32px] font-semibold text-slate-blue/70">
              {initials}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={pickFile}
            disabled={isBusy}
            className="rounded-[10px] bg-slate-blue px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-warm-cream hover:bg-slate-blue-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === "uploading"
              ? "Uploading…"
              : path
              ? "Change photo"
              : "Upload photo"}
          </button>
          {path ? (
            <button
              type="button"
              onClick={handleRemove}
              disabled={isBusy}
              className="rounded-[10px] border border-cream-shadow bg-white px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-charcoal hover:border-slate-blue hover:text-slate-blue transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === "removing" ? "Removing…" : "Remove"}
            </button>
          ) : null}
        </div>

        <p className="text-[12px] text-charcoal-soft/80 leading-relaxed">
          JPEG, PNG, WebP, or GIF up to 2 MB. Visible only to other signed-in
          Provender users — anonymous visitors can&apos;t see it.
        </p>

        {status === "saved" ? (
          <p className="text-[12px] text-slate-blue font-semibold">Saved.</p>
        ) : null}
        {status === "error" && errorMsg ? (
          <p className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-[8px] px-3 py-1.5">
            {errorMsg}
          </p>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept={Array.from(ALLOWED_MIME).join(",")}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}

function inferExtension(file: File): string {
  const fromMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  if (fromMime[file.type]) return fromMime[file.type];
  const dot = file.name.lastIndexOf(".");
  if (dot >= 0 && dot < file.name.length - 1) {
    return file.name.slice(dot + 1).toLowerCase();
  }
  return "png";
}

function computeInitials(name: string | null): string {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
