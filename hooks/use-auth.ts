"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react";
import { useAuthContext } from "@/components/auth-provider";
import { signUpAction, requestPasswordResetAction, resetPasswordAction } from "@/actions/auth-actions";

function normalizeRedirectPath(target?: string | null): string | null {
  if (!target) return null;
  if (!target.startsWith("/")) return null;
  // Prevent protocol-relative redirects (e.g. //evil.com)
  if (target.startsWith("//")) return null;
  return target;
}

export function useAuth() {
  const { user, isLoading, isAuthenticated } = useAuthContext();
  const router = useRouter();

  const signIn = async (
    email: string,
    password: string,
    redirectTo?: string | null,
  ) => {
    try {
      const res = await nextAuthSignIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        toast({
          title: "Error signing in",
          description: "Invalid email or password.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });

      const safeRedirect = normalizeRedirectPath(redirectTo) || "/dashboard";
      router.refresh();
      router.push(safeRedirect);
    } catch (error: any) {
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    accountType?: "individual" | "organization" | null,
  ) => {
    try {
      // Execute the server action to create the profile in Prisma
      const res = await signUpAction(email, password, fullName, accountType);
      
      if (!res.success) {
        toast({
          title: "Error signing up",
          description: res.error || "Failed to create account",
          variant: "destructive",
        });
        return;
      }

      // Automatically sign the user in via NextAuth credentials provider
      await nextAuthSignIn("credentials", {
        redirect: false,
        email,
        password,
      });

      toast({
        title: "Account created successfully",
        description:
          "Welcome! Let's set up your profile. Check your email for a welcome message.",
      });

      router.refresh();
      router.push("/onboarding");
      return { success: true };
    } catch (error: any) {
      toast({
        title: "Error signing up",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const signInWithGoogle = async (redirectTo?: string | null) => {
    try {
      const safeRedirect = normalizeRedirectPath(redirectTo);
      const callbackUrl = safeRedirect
        ? `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(safeRedirect)}`
        : `${window.location.origin}/auth/callback`;

      await nextAuthSignIn("google", {
        callbackUrl,
      });
    } catch (error: any) {
      toast({
        title: "Error signing in with Google",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const signOut = async () => {
    try {
      await nextAuthSignOut({ redirect: false });
      // Force a hard navigation to clear the Next.js Router Cache
      // and ensure the JWT cookie removal is fully processed
      window.location.href = "/";
    } catch (error: any) {
      console.error("Error signing out:", error);
      toast({
        title: "Error signing out",
        description:
          error?.message || "There was an error signing out. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const res = await requestPasswordResetAction(email);
      if (!res.success) {
        toast({
          title: "Error",
          description: res.error || "Failed to send reset link",
          variant: "destructive",
        });
        return false;
      }
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const updatePassword = async (password: string, token: string) => {
    try {
      const res = await resetPasswordAction(token, password);
      if (!res.success) {
        toast({
          title: "Error",
          description: res.error || "Failed to reset password",
          variant: "destructive",
        });
        return false;
      }
      toast({
        title: "Success",
        description: "Your password has been reset successfully.",
      });
      router.push("/auth/signin");
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    resetPassword,
    updatePassword,
  };
}
