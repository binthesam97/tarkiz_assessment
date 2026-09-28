import { useLocalSearchParams } from 'expo-router';
import { EmployeeDetailScreen } from '@/features/employees/screens/employee-detail-screen';

export default function EmployeeDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EmployeeDetailScreen id={id} />;
}
