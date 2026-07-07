import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Stethoscope, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed in");
    navigate({ to: "/dashboard", replace: true });
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created — you're signed in");
    navigate({ to: "/dashboard", replace: true });
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setGoogleLoading(false);
      toast.error(
        result.error instanceof Error ? result.error.message : "Google sign-in failed",
      );
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Brand side */}
      <div className="hidden lg:flex flex-col justify-between p-10 bg-sidebar text-sidebar-foreground">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-lg bg-gold text-gold-foreground grid place-items-center shadow-elev-1">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-lg font-semibold tracking-tight">
              TryCare<span className="text-gold">360</span>
            </span>
            <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
              Healthcare Network
            </span>
          </div>
        </Link>
        <div className="max-w-md">
          <h2 className="font-display text-3xl font-semibold leading-tight">
            One platform for every clinic, every franchise, every customer.
          </h2>
          <p className="mt-4 text-sm text-sidebar-foreground/70 leading-relaxed">
            CRM · Clinical · Finance · Inventory · Marketing · AI — from a single
            operating system built for scale.
          </p>
        </div>
        <div className="text-[11px] text-sidebar-foreground/50">
          © {new Date().getFullYear()} TryCare360
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <Stethoscope className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-semibold">
              TryCare<span className="text-[color:var(--gold)]">360</span>
            </span>
          </div>

          <h1 className="font-display text-2xl font-semibold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to access your dashboard.
          </p>

          <div className="mt-6">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogle}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <GoogleIcon className="h-4 w-4 mr-2" />
              )}
              Continue with Google
            </Button>
          </div>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              or
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                <Field
                  id="si-email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                  required
                />
                <Field
                  id="si-password"
                  label="Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                  required
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Sign in
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                <Field
                  id="su-name"
                  label="Full name"
                  value={fullName}
                  onChange={setFullName}
                  autoComplete="name"
                  required
                />
                <Field
                  id="su-email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                  required
                />
                <Field
                  id="su-password"
                  label="Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-xs text-center text-muted-foreground">
            By continuing you agree to the TryCare360 terms and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  ...rest
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
}) {
  const { value, onChange, ...input } = rest;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...input}
      />
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
