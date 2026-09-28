import { ActivityIndicator } from 'react-native';
import { useAppSelector } from '@/core/store/hooks';
import { HrHomeScreen } from '@/features/hr/screens/hr-home-screen';
import { LoginScreen } from '@/features/auth/screens/login-screen';

export default function HrRoute() {
  const status = useAppSelector((state) => state.auth.status);
  if (status === 'restoring') return <ActivityIndicator style={{ flex: 1 }} />;
  return status === 'signedIn' ? <HrHomeScreen /> : <LoginScreen />;
}
