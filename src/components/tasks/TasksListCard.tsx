import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import type { TaskReadDTO } from '../../types/task';

type TasksListCardProps = {
  task: TaskReadDTO;
  onViewTask: (task: TaskReadDTO) => void;
  onOpenActions: (task: TaskReadDTO) => void;
};

function formatDateTime(dateUtc?: string): string {
  if (!dateUtc) return '-';
  const d = new Date(dateUtc);
  if (Number.isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}`;
}

function getTaskStatusText(status?: number): string {
  switch (status) {
    case 0:
      return 'In Progress';
    case 1:
      return 'Complete';
    case 2:
      return 'Cancelled';
    case 3:
      return 'Locked';
    case 4:
      return 'Planned';
    default:
      return '-';
  }
}

function getTaskReference(task: TaskReadDTO): string {
  if (task.workOrderNumber || task.notificationNumber) {
    const parts: string[] = [];
    if (task.workOrderNumber) parts.push(`Work Order: ${task.workOrderNumber}`);
    if (task.notificationNumber) parts.push(`Notification No: ${task.notificationNumber}`);
    return parts.join('; ');
  }
  if (task.projectNumber) return `Project No: ${task.projectNumber}`;
  return '';
}

export function TasksListCard({ task, onViewTask, onOpenActions }: TasksListCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.taskNumber}>{task.taskNumber ?? '-'}</Text>
        <TouchableOpacity style={styles.viewTaskButton} onPress={() => onViewTask(task)}>
          <Text style={styles.viewTaskText}>View Task</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.description}>{task.description ?? '-'}</Text>

      <View style={styles.divider} />

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Asset</Text>
        <Text style={styles.fieldValue}>{task.asset?.name ?? '-'}</Text>
      </View>
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Task Reference</Text>
        <Text style={styles.fieldValue}>{getTaskReference(task)}</Text>
      </View>
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Status</Text>
        <Text style={styles.fieldValue}>{getTaskStatusText(task.status)}</Text>
      </View>
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Created By</Text>
        <Text style={styles.fieldValue}>{task.createdBy ?? '-'}</Text>
      </View>
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Created Date</Text>
        <Text style={styles.fieldValue}>{formatDateTime(task.createdOnUtc)}</Text>
      </View>

      <TouchableOpacity style={styles.actionsButton} onPress={() => onOpenActions(task)}>
        <Text style={styles.actionsText}>Actions</Text>
        <MaterialIcons name="more-vert" size={20} color="#3d4662" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#eae8f1',
    borderRadius: 4,
    backgroundColor: '#ffffff',
    padding: 12,
    shadowColor: '#dadee8',
    shadowOpacity: 0.75,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  taskNumber: {
    flex: 1,
    color: '#5b6e88',
    fontSize: 16,
  },
  viewTaskButton: {
    backgroundColor: '#e7effd',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  viewTaskText: {
    color: '#1976d2',
    fontSize: 13,
    fontWeight: '600',
  },
  description: {
    color: '#111111',
    fontSize: 17,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#e8e9ef',
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12,
  },
  fieldLabel: {
    color: '#8f8f8f',
    fontSize: 14,
    flex: 1,
  },
  fieldValue: {
    color: '#111111',
    fontSize: 16,
    textAlign: 'right',
    flex: 1,
  },
  actionsButton: {
    marginTop: 4,
    height: 38,
    borderWidth: 1,
    borderColor: '#d0d8e7',
    borderRadius: 3,
    backgroundColor: '#edf1fa',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  actionsText: {
    color: '#273149',
    fontSize: 16,
  },
});
