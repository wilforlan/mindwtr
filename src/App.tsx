import { format } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import type { Note, Profile } from "@shared/types";
import { Button } from "@/components/ui/button";
import { NoteEditor } from "@/features/editor/note-editor";
import { GraphView } from "@/features/graph/graph-view";
import { HistoryView } from "@/features/history/history-view";
import { ItemHubView } from "@/features/items/item-hub-view";
import { NotesList } from "@/features/notes/notes-list";
import { OnboardingScreen } from "@/features/onboarding/onboarding-screen";
import { ProfileSwitcher } from "@/features/profiles/profile-switcher";
import { cn } from "@/lib/utils";

type View = "today" | "notes" | "graph" | "history" | "item";

export const App = (): React.JSX.Element => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [archivedProfiles, setArchivedProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [view, setView] = useState<View>("today");
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [activeItemTitle, setActiveItemTitle] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [previousView, setPreviousView] = useState<View>("today");

  const refreshProfiles = useCallback(async () => {
    const [active, archived] = await Promise.all([
      window.mindwtr.profiles.list(),
      window.mindwtr.profiles.listArchived(),
    ]);
    setProfiles(active);
    setArchivedProfiles(archived);
    return active;
  }, []);

  const openToday = useCallback(async (profileId: string) => {
    const note = await window.mindwtr.notes.getToday(profileId);
    setActiveNote(note);
    setView("today");
  }, []);

  useEffect(() => {
    void (async () => {
      const active = await refreshProfiles();
      if (active.length > 0) {
        setActiveProfileId(active[0].id);
        await openToday(active[0].id);
      }
      setBootstrapped(true);
    })();
  }, [openToday, refreshProfiles]);

  const handleCreateProfile = async (name: string): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    const profile = await window.mindwtr.profiles.create(trimmed);
    await refreshProfiles();
    setActiveProfileId(profile.id);
    await openToday(profile.id);
  };

  const handleSelectProfile = async (profileId: string): Promise<void> => {
    setActiveProfileId(profileId);
    await openToday(profileId);
  };

  const handleOpenNote = async (noteId: string): Promise<void> => {
    const note = await window.mindwtr.notes.getById(noteId);
    if (!note) {
      return;
    }
    setActiveNote(note);
    setActiveItemTitle(null);
    setView(note.kind === "daily" ? "today" : "notes");
  };

  const handleOpenItem = (title: string): void => {
    setPreviousView(view === "item" ? previousView : view);
    setActiveItemTitle(title);
    setView("item");
  };

  if (!bootstrapped) {
    return (
      <div className="flex h-full items-center justify-center font-[family-name:var(--font-display)] text-2xl text-ink-700">
        mindwtr
      </div>
    );
  }

  if (!activeProfileId) {
    return (
      <OnboardingScreen
        onCreateProfile={(name) => handleCreateProfile(name)}
      />
    );
  }

  const navItems: { id: Exclude<View, "item">; label: string }[] = [
    { id: "today", label: "Today" },
    { id: "notes", label: "Notes" },
    { id: "graph", label: "Graph" },
    { id: "history", label: "History" },
  ];

  return (
    <div className="flex h-full gap-3 p-3">
      <aside className="glass-panel flex w-60 shrink-0 flex-col rounded-3xl p-4">
        <div className="font-[family-name:var(--font-display)] text-2xl text-ink-900">
          mindwtr
        </div>
        <p className="mt-1 text-xs text-ink-700/60">
          {format(new Date(), "EEEE, MMM d")}
        </p>
        <nav className="mt-6 flex flex-col gap-1">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant={view === item.id ? "soft" : "ghost"}
              className={cn("justify-start", view === item.id && "shadow-sm")}
              onClick={() => {
                setActiveItemTitle(null);
                setView(item.id);
                if (item.id === "today" && activeProfileId) {
                  void openToday(activeProfileId);
                }
                if (item.id === "notes") {
                  setActiveNote(null);
                }
              }}
            >
              {item.label}
            </Button>
          ))}
        </nav>
        <div className="mt-auto pt-4">
          <ProfileSwitcher
            profiles={profiles}
            archivedProfiles={archivedProfiles}
            activeProfileId={activeProfileId}
            onSelect={(id) => void handleSelectProfile(id)}
            onCreate={(name) => {
              void handleCreateProfile(name);
            }}
            onArchive={async (id) => {
              await window.mindwtr.profiles.softDelete(id);
              const active = await refreshProfiles();
              if (activeProfileId === id) {
                if (active[0]) {
                  setActiveProfileId(active[0].id);
                  await openToday(active[0].id);
                } else {
                  setActiveProfileId(null);
                  setActiveNote(null);
                }
              }
            }}
            onRestore={async (id) => {
              await window.mindwtr.profiles.restore(id);
              await refreshProfiles();
            }}
          />
        </div>
      </aside>

      <main className="glass-panel min-w-0 flex-1 overflow-hidden rounded-3xl">
        {view === "item" && activeItemTitle ? (
          <ItemHubView
            profileId={activeProfileId}
            title={activeItemTitle}
            onBack={() => {
              setActiveItemTitle(null);
              setView(previousView === "item" ? "today" : previousView);
            }}
            onOpenNote={(noteId) => void handleOpenNote(noteId)}
            onOpenItem={handleOpenItem}
            onPromote={async (nodeId) => {
              const result = await window.mindwtr.nodes.promote(nodeId);
              setActiveNote(result.note);
              setActiveItemTitle(null);
              setView("notes");
            }}
          />
        ) : null}
        {view === "graph" ? (
          <GraphView
            profileId={activeProfileId}
            onOpenNote={(noteId) => void handleOpenNote(noteId)}
            onOpenItem={handleOpenItem}
            onPromoteNode={async (nodeId) => {
              const result = await window.mindwtr.nodes.promote(nodeId);
              setActiveNote(result.note);
              setView("notes");
            }}
          />
        ) : null}
        {view === "history" ? (
          <HistoryView
            profileId={activeProfileId}
            activeNote={activeNote}
            onOpenDate={async (date) => {
              const note = await window.mindwtr.notes.getByDate(
                activeProfileId,
                date
              );
              setActiveNote(note);
              setView("today");
            }}
            onOpenNote={(noteId) => void handleOpenNote(noteId)}
            onRestored={(note) => setActiveNote(note)}
          />
        ) : null}
        {view === "notes" && !activeNote ? (
          <NotesList
            profileId={activeProfileId}
            onOpenNote={(noteId) => void handleOpenNote(noteId)}
            onCreate={async (title) => {
              const note = await window.mindwtr.notes.createFreeform(
                activeProfileId,
                title
              );
              setActiveNote(note);
            }}
          />
        ) : null}
        {(view === "today" || (view === "notes" && activeNote)) &&
        activeNote ? (
          <NoteEditor
            note={activeNote}
            profileId={activeProfileId}
            onChange={async (contentJson) => {
              const updated = await window.mindwtr.notes.updateContent(
                activeNote.id,
                contentJson
              );
              setActiveNote(updated);
            }}
            onWikiLink={async (title) => {
              const result = await window.mindwtr.nodes.createFromWikiLink({
                profileId: activeProfileId,
                sourceNoteId: activeNote.id,
                title,
              });
              return result.node;
            }}
            onOpenItem={handleOpenItem}
            onBackToNotes={
              activeNote.kind === "freeform"
                ? () => {
                    setActiveNote(null);
                    setView("notes");
                  }
                : undefined
            }
          />
        ) : null}
      </main>
    </div>
  );
};
