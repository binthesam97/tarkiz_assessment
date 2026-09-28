import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, FlatList, Linking, StyleSheet, Text, View } from 'react-native';
import { useAppSelector } from '@/core/store/hooks';
import { Banner } from '@/core/ui/banner';
import { Button } from '@/core/ui/button';
import { OfflineBanner } from '@/core/ui/offline-banner';
import { colors, radius, spacing } from '@/core/ui/theme';
import { routeDistance } from '../data/geo';
import type { ActiveShift, RoutePoint } from '../data/route.model';
import { routeRepository } from '../data/route-repository';
import { flushRoutePoints } from '../data/route-sync';
import { endShift, getActiveShift, requestTrackingPermissions, startShift, type PermissionOutcome } from '../task/tracking-service';

/** Used when nobody is signed in, so the tracker can be demonstrated on its own. */
const DEMO_EMPLOYEE_ID = 'e-0003';
const REFRESH_INTERVAL_MS = 5_000;

export function TrackerScreen() {
  const employeeId = useAppSelector((state) => state.auth.session?.user.employeeId ?? DEMO_EMPLOYEE_ID);
  const [shift, setShift] = useState<ActiveShift | null>(null);
  const [points, setPoints] = useState<RoutePoint[]>([]);
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState<PermissionOutcome | null>(null);
  const [lastUpload, setLastUpload] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const active = await getActiveShift();
    setShift(active);
    setPoints(active ? await routeRepository.getShiftPoints(active.id) : []);
  }, []);

  // Poll SQLite while the screen is focused and the app is in the foreground; the background task is the writer.
  useFocusEffect(
    useCallback(() => {
      void refresh();
      const timer = setInterval(() => AppState.currentState === 'active' && void refresh(), REFRESH_INTERVAL_MS);
      return () => clearInterval(timer);
    }, [refresh]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && void refresh());
    return () => subscription.remove();
  }, [refresh]);

  const start = async () => {
    setBusy(true);
    try {
      const outcome = await requestTrackingPermissions();
      setPermission(outcome);
      // Without "Always", iOS still delivers background updates while the blue location indicator is shown,
      // and the "Always" prompt itself is deferred by the OS. Only a foreground denial blocks the shift.
      if (outcome === 'foreground-denied') return;
      setShift(await startShift(employeeId));
      setPoints([]);
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    try {
      await endShift();
      setLastUpload(new Date().toLocaleTimeString());
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const syncNow = async () => {
    setBusy(true);
    try {
      await flushRoutePoints(employeeId);
      setLastUpload(new Date().toLocaleTimeString());
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const pending = points.filter((point) => !point.synced).length;
  const distanceKm = routeDistance(points) / 1000;

  return (
    <View style={styles.screen}>
      <OfflineBanner message="You are offline. Your route is still being recorded and will upload when you reconnect." />
      {permission === 'foreground-denied' || permission === 'background-denied' ? (
        <Banner
          tone={permission === 'foreground-denied' ? 'danger' : 'warning'}
          message={
            permission === 'background-denied'
              ? 'For reliable tracking when the app is closed, set location access to "Always".'
              : 'Location access is required to record your route.'
          }
          actionLabel="Open Settings"
          onAction={() => void Linking.openSettings()}
        />
      ) : null}

      <View style={styles.card}>
        <View style={styles.statusRow}>
          <View style={[styles.dot, shift ? styles.dotActive : null]} />
          <Text style={styles.status}>{shift ? 'Shift in progress' : 'Off duty'}</Text>
        </View>
        {shift ? <Text style={styles.meta}>Started {new Date(shift.startedAt).toLocaleTimeString()} · employee {shift.employeeId}</Text> : null}

        <View style={styles.stats}>
          <Stat label="Points" value={String(points.length)} />
          <Stat label="Distance" value={`${distanceKm.toFixed(2)} km`} />
          <Stat label="Awaiting upload" value={String(pending)} />
        </View>

        {shift ? <Button title="End shift" variant="danger" onPress={stop} loading={busy} /> : <Button title="Start shift" onPress={start} loading={busy} />}
        <Button title="Upload now" variant="secondary" onPress={syncNow} disabled={busy || pending === 0} />
        {lastUpload ? <Text style={styles.meta}>Last upload attempt {lastUpload}</Text> : null}
      </View>

      <Text style={styles.sectionTitle}>Route history (every 30 s)</Text>
      <FlatList
        data={points}
        keyExtractor={(point) => String(point.id)}
        renderItem={({ item }) => (
          <View style={styles.point}>
            <Text style={styles.pointTime}>{new Date(item.recordedAt).toLocaleTimeString()}</Text>
            <Text style={styles.pointCoords}>
              {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
            </Text>
            <Text style={[styles.pointSync, item.synced ? styles.synced : styles.unsynced]}>{item.synced ? 'uploaded' : 'queued'}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{shift ? 'Waiting for the first location fix…' : 'Start a shift to record your route.'}</Text>}
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  card: { margin: spacing.lg, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.success },
  status: { fontSize: 18, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.background, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textMuted },
  sectionTitle: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, fontSize: 13, fontWeight: '600', color: colors.textMuted },
  point: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  pointTime: { width: 90, fontSize: 13, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  pointCoords: { flex: 1, fontSize: 13, color: colors.text, fontVariant: ['tabular-nums'] },
  pointSync: { fontSize: 11, fontWeight: '700' },
  synced: { color: colors.success },
  unsynced: { color: colors.warning },
  empty: { textAlign: 'center', color: colors.textMuted, padding: spacing.xl },
});
