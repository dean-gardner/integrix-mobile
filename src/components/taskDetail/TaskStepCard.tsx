import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import type { TaskStepReadDTO } from '../../types/task';
import {
  isImageFile,
  stripHtmlToText,
  TASK_STEP_COMPLETED_WITH_RECORD,
  TASK_STEP_NOT_COMPLETED,
} from '../../config/taskDetail';

type TaskStepCardProps = {
  orderLabel: string;
  taskStep: TaskStepReadDTO;
  status: number | null;
  statusUpdating: boolean;
  statusUpdatingAction: 'skip' | 'done' | null;
  onPostPress: () => void;
  onSkipPress: () => void;
  onDonePress: () => void;
};

function resolveImageUrl(taskStep: TaskStepReadDTO): string | null {
  const files = taskStep.files ?? [];
  const match = files.find((file) => isImageFile(file?.name, file?.url) && typeof file?.url === 'string');
  return match?.url ?? null;
}

export function TaskStepCard({
  orderLabel,
  taskStep,
  status,
  statusUpdating,
  statusUpdatingAction,
  onPostPress,
  onSkipPress,
  onDonePress,
}: TaskStepCardProps) {
  const imageUrl = resolveImageUrl(taskStep);
  const isDone = status === TASK_STEP_COMPLETED_WITH_RECORD;
  const isSkipped = status === TASK_STEP_NOT_COMPLETED;
  const isPending = status === null || status === undefined;
  const postsCount = taskStep.postsCount ?? 0;
  const description = stripHtmlToText(taskStep.taskDescription) || `Task step ${orderLabel}`;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>TASK STEP {orderLabel}</Text>
      <Text style={styles.description}>{description}</Text>

      {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" /> : null}

      <View style={styles.actionsRow}>
        {/* Post button — always shown, badge when postsCount > 0 */}
        <TouchableOpacity style={styles.postButton} onPress={onPostPress} activeOpacity={0.8}>
          <Text style={styles.postButtonText}>Post</Text>
          {postsCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{postsCount > 99 ? '99+' : postsCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        {/* Skip button — shown only when step is pending; or as "Skipped ✗" when already skipped */}
        {(isPending || isSkipped) ? (
          <TouchableOpacity
            style={[styles.skipButton, isSkipped && styles.skipButtonActive]}
            onPress={onSkipPress}
            disabled={statusUpdating}
            activeOpacity={0.8}
          >
            {statusUpdating && statusUpdatingAction === 'skip' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.skipButtonText}>{isSkipped ? 'Skipped' : 'Skip'}</Text>
                {isSkipped ? <MaterialIcons name="close" size={18} color="#fff" /> : null}
              </View>
            )}
          </TouchableOpacity>
        ) : null}

        {/* Done button — hidden when skipped; shown as active when done */}
        {!isSkipped ? (
          <TouchableOpacity
            style={[styles.doneButton, isDone && styles.doneButtonActive]}
            onPress={onDonePress}
            disabled={statusUpdating}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.doneButtonText}>Done</Text>
              {isDone ? <MaterialIcons name="check" size={18} color="#fff" /> : null}
            </View>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    borderWidth: 1,
    borderColor: '#d7deed',
    borderRadius: 6,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    padding: 14,
  },
  title: {
    textAlign: 'center',
    fontSize: 19,
    fontWeight: '700',
    color: '#242f43',
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: '#161c27',
    marginBottom: 10,
  },
  image: {
    width: '100%',
    aspectRatio: 1.6,
    borderRadius: 2,
    backgroundColor: '#d8dbe4',
    marginBottom: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  postButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 3,
    backgroundColor: '#7584a6',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  postButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: -8,
    left: '50%',
    marginLeft: -10,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  skipButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 3,
    backgroundColor: '#7584a6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonActive: {
    backgroundColor: '#c0392b',
  },
  skipButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  doneButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 3,
    backgroundColor: '#7584a6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonActive: {
    backgroundColor: '#243aa8',
  },
  doneButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
