import { setFirebaseConfig } from "@gaddario98/react-firebase";
import { storage } from "@gaddario98/react-state";
import firebase from "@react-native-firebase/app";
import {
  getAuth,
  sendPasswordResetEmail as sendPasswordResetEmailBase,
} from "@react-native-firebase/auth";

export const setReactNativeFirebaseConfig = (
  firebaseConfig: Parameters<typeof setFirebaseConfig>[0]
) => {
  firebase.setReactNativeAsyncStorage(storage);
  setFirebaseConfig(firebaseConfig);
};

export const sendPasswordResetEmail = (mail: string) =>
  sendPasswordResetEmailBase(getAuth(), mail);

export { firebaseConfig } from "@gaddario98/react-firebase";
