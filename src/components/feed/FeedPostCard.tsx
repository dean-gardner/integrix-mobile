import React, { useMemo, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { config } from '../../config';
import type { FeedFieldValueDTO, FeedFileDTO, FeedItemDTO } from '../../types/feed';

const COLLAPSED_CONTENT_HEIGHT = 200;
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif']);

function toAbsoluteUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) {
    return `${config.apiUrl}${url.slice(1)}`;
  }
  return `${config.apiUrl}${url}`;
}

function getFileExtensionFromValue(value?: string | null): string | null {
  if (!value) return null;
  const cleanValue = value.split('?')[0].split('#')[0];
  const parts = cleanValue.split('.');
  if (parts.length < 2) return null;
  const extension = parts[parts.length - 1]?.trim().toLowerCase();
  return extension ? extension : null;
}

function getFileExtension(file: FeedFileDTO): string {
  return (
    (typeof file.extension === 'string' ? file.extension.toLowerCase() : null) ??
    getFileExtensionFromValue(file.name) ??
    getFileExtensionFromValue(file.url) ??
    getFileExtensionFromValue(file.thumbnailUrl) ??
    ''
  );
}

function isImageFile(file: FeedFileDTO): boolean {
  const extension = getFileExtension(file);
  return IMAGE_EXTENSIONS.has(extension);
}

function resolvePreviewUrl(file: FeedFileDTO): string | null {
  if (isImageFile(file)) {
    return toAbsoluteUrl(file.url ?? file.thumbnailUrl);
  }

  const thumbExtension = getFileExtensionFromValue(file.thumbnailUrl);
  if (thumbExtension && IMAGE_EXTENSIONS.has(thumbExtension)) {
    return toAbsoluteUrl(file.thumbnailUrl);
  }
  return null;
}

function toReadableText(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value !== 'string') return String(value);
  const trimmed = value.trim();
  if (!trimmed) return '-';
  if (!/[<>]/.test(trimmed)) return trimmed;

  return trimmed
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function formatTimeDifference(createdOnUtc?: string): string {
  if (!createdOnUtc) return '';
  const inputDate = new Date(createdOnUtc);
  if (Number.isNaN(inputDate.getTime())) return '';

  const diffMs = Date.now() - inputDate.getTime();
  const seconds = Math.max(0, Math.floor(diffMs / 1000));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days >= 2) {
    const day = inputDate.getDate();
    const month = inputDate.toLocaleString('en-US', { month: 'long' });
    const year = inputDate.getFullYear();
    const hourText = String(inputDate.getHours()).padStart(2, '0');
    const minuteText = String(inputDate.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hourText}:${minuteText}`;
  }

  if (days > 0) {
    const remainingHours = hours % 24;
    return `${days} day${days === 1 ? '' : 's'} ${remainingHours} hour${remainingHours === 1 ? '' : 's'} ago`;
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours} hour${hours === 1 ? '' : 's'} ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'} ago`;
  }

  if (minutes > 0) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  return `${seconds} second${seconds === 1 ? '' : 's'} ago`;
}

function getReferenceItems(post: FeedItemDTO): Array<{ label: string; value: string }> {
  const result: Array<{ label: string; value: string }> = [];
  if (post.workOrderNumber) {
    result.push({ label: 'Work order: ', value: post.workOrderNumber });
  }
  if (post.notificationNumber) {
    result.push({ label: 'Notification Number: ', value: post.notificationNumber });
  }
  if (result.length === 0 && post.projectNumber) {
    result.push({ label: 'Project Number: ', value: post.projectNumber });
  }
  if (result.length === 0 && (post.taskNo || post.taskId)) {
    result.push({ label: 'Task ID: ', value: post.taskNo ?? post.taskId ?? '-' });
  }
  return result;
}

type FeedPostCardProps = {
  post: FeedItemDTO;
  userCompanyId?: string | null;
  onOpenTask: (post: FeedItemDTO) => void;
};

export function FeedPostCard({ post, userCompanyId, onOpenTask }: FeedPostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [measuredHeight, setMeasuredHeight] = useState(0);

  const postTypeLower = (post.type ?? '').toLowerCase();
  const isDefect = postTypeLower === 'defect';
  const isStepCompletion = postTypeLower === 'stepcompletion' || postTypeLower === 'step completion';
  const canOpenTask = Boolean(post.taskId);
  const fieldValues = useMemo(
    () => (Array.isArray(post.fieldValues) ? post.fieldValues : []),
    [post.fieldValues]
  );
  const allFiles = useMemo(() => (Array.isArray(post.files) ? post.files : []), [post.files]);
  const visibleFiles = expanded ? allFiles : allFiles.slice(0, 4);
  const hiddenFilesCount = Math.max(0, allFiles.length - visibleFiles.length);
  const references = useMemo(() => getReferenceItems(post), [post]);
  const contentIsExpandable = measuredHeight > COLLAPSED_CONTENT_HEIGHT + 2;

  const authorName = post.createdByName ? toReadableText(post.createdByName) : 'Unknown user';
  const shouldShowCompany =
    Boolean(post.createdByCompanyId) &&
    Boolean(userCompanyId) &&
    post.createdByCompanyId !== userCompanyId &&
    Boolean(post.createdByCompany);
  const authorDisplayName = shouldShowCompany
    ? `${authorName} (${toReadableText(post.createdByCompany)})`
    : authorName;

  const taskTitle = toReadableText(post.taskTitle ?? '-');
  const stepTitle = toReadableText(post.taskStepDescription ?? '');

  const detailsDescription = toReadableText(post.description);
  const remediationDetails = toReadableText(post.remediationDetails);

  const onDetailsLayout = (event: LayoutChangeEvent) => {
    const nextHeight = Math.ceil(event.nativeEvent.layout.height);
    setMeasuredHeight((previous) => (nextHeight > previous ? nextHeight : previous));
  };

  const openFile = (file: FeedFileDTO) => {
    const url = toAbsoluteUrl(file.url ?? file.thumbnailUrl);
    if (!url) return;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.card}>
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusPill,
            isDefect
              ? styles.statusPillDefect
              : isStepCompletion
              ? styles.statusPillStepCompletion
              : styles.statusPillObservation,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              isDefect
                ? styles.statusDotDefect
                : isStepCompletion
                ? styles.statusDotStepCompletion
                : styles.statusDotObservation,
            ]}
          />
          <Text
            style={[
              styles.statusText,
              isDefect
                ? styles.statusTextDefect
                : isStepCompletion
                ? styles.statusTextStepCompletion
                : styles.statusTextObservation,
            ]}
          >
            {isDefect ? 'DEFECT' : isStepCompletion ? 'STEP COMPLETION' : 'OBSERVATION'}
          </Text>
        </View>
      </View>

      <View style={styles.authorRow}>
        <View style={styles.authorMeta}>
          <MaterialIcons name="account-circle" size={26} color="#b9bdc7" />
          <View style={styles.authorTextWrap}>
            <Text style={styles.authorLine} numberOfLines={1}>
              {authorDisplayName}
            </Text>
            {post.createdOnUtc ? (
              <Text style={styles.timeLine} numberOfLines={1}>
                {formatTimeDifference(post.createdOnUtc)}
              </Text>
            ) : null}
          </View>
        </View>

        {canOpenTask ? (
          <TouchableOpacity
            style={styles.openTaskButton}
            onPress={() => onOpenTask(post)}
            activeOpacity={0.85}
          >
            <Text style={styles.openTaskButtonText}>Open task</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {(post.taskTitle || post.taskStepDescription) ? (
        <View style={styles.taskBreadcrumb}>
          {post.taskTitle ? (
            <Text style={styles.taskLine} numberOfLines={1}>
              <Text style={styles.taskLineLabel}>Task: </Text>
              <Text style={styles.taskLineValue}>{taskTitle}</Text>
            </Text>
          ) : null}
          {post.taskTitle && post.taskStepDescription ? (
            <MaterialIcons name="chevron-right" size={16} color="#707887" style={styles.taskLineChevron} />
          ) : null}
          {post.taskStepDescription ? (
            <Text style={styles.taskLine} numberOfLines={1}>
              <Text style={styles.taskLineLabel}>Step: </Text>
              <Text style={styles.taskLineValue}>{stepTitle}</Text>
            </Text>
          ) : null}
        </View>
      ) : null}

      {references.length > 0 || post.assetName ? (
        <Text style={styles.referenceLine} numberOfLines={2}>
          {references.length > 0 ? (
            <>
              <Text style={styles.referenceLabel}>{references[0].label}</Text>
              <Text style={styles.referenceValue}>{references[0].value}</Text>
              {references.slice(1).map((item, index) => (
                <Text key={`ref-${index}`} style={styles.referenceValue}>
                  {`  •  ${item.label}${item.value}`}
                </Text>
              ))}
            </>
          ) : null}
          {post.assetName ? (
            <Text style={styles.referenceValue}>
              {`${references.length > 0 ? '  •  ' : ''}${toReadableText(post.assetName)}`}
            </Text>
          ) : null}
        </Text>
      ) : null}

      <View style={styles.divider} />

      <View style={styles.detailsOuter}>
        <View
          style={[
            styles.detailsContent,
            contentIsExpandable && !expanded ? styles.detailsContentCollapsed : null,
          ]}
          onLayout={onDetailsLayout}
        >
          {fieldValues.length > 0 ? (
            fieldValues
              .filter((fieldValue) => fieldValue.type !== 3)
              .map((fieldValue: FeedFieldValueDTO, index) => (
                <View key={fieldValue.id ?? `${fieldValue.name ?? 'field'}-${index}`} style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>{toReadableText(fieldValue.name)}</Text>
                  <Text style={styles.fieldValue}>{toReadableText(fieldValue.value)}</Text>
                </View>
              ))
          ) : (
            <Text style={styles.descriptionText}>{detailsDescription}</Text>
          )}

          {isDefect ? (
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Remediation details</Text>
              <Text style={styles.fieldValue}>{remediationDetails}</Text>
            </View>
          ) : null}

          {visibleFiles.length > 0 ? (
            <View style={styles.filesGrid}>
              {visibleFiles.map((file, index) => {
                const previewUrl = resolvePreviewUrl(file);
                const extension = getFileExtension(file);
                const useSingleTile = visibleFiles.length === 1;
                const showHiddenCount = !expanded && hiddenFilesCount > 0 && index === visibleFiles.length - 1;

                return (
                  <TouchableOpacity
                    key={file.id ?? `${file.name ?? 'file'}-${index}`}
                    style={[styles.fileTile, useSingleTile ? styles.fileTileSingle : styles.fileTileGrid]}
                    onPress={() => openFile(file)}
                    activeOpacity={0.9}
                  >
                    {previewUrl ? (
                      <Image source={{ uri: previewUrl }} style={styles.fileImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.fileFallback}>
                        <MaterialIcons
                          name={extension === 'pdf' ? 'picture-as-pdf' : 'description'}
                          size={72}
                          color={extension === 'pdf' ? '#e53935' : '#6d7891'}
                        />
                        <Text style={styles.fileFallbackText}>
                          {(extension || 'FILE').toUpperCase()}
                        </Text>
                      </View>
                    )}
                    {showHiddenCount ? (
                      <View style={styles.moreOverlay}>
                        <Text style={styles.moreOverlayText}>+{hiddenFilesCount}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>
        {contentIsExpandable && !expanded ? <View style={styles.detailsFade} /> : null}
      </View>

      {contentIsExpandable ? (
        <View style={styles.expandRow}>
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => setExpanded((current) => !current)}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name={expanded ? 'expand-less' : 'expand-more'}
              size={24}
              color="#6f7688"
            />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f8f9fc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9dfeb',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
  },
  statusRow: {
    marginBottom: 8,
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    minHeight: 24,
    gap: 6,
  },
  statusPillDefect: {
    backgroundColor: '#fef3f2',
  },
  statusPillObservation: {
    backgroundColor: 'rgba(251, 188, 11, 0.16)',
  },
  statusPillStepCompletion: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotDefect: {
    backgroundColor: '#b42318',
  },
  statusDotObservation: {
    backgroundColor: '#e8b210',
  },
  statusDotStepCompletion: {
    backgroundColor: '#16a34a',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusTextDefect: {
    color: '#b42318',
  },
  statusTextObservation: {
    color: '#d7a208',
  },
  statusTextStepCompletion: {
    color: '#16a34a',
  },
  authorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  authorMeta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    gap: 6,
  },
  authorTextWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: 4,
  },
  authorLine: {
    color: '#222834',
    fontSize: 16,
    fontWeight: '500',
  },
  timeLine: {
    color: '#516487',
    fontSize: 13,
  },
  openTaskButton: {
    minHeight: 34,
    borderRadius: 6,
    backgroundColor: '#e8edf9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 11,
  },
  openTaskButtonText: {
    color: '#1f74d9',
    fontSize: 14,
    fontWeight: '600',
  },
  taskBreadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 0,
  },
  taskLineChevron: {
    marginHorizontal: 0,
  },
  taskLine: {
    color: '#3f5479',
    fontSize: 13,
    lineHeight: 20,
    flexShrink: 1,
  },
  taskLineLabel: {
    fontWeight: '700',
    color: '#1f232c',
  },
  taskLineValue: {
    color: '#3f5479',
    fontWeight: '400',
  },
  referenceLine: {
    marginTop: 2,
    color: '#3f5479',
    fontSize: 14,
    lineHeight: 20,
  },
  referenceLabel: {
    fontWeight: '700',
    color: '#1f232c',
  },
  referenceValue: {
    color: '#3f5479',
  },
  divider: {
    marginTop: 8,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#d6dbe6',
  },
  detailsOuter: {
    position: 'relative',
  },
  detailsContent: {
    gap: 8,
  },
  detailsContentCollapsed: {
    maxHeight: COLLAPSED_CONTENT_HEIGHT,
    overflow: 'hidden',
  },
  detailsFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 40,
    backgroundColor: 'rgba(248, 249, 252, 0.96)',
  },
  fieldBlock: {
    gap: 2,
  },
  fieldLabel: {
    color: '#9a9ca6',
    fontSize: 13,
  },
  fieldValue: {
    color: '#161b24',
    fontSize: 14,
    lineHeight: 21,
  },
  descriptionText: {
    color: '#202531',
    fontSize: 16,
    lineHeight: 24,
  },
  filesGrid: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  fileTile: {
    borderRadius: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#d8dee9',
    backgroundColor: '#f0f3f8',
    position: 'relative',
  },
  fileTileSingle: {
    width: '100%',
    aspectRatio: 1.26,
  },
  fileTileGrid: {
    width: '48.8%',
    aspectRatio: 1,
  },
  fileImage: {
    width: '100%',
    height: '100%',
  },
  fileFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileFallbackText: {
    marginTop: -8,
    color: '#2f3a55',
    fontSize: 14,
    fontWeight: '700',
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(36, 46, 76, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreOverlayText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
  expandRow: {
    alignItems: 'center',
    marginTop: 4,
  },
  expandButton: {
    width: 34,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
