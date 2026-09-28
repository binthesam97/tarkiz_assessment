import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/core/ui/theme';

interface RenderStatsProps {
  loaded: number;
  total: number;
  mode: string;
}

export const RenderStats = memo(function RenderStats({ loaded, total, mode }: RenderStatsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {mode} · {loaded.toLocaleString()} in memory · {total.toLocaleString()} matching
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  text: { fontSize: 12, color: colors.textMuted },
});
