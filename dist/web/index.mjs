import { setFirebaseConfig } from '@gaddario98/react-firebase';
export { firebaseConfig, getToken, useFirebaseAuth, useFirebaseAuthProvider } from '@gaddario98/react-firebase';
import { sendPasswordResetEmail as sendPasswordResetEmail$1, initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { storage } from '@gaddario98/react-state';

const setReactNativeFirebaseConfig = (firebaseConfig) => {
    var _a;
    (_a = setFirebaseConfig(firebaseConfig)) === null || _a === void 0 ? void 0 : _a.then((app) => {
        if (app) {
            initializeAuth(app, {
                persistence: getReactNativePersistence(storage),
            });
        }
    });
};
const sendPasswordResetEmail = (mail) => sendPasswordResetEmail$1(getAuth(), mail);

export { sendPasswordResetEmail, setReactNativeFirebaseConfig };
//# sourceMappingURL=index.mjs.map
