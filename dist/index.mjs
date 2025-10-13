import { jsx, jsxs } from 'react/jsx-runtime';
import { useNotification, contentLayout, padding, Text, Button } from '@gaddario98/react-native-ui';
import { withMemo } from '@gaddario98/utiles';
import { View } from 'react-native';
import { getAuth as getAuth$1, sendEmailVerification, reload } from '@react-native-firebase/auth';
import { useAuthState } from '@gaddario98/react-auth';
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

const EmailNotVerifiedContainer = withMemo(() => {
    const [auth] = useAuthState();
    const { showNotification } = useNotification();
    if (!(auth === null || auth === void 0 ? void 0 : auth.id) || (auth === null || auth === void 0 ? void 0 : auth.accountVerified))
        return;
    return (jsx(View, { style: [contentLayout, { padding, paddingBottom: 0 }], children: jsxs(View, { style: [
                contentLayout,
                {
                    padding,
                    backgroundColor: "#FFEBEE",
                    borderColor: "#B00020",
                    borderRadius: 4,
                    borderWidth: 1,
                },
            ], children: [jsx(Text, { text: "emailNotVerified", ns: "auth", props: { style: { color: "#B00020" } } }), jsx(Button, { text: "sendNewEmail", ns: "auth", variant: "text", color: "error", onPress: () => {
                        const user = getAuth$1().currentUser;
                        if (user) {
                            sendEmailVerification(user).then(() => showNotification({
                                message: "confirmationEmailSent",
                                type: "success",
                                ns: "auth",
                            }));
                        }
                    } }), jsx(Button, { text: "controlEmail", ns: "auth", variant: "text", color: "warning", onPress: () => {
                        const user = getAuth$1().currentUser;
                        if (user) {
                            reload(user);
                        }
                    } })] }) }));
});

export { EmailNotVerifiedContainer, sendPasswordResetEmail, setReactNativeFirebaseConfig };
//# sourceMappingURL=index.mjs.map
