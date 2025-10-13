import { useCallback, useEffect, useRef, useState } from "react";
import { AuthState } from "@gaddario98/react-auth";
import {
  getAuth,
  getIdTokenResult,
  onIdTokenChanged,
  reload,
} from "@react-native-firebase/auth";
import { useFirebaseAuthProviderCommon } from "@gaddario98/react-firebase";

// Calculate next refresh delay from token result with safety bounds
const nextRefreshDelayMs = (expirationTimeISO: string): number => {
  const now = Date.now();
  const expirationTime = Date.parse(expirationTimeISO);
  const timeUntilExp = Math.max(0, expirationTime - now);
  // refresh 30s before expiry; clamp between 30s and 55m
  const SAFETY = 30 * 1000;
  const MIN = 30 * 1000;
  const MAX = 55 * 60 * 1000;
  const desired = Math.max(MIN, timeUntilExp - SAFETY);
  return Math.min(MAX, desired);
};

export interface FirebaseProviderProps {
  initializeNotifications: (id: string) => Promise<void>;
  setFirebaseAuth: (auth?: AuthState) => void;
}
export const useFirebaseAuthProvider = ({
  initializeNotifications,
  setFirebaseAuth,
}: FirebaseProviderProps) => {
  const { loading, setLoading, authRef } = useFirebaseAuthProviderCommon();
  const [, setAuthState] = useState<AuthState | undefined>(undefined);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper to clear any scheduled fallback refresh (memoized)
  const clearRefreshTimeout = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  // Schedule a safe fallback refresh slightly before token expiration. (memoized)
  const scheduleFallbackRefresh = useCallback(async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        clearRefreshTimeout();
        return;
      }
      // Prefer using getIdTokenResult if available for proper expiration time
      let expirationTimeISO: string | undefined;
      try {
        const tokenResult = await getIdTokenResult(user, false);
        expirationTimeISO = tokenResult?.expirationTime;
      } catch {
        // If not available, set a conservative default ~55m from now
        expirationTimeISO = new Date(Date.now() + 55 * 60 * 1000).toISOString();
      }
      if (!expirationTimeISO) return;
      const delay = nextRefreshDelayMs(expirationTimeISO);
      clearRefreshTimeout();
      refreshTimeoutRef.current = setTimeout(async () => {
        try {
          // Force a refresh; onIdTokenChanged will fire and reschedule.
          await user.getIdToken(true);
        } catch (err) {
          console.error("Fallback token refresh error:", err);
        }
      }, delay);
    } catch (err) {
      console.error("Error scheduling fallback token refresh:", err);
    }
  }, [clearRefreshTimeout]);

  // Update and propagate AuthState (memoized)
  const updateAuthState = useCallback(
    async (
      uidChanged: boolean,
      user: NonNullable<ReturnType<typeof getAuth>["currentUser"]>
    ) => {
      // Prefer using getIdTokenResult to match web behavior; fallback to getIdToken
      let token: string | undefined;
      try {
        const tokenResult = await getIdTokenResult(user, false);
        token = tokenResult?.token ?? (await user.getIdToken());
      } catch {
        token = await user.getIdToken();
      }

      const newAuthState: AuthState = {
        accountVerified: user.emailVerified || !!user.phoneNumber,
        id: user.uid,
        isLogged: true,
        token: token ?? "",
        phoneNumber: user.phoneNumber ?? "",
        email: user.email ?? "",
      };

      setFirebaseAuth?.(newAuthState);
      setAuthState(newAuthState);
      authRef.current = newAuthState;

      try {
        await initializeNotifications(newAuthState.id);
      } catch (e) {
        console.error("initializeNotifications error:", e);
      }

      await scheduleFallbackRefresh();
    },
    [initializeNotifications, setFirebaseAuth, authRef, scheduleFallbackRefresh]
  );


  useEffect(() => {
    const auth = getAuth();
    let initialized = false;

    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      try {
        if (user) {
          const prev = authRef.current;
          const uidChanged = prev?.id !== user.uid;
          await updateAuthState(uidChanged, user);
        } else {
          // Logged out
          clearRefreshTimeout();
          setAuthState(undefined);
          authRef.current = undefined;
          setFirebaseAuth?.(undefined);
        }
      } catch (error) {
        console.error("onIdTokenChanged handler error:", error);
      } finally {
        if (!initialized) {
          initialized = true;
          // Small delay to keep UX parity with web behavior
          setTimeout(() => setLoading(false), 300);
        }
      }
    });

    return () => {
      unsubscribe();
      clearRefreshTimeout();
    };
  }, [
    setLoading,
    updateAuthState,
    scheduleFallbackRefresh,
    clearRefreshTimeout,
  ]);

  useEffect(() => {
    const currentUser = getAuth().currentUser;
    if (currentUser) {
      reload(currentUser);
    }
  }, []);

  return { loading };
};
