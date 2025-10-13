import auth, { sendEmailVerification, getAuth, getIdTokenResult, onIdTokenChanged, reload, getIdToken, sendPasswordResetEmail as sendPasswordResetEmail$1 } from '@react-native-firebase/auth';
import { useFirebaseAuthCommon, ERROR_KEYS, useFirebaseAuthProviderCommon, setFirebaseConfig } from '@gaddario98/react-firebase';
export { firebaseConfig } from '@gaddario98/react-firebase';
import { useCallback, useState, useRef, useEffect } from 'react';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useTranslation } from 'react-i18next';
import { storage } from '@gaddario98/react-state';
import firebase from '@react-native-firebase/app';

const useFirebaseAuth = () => {
    const { t } = useTranslation("auth");
    const { loading, setLoading, error, setError, handleAuthError } = useFirebaseAuthCommon();
    const withErrorHandling = useCallback(async (operation) => {
        setError(null);
        setLoading(true);
        try {
            const result = await operation();
            //  setAuth(result.user);
            return {
                success: true,
                user: result.user,
            };
        }
        catch (error) {
            const errorMessage = handleAuthError(error);
            setError(errorMessage);
            return {
                success: false,
                error: errorMessage,
            };
        }
        finally {
            setLoading(false);
        }
    }, [handleAuthError, setError, setLoading]);
    const loginWithEmail = useCallback(({ email, password }) => withErrorHandling(async () => {
        return await auth().signInWithEmailAndPassword(email, password);
    }), [withErrorHandling]);
    const registerWithEmail = useCallback((email, password, name) => withErrorHandling(async () => {
        const credential = await auth().createUserWithEmailAndPassword(email, password);
        sendEmailVerification(credential.user);
        await credential.user.updateProfile({ displayName: name });
        return credential;
    }), [withErrorHandling]);
    const logout = async () => {
        setLoading(true);
        try {
            await auth().signOut();
        }
        finally {
            setLoading(false);
        }
    };
    const loginWithGoogle = useCallback(async () => withErrorHandling(async () => {
        var _a, _b;
        try {
            GoogleSignin.configure({
                webClientId: process.env.EXPO_PUBLIC_GOOGLEWEBCLIENTID,
                scopes: ["https://www.googleapis.com/auth/drive.readonly"],
            });
            await GoogleSignin.hasPlayServices();
            const signInResult = await GoogleSignin.signIn();
            // Corretto l'accesso alla proprietà idToken
            if (!((_a = signInResult.data) === null || _a === void 0 ? void 0 : _a.idToken)) {
                throw new Error(t(ERROR_KEYS.GOOGLE_SIGN_IN_FAILED));
            }
            const credential = auth.GoogleAuthProvider.credential((_b = signInResult.data) === null || _b === void 0 ? void 0 : _b.idToken);
            return auth().signInWithCredential(credential);
        }
        catch (error) {
            // Gestione specifica degli errori di Google Sign-In
            if (error instanceof Error) {
                const nativeError = error;
                if (nativeError.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                    throw new Error(t(ERROR_KEYS.PLAY_SERVICES_NOT_AVAILABLE));
                }
                // Se è un altro tipo di errore di Google Sign-In
                if (nativeError.code) {
                    throw new Error(t(ERROR_KEYS.GOOGLE_SIGN_IN_FAILED));
                }
            }
            // Rilancia l'errore per la gestione generica
            throw error;
        }
    }), [withErrorHandling, t]);
    const loginWithApple = useCallback(async () => withErrorHandling(async () => {
        const appleAuthRequestResponse = await appleAuth.performRequest({
            requestedOperation: appleAuth.Operation.LOGIN,
            requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
        });
        if (!appleAuthRequestResponse.identityToken) {
            throw new Error(t(ERROR_KEYS.APPLE_SIGN_IN_FAILED));
        }
        const credentialState = await appleAuth.getCredentialStateForUser(appleAuthRequestResponse.user);
        if (credentialState === appleAuth.State.AUTHORIZED) {
            const { identityToken, nonce } = appleAuthRequestResponse;
            const appleCredential = auth.AppleAuthProvider.credential(identityToken, nonce);
            return auth().signInWithCredential(appleCredential);
            // user is authenticated
        }
        else {
            throw new Error();
        }
    }), [withErrorHandling, t]);
    return {
        loading,
        error,
        loginWithEmail,
        registerWithEmail,
        logout,
        loginWithApple,
        loginWithGoogle,
    };
};

// Calculate next refresh delay from token result with safety bounds
const nextRefreshDelayMs = (expirationTimeISO) => {
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
const useFirebaseAuthProvider = ({ initializeNotifications, setFirebaseAuth, }) => {
    const { loading, setLoading, authRef } = useFirebaseAuthProviderCommon();
    const [, setAuthState] = useState(undefined);
    const refreshTimeoutRef = useRef(null);
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
            let expirationTimeISO;
            try {
                const tokenResult = await getIdTokenResult(user, false);
                expirationTimeISO = tokenResult === null || tokenResult === void 0 ? void 0 : tokenResult.expirationTime;
            }
            catch (_a) {
                // If not available, set a conservative default ~55m from now
                expirationTimeISO = new Date(Date.now() + 55 * 60 * 1000).toISOString();
            }
            if (!expirationTimeISO)
                return;
            const delay = nextRefreshDelayMs(expirationTimeISO);
            clearRefreshTimeout();
            refreshTimeoutRef.current = setTimeout(async () => {
                try {
                    // Force a refresh; onIdTokenChanged will fire and reschedule.
                    await user.getIdToken(true);
                }
                catch (err) {
                    console.error("Fallback token refresh error:", err);
                }
            }, delay);
        }
        catch (err) {
            console.error("Error scheduling fallback token refresh:", err);
        }
    }, [clearRefreshTimeout]);
    // Update and propagate AuthState (memoized)
    const updateAuthState = useCallback(async (uidChanged, user) => {
        var _a, _b, _c;
        // Prefer using getIdTokenResult to match web behavior; fallback to getIdToken
        let token;
        try {
            const tokenResult = await getIdTokenResult(user, false);
            token = (_a = tokenResult === null || tokenResult === void 0 ? void 0 : tokenResult.token) !== null && _a !== void 0 ? _a : (await user.getIdToken());
        }
        catch (_d) {
            token = await user.getIdToken();
        }
        const newAuthState = {
            accountVerified: user.emailVerified || !!user.phoneNumber,
            id: user.uid,
            isLogged: true,
            token: token !== null && token !== void 0 ? token : "",
            phoneNumber: (_b = user.phoneNumber) !== null && _b !== void 0 ? _b : "",
            email: (_c = user.email) !== null && _c !== void 0 ? _c : "",
        };
        setFirebaseAuth === null || setFirebaseAuth === void 0 ? void 0 : setFirebaseAuth(newAuthState);
        setAuthState(newAuthState);
        authRef.current = newAuthState;
        try {
            await initializeNotifications(newAuthState.id);
        }
        catch (e) {
            console.error("initializeNotifications error:", e);
        }
        await scheduleFallbackRefresh();
    }, [initializeNotifications, setFirebaseAuth, authRef, scheduleFallbackRefresh]);
    useEffect(() => {
        const auth = getAuth();
        let initialized = false;
        const unsubscribe = onIdTokenChanged(auth, async (user) => {
            try {
                if (user) {
                    const prev = authRef.current;
                    const uidChanged = (prev === null || prev === void 0 ? void 0 : prev.id) !== user.uid;
                    await updateAuthState(uidChanged, user);
                }
                else {
                    // Logged out
                    clearRefreshTimeout();
                    setAuthState(undefined);
                    authRef.current = undefined;
                    setFirebaseAuth === null || setFirebaseAuth === void 0 ? void 0 : setFirebaseAuth(undefined);
                }
            }
            catch (error) {
                console.error("onIdTokenChanged handler error:", error);
            }
            finally {
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

const getToken = async () => {
    const user = getAuth();
    if (user === null || user === void 0 ? void 0 : user.currentUser) {
        const token = await getIdToken(user.currentUser);
        return `Bearer ${token}`;
    }
    return '';
};

const setReactNativeFirebaseConfig = (firebaseConfig) => {
    firebase.setReactNativeAsyncStorage(storage);
    setFirebaseConfig(firebaseConfig);
};
const sendPasswordResetEmail = (mail) => sendPasswordResetEmail$1(getAuth(), mail);

export { getToken, sendPasswordResetEmail, setReactNativeFirebaseConfig, useFirebaseAuth, useFirebaseAuthProvider };
//# sourceMappingURL=index.mjs.map
