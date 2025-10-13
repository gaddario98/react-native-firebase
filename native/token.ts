import { getAuth, getIdToken } from '@react-native-firebase/auth';

export const getToken = async() => {
  const user = getAuth();

  if (user?.currentUser) {
    const token = await getIdToken(user.currentUser);
    return  `Bearer ${token}`;
  }
  return '';
};
