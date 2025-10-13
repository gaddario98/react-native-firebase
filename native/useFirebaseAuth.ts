import auth, {
  FirebaseAuthTypes,
  sendEmailVerification,
} from "@react-native-firebase/auth";
import {
  useFirebaseAuthCommon,
  UseFirebaseAuth,
  AuthResponse,
  LoginProps,
  ERROR_KEYS,
} from "@gaddario98/react-firebase";
import { useCallback } from "react";
import { appleAuth } from "@invertase/react-native-apple-authentication";
import {
  GoogleSignin,
  NativeModuleError,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { useTranslation } from "react-i18next";

export const useFirebaseAuth = (): UseFirebaseAuth<
  FirebaseAuthTypes.UserCredential["user"]
> => {
  const { t } = useTranslation("auth");
  const { loading, setLoading, error, setError, handleAuthError } =
    useFirebaseAuthCommon();

  const withErrorHandling = useCallback(
    async <T extends AuthResponse<FirebaseAuthTypes.UserCredential["user"]>>(
      operation: () => Promise<FirebaseAuthTypes.UserCredential>
    ): Promise<T> => {
      setError(null);
      setLoading(true);
      try {
        const result = await operation();
        //  setAuth(result.user);
        return {
          success: true,
          user: result.user,
        } as T;
      } catch (error) {
        const errorMessage = handleAuthError(error);
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage,
        } as T;
      } finally {
        setLoading(false);
      }
    },
    [handleAuthError, setError, setLoading]
  );

  const loginWithEmail = useCallback(
    ({ email, password }: LoginProps) =>
      withErrorHandling(async () => {
        return await auth().signInWithEmailAndPassword(email, password);
      }),
    [withErrorHandling]
  );

  const registerWithEmail = useCallback(
    (email: string, password: string, name: string) =>
      withErrorHandling(async () => {
        const credential = await auth().createUserWithEmailAndPassword(
          email,
          password
        );
        sendEmailVerification(credential.user);
        await credential.user.updateProfile({ displayName: name });
        return credential;
      }),
    [withErrorHandling]
  );

  const logout = async () => {
    setLoading(true);
    try {
      await auth().signOut();
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = useCallback(
    async () =>
      withErrorHandling(async () => {
        try {
          GoogleSignin.configure({
            webClientId: process.env.EXPO_PUBLIC_GOOGLEWEBCLIENTID,
            scopes: ["https://www.googleapis.com/auth/drive.readonly"],
          });

          await GoogleSignin.hasPlayServices();
          const signInResult = await GoogleSignin.signIn();

          // Corretto l'accesso alla proprietà idToken
          if (!signInResult.data?.idToken) {
            throw new Error(t(ERROR_KEYS.GOOGLE_SIGN_IN_FAILED));
          }

          const credential = auth.GoogleAuthProvider.credential(
            signInResult.data?.idToken
          );

          return auth().signInWithCredential(credential);
        } catch (error: unknown) {
          // Gestione specifica degli errori di Google Sign-In
          if (error instanceof Error) {
            const nativeError = error as NativeModuleError;
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
      }),
    [withErrorHandling, t]
  );

  const loginWithApple = useCallback(
    async () =>
      withErrorHandling(async () => {
        const appleAuthRequestResponse = await appleAuth.performRequest({
          requestedOperation: appleAuth.Operation.LOGIN,
          requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
        });

        if (!appleAuthRequestResponse.identityToken) {
          throw new Error(t(ERROR_KEYS.APPLE_SIGN_IN_FAILED));
        }
        const credentialState = await appleAuth.getCredentialStateForUser(
          appleAuthRequestResponse.user
        );
        if (credentialState === appleAuth.State.AUTHORIZED) {
          const { identityToken, nonce } = appleAuthRequestResponse;
          const appleCredential = auth.AppleAuthProvider.credential(
            identityToken,
            nonce
          );
          return auth().signInWithCredential(appleCredential);
          // user is authenticated
        } else {
          throw new Error();
        }
      }),
    [withErrorHandling, t]
  );

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
