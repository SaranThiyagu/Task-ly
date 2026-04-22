"use client";

import { useState } from "react";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckSquare } from "lucide-react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-slate-900 p-12 text-white">
        <div className="flex items-center gap-3">
          <CheckSquare className="h-8 w-8 text-blue-400" />
          <span className="text-2xl font-bold tracking-tight">TaskMe</span>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold leading-tight">
            Streamline your
            <br />
            task management
          </h1>
          <p className="text-lg text-slate-300 max-w-md">
            Assign, track, and review tasks across your team with real-time
            visibility and role-based workflows.
          </p>
        </div>

        <p className="text-sm text-slate-500">
          &copy; {new Date().getFullYear()} TaskMe. All rights reserved.
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-gray-50 px-6">
        <Card className="w-full max-w-md p-8 shadow-lg border-0">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <CheckSquare className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold text-slate-900">TaskMe</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900">
              Sign in to your account
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter your credentials to continue
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form action={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">
                Email address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                required
                autoComplete="email"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium"
            >
              {loading ? "Signing in…" : "Sign In"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
