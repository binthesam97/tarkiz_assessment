import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppDispatch, useAppSelector } from '@/core/store/hooks';
import { Banner } from '@/core/ui/banner';
import { Button } from '@/core/ui/button';
import { OfflineBanner } from '@/core/ui/offline-banner';
import { colors, radius, spacing } from '@/core/ui/theme';
import { requestNotificationPermission } from '@/core/notifications/local-notifications';
import { signOut } from '@/features/auth/auth-slice';
import { Section } from '../components/section';
import { useGetMyAttendanceQuery, useGetMyLeavesQuery } from '../data/hr-api';
import { todayIso, type LeaveStatus } from '../data/hr.model';
import { recordAttendance } from '../state/hr-slice';
import { connectNotificationFeed } from '../state/notification-feed';

const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
const formatTime = (iso: string) => timeFormatter.format(new Date(iso));

const STATUS_TONE: Record<LeaveStatus, { background: string; foreground: string }> = {
  PENDING: { background: colors.warningSoft, foreground: colors.warning },
  APPROVED: { background: colors.successSoft, foreground: colors.success },
  REJECTED: { background: colors.dangerSoft, foreground: colors.danger },
};

export function HrHomeScreen() {
  const dispatch = useAppDispatch();
  const session = useAppSelector((state) => state.auth.session)!;
  const queued = useAppSelector((state) => state.hr.queuedAttendance);
  const notifications = useAppSelector((state) => state.hr.notifications);
  const attendance = useGetMyAttendanceQuery();
  const leaves = useGetMyLeavesQuery();

  useEffect(() => {
    void requestNotificationPermission();
    return connectNotificationFeed(session.accessToken, dispatch);
  }, [session.accessToken, dispatch]);

  const today = todayIso();
  const todayRecord = attendance.data?.find((record) => record.date === today);
  const queuedToday = queued.filter((entry) => entry.date === today);
  const checkedIn = Boolean(todayRecord) || queuedToday.some((entry) => entry.action === 'check-in');
  const checkedOut = Boolean(todayRecord?.checkOut) || queuedToday.some((entry) => entry.action === 'check-out');

  const mark = (action: 'check-in' | 'check-out') => void dispatch(recordAttendance({ action, date: today, timestamp: new Date().toISOString() }));

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={attendance.isFetching || leaves.isFetching}
          onRefresh={() => {
            void attendance.refetch();
            void leaves.refetch();
          }}
        />
      }
    >
      <OfflineBanner message="Offline — attendance is saved on this device and syncs automatically." />
      <View style={styles.greeting}>
        <View>
          <Text style={styles.hello}>Hello, {session.user.name.split(' ')[0]}</Text>
          <Text style={styles.meta}>{session.user.roles.join(' · ')}</Text>
        </View>
        <Button title="Sign out" variant="secondary" compact onPress={() => void dispatch(signOut())} />
      </View>

      <Section title="Today's attendance">
        <Text style={styles.body}>
          {todayRecord
            ? `Checked in ${formatTime(todayRecord.checkIn)}${todayRecord.checkOut ? ` · checked out ${formatTime(todayRecord.checkOut)}` : ''}`
            : checkedIn
              ? 'Check-in saved on this device'
              : 'Not checked in yet'}
        </Text>
        {queued.length ? <Banner tone="warning" message={`${queued.length} attendance entr${queued.length === 1 ? 'y' : 'ies'} waiting to sync`} /> : null}
        {!checkedIn ? <Button title="Check in" onPress={() => mark('check-in')} /> : !checkedOut ? <Button title="Check out" variant="secondary" onPress={() => mark('check-out')} /> : null}
      </Section>

      <Section title="My leave" action={<Button title="Apply" compact onPress={() => router.push('/hr/leave')} />}>
        {leaves.data?.length ? (
          leaves.data.map((leave) => (
            <View key={leave.id} style={styles.row}>
              <View style={styles.flex}>
                <Text style={styles.body}>{leave.type.charAt(0) + leave.type.slice(1).toLowerCase()} leave</Text>
                <Text style={styles.meta}>{leave.from} → {leave.to}</Text>
              </View>
              <Text style={[styles.pill, { backgroundColor: STATUS_TONE[leave.status].background, color: STATUS_TONE[leave.status].foreground }]}>{leave.status}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.meta}>{leaves.isLoading ? 'Loading…' : leaves.isError ? 'Could not load leave requests.' : 'No leave requests yet.'}</Text>
        )}
      </Section>

      <Section title="Alerts">
        {notifications.length ? (
          notifications.slice(0, 5).map((item) => (
            <Pressable key={item.id} style={styles.row} accessibilityRole="text">
              <View style={styles.flex}>
                <Text style={styles.body}>{item.title}</Text>
                <Text style={styles.meta}>{item.message}</Text>
              </View>
              <Text style={styles.meta}>{formatTime(item.createdAt)}</Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.meta}>Live alerts (leave decisions, announcements) appear here and as notifications.</Text>
        )}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  greeting: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hello: { fontSize: 22, fontWeight: '700', color: colors.text },
  flex: { flex: 1 },
  body: { fontSize: 15, color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pill: { fontSize: 11, fontWeight: '700', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, overflow: 'hidden' },
});
