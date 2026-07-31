import { useState } from "react";
import type { Profile } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ProfileSwitcherProps = {
  profiles: Profile[];
  archivedProfiles: Profile[];
  activeProfileId: string;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onArchive: (id: string) => Promise<void>;
  onRestore: (id: string) => Promise<void>;
};

export const ProfileSwitcher = ({
  profiles,
  archivedProfiles,
  activeProfileId,
  onSelect,
  onCreate,
  onArchive,
  onRestore,
}: ProfileSwitcherProps): React.JSX.Element => {
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const active = profiles.find((profile) => profile.id === activeProfileId);
  const initial = (active?.name.trim().charAt(0) || "m").toUpperCase();

  return (
    <div className="border-t border-sand-300/40 pt-3">
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition",
          "hover:bg-sand-200/50",
          expanded && "bg-sand-200/40"
        )}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-peach-400 to-amber-500 font-[family-name:var(--font-display)] text-lg text-sand-50 shadow-sm">
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink-900">
            {active?.name ?? "Profile"}
          </span>
          <span className="block text-xs text-ink-700/55">Local · offline</span>
        </span>
        <span className="text-xs text-ink-700/45">{expanded ? "−" : "+"}</span>
      </button>

      {expanded ? (
        <div className="mt-3 space-y-3 px-1">
          <div className="space-y-1">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm transition",
                  profile.id === activeProfileId
                    ? "bg-amber-500/15 font-medium text-ink-900"
                    : "text-ink-700 hover:bg-sand-200/50"
                )}
                onClick={() => onSelect(profile.id)}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sand-200 text-xs">
                  {profile.name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="truncate">{profile.name}</span>
              </button>
            ))}
          </div>

          {adding ? (
            <div className="space-y-2">
              <Input
                autoFocus
                value={name}
                placeholder="Profile name"
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && name.trim()) {
                    onCreate(name.trim());
                    setName("");
                    setAdding(false);
                  }
                  if (event.key === "Escape") {
                    setAdding(false);
                    setName("");
                  }
                }}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    if (!name.trim()) {
                      return;
                    }
                    onCreate(name.trim());
                    setName("");
                    setAdding(false);
                  }}
                >
                  Create
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAdding(false);
                    setName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="soft"
              className="w-full justify-start"
              onClick={() => setAdding(true)}
            >
              New profile
            </Button>
          )}

          <div className="flex flex-col gap-1 border-t border-sand-300/40 pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="justify-start text-ink-700/70"
              onClick={() => void onArchive(activeProfileId)}
            >
              Archive this profile
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start text-ink-700/70"
              onClick={() => setShowArchived((value) => !value)}
            >
              {showArchived ? "Hide archived" : "Archived profiles"}
              {archivedProfiles.length > 0
                ? ` (${archivedProfiles.length})`
                : ""}
            </Button>
          </div>

          {showArchived ? (
            <div className="space-y-1">
              {archivedProfiles.length === 0 ? (
                <p className="px-2 text-xs text-ink-700/50">None archived.</p>
              ) : (
                archivedProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5"
                  >
                    <span className="truncate text-xs text-ink-700">
                      {profile.name}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void onRestore(profile.id)}
                    >
                      Restore
                    </Button>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
