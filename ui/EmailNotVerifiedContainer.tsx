import {
  contentLayout,
  padding,
  Button,
  Text,
  useNotification,
} from "@gaddario98/react-native-ui";
import { withMemo } from "@gaddario98/utiles";
import { View } from "react-native";
import {
  getAuth,
  reload,
  sendEmailVerification,
} from "@react-native-firebase/auth";
import { useAuthState } from "@gaddario98/react-auth";

const EmailNotVerifiedContainer = withMemo(() => {
  const [auth] = useAuthState();
  const { showNotification } = useNotification();

  if (!auth?.id || auth?.accountVerified) return;

  return (
    <View style={[contentLayout, { padding, paddingBottom: 0 }]}>
      <View
        style={[
          contentLayout,
          {
            padding,
            backgroundColor: "#FFEBEE",
            borderColor: "#B00020",
            borderRadius: 4,
            borderWidth: 1,
          },
        ]}
      >
        <Text
          text="emailNotVerified"
          ns="auth"
          props={{ style: { color: "#B00020" } }}
        />
        <Button
          text="sendNewEmail"
          ns="auth"
          variant="text"
          color="error"
          onPress={() => {
            const user = getAuth().currentUser;
            if (user) {
              sendEmailVerification(user).then(() =>
                showNotification({
                  message: "confirmationEmailSent",
                  type: "success",
                  ns: "auth",
                })
              );
            }
          }}
        />
        <Button
          text="controlEmail"
          ns="auth"
          variant="text"
          color="warning"
          onPress={() => {
            const user = getAuth().currentUser;
            if (user) {
              reload(user);
            }
          }}
        />
      </View>
    </View>
  );
});
export default EmailNotVerifiedContainer;
