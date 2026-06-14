import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { DottedSphere } from "@/components/DottedSphere";

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground flex items-center justify-center p-4 overflow-hidden">
      {/* Dotted sphere — decorative, behind content */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-40 sm:opacity-60">
        <DottedSphere size={640} dotCount={1600} />
      </div>

      {/* Top brand mark */}
      <div className="absolute top-6 left-6 flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-foreground/70">
        <span className="inline-block h-2 w-2 rounded-full bg-foreground" />
        AURA
      </div>

      <div className="relative w-full max-w-md z-10">
        <div className="text-center mb-10 animate-fade-in-up">
          <h1 className="font-serif text-5xl sm:text-6xl leading-[0.95] tracking-tight text-foreground">
            <em className="not-italic">academic</em>
            <br />
            <span className="italic font-light">user&nbsp;rule</span>
            <br />
            <em className="not-italic">assistant</em>
          </h1>
          <p className="text-muted-foreground mt-5 text-sm">
            Sign in to chat with AURA — your AI policy guide.
          </p>
        </div>

        <Card className="p-6 shadow-elegant border-border/60 bg-card/80 backdrop-blur-md">
          <div className="flex gap-2 mb-6 p-1 bg-muted rounded-xl">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${mode === "signin" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"}`}
            >Sign in</button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${mode === "signup" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"}`}
            >Sign up</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="mashalkhan@gmail.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 rounded-full font-medium tracking-wide">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (mode === "signin" ? "Sign in" : "Create account")}
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing you agree to follow the college Code of Conduct.
        </p>
      </div>
    </div>
  );
}
