import { Plus, LogOut, Trash2, X, Menu, Search, ChevronDown, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tables } from "@/integrations/supabase/types";
import { useMemo, useState } from "react";
import auraLogo from "@/assets/aura-logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  conversations: Tables<"conversations">[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onSignOut: () => void;
  userEmail?: string;
  open: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

type Group = { label: string; items: Tables<"conversations">[] };

function groupConversations(convs: Tables<"conversations">[]): Group[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const buckets: Record<string, Tables<"conversations">[]> = {
    Today: [],
    Yesterday: [],
    "Previous 7 Days": [],
    "Previous 30 Days": [],
    Older: [],
  };
  for (const c of convs) {
    const t = new Date(c.updated_at as unknown as string).getTime();
    const diff = now - t;
    if (diff < day) buckets["Today"].push(c);
    else if (diff < 2 * day) buckets["Yesterday"].push(c);
    else if (diff < 7 * day) buckets["Previous 7 Days"].push(c);
    else if (diff < 30 * day) buckets["Previous 30 Days"].push(c);
    else buckets["Older"].push(c);
  }
  return Object.entries(buckets)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

export const ChatSidebar = ({ conversations, activeId, onSelect, onNew, onDelete, onSignOut, userEmail, open, onClose, collapsed, onToggleCollapsed }: Props) => {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, query]);

  const groups = useMemo(() => groupConversations(filtered), [filtered]);

  const displayName =
    (userEmail?.split("@")[0] || "Guest")
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  const initial = displayName[0]?.toUpperCase() || "?";

  return (
    <>
      {open && <div className="md:hidden fixed inset-0 bg-foreground/40 backdrop-blur-sm z-30" onClick={onClose} />}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border transition-all duration-300 ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${collapsed ? "md:hidden" : ""}`}
      >
        {/* User profile — top of sidebar (Stratify-style) */}
        <div className="px-3 pt-3 pb-2 flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex-1 flex items-center gap-2.5 min-w-0 px-2 py-1.5 rounded-xl hover:bg-sidebar-accent/70 outline-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-colors">
              <div className="relative flex-shrink-0">
                <div className="h-9 w-9 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground text-sm font-semibold shadow-soft">
                  {initial}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-sidebar" />
              </div>
              <span className="flex-1 truncate text-sm font-semibold text-sidebar-foreground text-left">
                {displayName}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/50 flex-shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel className="flex items-center gap-3 py-2.5">
                <div className="h-10 w-10 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground text-sm font-semibold flex-shrink-0">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{displayName}</div>
                  <div className="text-[11px] font-normal text-muted-foreground truncate">
                    {userEmail}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-sm">
                <img src={auraLogo} alt="" className="h-4 w-4 object-contain" />
                <span className="flex-1">AURA Workspace</span>
                <span className="text-[10px] text-primary font-medium">ACTIVE</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-sm">
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onSignOut}
                className="gap-2 text-sm text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={onClose}
            className="md:hidden text-sidebar-foreground/70 hover:text-sidebar-foreground p-1.5 rounded-md hover:bg-sidebar-accent"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            onClick={onToggleCollapsed}
            className="hidden md:inline-flex text-sidebar-foreground/60 hover:text-sidebar-foreground p-1.5 rounded-md hover:bg-sidebar-accent"
            aria-label="Collapse sidebar"
          >
            <ChevronDown className="h-4 w-4 -rotate-90" />
          </button>
        </div>

        {/* New chat — pill button */}
        <div className="px-3 pb-2">
          <Button
            onClick={onNew}
            className="w-full bg-card hover:bg-card text-sidebar-foreground border border-sidebar-border justify-center gap-2 h-10 rounded-full font-medium text-sm shadow-soft"
          >
            <Plus className="h-4 w-4" /> New chat
          </Button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-sidebar-foreground/50 pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats"
              className="h-9 pl-8 pr-8 rounded-full bg-card/60 border-sidebar-border text-sm focus-visible:ring-1 focus-visible:ring-primary/40"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-sidebar-foreground/50 hover:text-sidebar-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Conversations grouped by date */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {groups.length === 0 ? (
            <p className="text-xs text-sidebar-foreground/50 px-3 py-2">
              {query ? "No chats match your search." : "No chats yet — ask your first question!"}
            </p>
          ) : (
            groups.map((g) => (
              <div key={g.label} className="mb-3">
                <p className="text-[11px] font-medium text-sidebar-foreground/50 px-3 pt-2 pb-1.5">{g.label}</p>
                <div className="space-y-0.5">
                  {g.items.map((c) => {
                    const isActive = activeId === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => onSelect(c.id)}
                        className={`group flex items-center gap-2 pl-3 pr-2 py-2 rounded-lg cursor-pointer transition-colors ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "hover:bg-sidebar-accent/60 text-sidebar-foreground/85"
                        }`}
                      >
                        <span className="flex-1 truncate text-sm">{c.title}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                          className="opacity-0 group-hover:opacity-100 text-sidebar-foreground/50 hover:text-destructive transition-opacity p-1 rounded"
                          aria-label="Delete chat"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Brand footer */}
        <div className="px-4 py-3 border-t border-sidebar-border flex items-center gap-2">
          <img src={auraLogo} alt="AURA" className="h-7 w-7 object-contain flex-shrink-0" />
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-[13px] font-semibold text-sidebar-foreground tracking-tight">AURA</span>
            <span className="text-[10px] text-sidebar-foreground/55 truncate">Academic User Rule Assistant</span>
          </div>
        </div>
      </aside>
    </>
  );
};
