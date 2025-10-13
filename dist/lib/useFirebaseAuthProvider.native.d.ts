import { AuthState } from "@gaddario98/react-auth";
export interface FirebaseProviderProps {
    initializeNotifications: (id: string) => Promise<void>;
    setFirebaseAuth: (auth?: AuthState) => void;
}
export declare const useFirebaseAuthProvider: ({ initializeNotifications, setFirebaseAuth, }: FirebaseProviderProps) => {
    loading: boolean;
};
