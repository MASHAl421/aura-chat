import { useEffect, useMemo, useState } from "react";
import auraLogo from "@/assets/aura-logo.png";

// Categorized phrase pools so the rotating status feels relevant to the prompt.
const POOLS = {
  policy: [
    "Reading the rulebook",
    "Checking college policies",
    "Cross-referencing regulations",
    "Looking up the code of conduct",
    "Verifying the relevant clause",
    "Consulting GPGC guidelines",
  ],
  academic: [
    "Reviewing academic records",
    "Checking program details",
    "Looking up course info",
    "Gathering admission criteria",
    "Pulling academic context",
  ],
  history: [
    "Recalling the history",
    "Gathering background details",
    "Putting the timeline together",
    "Collecting institutional memory",
  ],
  list: [
    "Compiling the list",
    "Organizing the items",
    "Structuring the points",
    "Lining things up neatly",
  ],
  compare: [
    "Weighing the options",
    "Comparing both sides",
    "Balancing the trade-offs",
    "Lining up the differences",
  ],
  howto: [
    "Mapping out the steps",
    "Working through the procedure",
    "Sketching the approach",
    "Planning the walkthrough",
  ],
  generic: [
    "Thinking",
    "Defining the parameters",
    "Gathering context",
    "Connecting the dots",
    "Refining the response",
    "Putting it together",
    "Polishing the wording",
    "Almost there",
    "Wrapping up",
    "Reasoning it through",
    "Double-checking the details",
  ],
};

function pickPool(prompt: string): string[] {
  const p = prompt.toLowerCase();
  const isUrdu = /[\u0600-\u06FF]/.test(prompt);

  const buckets: string[][] = [];
  if (
    /(rule|policy|polic|conduct|discipline|prohibit|allowed|politic|smok|ragging|attendance|penalt|punish|cheat)/.test(p) ||
    /(قاعدہ|قواعد|اصول|پابندی|سیاست|سگریٹ|ریگنگ|حاضری|سزا|نقل)/.test(prompt)
  ) buckets.push(POOLS.policy);
  if (/(program|course|admission|bs |fee|subject|department|semester|exam|degree|study)/.test(p) ||
      /(داخلہ|کورس|پروگرام|فیس|مضمون|امتحان|ڈگری)/.test(prompt))
    buckets.push(POOLS.academic);
  if (/(history|founded|established|background|origin|when was)/.test(p) ||
      /(تاریخ|قیام|بنیاد)/.test(prompt))
    buckets.push(POOLS.history);
  if (/\b(list|all the|which|what are|name the)\b/.test(p))
    buckets.push(POOLS.list);
  if (/(compare|difference|vs\.?|versus|better)/.test(p))
    buckets.push(POOLS.compare);
  if (/(how (do|to|can)|steps?|procedure|process|guide)/.test(p) ||
      /(کیسے|طریقہ)/.test(prompt))
    buckets.push(POOLS.howto);

  // Always mix some generic phrases for variety.
  buckets.push(POOLS.generic);

  // Flatten + dedupe
  const merged = Array.from(new Set(buckets.flat()));
  // Mark unused isUrdu to avoid lint, reserved for future bilingual phrasing.
  void isUrdu;
  return merged;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Props {
  prompt?: string;
}

export const ThinkingIndicator = ({ prompt = "" }: Props) => {
  // Build a fresh, randomized sequence per mount so each "thinking" feels different.
  const phases = useMemo(() => {
    const pool = pickPool(prompt);
    const shuffled = shuffle(pool);
    // Always start with a quick "Thinking" beat for familiarity, then unique phrases.
    return ["Thinking", ...shuffled.filter((p) => p !== "Thinking")];
  }, [prompt]);

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % phases.length);
    }, 1800);
    return () => clearInterval(t);
  }, [phases]);

  return (
    <div
      className="flex items-center gap-3 py-2 animate-fade-in-up"
      role="status"
      aria-live="polite"
      aria-label={`${phases[idx]}…`}
    >
      {/* Logo with soft pulsing halo */}
      <div className="relative h-7 w-7 flex-shrink-0">
        <span
          aria-hidden
          className="absolute inset-0 rounded-full thinking-halo"
        />
        <img
          src={auraLogo}
          alt=""
          className="absolute inset-0 h-7 w-7 object-contain thinking-logo-pulse"
        />
      </div>

      {/* Rotating status label */}
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span
          key={idx}
          className="thinking-text-in thinking-label text-[14px] font-medium tracking-tight text-foreground/80"
        >
          {phases[idx]}
        </span>
        <span aria-hidden className="thinking-ellipsis text-foreground/60 text-[14px] font-medium">
          <span>.</span><span>.</span><span>.</span>
        </span>
      </div>
    </div>
  );
};
