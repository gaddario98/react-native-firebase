import { setFirebaseConfig } from "@gaddario98/react-firebase";
export declare const setReactNativeFirebaseConfig: (firebaseConfig: Parameters<typeof setFirebaseConfig>[0]) => void;
export declare const sendPasswordResetEmail: (mail: string) => Promise<void>;
export { firebaseConfig } from "@gaddario98/react-firebase";
