import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import { buildLeafletPickerHtml } from '../../utils/gpsPinPickerHtml';

export type GpsPinCoords = { lat: number; lng: number };

type GpsPinPickerModalProps = {
  visible: boolean;
  initial: GpsPinCoords | null;
  onClose: () => void;
  onApply: (coords: GpsPinCoords) => void;
  /** Render inside another Modal as a full-screen overlay (avoids nested Modal issues on iOS). */
  embedded?: boolean;
};

function GpsPinPickerContent({
  initial,
  onClose,
  onApply,
}: {
  initial: GpsPinCoords;
  onClose: () => void;
  onApply: (coords: GpsPinCoords) => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<GpsPinCoords>(initial);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    setDraft(initial);
    setMapLoading(true);
    setMapError(false);
  }, [initial.lat, initial.lng]);

  const htmlSource = useMemo(
    () => ({ html: buildLeafletPickerHtml(initial.lat, initial.lng) }),
    [initial.lat, initial.lng]
  );

  const onWebMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as { type?: string; lat?: unknown; lng?: unknown };
      if (data?.type !== 'move') return;
      const lat = typeof data.lat === 'number' ? data.lat : Number(data.lat);
      const lng = typeof data.lng === 'number' ? data.lng : Number(data.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      setDraft({ lat, lng });
    } catch {
      /* ignore malformed messages */
    }
  }, []);

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 12,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t('app.taskStepPost.gpsPinPickerTitle')}</Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <MaterialIcons name="close" size={26} color="#1f2233" />
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>{t('app.taskStepPost.gpsPinPickerHint')}</Text>
      <View style={styles.mapWrap}>
        {mapLoading ? (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : null}
        {mapError ? (
          <View style={styles.mapLoading}>
            <Text style={styles.mapErrorText}>{t('app.taskStepPost.gpsPinPickerMapError')}</Text>
          </View>
        ) : null}
        <WebView
          key={`${initial.lat.toFixed(6)}-${initial.lng.toFixed(6)}`}
          source={htmlSource}
          style={styles.webview}
          onMessage={onWebMessage}
          onLoadEnd={() => setMapLoading(false)}
          onError={() => {
            setMapLoading(false);
            setMapError(true);
          }}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          setSupportMultipleWindows={false}
          {...(Platform.OS === 'android' ? { mixedContentMode: 'always' as const } : {})}
        />
      </View>
      <Text style={styles.coordsPreview}>
        {`${draft.lat.toFixed(5)}, ${draft.lng.toFixed(5)}`}
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>{t('app.modal.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.applyBtn} onPress={() => onApply(draft)}>
          <Text style={styles.applyBtnText}>{t('app.taskStepPost.gpsPinPickerApply')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function GpsPinPickerModal({
  visible,
  initial,
  onClose,
  onApply,
  embedded = false,
}: GpsPinPickerModalProps) {
  if (!visible || !initial) {
    return null;
  }

  if (embedded) {
    return (
      <View style={styles.embeddedOverlay} pointerEvents="box-none">
        <GpsPinPickerContent initial={initial} onClose={onClose} onApply={onApply} />
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <GpsPinPickerContent initial={initial} onClose={onClose} onApply={onApply} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  embeddedOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    elevation: 50,
    backgroundColor: '#f4f6fb',
  },
  root: {
    flex: 1,
    backgroundColor: '#f4f6fb',
    paddingHorizontal: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1e26',
    flex: 1,
    paddingRight: 8,
  },
  hint: {
    fontSize: 13,
    color: '#5a6175',
    marginBottom: 10,
    lineHeight: 18,
  },
  mapWrap: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#e2e6ef',
  },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e6ef',
    zIndex: 2,
  },
  mapErrorText: {
    color: '#5a6175',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  webview: {
    flex: 1,
    backgroundColor: '#e2e6ef',
  },
  coordsPreview: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#243aa8',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 4,
    backgroundColor: '#7282a9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
