import { setFirebaseConfig } from "@gaddario98/react-firebase";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  sendPasswordResetEmail as sendPasswordResetEmailBase,
} from "firebase/auth";
import { storage } from "@gaddario98/react-state";

export const setReactNativeFirebaseConfig = (
  firebaseConfig: Parameters<typeof setFirebaseConfig>[0]
) => {
  setFirebaseConfig(firebaseConfig)?.then((app) => {
    if (app) {
      initializeAuth(app, {
        persistence: getReactNativePersistence(storage),
      });
    }
  });
};

export const sendPasswordResetEmail = (mail: string) =>
  sendPasswordResetEmailBase(getAuth(), mail);

export { firebaseConfig } from "@gaddario98/react-firebase";
