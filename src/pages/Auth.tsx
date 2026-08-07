import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import auraLogo from "@/assets/aura-logo.png";

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const passwordScore = (() => {
    let s = 0;
    if (password.length >= 6) s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
    if (/\d/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return Math.min(s, 4);
  })();
  const strengthLabel = ["Too weak", "Weak", "Fair", "Good", "Strong"][passwordScore];

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          return;
        }
        if (!agreed) {
          toast.error("Please accept the Code of Conduct to continue");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        setPendingEmail(email);
        toast.success("Account created — check your inbox to confirm your email.");
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (/confirm/i.test(error.message)) {
            setPendingEmail(email);
            toast.error("Please verify your email before signing in.");
            return;
          }
          throw error;
        }
      }
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingEmail,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
      toast.success("Verification email sent again.");
    } catch (err: any) {
      toast.error(err.message || "Could not resend the email");
    } finally {
      setResending(false);
    }
  };

  if (pendingEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
        <Card className="w-full max-w-md rounded-3xl p-8 md:p-10 shadow-elegant border-border/50 animate-fade-in-up text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-hero flex items-center justify-center shadow-lg shadow-primary/20 mb-6">
            <MailCheck className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight mb-3">Verify your email</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We sent a confirmation link to{" "}
            <span className="font-medium text-foreground break-all">{pendingEmail}</span>. Click the
            link to activate your AURA account, then sign in.
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Can’t find it? Check your spam or promotions folder.
          </p>
          <Button
            onClick={handleResend}
            disabled={resending}
            className="w-full mt-8 bg-gradient-hero hover:opacity-95 text-primary-foreground font-semibold h-12 rounded-xl disabled:opacity-60"
          >
            {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resend verification email"}
          </Button>
          <button
            type="button"
            onClick={() => {
              setPendingEmail(null);
              setMode("signin");
              setPassword("");
              setConfirmPassword("");
            }}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to sign in
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md rounded-3xl p-8 md:p-10 shadow-elegant border-border/50 animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-hero flex items-center justify-center shadow-lg shadow-primary/20 mb-6">
            <img
              src={auraLogo}
              alt="AURA logo"
              className="h-10 w-10 object-contain"
            />
          </div>
          <h1 className="text-2xl md:text-[1.65rem] font-bold text-foreground tracking-tight mb-2">
            Academic User Rule Assistant
          </h1>
          <p className="text-sm text-muted-foreground">
            Empowering GPGC Swabi students with AI intelligence.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex p-1 bg-muted rounded-xl mb-8">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              mode === "signin"
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              mode === "signup"
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === "signup" && (
            <div>
              <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 ml-1 block">
                Full Name
              </Label>
              <Input
                id="name"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Mashal Khan"
                className="px-4 py-3 bg-muted/50 border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all"
              />
            </div>
          )}

          <div>
            <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 ml-1 block">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="mashalkhan@gmail.com"
              className="px-4 py-3 bg-muted/50 border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all"
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 ml-1 block">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="pr-10 px-4 py-3 bg-muted/50 border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all"
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

            {mode === "signup" && password.length > 0 && (
              <div className="mt-2.5 ml-1">
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3].map(i => (
                    <span
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i < passwordScore
                          ? passwordScore <= 1
                            ? "bg-destructive"
                            : passwordScore === 2
                            ? "bg-primary/40"
                            : "bg-primary"
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Password strength: <span className="font-medium text-foreground">{strengthLabel}</span>
                </p>
              </div>
            )}
          </div>

          {mode === "signup" && (
            <div>
              <Label htmlFor="confirm" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 ml-1 block">
                Confirm Password
              </Label>
              <Input
                id="confirm"
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="px-4 py-3 bg-muted/50 border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all"
              />
              {confirmPassword.length > 0 && confirmPassword !== password && (
                <p className="text-[11px] text-destructive mt-1.5 ml-1">Passwords do not match</p>
              )}
            </div>
          )}

          {mode === "signup" && (
            <label className="flex items-start gap-2.5 ml-1 cursor-pointer">
              <Checkbox checked={agreed} onCheckedChange={v => setAgreed(v === true)} className="mt-0.5" />
              <span className="text-xs text-muted-foreground leading-relaxed">
                I confirm I am a GPGC Swabi student and agree to follow the college Code of Conduct.
              </span>
            </label>
          )}

          <Button
            type="submit"
            disabled={busy || (mode === "signup" && (!agreed || password !== confirmPassword))}
            className="w-full bg-gradient-hero hover:opacity-95 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 h-12 rounded-xl disabled:opacity-60 disabled:translate-y-0"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (mode === "signin" ? "Access AURA" : "Create account")}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-8">
          {mode === "signin"
            ? "By continuing you agree to follow the college Code of Conduct."
            : "Your details are used only to secure your AURA account."}
        </p>
      </Card>
    </div>
  );
}
