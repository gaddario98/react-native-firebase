import { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { UseFirebaseAuth } from "@gaddario98/react-firebase";
export declare const useFirebaseAuth: () => UseFirebaseAuth<FirebaseAuthTypes.UserCredential["user"]>;
