import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store';
import {
  fetchDashboardStats,
  fetchDashboardTasks,
  fetchDashboardDefects,
  fetchDashboardClosedDefects,
  fetchDashboardObservations,
} from '../store/dashboardSlice';
import { theme } from '../theme';

export default function DashboardScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { stats, isLoading, error } = useSelector((s: RootState) => s.dashboard);

  const loadDashboard = React.useCallback(() => {
    dispatch(fetchDashboardStats(undefined));
  }, [dispatch]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!stats) return;
    const assetId = stats.asset?.id;
    dispatch(fetchDashboardTasks({ assetId, page: 0, pageSize: 10 }));
    dispatch(fetchDashboardDefects({ assetId, page: 0, pageSize: 10 }));
    dispatch(fetchDashboardClosedDefects({ assetId, page: 0, pageSize: 10 }));
    dispatch(fetchDashboardObservations({ assetId, page: 0, pageSize: 10 }));
  }, [dispatch, stats]);

  const tasks = stats?.tasks?.items ?? [];
  const defects = stats?.defects?.items ?? [];
  const observations = stats?.observations?.items ?? [];
  const closedDefects = stats?.closedDefects?.items ?? [];

  useEffect(() => {
    if (stats) {
      console.log('[Dashboard] stats:', JSON.stringify(stats, null, 2));
      console.log('[Dashboard] tasks count:', tasks.length, 'totalCount:', stats.tasks?.totalCount);
      console.log('[Dashboard] defects count:', defects.length, 'totalCount:', stats.defects?.totalCount);
      console.log('[Dashboard] observations count:', observations.length, 'totalCount:', stats.observations?.totalCount);
      console.log('[Dashboard] closedDefects count:', closedDefects.length, 'totalCount:', stats.closedDefects?.totalCount);
    }
  }, [stats, tasks.length, defects.length, observations.length, closedDefects.length]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={loadDashboard} />
      }
    >
      <Text style={styles.title}>Dashboard</Text>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {isLoading && !stats ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <>
          {stats?.asset ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Asset</Text>
              <Text style={styles.assetName}>{stats.asset.name}</Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Tasks {stats?.tasks ? `(${stats.tasks.totalCount})` : ''}
            </Text>
            {tasks.length === 0 ? (
              <Text style={styles.muted}>No tasks</Text>
            ) : (
              tasks.slice(0, 5).map((t) => (
                <View key={t.id} style={styles.listRow}>
                  <Text style={styles.listText}>{t.taskNumber}</Text>
                  <Text style={styles.muted} numberOfLines={1}>
                    {t.description ?? '—'}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Open defects {stats?.defects ? `(${stats.defects.totalCount})` : ''}
            </Text>
            {defects.length === 0 ? (
              <Text style={styles.muted}>No open defects</Text>
            ) : (
              defects.slice(0, 5).map((d) => (
                <View key={d.id} style={styles.listRow}>
                  <Text style={styles.listText}>{d.defectNumber}</Text>
                  <Text style={styles.muted} numberOfLines={1}>
                    {d.description ?? '—'}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Observations {stats?.observations ? `(${stats.observations.totalCount})` : ''}
            </Text>
            {observations.length === 0 ? (
              <Text style={styles.muted}>No observations</Text>
            ) : (
              observations.slice(0, 5).map((o) => (
                <View key={o.id} style={styles.listRow}>
                  <Text style={styles.listText}>{o.id}</Text>
                  <Text style={styles.muted} numberOfLines={1}>
                    {o.description ?? '—'}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Closed defects {stats?.closedDefects ? `(${stats.closedDefects.totalCount})` : ''}
            </Text>
            {closedDefects.length === 0 ? (
              <Text style={styles.muted}>No closed defects</Text>
            ) : (
              closedDefects.slice(0, 5).map((d) => (
                <View key={d.id} style={styles.listRow}>
                  <Text style={styles.listText}>{d.defectNumber}</Text>
                  <Text style={styles.muted} numberOfLines={1}>
                    {d.description ?? '—'}
                  </Text>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.pagePadding, paddingBottom: 32 },
  title: {
    fontSize: theme.typography.title,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 24,
  },
  loader: { paddingVertical: 48, alignItems: 'center' },
  errorBox: {
    backgroundColor: '#fee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: { color: theme.colors.error, fontSize: 14 },
  card: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    padding: theme.spacing.cardPadding,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 8 },
  assetName: { fontSize: 14, color: theme.colors.textMuted, marginTop: 4 },
  muted: { fontSize: 14, color: theme.colors.textMuted },
  listRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#eee' },
  listText: { fontSize: 14, fontWeight: '500', color: theme.colors.text },
});
