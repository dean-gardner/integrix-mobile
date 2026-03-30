import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TaskReadDTO } from '../../types/task';
import { theme } from '../../theme';

type FeedTaskCardProps = {
  task: TaskReadDTO;
  indicatorColor: string;
  onPress: () => void;
};

function formatStartedOn(createdOnUtc: string | undefined, language: string, startedLabel: string): string {
  if (!createdOnUtc) return `${startedLabel}-`;
  const date = new Date(createdOnUtc);
  if (Number.isNaN(date.getTime())) return `${startedLabel}-`;

  try {
    const formatted = new Intl.DateTimeFormat(language, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
    return `${startedLabel}${formatted}`;
  } catch {
    return `${startedLabel}${date.toLocaleString()}`;
  }
}

function getProgressPercent(task: TaskReadDTO): number {
  const total = Number(task.taskStepsCount ?? 0);
  const completed = Number(task.taskStepsDone ?? 0);
  if (!Number.isFinite(total) || total <= 0) return 100;
  const raw = (completed / total) * 100;
  return Math.max(0, Math.min(100, raw));
}

function getTopLine(task: TaskReadDTO, t: (key: string) => string): string {
  if (task.workOrderNumber) return `${t('app.feed.workOrderNumber')}${task.workOrderNumber}`;
  if (task.notificationNumber) return `${t('app.feed.notificationNumber')}${task.notificationNumber}`;
  if (task.projectNumber) return `${t('app.feed.projectNumber')}${task.projectNumber}`;
  return `${t('app.feed.internalTaskNumber')}${task.taskNumber ?? '-'}`;
}

export function FeedTaskCard({ task, indicatorColor, onPress }: FeedTaskCardProps) {
  const { t, i18n } = useTranslation();
  const progressPercent = getProgressPercent(task);
  const assetName = task.asset?.name ?? '—';
  const taskTitle = task.description ?? assetName;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.cornerIndicator, { borderTopColor: indicatorColor }]} />
      <View style={styles.content}>
        <Text style={styles.topLine}>{getTopLine(task, t)}</Text>
        <Text style={styles.assetLine}>{assetName}</Text>
        <Text style={styles.taskTitle}>{taskTitle}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.startedText}>
          {formatStartedOn(task.createdOnUtc, i18n.language, t('app.feed.started'))}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },
  content: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  cornerIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    borderTopWidth: 18,
    borderRightWidth: 18,
    borderRightColor: 'transparent',
    zIndex: 2,
  },
  topLine: {
    fontSize: 12,
    color: theme.colors.primary,
    marginBottom: 12,
  },
  assetLine: {
    fontSize: 14,
    color: '#3d4f78',
    marginBottom: 14,
  },
  taskTitle: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '400',
    marginBottom: 12,
  },
  progressTrack: {
    height: 18,
    borderWidth: 1,
    borderColor: '#a5b2d6',
    borderRadius: 3,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#a5b2d6',
  },
  startedText: {
    marginTop: 10,
    fontSize: 12,
    color: '#c9ccd1',
  },
});
