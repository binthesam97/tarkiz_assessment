import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, View, type ListRenderItem } from 'react-native';
import { useAppDispatch, useAppSelector } from '@/core/store/hooks';
import { Banner } from '@/core/ui/banner';
import { OfflineBanner } from '@/core/ui/offline-banner';
import { colors, radius, spacing } from '@/core/ui/theme';
import { EMPLOYEE_ROW_HEIGHT, EmployeeRow } from '../components/employee-row';
import { fullName, type Employee } from '../data/employee.model';
import { conflictsDismissed, employeeSelectors, synchronizeEmployees } from '../state/employees-slice';

export function EmployeeListScreen() {
  const dispatch = useAppDispatch();
  const employees = useAppSelector(employeeSelectors.selectAll);
  const { hydrated, syncStatus, syncError, lastSyncedAt, pendingIds, conflicts } = useAppSelector((state) => state.employees);
  const isOnline = useAppSelector((state) => state.connectivity.isOnline);
  const [query, setQuery] = useState('');

  const pending = useMemo(() => new Set(pendingIds), [pendingIds]);
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((employee) => fullName(employee).toLowerCase().includes(term) || employee.department.toLowerCase().includes(term));
  }, [employees, query]);

  const openEmployee = useCallback((id: string) => router.push({ pathname: '/employees/[id]', params: { id } }), []);
  const refresh = useCallback(() => void dispatch(synchronizeEmployees()), [dispatch]);

  const renderItem = useCallback<ListRenderItem<Employee>>(
    ({ item }) => <EmployeeRow employee={item} pending={pending.has(item.id)} onPress={openEmployee} />,
    [pending, openEmployee],
  );

  if (!hydrated) return <ActivityIndicator style={styles.loader} />;

  return (
    <View style={styles.screen}>
      <OfflineBanner />
      {conflicts.length > 0 ? (
        <Banner
          tone="danger"
          message={`${conflicts.map((conflict) => conflict.name).join(', ')} changed on the server before your edit synced. The latest version was kept.`}
          actionLabel="Dismiss"
          onAction={() => dispatch(conflictsDismissed())}
        />
      ) : null}
      {syncStatus === 'failed' && isOnline ? <Banner tone="danger" message={`Sync failed: ${syncError}`} actionLabel="Retry" onAction={refresh} /> : null}

      <View style={styles.header}>
        <TextInput
          style={styles.search}
          placeholder="Search name or department"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          clearButtonMode="while-editing"
          accessibilityLabel="Search employees"
        />
        <Text style={styles.status}>
          {syncStatus === 'syncing'
            ? 'Syncing…'
            : `${employees.length} employees · ${pendingIds.length} pending · ${lastSyncedAt ? `synced ${new Date(lastSyncedAt).toLocaleTimeString()}` : 'never synced'}`}
        </Text>
      </View>

      <FlatList
        data={visible}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        ItemSeparatorComponent={Separator}
        refreshControl={<RefreshControl refreshing={syncStatus === 'syncing'} onRefresh={refresh} enabled={isOnline} />}
        ListEmptyComponent={
          <Text style={styles.empty}>{employees.length ? 'No employees match your search.' : isOnline ? 'Pull down to download the directory.' : 'Connect to the internet to download the directory.'}</Text>
        }
        keyboardDismissMode="on-drag"
      />
    </View>
  );
}

const keyExtractor = (employee: Employee) => employee.id;
const getItemLayout = (_: unknown, index: number) => ({ length: EMPLOYEE_ROW_HEIGHT + StyleSheet.hairlineWidth, offset: (EMPLOYEE_ROW_HEIGHT + StyleSheet.hairlineWidth) * index, index });
const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1 },
  header: { padding: spacing.lg, gap: spacing.sm },
  search: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: 15, color: colors.text },
  status: { fontSize: 12, color: colors.textMuted },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 68 },
  empty: { textAlign: 'center', color: colors.textMuted, padding: spacing.xl },
});
