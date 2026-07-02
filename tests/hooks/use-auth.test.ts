jest.mock("@/components/auth-provider", () => ({
  useAuthContext: jest.fn(),
}));

jest.mock("@/actions/auth-actions", () => ({
  signUpAction: jest.fn(),
  requestPasswordResetAction: jest.fn(),
  resetPasswordAction: jest.fn(),
}));

jest.mock("@/components/ui/use-toast", () => ({
  toast: jest.fn(),
}));

import { renderHook, act } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { useAuthContext } from "@/components/auth-provider";
import {
  signUpAction,
  requestPasswordResetAction,
  resetPasswordAction,
} from "@/actions/auth-actions";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";

describe("useAuth", () => {
  const mockPush = jest.fn();
  const mockRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthContext as jest.Mock).mockReturnValue({
      user: { id: "user-1", email: "test@example.com" },
      isLoading: false,
      isAuthenticated: true,
    });
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    });
  });

  it("exposes user and auth methods from context", () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toEqual({
      id: "user-1",
      email: "test@example.com",
    });
    expect(result.current.isLoading).toBe(false);
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
    expect(typeof result.current.signOut).toBe("function");
  });

  it("signs in successfully and redirects to dashboard", async () => {
    (signIn as jest.Mock).mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("Test@Example.com", "password123");
    });

    expect(signIn).toHaveBeenCalledWith("credentials", {
      redirect: false,
      email: "test@example.com",
      password: "password123",
    });
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Welcome back!" }),
    );
    expect(mockRefresh).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("shows error toast when sign in fails", async () => {
    (signIn as jest.Mock).mockResolvedValue({ error: "CredentialsSignin" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("test@example.com", "wrong");
    });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Error signing in",
        variant: "destructive",
      }),
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("signs up, auto signs in, and redirects to onboarding", async () => {
    (signUpAction as jest.Mock).mockResolvedValue({ success: true });
    (signIn as jest.Mock).mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp(
        "new@example.com",
        "password123",
        "New User",
        "individual",
      );
    });

    expect(signUpAction).toHaveBeenCalledWith(
      "new@example.com",
      "password123",
      "New User",
      "individual",
    );
    expect(signIn).toHaveBeenCalledWith("credentials", {
      redirect: false,
      email: "new@example.com",
      password: "password123",
    });
    expect(mockPush).toHaveBeenCalledWith("/onboarding");
  });

  it("resets password successfully", async () => {
    (requestPasswordResetAction as jest.Mock).mockResolvedValue({
      success: true,
    });

    const { result } = renderHook(() => useAuth());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.resetPassword("test@example.com");
    });

    expect(success).toBe(true);
    expect(requestPasswordResetAction).toHaveBeenCalledWith(
      "test@example.com",
    );
  });

  it("updates password and navigates to signin", async () => {
    (resetPasswordAction as jest.Mock).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.updatePassword("newpass", "token-1");
    });

    expect(success).toBe(true);
    expect(resetPasswordAction).toHaveBeenCalledWith("token-1", "newpass");
    expect(mockPush).toHaveBeenCalledWith("/auth/signin");
  });

  it("signs out via next-auth without redirect", async () => {
    (signOut as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signOut();
    });

    expect(signOut).toHaveBeenCalledWith({ redirect: false });
  });
});
