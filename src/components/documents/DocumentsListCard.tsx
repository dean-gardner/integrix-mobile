import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import type { DocumentVersionReadDTO } from '../../types/document';

type DocumentsListCardProps = {
  document: DocumentVersionReadDTO;
  onStartTask: (document: DocumentVersionReadDTO) => void;
  onView: (document: DocumentVersionReadDTO) => void;
  onShare: (document: DocumentVersionReadDTO) => void;
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

export function DocumentsListCard({
  document,
  onStartTask,
  onView,
  onShare,
}: DocumentsListCardProps) {
  const isPublished = String(document.versionStatusCode ?? '').trim().toLowerCase() === 'published';
  const actionsRef = useRef<any>(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(
    null
  );

  const openActions = () => {
    setActionsVisible(true);
    if ((actionsRef.current as any)?.measureInWindow) {
      (actionsRef.current as any).measureInWindow((x: number, y: number, width: number, height: number) => {
        setMenuAnchor({ x, y, width, height });
      });
    }
  };

  const closeActions = () => setActionsVisible(false);

  const menuWidth = 150;
  const menuTop = menuAnchor ? menuAnchor.y - 4 : 180;
  const menuLeft = menuAnchor ? Math.max(12, menuAnchor.x + menuAnchor.width - menuWidth) : 12;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.docNumber}>{document.documentNumberStr ?? document.documentNo}</Text>
        {isPublished ? (
          <TouchableOpacity style={styles.startTaskButton} onPress={() => onStartTask(document)}>
            <Text style={styles.startTaskText}>Start Task</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.description}>{document.description}</Text>

      <View style={styles.divider} />

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Status</Text>
        <Text style={styles.fieldValue}>{document.versionStatusCode}</Text>
      </View>
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Author</Text>
        <Text style={styles.fieldValue}>{document.createdByName}</Text>
      </View>
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Created Date</Text>
        <Text style={styles.fieldValue}>{formatDateTime(document.createdOnUtc)}</Text>
      </View>

      <TouchableOpacity ref={actionsRef} style={styles.actionsButton} onPress={openActions}>
        <Text style={styles.actionsText}>Actions</Text>
        <MaterialIcons name="more-vert" size={20} color="#3d4662" />
      </TouchableOpacity>

      <Modal visible={actionsVisible} transparent animationType="fade" onRequestClose={closeActions}>
        <TouchableWithoutFeedback onPress={closeActions}>
          <View style={styles.menuBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[styles.menuCard, { top: menuTop, left: menuLeft, width: menuWidth }]}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    closeActions();
                    onShare(document);
                  }}
                >
                  <MaterialIcons name="share" size={20} color="#2b3550" />
                  <Text style={styles.menuItemText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    closeActions();
                    onView(document);
                  }}
                >
                  <MaterialIcons name="visibility" size={20} color="#2b3550" />
                  <Text style={styles.menuItemText}>View</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
  docNumber: {
    flex: 1,
    color: '#5b6e88',
    fontSize: 16,
  },
  startTaskButton: {
    backgroundColor: '#e7effd',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  startTaskText: {
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
    alignItems: 'center',
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
  menuBackdrop: {
    flex: 1,
  },
  menuCard: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d6dceb',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
    overflow: 'hidden',
  },
  menuItem: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#2b3550',
  },
});
