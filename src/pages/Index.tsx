import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatMessage } from "@/components/ChatMessage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Menu,
  ArrowUp,
  Mic,
  Square,
  Scale,
  GraduationCap,
  ChevronDown,
  SquarePen,
  Pencil,
  Trash2,
  Building2,
  Phone,
  ClipboardList,
  X,
} from "lucide-react";
import auraLogo from "@/assets/aura-logo.png";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Msg = { id?: string; role: "user" | "assistant"; content: string };

// Claude-style category chips. Clicking one opens a panel of curated
// questions scoped to this website (GPGC Swabi + KP college policies).
const CATEGORIES: {
  id: string;
  label: string;
  icon: typeof GraduationCap;
  questions: string[];
}[] = [
  {
    id: "college",
    label: "College",
    icon: GraduationCap,
    questions: [
      "Tell me about GPGC Gohati Swabi history",
      "Which BS programs are offered at GPGC Swabi?",
      "Who is the current Principal of GPGC Swabi?",
      "List all departments and HoDs at GPGC Gohati Swabi",
      "What are the timings and academic calendar of GPGC Swabi?",
    ],
  },
  {
    id: "admissions",
    label: "Admissions",
    icon: ClipboardList,
    questions: [
      "What is the admission process at GPGC Gohati Swabi?",
      "What is the latest admission criteria for BS programs at GPGC Swabi?",
      "What are the eligibility requirements for FSc Pre-Medical at GPGC Swabi?",
      "What scholarships are available at GPGC Gohati Swabi?",
    ],
  },
  {
    id: "campus",
    label: "Campus",
    icon: Building2,
    questions: [
      "What facilities does GPGC Swabi provide to students?",
      "Does GPGC Swabi have a hostel facility for students?",
      "What labs and library facilities are available at GPGC Swabi?",
      "Tell me about the BS block and grounds at GPGC Swabi",
    ],
  },
  {
    id: "policies",
    label: "Policies",
    icon: Scale,
    questions: [
      "What are the possible penalties for cheating?",
      "What is the attendance policy in KP government colleges?",
      "What are the rules about ragging in KP colleges?",
      "What is the dress code policy in KP colleges?",
      "Can students take part in politics in KP colleges?",
    ],
  },
  {
    id: "contact",
    label: "Contact",
    icon: Phone,
    questions: [
      "How can I contact GPGC Swabi for academic queries?",
      "Who is the Chief Proctor and Senior Clerk of GPGC Swabi?",
      "How many staff members work at GPGC Swabi and their qualifications?",
    ],
  },
];

const Index = () => {
  const { user, loading } = useAuth();
  const [conversations, setConversations] = useState<Tables<"conversations">[]>(
    [],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, "up" | "down">>(
    {},
  );
  const [renameTarget, setRenameTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const skipLoadRef = useRef<string | null>(null); // conv id to skip auto-loading (just created locally)
  const abortRef = useRef<AbortController | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const baseInputRef = useRef<string>("");
  const [logoAnim, setLogoAnim] = useState(0);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  function stopGeneration() {
    abortRef.current?.abort();
  }

  function toggleVoiceInput() {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Voice input isn't supported in this browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    try {
      const rec = new SR();
      const isUrdu = /[\u0600-\u06FF]/.test(input);
      rec.lang = isUrdu ? "ur-PK" : "en-US";
      rec.interimResults = true;
      rec.continuous = true;
      baseInputRef.current = input ? input.trimEnd() + " " : "";

      rec.onresult = (event: any) => {
        let finalText = "";
        let interimText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalText += transcript;
          else interimText += transcript;
        }
        if (finalText) {
          baseInputRef.current = baseInputRef.current + finalText + " ";
          setInput(baseInputRef.current);
        } else {
          setInput(baseInputRef.current + interimText);
        }
      };
      rec.onerror = (e: any) => {
        if (e.error !== "aborted" && e.error !== "no-speech") {
          toast.error("Mic error: " + e.error);
        }
        setIsListening(false);
      };
      rec.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };
      recognitionRef.current = rec;
      rec.start();
      setIsListening(true);
    } catch (err) {
      toast.error("Couldn't start voice input.");
      setIsListening(false);
    }
  }

  // Auto-resize textarea: grow from 1 → up to 7 lines, then scroll.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const styles = window.getComputedStyle(el);
    const lineHeight = parseFloat(styles.lineHeight) || 20;
    const paddingY =
      parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const maxHeight = lineHeight * 7 + paddingY;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${next}px`;
    // Always allow scroll once max is reached; CSS keeps scrollbar invisible until user actually scrolls.
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [input]);

  // Mobile keyboard: track visualViewport so the composer stays above the keyboard.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      // Difference between layout viewport and visual viewport ≈ keyboard height
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(offset > 80 ? offset : 0);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  useEffect(() => {
    if (user) loadConversations();
  }, [user]);
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    if (skipLoadRef.current === activeId) {
      skipLoadRef.current = null;
      return;
    }
    loadMessages(activeId);
  }, [activeId]);
  // No auto-scroll. The user controls scrolling.

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        Loading…
      </div>
    );
  if (!user) return <Navigate to="/auth" replace />;

  async function loadConversations() {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });
    setConversations(data || []);
  }

  async function loadMessages(id: string) {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at");
    const msgs = (data || []).map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    setMessages(msgs);
    // Load feedback for assistant messages
    const ids = msgs
      .filter((m) => m.role === "assistant" && m.id)
      .map((m) => m.id!);
    if (ids.length) {
      const { data: fb } = await supabase
        .from("message_feedback")
        .select("message_id, rating")
        .in("message_id", ids);
      const map: Record<string, "up" | "down"> = {};
      (fb || []).forEach((r: any) => {
        map[r.message_id] = r.rating;
      });
      setFeedbackMap(map);
    } else {
      setFeedbackMap({});
    }
  }

  async function newChat() {
    setActiveId(null);
    setMessages([]);
    setSuggestions([]);
    setSidebarOpen(false);
  }

  async function deleteConversation(id: string) {
    await supabase.from("conversations").delete().eq("id", id);
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
    loadConversations();
  }

  function openRename(id: string) {
    const current = conversations.find((c) => c.id === id);
    if (!current) return;
    setRenameTarget({ id, title: current.title });
    setRenameValue(current.title);
  }

  async function submitRename() {
    if (!renameTarget) return;
    const next = renameValue.trim();
    if (!next || next === renameTarget.title) {
      setRenameTarget(null);
      return;
    }
    const { error } = await supabase
      .from("conversations")
      .update({ title: next })
      .eq("id", renameTarget.id);
    setRenameTarget(null);
    if (error) {
      toast.error("Couldn't rename");
      return;
    }
    loadConversations();
  }

  async function editUserMessage(index: number, newText: string) {
    if (sending || !user || !activeId) return;
    const target = messages[index];
    if (!target || target.role !== "user") return;
    // Persist edit on the user message
    if (target.id) {
      const { error } = await supabase
        .from("messages")
        .update({ content: newText })
        .eq("id", target.id);
      if (error) {
        toast.error("Couldn't save edit");
        return;
      }
    }
    // Delete every message after the edited one (locally + DB)
    const tail = messages.slice(index + 1);
    const tailIds = tail.map((m) => m.id).filter(Boolean) as string[];
    if (tailIds.length) {
      await supabase.from("messages").delete().in("id", tailIds);
    }
    const baseHistory = messages.slice(0, index); // sendMessage will re-add the user msg
    setSuggestions([]);
    setMessages([
      ...baseHistory,
      { ...target, content: newText },
      { role: "assistant", content: "" },
    ]);
    await sendMessage({
      overrideText: newText,
      baseHistory,
      skipPersistUser: true, // we already updated the existing user row
    });
  }

  async function regenerateLast() {
    if (sending || !user || !activeId) return;
    // Find last user message
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx === -1) return;
    const lastUser = messages[lastUserIdx];
    const previousAnswer =
      messages[messages.length - 1]?.role === "assistant"
        ? messages[messages.length - 1].content
        : "";
    // Delete previous assistant message from DB
    const lastAssistant = messages[messages.length - 1];
    if (lastAssistant?.role === "assistant" && lastAssistant.id) {
      await supabase.from("messages").delete().eq("id", lastAssistant.id);
    }
    // Immediately hide the old answer & show thinking dots
    setSuggestions([]);
    setMessages([
      ...messages.slice(0, lastUserIdx + 1),
      { role: "assistant", content: "" },
    ]);
    await sendMessage({
      overrideText: lastUser.content,
      baseHistory: messages.slice(0, lastUserIdx), // exclude the user msg (sendMessage re-adds it)
      skipPersistUser: true,
      regenerate: true,
      previousAnswer,
    });
  }

  async function fetchSuggestions(history: Msg[]) {
    try {
      setLoadingSuggestions(true);
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ mode: "suggestions", messages: history }),
        },
      );
      if (!resp.ok) {
        setSuggestions([]);
        return;
      }
      const data = await resp.json();
      setSuggestions(
        Array.isArray(data.suggestions) ? data.suggestions.slice(0, 3) : [],
      );
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function sendMessage(opts?: {
    overrideText?: string;
    baseHistory?: Msg[];
    skipPersistUser?: boolean;
    regenerate?: boolean;
    previousAnswer?: string;
  }) {
    const rawText = (opts?.overrideText ?? input).trim();
    if (!rawText) return;
    if (sending || !user) return;
    if (!opts?.overrideText) {
      setInput("");
    }
    setSending(true);
    setSuggestions([]);

    const text = rawText;

    let convId = activeId;
    // Create conversation if first message
    if (!convId) {
      const titleSrc = rawText || "New chat";
      const title = titleSrc.slice(0, 50) + (titleSrc.length > 50 ? "…" : "");
      const { data, error } = await supabase
        .from("conversations")
        .insert({ user_id: user.id, title })
        .select()
        .single();
      if (error || !data) {
        toast.error("Couldn't start chat");
        setSending(false);
        return;
      }
      convId = data.id;
      skipLoadRef.current = convId; // prevent the activeId effect from wiping optimistic UI
      setActiveId(convId);
      loadConversations();
    }

    const baseMessages = opts?.baseHistory ?? messages;
    const userMsg: Msg = { role: "user", content: text };
    const newMessages = [...baseMessages, userMsg];
    setMessages([...newMessages, { role: "assistant", content: "" }]);

    // Smoothly scroll the new user message just under the header.
    // Custom rAF easing for a softer, more polished feel than native smooth.
    requestAnimationFrame(() => {
      const container = scrollRef.current;
      if (!container) return;
      const userEls =
        container.querySelectorAll<HTMLElement>("[data-role='user']");
      const lastUser = userEls[userEls.length - 1];
      if (!lastUser) return;
      const offset = 72; // breathing room below header
      const targetTop = Math.max(0, lastUser.offsetTop - offset);
      const startTop = container.scrollTop;
      const distance = targetTop - startTop;
      if (Math.abs(distance) < 2) return;
      const duration = 650; // ms — slow enough to feel smooth, quick enough to stay snappy
      const startTime = performance.now();
      // easeInOutCubic — gentle acceleration & deceleration
      const ease = (t: number) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const step = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        container.scrollTop = startTop + distance * ease(t);
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });

    // Persist user message (skip when regenerating — user msg already in DB)
    let userMsgId: string | null = null;
    if (!opts?.skipPersistUser) {
      const { data: insertedUser } = await supabase
        .from("messages")
        .insert({
          conversation_id: convId,
          user_id: user.id,
          role: "user",
          content: text,
        })
        .select()
        .single();
      userMsgId = insertedUser?.id ?? null;
    }

    try {
      const controller = new AbortController();
      abortRef.current = controller;
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: newMessages,
            regenerate: !!opts?.regenerate,
            previousAnswer: opts?.previousAnswer,
          }),
          signal: controller.signal,
        },
      );

      if (!resp.ok || !resp.body) {
        if (resp.status === 429)
          toast.error("Rate limit reached. Try again shortly.");
        else if (resp.status === 402)
          toast.error(
            "AI credits exhausted. Add credits in workspace settings.",
          );
        else if (resp.status === 504)
          toast.error("The model took too long. Try a shorter question.");
        else toast.error("Failed to get response");
        setMessages(newMessages);
        setSending(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let hasReceivedText = false;
      const consumeSseLine = (rawLine: string) => {
        let line = rawLine;
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") return false;
        if (!line.startsWith("data: ")) return false;

        const json = line.slice(6).trim();
        if (json === "[DONE]") return true;

        try {
          const parsed = JSON.parse(json);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            hasReceivedText = true;
            setMessages([
              ...newMessages,
              { role: "assistant", content: fullText },
            ]);
          }
          return false;
        } catch {
          buffer = `${line}\n${buffer}`;
          return false;
        }
      };

      let fullText = "";

      let done = false;
      let aborted = false;
      try {
        while (!done) {
          const { done: d, value } = await reader.read();
          if (d) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            if (consumeSseLine(line)) {
              done = true;
              break;
            }
          }
        }
      } catch (e: any) {
        if (e?.name === "AbortError" || controller.signal.aborted) {
          aborted = true;
        } else {
          throw e;
        }
      }
      if (!done && buffer.trim()) {
        for (const rawLine of buffer.split("\n")) {
          if (consumeSseLine(rawLine)) break;
        }
      }

      if (!hasReceivedText && !aborted) {
        fullText =
          "I couldn’t get a visible reply this time. Please try again.";
        setMessages([...newMessages, { role: "assistant", content: fullText }]);
      }

      const assistantText = fullText;
      // Persist assistant message (even if user aborted, save partial)
      if (assistantText) {
        const { data: insertedAsst } = await supabase
          .from("messages")
          .insert({
            conversation_id: convId,
            user_id: user.id,
            role: "assistant",
            content: assistantText,
          })
          .select()
          .single();
        if (insertedAsst?.id) {
          // Attach id to the last assistant message in state so feedback can persist
          setMessages((prev) => {
            const next = [...prev];
            for (let i = next.length - 1; i >= 0; i--) {
              if (next[i].role === "assistant") {
                next[i] = { ...next[i], id: insertedAsst.id };
                break;
              }
            }
            return next;
          });
        }
        if (!aborted) {
          // Fire-and-forget: fetch follow-up suggestions
          fetchSuggestions([
            ...newMessages,
            { role: "assistant", content: assistantText },
          ]);
        }
      } else if (aborted) {
        // Stopped before any token arrived — drop user msg too so the next prompt
        // doesn't get answered together with this orphaned one.
        if (userMsgId)
          await supabase.from("messages").delete().eq("id", userMsgId);
        setMessages(baseMessages);
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        // Stopped before any response started — clean up the orphan user msg.
        if (userMsgId)
          await supabase.from("messages").delete().eq("id", userMsgId);
        setMessages(baseMessages);
      } else {
        console.error(err);
        toast.error("Connection error");
        setMessages(newMessages);
      }
    } finally {
      abortRef.current = null;
      setSending(false);
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const composerNode = (
    <div className="bg-card border border-border rounded-3xl shadow-soft focus-within:border-primary/40 focus-within:shadow-elegant transition-all px-2 py-1.5">
      <div className="flex items-end gap-2 px-3">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onScroll={(e) => {
            const el = e.currentTarget;
            el.classList.add("is-scrolling");
            window.clearTimeout((el as any)._scrollHideTimer);
            (el as any)._scrollHideTimer = window.setTimeout(() => {
              el.classList.remove("is-scrolling");
            }, 800);
          }}
          placeholder={messages.length === 0 ? "How can I help you today?" : "Message AURA"}
          rows={1}
          className="input-scroll border-0 bg-transparent focus-visible:ring-0 resize-none p-0 py-2 text-[15px] leading-5 placeholder:text-muted-foreground/70 shadow-none min-h-[20px] flex-1 overflow-hidden"
        />
        {sending ? (
          <Button
            onClick={stopGeneration}
            size="icon"
            aria-label="Stop generating"
            className="h-9 w-9 rounded-full bg-foreground text-background hover:bg-foreground/85 flex-shrink-0 animate-fade-in-up"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </Button>
        ) : (
          <>
            <Button
              onClick={toggleVoiceInput}
              size="icon"
              variant="ghost"
              aria-label={isListening ? "Stop voice input" : "Start voice input"}
              title={isListening ? "Stop voice input" : "Speak"}
              className={`h-9 w-9 rounded-full flex-shrink-0 transition-colors ${
                isListening
                  ? "bg-destructive/10 text-destructive hover:bg-destructive/15 animate-pulse"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {isListening ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim()}
              size="icon"
              aria-label="Send"
              className="h-9 w-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:bg-muted disabled:text-muted-foreground flex-shrink-0"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );

  const activeCategory = CATEGORIES.find((c) => c.id === openCategory);

  return (
    <div className="h-[100dvh] flex bg-background overflow-hidden">
      <ChatSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={(id) => {
          setActiveId(id);
          setSidebarOpen(false);
        }}
        onNew={newChat}
        onDelete={deleteConversation}
        onSignOut={() => supabase.auth.signOut()}
        userEmail={user.email}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
      />

      <main className="flex-1 flex flex-col min-w-0 relative bg-background">
        {!activeId && (
          <>
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden absolute top-3 left-3 z-20 p-2 rounded-md bg-background/80 backdrop-blur hover:bg-muted border border-border/60"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="hidden md:inline-flex absolute top-3 left-3 z-20 p-2 rounded-md bg-background/80 backdrop-blur hover:bg-muted border border-border/60"
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
          </>
        )}
        {activeId && (
          <header className="h-11 border-b border-border/70 flex items-center px-3 gap-2 bg-background/95 backdrop-blur-xl flex-shrink-0 z-20 sticky top-0 md:static">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 -ml-1 rounded-md hover:bg-muted"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="hidden md:inline-flex p-1.5 -ml-1 rounded-md hover:bg-muted"
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted text-sm font-medium text-foreground/90 max-w-[60%] truncate outline-none">
                <span className="truncate">
                  {conversations.find((c) => c.id === activeId)?.title || "Chat"}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuItem onClick={() => openRename(activeId)}>
                  <Pencil className="h-4 w-4 mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => deleteConversation(activeId)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={newChat}
              className="ml-auto p-1.5 rounded-md hover:bg-muted text-foreground/80"
              aria-label="New chat"
              title="New chat"
            >
              <SquarePen className="h-[18px] w-[18px]" />
            </button>
          </header>
        )}

        {messages.length === 0 ? (
          // Claude-style centered empty state
          <div className="flex-1 overflow-y-auto">
            <div className="min-h-full flex flex-col items-center justify-center px-4 sm:px-8 py-10 sm:py-16">
              <div className="w-full max-w-2xl animate-fade-in-up">
                <div className="flex items-center justify-center mb-8 sm:mb-10">
                  <h1 className="font-serif text-3xl sm:text-5xl tracking-tight text-foreground/90 font-normal text-center">
                    What’s on your mind?
                  </h1>
                </div>

                {composerNode}

                {/* Category chips OR opened question panel */}
                <div className="mt-5 sm:mt-6">
                  {activeCategory ? (
                    <div className="bg-card border border-border rounded-2xl shadow-soft animate-fade-in-up overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <activeCategory.icon className="h-4 w-4 text-primary" />
                          <span className="font-medium text-foreground/80">{activeCategory.label}</span>
                        </div>
                        <button
                          onClick={() => setOpenCategory(null)}
                          className="p-1 rounded-md hover:bg-muted text-muted-foreground"
                          aria-label="Close"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <ul className="divide-y divide-border/60">
                        {activeCategory.questions.map((q, i) => (
                          <li key={i}>
                            <button
                              onClick={() => {
                                setInput(q);
                                setOpenCategory(null);
                                textareaRef.current?.focus();
                              }}
                              className="w-full text-left px-4 py-3 text-[14px] text-foreground/85 hover:bg-secondary/50 transition-colors"
                            >
                              {q}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                      {CATEGORIES.map((c, idx) => (
                        <button
                          key={c.id}
                          onClick={() => setOpenCategory(c.id)}
                          className={`${idx === 4 ? "hidden sm:inline-flex" : "inline-flex"} shrink-0 items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3.5 sm:py-2 rounded-full border border-border bg-card hover:border-primary/40 hover:bg-secondary/40 text-[11px] sm:text-[14px] text-foreground/85 transition-colors shadow-soft`}
                        >
                          <c.icon className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                          {c.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground/80 text-center mt-6">
                  Aura is AI and can make mistakes.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10 space-y-6">
                {messages.map((m, i) => {
                  const isLastAssistant =
                    m.role === "assistant" && i === messages.length - 1;
                  const canEdit =
                    m.role === "user" && !sending && i < messages.length;
                  const lastUserContent =
                    isLastAssistant && i > 0 && messages[i - 1]?.role === "user"
                      ? messages[i - 1].content
                      : "";
                  return (
                    <ChatMessage
                      key={m.id || i}
                      role={m.role}
                      content={m.content}
                      streaming={sending && isLastAssistant}
                      onRegenerate={
                        isLastAssistant && !sending ? regenerateLast : undefined
                      }
                      messageId={m.id}
                      initialFeedback={m.id ? (feedbackMap[m.id] ?? null) : null}
                      onEdit={
                        canEdit ? (txt) => editUserMessage(i, txt) : undefined
                      }
                      thinkingPrompt={lastUserContent}
                    />
                  );
                })}

                {!sending &&
                  messages.length > 0 &&
                  messages[messages.length - 1]?.role === "assistant" &&
                  (suggestions.length > 0 || loadingSuggestions) && (
                    <div className="pt-2 flex flex-wrap gap-2 animate-fade-in-up">
                      {loadingSuggestions && suggestions.length === 0 ? (
                        <>
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className="h-8 w-40 rounded-full bg-muted animate-pulse"
                            />
                          ))}
                        </>
                      ) : (
                        suggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setInput(s);
                            }}
                            className="text-[13px] px-3.5 py-1.5 rounded-full border border-border bg-card hover:border-primary/40 hover:bg-secondary/50 text-foreground/85 transition-colors"
                          >
                            {s}
                          </button>
                        ))
                      )}
                    </div>
                  )}

                {sending && <div aria-hidden className="h-[60vh]" />}
              </div>
            </div>

            <div
              className="bg-gradient-to-t from-background via-background to-transparent pt-2 sm:pt-6 pb-3 sm:pb-5 px-3 sm:px-6 flex-shrink-0 sticky bottom-0 md:static z-10 transition-transform duration-150"
              style={
                keyboardOffset > 0
                  ? { transform: `translateY(-${keyboardOffset}px)` }
                  : undefined
              }
            >
              <div className="max-w-3xl mx-auto">
                {composerNode}
                <p className="text-[11px] text-muted-foreground/80 text-center mt-3">
                  Aura is AI and can make mistakes.
                </p>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Rename chat dialog */}
      <Dialog
        open={!!renameTarget}
        onOpenChange={(o) => {
          if (!o) setRenameTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename chat</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitRename();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setRenameTarget(null);
              }
            }}
            placeholder="Chat name"
            maxLength={120}
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={submitRename}
              disabled={
                !renameValue.trim() ||
                renameValue.trim() === renameTarget?.title
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
