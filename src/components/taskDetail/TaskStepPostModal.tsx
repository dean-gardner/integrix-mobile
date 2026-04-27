import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Geolocation, { type GeolocationError } from '@react-native-community/geolocation';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { launchCamera, launchImageLibrary, type Asset as ImagePickerAsset } from 'react-native-image-picker';
import i18n from '../../i18n';
import { getDefaultDefectFieldsTemplate } from '../../api/defectFieldsTemplates';
import { editDefect, getDefectById, getTaskStepDefects } from '../../api/defects';
import { getTaskPosts } from '../../api/feed';
import {
  getCachedTaskStepDefects,
  getCachedTaskStepPosts,
  setCachedTaskStepDefects,
  setCachedTaskStepPosts,
} from '../../storage/taskOfflineCache';
import type { DefectCommentDTO, DefectFilteringModel, DefectReadDTO } from '../../types/defect';
import type { DefectFieldReadDTO, DefectFieldsTemplateDTO } from '../../types/defectTemplate';
import type { FeedItemDTO, FilteringModel } from '../../types/feed';
import type { TaskStepReadDTO } from '../../types/task';
import { theme } from '../../theme';
import { useTranslation } from 'react-i18next';

const DEFECT_FIELD_TYPES = {
  FreeText: 0,
  Checkbox: 1,
  List: 2,
  Map: 3,
  Picture: 4,
  Dictionary: 5,
  Numerical: 6,
  HtmlText: 7,
} as const;

const TASK_POSTS_FILTERING_MODEL: FilteringModel = {
  pageNumber: 0,
  pageSize: 100,
  sortingField: 'createdOnUtc',
  sortingOrder: 1,
};

const TASK_STEP_DEFECTS_FILTERING_MODEL: DefectFilteringModel = {
  pageNumber: 0,
  pageSize: 20,
  sortingField: 'createdOnUtc',
  sortingOrder: 1,
  statusCode: null,
  templateId: null,
  userId: null,
  fieldFilters: {},
  sharedUserEmail: null,
};

Geolocation.setRNConfiguration({
  skipPermissionRequests: false,
  authorizationLevel: 'whenInUse',
  locationProvider: 'auto',
});

type ModalTab = 'posts' | 'defects';
type DefectFieldValue = string | boolean;
type GpsCoordinates = { lat: number; lng: number };
type DefectFieldValueLike = {
  id?: string;
  name?: string;
  type?: number | null;
  value?: unknown;
  valueId?: string | number | null;
  defectFieldId?: string;
};

type UploadFile = {
  uri: string;
  type: string;
  name: string;
};

export type TaskStepPostPayload =
  | {
      kind: 'observation';
      description: string;
      files: UploadFile[];
    }
  | {
      kind: 'defect';
      description: string;
      remediationDetails: string;
      template: DefectFieldsTemplateDTO | null;
      fieldValues: Record<string, string>;
      files: UploadFile[];
    };

type TaskStepPostModalProps = {
  visible: boolean;
  taskStep: TaskStepReadDTO | null;
  taskId?: string | null;
  assetName?: string | null;
  onClose: () => void;
  onSubmit: (payload: TaskStepPostPayload, taskStep: TaskStepReadDTO) => Promise<void>;
};

function isDescriptionField(field: DefectFieldReadDTO): boolean {
  return field.name.toLowerCase().includes('description');
}

function isAssetField(field: DefectFieldReadDTO): boolean {
  return field.name.toLowerCase().includes('asset');
}

function isGpsField(field: DefectFieldReadDTO): boolean {
  return field.name.toLowerCase().includes('gps');
}

function toReadableText(value: unknown): string {
  if (value == null) return '-';
  const text = String(value).trim();
  return text ? text : '-';
}

function valueToString(value: DefectFieldValue): string {
  return typeof value === 'boolean' ? String(value) : value;
}

function parseFieldOptions(options: string | null): string[] {
  if (!options) return [];
  const items = options
    .split(/\r?\n|,|;|\|/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
  return Array.from(new Set(items));
}

function formatPostDate(utcValue?: string): string {
  if (!utcValue) return '-';
  const date = new Date(utcValue);
  if (Number.isNaN(date.getTime())) return '-';
  try {
    return new Intl.DateTimeFormat(i18n.language || 'en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return date.toLocaleString(i18n.language || 'en');
  }
}

function formatRelativeTime(utcValue?: string | null): string {
  if (!utcValue) return '';
  const value = new Date(utcValue).getTime();
  if (Number.isNaN(value)) return '';
  const diff = Date.now() - value;
  try {
    if (typeof Intl.RelativeTimeFormat !== 'function') {
      return formatPostDate(utcValue);
    }
    const formatter = new Intl.RelativeTimeFormat(i18n.language || 'en', { numeric: 'auto' });
    if (diff < 60_000) return formatter.format(0, 'second');
    if (diff < 3_600_000) return formatter.format(-Math.floor(diff / 60_000), 'minute');
    if (diff < 86_400_000) return formatter.format(-Math.floor(diff / 3_600_000), 'hour');
    return formatter.format(-Math.floor(diff / 86_400_000), 'day');
  } catch {
    return formatPostDate(utcValue);
  }
}

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'image/bmp', 'image/heic', 'image/heif',
]);

function isImageFile(file: UploadFile): boolean {
  return IMAGE_MIME_TYPES.has((file.type ?? '').toLowerCase());
}

function parseGpsCoordinates(value: unknown): GpsCoordinates | null {
  if (value == null) return null;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const rawLat = record.lat ?? record.latitude;
    const rawLng = record.lng ?? record.lon ?? record.long ?? record.longitude;
    const lat = typeof rawLat === 'number' ? rawLat : Number(rawLat);
    const lng = typeof rawLng === 'number' ? rawLng : Number(rawLng);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }

  const text = String(value).trim();
  if (!text || text.toLowerCase() === 'auto' || text === '-') return null;
  try {
    return parseGpsCoordinates(JSON.parse(text));
  } catch {
    const match = text.match(/(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)/);
    if (!match) return null;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }
}

function getDefectGpsCoordinates(defect: DefectReadDTO): GpsCoordinates | null {
  const rawFieldValues =
    ((defect as { fieldValues?: DefectFieldValueLike[] }).fieldValues ?? [])
      .concat((defect as { defectFieldsValues?: DefectFieldValueLike[] }).defectFieldsValues ?? []);

  for (const fieldValue of rawFieldValues) {
    const name = (fieldValue.name ?? '').toLowerCase();
    const type = typeof fieldValue.type === 'number' ? fieldValue.type : null;
    if (type === DEFECT_FIELD_TYPES.Map || name.includes('gps')) {
      const coords = parseGpsCoordinates(fieldValue.value);
      if (coords) return coords;
    }
  }

  return (
    parseGpsCoordinates((defect as Record<string, unknown>).gpsPosition) ??
    parseGpsCoordinates((defect as Record<string, unknown>).gpsCoordinates) ??
    parseGpsCoordinates((defect as Record<string, unknown>).position)
  );
}

async function requestAndroidLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const fineLocation = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
  const coarseLocation = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;
  const hasFinePermission = await PermissionsAndroid.check(fineLocation);
  const hasCoarsePermission = await PermissionsAndroid.check(coarseLocation);
  if (hasFinePermission || hasCoarsePermission) return true;

  const result = await PermissionsAndroid.request(fineLocation);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

function requestIosLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'ios') return Promise.resolve(true);
  return new Promise((resolve) => {
    Geolocation.requestAuthorization(
      () => resolve(true),
      () => resolve(false)
    );
  });
}

function mapPickerAsset(asset: ImagePickerAsset): UploadFile | null {
  if (!asset.uri) return null;
  const extension = asset.type?.split('/')[1] ?? 'jpg';
  return {
    uri: asset.uri,
    type: asset.type ?? 'image/jpeg',
    name: asset.fileName?.trim() || `attachment-${Date.now()}-${Math.random()}.${extension}`,
  };
}

function pickImagesWithSource(
  selectionLimit: number,
  onPicked: (files: UploadFile[]) => void,
  onError?: () => void
) {
  const launch = (source: 'camera' | 'library') => {
    const opts = { mediaType: 'photo' as const, selectionLimit: source === 'camera' ? 1 : selectionLimit, quality: 0.9 as const };
    const launcher = source === 'camera' ? launchCamera : launchImageLibrary;
    launcher(opts).then((result) => {
      if (result.didCancel) return;
      const files = (result.assets ?? []).map(mapPickerAsset).filter((f): f is UploadFile => f !== null);
      if (files.length > 0) onPicked(files);
    }).catch(() => onError?.());
  };

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [
          i18n.t('app.modal.cancel'),
          i18n.t('app.task.takePhoto'),
          i18n.t('app.task.chooseLibrary'),
        ],
        cancelButtonIndex: 0,
      },
      (index) => {
        if (index === 1) launch('camera');
        if (index === 2) launch('library');
      }
    );
  } else {
    Alert.alert(i18n.t('app.task.addPhoto'), '', [
      { text: i18n.t('app.task.takePhoto'), onPress: () => launch('camera') },
      { text: i18n.t('app.task.chooseLibrary'), onPress: () => launch('library') },
      { text: i18n.t('app.modal.cancel'), style: 'cancel' },
    ]);
  }
}

export function TaskStepPostModal({
  visible,
  taskStep,
  taskId = null,
  assetName,
  onClose,
  onSubmit,
}: TaskStepPostModalProps) {
  const { t } = useTranslation();
  const canCreateDefect = Boolean(taskStep?.canUserCreateDefect ?? taskStep?.defectFieldsTemplate);

  const [activeTab, setActiveTab] = useState<ModalTab>('posts');
  const [isDefect, setIsDefect] = useState(false);

  const [description, setDescription] = useState('');
  const [remediationDetails, setRemediationDetails] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, DefectFieldValue>>({});
  const [files, setFiles] = useState<UploadFile[]>([]);

  const [defaultTemplate, setDefaultTemplate] = useState<DefectFieldsTemplateDTO | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);

  const [posts, setPosts] = useState<FeedItemDTO[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [defects, setDefects] = useState<DefectReadDTO[]>([]);
  const [defectsLoading, setDefectsLoading] = useState(false);
  const [defectsError, setDefectsError] = useState<string | null>(null);

  const [expandedDefectId, setExpandedDefectId] = useState<string | null>(null);
  const [updatingDefect, setUpdatingDefect] = useState<DefectReadDTO | null>(null);
  const [updateDescription, setUpdateDescription] = useState('');
  const [updateStatus, setUpdateStatus] = useState('Open');
  const [updateRemediation, setUpdateRemediation] = useState('');
  const [updateFiles, setUpdateFiles] = useState<UploadFile[]>([]);
  const [updateSubmitting, setUpdateSubmitting] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateLoadingFull, setUpdateLoadingFull] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  const selectedTemplate = taskStep?.defectFieldsTemplate ?? defaultTemplate;

  const resetComposer = useCallback(() => {
    setDescription('');
    setRemediationDetails('');
    setFieldValues({});
    setFiles([]);
    setGpsCoords(null);
    setGpsLoading(false);
    setError(null);
  }, []);

  const closeModal = useCallback(() => {
    if (submitting) return;
    onClose();
  }, [onClose, submitting]);

  const loadPosts = useCallback(async () => {
    if (!taskId || !taskStep?.id) {
      setPosts([]);
      setPostsError(null);
      return;
    }

    setPostsLoading(true);
    setPostsError(null);
    try {
      const response = await getTaskPosts(taskId, taskStep.id, TASK_POSTS_FILTERING_MODEL);
      const incomingPosts = Array.isArray(response.data?.items) ? response.data.items : [];
      const sorted = incomingPosts.slice().sort((first, second) => {
        const firstDate = new Date(first.modifiedOnUtc ?? first.createdOnUtc ?? '').getTime();
        const secondDate = new Date(second.modifiedOnUtc ?? second.createdOnUtc ?? '').getTime();
        return secondDate - firstDate;
      });
      setPosts(sorted);
      await setCachedTaskStepPosts(taskId, taskStep.id, sorted);
    } catch {
      const cachedPosts = await getCachedTaskStepPosts(taskId, taskStep.id);
      if (cachedPosts.length > 0) {
        const sortedCachedPosts = cachedPosts.slice().sort((first, second) => {
          const firstDate = new Date(first.modifiedOnUtc ?? first.createdOnUtc ?? '').getTime();
          const secondDate = new Date(second.modifiedOnUtc ?? second.createdOnUtc ?? '').getTime();
          return secondDate - firstDate;
        });
        setPosts(sortedCachedPosts);
        setPostsError(null);
      } else {
        setPosts([]);
        setPostsError(i18n.t('app.taskStepPost.loadPostsFail'));
      }
    } finally {
      setPostsLoading(false);
    }
  }, [taskId, taskStep?.id]);

  const loadDefects = useCallback(async () => {
    if (!taskId || !taskStep?.id) {
      setDefects([]);
      setDefectsError(null);
      return;
    }

    setDefectsLoading(true);
    setDefectsError(null);
    try {
      const response = await getTaskStepDefects(taskId, taskStep.id, TASK_STEP_DEFECTS_FILTERING_MODEL);
      const incomingDefects = Array.isArray(response.data?.items) ? response.data.items : [];
      const sorted = incomingDefects.slice().sort((first, second) => {
        const firstDate = new Date(
          (typeof first.modifiedOnUtc === 'string' ? first.modifiedOnUtc : first.createdOnUtc) ?? ''
        ).getTime();
        const secondDate = new Date(
          (typeof second.modifiedOnUtc === 'string' ? second.modifiedOnUtc : second.createdOnUtc) ?? ''
        ).getTime();
        return secondDate - firstDate;
      });
      setDefects(sorted);
      await setCachedTaskStepDefects(taskId, taskStep.id, sorted);
    } catch {
      const cachedDefects = await getCachedTaskStepDefects(taskId, taskStep.id);
      if (cachedDefects.length > 0) {
        const sortedCachedDefects = cachedDefects.slice().sort((first, second) => {
          const firstDate = new Date(
            (typeof first.modifiedOnUtc === 'string' ? first.modifiedOnUtc : first.createdOnUtc) ?? ''
          ).getTime();
          const secondDate = new Date(
            (typeof second.modifiedOnUtc === 'string' ? second.modifiedOnUtc : second.createdOnUtc) ?? ''
          ).getTime();
          return secondDate - firstDate;
        });
        setDefects(sortedCachedDefects);
        setDefectsError(null);
      } else {
        setDefects([]);
        setDefectsError(i18n.t('app.taskStepPost.loadDefectsFail'));
      }
    } finally {
      setDefectsLoading(false);
    }
  }, [taskId, taskStep?.id]);

  useEffect(() => {
    if (!visible) return;
    setActiveTab('posts');
    setIsDefect(false);
    setDefaultTemplate(null);
    resetComposer();
  }, [resetComposer, taskStep?.id, visible]);

  useEffect(() => {
    if (!visible) return;
    loadPosts().catch(() => {});
  }, [loadPosts, visible]);

  useEffect(() => {
    if (!visible || activeTab !== 'defects') return;
    loadDefects().catch(() => {});
  }, [activeTab, loadDefects, visible]);

  useEffect(() => {
    if (!visible || !isDefect || !canCreateDefect) return;
    if (taskStep?.defectFieldsTemplate || defaultTemplate || templateLoading) return;

    let mounted = true;
    setTemplateLoading(true);
    getDefaultDefectFieldsTemplate()
      .then((response) => {
        if (!mounted) return;
        setDefaultTemplate(response.data ?? null);
      })
      .catch(() => {
        if (!mounted) return;
        setError(i18n.t('app.taskStepPost.loadTemplateFail'));
      })
      .finally(() => {
        if (!mounted) return;
        setTemplateLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [
    canCreateDefect,
    defaultTemplate,
    isDefect,
    taskStep?.defectFieldsTemplate,
    templateLoading,
    visible,
  ]);

  const resolveFieldValue = useCallback(
    (field: DefectFieldReadDTO): DefectFieldValue => {
      const explicitValue = fieldValues[field.id];
      if (explicitValue != null) return explicitValue;
      if (isDescriptionField(field)) return description;
      if (isAssetField(field)) return assetName ?? '';
      if (isGpsField(field)) return 'auto';
      return '';
    },
    [assetName, description, fieldValues]
  );

  const additionalFields = useMemo(() => {
    if (!selectedTemplate?.fields?.length) return [];
    return selectedTemplate.fields.filter(
      (field) => !isDescriptionField(field) && !isAssetField(field) && !isGpsField(field)
    );
  }, [selectedTemplate]);

  const requiredMissingFields = useMemo(() => {
    if (!isDefect) return [];
    if (!selectedTemplate?.fields?.length) return [];
    return selectedTemplate.fields
      .filter((field) => field.isRequired)
      .filter((field) => !isGpsField(field))
      .filter((field) => !valueToString(resolveFieldValue(field)).trim())
      .map((field) => field.name);
  }, [isDefect, resolveFieldValue, selectedTemplate]);

  const mainPosts = useMemo(() => {
    return posts
      .filter((post) => !post.isOtherPostItem)
      .slice()
      .sort((a, b) => {
        const tA = new Date(a.modifiedOnUtc ?? a.createdOnUtc ?? '').getTime();
        const tB = new Date(b.modifiedOnUtc ?? b.createdOnUtc ?? '').getTime();
        return tB - tA;
      });
  }, [posts]);

  const otherPosts = useMemo(() => {
    return posts
      .filter((post) => !!post.isOtherPostItem)
      .slice()
      .sort((a, b) => {
        const tA = new Date(a.modifiedOnUtc ?? a.createdOnUtc ?? '').getTime();
        const tB = new Date(b.modifiedOnUtc ?? b.createdOnUtc ?? '').getTime();
        return tB - tA;
      });
  }, [posts]);

  const addFiles = () => {
    if (submitting) return;
    pickImagesWithSource(
      8,
      (picked) => {
        setFiles((current) => {
          const keys = new Set(current.map((f) => `${f.uri}::${f.name}`));
          const merged = [...current];
          picked.forEach((f) => {
            const key = `${f.uri}::${f.name}`;
            if (!keys.has(key)) { keys.add(key); merged.push(f); }
          });
          return merged;
        });
        setError(null);
      },
      () => setError(i18n.t('app.taskStepPost.pickAttachmentFail'))
    );
  };

  const removeFile = (entryToDelete: UploadFile) => {
    setFiles((current) =>
      current.filter((entry) => !(entry.uri === entryToDelete.uri && entry.name === entryToDelete.name))
    );
  };

  const submit = async () => {
    if (!taskStep) return;

    const cleanDescription = description.trim();
    if (!cleanDescription) {
      setError(i18n.t('app.taskStepPost.descriptionRequired'));
      return;
    }

    if (isDefect && !selectedTemplate) {
      setError(i18n.t('app.taskStepPost.templateUnavailable'));
      return;
    }

    if (isDefect && requiredMissingFields.length > 0) {
      setError(i18n.t('app.defects.fillRequired', { fields: requiredMissingFields.join(', ') }));
      return;
    }

    const serializedFieldValues: Record<string, string> = {};
    Object.entries(fieldValues).forEach(([fieldId, value]) => {
      serializedFieldValues[fieldId] = valueToString(value);
    });

    setSubmitting(true);
    setError(null);

    try {
      if (isDefect) {
        await onSubmit(
          {
            kind: 'defect',
            description: cleanDescription,
            remediationDetails: remediationDetails.trim(),
            template: selectedTemplate,
            fieldValues: serializedFieldValues,
            files,
          },
          taskStep
        );
      } else {
        await onSubmit(
          {
            kind: 'observation',
            description: cleanDescription,
            files,
          },
          taskStep
        );
      }

      resetComposer();
      await loadPosts();
      if (isDefect) {
        await loadDefects();
      }
    } catch (submitError) {
      const fallbackMessage = i18n.t('app.taskStepPost.createPostFail');
      if (typeof submitError === 'string') {
        setError(submitError || fallbackMessage);
      } else if (
        submitError &&
        typeof submitError === 'object' &&
        'message' in submitError &&
        typeof (submitError as { message?: unknown }).message === 'string'
      ) {
        setError((submitError as { message: string }).message || fallbackMessage);
      } else {
        setError(fallbackMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openGpsInMaps = useCallback((coords: GpsCoordinates) => {
    const { lat, lng } = coords;
    const url =
      Platform.OS === 'ios'
        ? `maps://?ll=${lat},${lng}&q=GPS+Position`
        : `geo:${lat},${lng}?q=${lat},${lng}(GPS+Position)`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`).catch(() => {
        Alert.alert(t('common.error'), t('app.taskStepPost.gpsOpenFailed'));
      })
    );
  }, [t]);

  const updateGpsFieldValues = useCallback(
    (coords: GpsCoordinates) => {
      const gpsFieldIds = selectedTemplate?.fields?.filter(isGpsField).map((field) => field.id) ?? [];
      if (gpsFieldIds.length === 0) return;
      const serializedCoords = JSON.stringify(coords);
      setFieldValues((current) => {
        const next = { ...current };
        gpsFieldIds.forEach((fieldId) => {
          next[fieldId] = serializedCoords;
        });
        return next;
      });
    },
    [selectedTemplate?.fields]
  );

  useEffect(() => {
    if (!gpsCoords) return;
    updateGpsFieldValues(gpsCoords);
  }, [gpsCoords, updateGpsFieldValues]);

  const requestCurrentGpsPosition = useCallback(async (): Promise<GpsCoordinates | null> => {
    setGpsLoading(true);
    setError(null);
    try {
      const hasPermission =
        Platform.OS === 'ios'
          ? await requestIosLocationPermission()
          : await requestAndroidLocationPermission();

      if (!hasPermission) {
        setGpsLoading(false);
        setError(t('app.taskStepPost.gpsPermissionDenied'));
        return null;
      }

      return await new Promise<GpsCoordinates | null>((resolve) => {
        Geolocation.getCurrentPosition(
          ({ coords }) => {
            const nextCoords = { lat: coords.latitude, lng: coords.longitude };
            setGpsCoords(nextCoords);
            updateGpsFieldValues(nextCoords);
            setGpsLoading(false);
            resolve(nextCoords);
          },
          (positionError: GeolocationError) => {
            setGpsLoading(false);
            const permissionDenied = positionError.code === positionError.PERMISSION_DENIED;
            setError(
              permissionDenied
                ? t('app.taskStepPost.gpsPermissionDenied')
                : t('app.taskStepPost.gpsUnavailable')
            );
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
        );
      });
    } catch {
      setGpsLoading(false);
      setError(t('app.taskStepPost.gpsUnavailable'));
      return null;
    }
  }, [t, updateGpsFieldValues]);

  useEffect(() => {
    if (!visible || !isDefect || gpsCoords || gpsLoading) return;
    requestCurrentGpsPosition().catch(() => {
        setGpsLoading(false);
        setError(t('app.taskStepPost.gpsUnavailable'));
      });
  }, [gpsCoords, gpsLoading, isDefect, requestCurrentGpsPosition, t, visible]);

  const handleViewGps = useCallback(() => {
    if (gpsCoords) {
      openGpsInMaps(gpsCoords);
      return;
    }

    requestCurrentGpsPosition()
      .then((coords) => {
        if (coords) openGpsInMaps(coords);
      })
      .catch(() => {
        setGpsLoading(false);
        setError(t('app.taskStepPost.gpsUnavailable'));
      });
  }, [gpsCoords, openGpsInMaps, requestCurrentGpsPosition, t]);

  const handleViewDefectGps = useCallback(
    (defect: DefectReadDTO) => {
      const coords = getDefectGpsCoordinates(defect);
      if (coords) {
        openGpsInMaps(coords);
        return;
      }
      Alert.alert(t('common.info'), t('app.taskStepPost.gpsCoordinatesUnavailable'));
    },
    [openGpsInMaps, t]
  );

  const openUpdateDefect = useCallback(async (defect: DefectReadDTO) => {
    // Set with list data immediately so the form opens without delay.
    setUpdatingDefect(defect);
    setUpdateDescription(typeof defect.description === 'string' ? defect.description : '');
    setUpdateStatus(typeof defect.statusCode === 'string' ? defect.statusCode : 'Open');
    setUpdateRemediation(typeof defect.remediationDetails === 'string' ? defect.remediationDetails : '');
    setUpdateFiles([]);
    setUpdateError(null);

    // Fetch full defect (with comments + files) in the background.
    setUpdateLoadingFull(true);
    try {
      const { data: full } = await getDefectById(defect.id);
      setUpdatingDefect(full);
      setUpdateDescription(typeof full.description === 'string' ? full.description : '');
      setUpdateStatus(typeof full.statusCode === 'string' ? full.statusCode : 'Open');
      setUpdateRemediation(typeof full.remediationDetails === 'string' ? full.remediationDetails : '');
    } catch {
      // Keep list data if fetch fails — form is still usable.
    } finally {
      setUpdateLoadingFull(false);
    }
  }, []);

  const closeUpdateDefect = useCallback(() => {
    setUpdatingDefect(null);
    setUpdateError(null);
  }, []);

  const addUpdateFiles = useCallback(() => {
    pickImagesWithSource(
      10,
      (picked) => setUpdateFiles((prev) => [...prev, ...picked]),
    );
  }, []);

  const submitUpdateDefect = useCallback(async () => {
    if (!updatingDefect) return;
    setUpdateSubmitting(true);
    setUpdateError(null);
    try {
      const formData = new FormData();
      const trimmedDescription = updateDescription.trim();
      formData.append('Description', trimmedDescription);
      if (trimmedDescription) {
        // Web sends update text as both Description and Comments[0].
        formData.append('Comments[0]', trimmedDescription);
      }
      formData.append('StatusCode', updateStatus);
      formData.append('RemediationDetails', updateRemediation.trim());
      formData.append('Mode', '2');

      const templateFields =
        selectedTemplate?.fields ?? (updatingDefect as { fields?: DefectFieldReadDTO[] }).fields ?? [];
      const rawFieldValues =
        ((updatingDefect as { fieldValues?: DefectFieldValueLike[] }).fieldValues ?? [])
          .concat((updatingDefect as { defectFieldsValues?: DefectFieldValueLike[] }).defectFieldsValues ?? []);

      const normalizedFields: DefectFieldReadDTO[] =
        templateFields.length > 0
          ? templateFields
          : rawFieldValues
              .filter((fieldValue) => Boolean(fieldValue.defectFieldId) && Boolean(fieldValue.name))
              .map((fieldValue) => ({
                id: fieldValue.defectFieldId!,
                name: fieldValue.name!,
                type: typeof fieldValue.type === 'number' ? fieldValue.type : 0,
                isRequired: false,
                options: null,
                defectFieldsTemplateId: selectedTemplate?.id ?? '',
              }));

      const fieldValueByFieldId = new Map<string, DefectFieldValueLike>();
      rawFieldValues.forEach((fieldValue) => {
        const fieldId = fieldValue.defectFieldId ?? fieldValue.id;
        if (fieldId) fieldValueByFieldId.set(fieldId, fieldValue);
      });

      const getFieldValue = (field: DefectFieldReadDTO): string => {
        if (isDescriptionField(field)) return trimmedDescription;
        if (isAssetField(field)) {
          const existingAssetValue = fieldValueByFieldId.get(field.id)?.value;
          return (assetName ?? updatingDefect?.assetName ?? existingAssetValue ?? '').toString();
        }
        const existing = fieldValueByFieldId.get(field.id)?.value;
        return (existing ?? '').toString();
      };

      normalizedFields.forEach((field, index) => {
        formData.append(`DefectFieldsValues[${index}].Name`, field.name);
        formData.append(`DefectFieldsValues[${index}].Type`, String(field.type ?? 0));
        formData.append(`DefectFieldsValues[${index}].Id`, field.id);
        formData.append(`DefectFieldsValues[${index}].Value`, getFieldValue(field));
        const valueId = fieldValueByFieldId.get(field.id)?.valueId;
        if (valueId != null && String(valueId).trim()) {
          formData.append(`DefectFieldsValues[${index}].ValueId`, String(valueId));
        }
      });

      updateFiles.forEach((file) => {
        formData.append('NewFiles', {
          uri: file.uri,
          name: file.name,
          type: file.type || 'image/jpeg',
        } as unknown as Blob);
      });
      const { data: updated } = await editDefect(updatingDefect.id, formData);
      const updatedDefectId = (updated as { id?: string; defectId?: string })?.id ?? null;
      const updatedBusinessId = (updated as { id?: string; defectId?: string })?.defectId ?? null;
      const currentBusinessId = (updatingDefect as { defectId?: string })?.defectId ?? null;

      // Optimistically update the current list item, then refresh from API to stay in sync.
      setDefects((prev) =>
        prev.map((defectItem) => {
          const defectItemBusinessId = (defectItem as { defectId?: string })?.defectId ?? null;
          const matches =
            defectItem.id === updatingDefect.id ||
            (updatedDefectId !== null && defectItem.id === updatedDefectId) ||
            (currentBusinessId !== null && defectItemBusinessId === currentBusinessId) ||
            (updatedBusinessId !== null && defectItemBusinessId === updatedBusinessId);
          if (!matches) return defectItem;

          return {
            ...defectItem,
            ...(updated ?? {}),
            description: trimmedDescription,
            statusCode: updateStatus,
            remediationDetails: updateRemediation.trim(),
            modifiedOnUtc: new Date().toISOString(),
          } as DefectReadDTO;
        })
      );

      await Promise.all([
        loadDefects().catch(() => {}),
        loadPosts().catch(() => {}),
      ]);
      closeUpdateDefect();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string }; status?: number } };
      const message =
        typeof err?.response?.data?.message === 'string'
          ? err.response.data.message
          : err?.response?.data
            ? String(err.response.data)
            : i18n.t('app.taskStepPost.updateDefectFail');
      setUpdateError(message);
    } finally {
      setUpdateSubmitting(false);
    }
  }, [
    updatingDefect,
    updateDescription,
    updateStatus,
    updateRemediation,
    updateFiles,
    selectedTemplate?.fields,
    selectedTemplate?.id,
    assetName,
    closeUpdateDefect,
    loadDefects,
    loadPosts,
  ]);

  const getDefectStatusLabel = useCallback(
    (statusCode?: string | null) => {
      const normalized = String(statusCode ?? '').trim().toLowerCase();
      if (normalized === 'open') return t('app.taskStepPost.statusOpen');
      if (normalized === 'closed') return t('app.taskStepPost.statusClosed');
      if (normalized === 'cancelled' || normalized === 'canceled') return t('app.taskStepPost.statusCancelled');
      return toReadableText(statusCode);
    },
    [t]
  );

  const renderCustomField = (field: DefectFieldReadDTO) => {
    const label = `${field.name}${field.isRequired ? ' *' : ''}`;
    const resolvedValue = resolveFieldValue(field);
    const valueText = valueToString(resolvedValue);

    if (field.type === DEFECT_FIELD_TYPES.Checkbox) {
      const checked = resolvedValue === true || resolvedValue === 'true';
      return (
        <TouchableOpacity
          key={field.id}
          style={styles.checkboxFieldRow}
          onPress={() =>
            setFieldValues((current) => ({
              ...current,
              [field.id]: !checked,
            }))
          }
          disabled={submitting}
        >
          <MaterialIcons
            name={checked ? 'check-box' : 'check-box-outline-blank'}
            size={20}
            color={checked ? theme.colors.primary : '#8a90a4'}
          />
          <Text style={styles.checkboxFieldText}>{label}</Text>
        </TouchableOpacity>
      );
    }

    if (field.type === DEFECT_FIELD_TYPES.List) {
      const options = parseFieldOptions(field.options);
      if (options.length > 0) {
        return (
          <View key={field.id} style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <View style={styles.optionChipsWrap}>
              {options.map((option) => {
                const selected = option === valueText;
                return (
                  <TouchableOpacity
                    key={`${field.id}-${option}`}
                    style={[styles.optionChip, selected && styles.optionChipSelected]}
                    onPress={() =>
                      setFieldValues((current) => ({
                        ...current,
                        [field.id]: option,
                      }))
                    }
                    disabled={submitting}
                  >
                    <Text style={[styles.optionChipText, selected && styles.optionChipTextSelected]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      }
    }

    if (field.type === DEFECT_FIELD_TYPES.Numerical) {
      return (
        <View key={field.id} style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <TextInput
            style={styles.fieldInput}
            value={valueText}
            onChangeText={(value) =>
              setFieldValues((current) => ({
                ...current,
                [field.id]: value,
              }))
            }
            keyboardType="decimal-pad"
            editable={!submitting}
          />
        </View>
      );
    }

    if (
      field.type === DEFECT_FIELD_TYPES.FreeText ||
      field.type === DEFECT_FIELD_TYPES.HtmlText ||
      field.type === DEFECT_FIELD_TYPES.Dictionary
    ) {
      return (
        <View key={field.id} style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <TextInput
            style={[styles.fieldInput, styles.fieldTextArea]}
            value={valueText}
            onChangeText={(value) =>
              setFieldValues((current) => ({
                ...current,
                [field.id]: value,
              }))
            }
            multiline
            numberOfLines={3}
            editable={!submitting}
          />
        </View>
      );
    }

    return (
      <View key={field.id} style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TextInput
          style={styles.fieldInput}
          value={valueText}
          onChangeText={(value) =>
            setFieldValues((current) => ({
              ...current,
              [field.id]: value,
            }))
          }
          editable={!submitting}
        />
      </View>
    );
  };

  const renderPostItem = (post: FeedItemDTO) => {
    const typeKey = (post.type ?? '').toLowerCase();
    const isDefectPost = typeKey === 'defect';
    const isStepCompletion = typeKey === 'stepcompletion';
    const isModified = !!post.modifiedOnUtc;
    const authorName = isModified ? (post.modifiedByName ?? post.createdByName) : post.createdByName;
    const dateStr = formatPostDate(post.modifiedOnUtc ?? post.createdOnUtc);
    const actionLabel = isModified ? t('app.taskStepPost.edited') : t('app.taskStepPost.created');

    const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif']);
    const imageFiles = (post.files ?? []).filter((f) => {
      if (f.thumbnailUrl) return true;
      const ext = (f.extension ?? f.name?.split('.').pop() ?? '').toLowerCase().replace('.', '');
      return IMAGE_EXTENSIONS.has(ext);
    });

    const pillStyle = isDefectPost
      ? styles.pillDefect
      : isStepCompletion
      ? styles.pillStepCompletion
      : styles.pillObservation;

    const pillTextStyle = isDefectPost
      ? styles.pillTextDefect
      : isStepCompletion
      ? styles.pillTextStepCompletion
      : styles.pillTextObservation;

    const pillLabel = isDefectPost
      ? t('app.feed.defect')
      : isStepCompletion
      ? t('app.feed.stepCompletion')
      : t('app.feed.observation');

    return (
      <View key={post.id}>
        {/* Pill badge — outside and above the card */}
        <View style={[styles.postPill, pillStyle]}>
          <View style={[styles.postPillDot, pillTextStyle && { backgroundColor: (pillTextStyle as { color?: string }).color }]} />
          <Text style={[styles.postPillText, pillTextStyle]}>{pillLabel}</Text>
        </View>

        {/* Card */}
        <View style={styles.postCard}>
          <View style={styles.postHead}>
            <MaterialIcons name="account-circle" size={36} color="#b9bdc8" />
            <View style={styles.postHeadTextWrap}>
              <Text style={styles.postAuthor}>{toReadableText(authorName)}</Text>
              <Text style={styles.postDate}>{actionLabel} {dateStr}</Text>
            </View>
          </View>

          {isDefectPost ? (
            <>
              <Text style={styles.postKindHeading}>{t('app.feed.defect')}</Text>
              {post.defectNumber ? (
                <View style={styles.postFieldBlock}>
                  <Text style={styles.postFieldLabel}>{t('app.taskStepPost.defectNumber')}</Text>
                  <Text style={styles.postFieldValue}>{post.defectNumber}</Text>
                </View>
              ) : null}
              {post.statusCode ? (
                <View style={styles.postFieldBlock}>
                  <Text style={styles.postFieldLabel}>{t('app.task.statusLabel')}</Text>
                  <Text style={styles.postFieldValue}>{getDefectStatusLabel(post.statusCode)}</Text>
                </View>
              ) : null}
              {post.description ? (
                <View style={styles.postFieldBlock}>
                  <Text style={styles.postFieldLabel}>{t('app.taskStepPost.defectDescription')}</Text>
                  <Text style={styles.postFieldValue}>{post.description}</Text>
                </View>
              ) : null}
              {post.assetName ? (
                <View style={styles.postFieldBlock}>
                  <Text style={styles.postFieldLabel}>{t('app.taskStepPost.assetName')}</Text>
                  <Text style={styles.postFieldValue}>{post.assetName}</Text>
                </View>
              ) : null}
              {post.remediationDetails ? (
                <View style={styles.postFieldBlock}>
                  <Text style={styles.postFieldLabel}>{t('app.feed.remediationDetails')}</Text>
                  <Text style={styles.postFieldValue}>{post.remediationDetails}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.postKindHeading}>
                {isStepCompletion ? t('app.feed.stepCompletion') : t('app.feed.observation')}
              </Text>
              {post.description ? (
                <Text style={styles.postObservationText}>{post.description}</Text>
              ) : null}
            </>
          )}

          {imageFiles.length > 0 ? (
            <View style={styles.postImagesRow}>
              {imageFiles.map((f, i) => (
                <Image
                  key={`${post.id}-img-${i}`}
                  source={{ uri: f.thumbnailUrl ?? f.url }}
                  style={styles.postThumbnail}
                  resizeMode="cover"
                />
              ))}
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const renderDefectItem = (defect: DefectReadDTO) => {
    const isExpanded = expandedDefectId === defect.id;
    const isUpdating = updatingDefect?.id === defect.id;
    const showUpdateInHeader = canCreateDefect;
    const defectRemediationDetails =
      typeof defect.remediationDetails === 'string' ? defect.remediationDetails : '';
    const defectGpsCoords = getDefectGpsCoordinates(defect);
    const modifiedOrCreatedOnUtc =
      (typeof defect.modifiedOnUtc === 'string' ? defect.modifiedOnUtc : null) ?? defect.createdOnUtc;

    return (
      <View key={defect.id} style={styles.defectAccordionItem}>
        {/* Accordion header row */}
        <TouchableOpacity
          style={styles.defectAccordionHeader}
          onPress={() => setExpandedDefectId(isExpanded ? null : defect.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.defectAccordionTitle} numberOfLines={1} ellipsizeMode="tail">
            {toReadableText(defect.description)}
          </Text>
          {showUpdateInHeader ? (
            <TouchableOpacity
              style={styles.defectUpdateButton}
              onPress={() => {
                setExpandedDefectId(defect.id);
                openUpdateDefect(defect).catch(() => {});
              }}
            >
              <Text style={styles.defectUpdateButtonText}>{t('app.taskStepPost.update')}</Text>
            </TouchableOpacity>
          ) : null}
          <MaterialIcons
            name={isExpanded ? 'expand-less' : 'expand-more'}
            size={22}
            color="#5a6074"
          />
        </TouchableOpacity>

        {/* Expanded body */}
        {isExpanded ? (
          <View style={styles.defectAccordionBody}>
            {isUpdating ? (
              /* ── Update form ── */
              <View>
                {/* Latest editor row */}
                <View style={styles.postHead}>
                  <MaterialIcons name="account-circle" size={30} color="#b9bdc8" />
                  <View style={styles.postHeadTextWrap}>
                    <Text style={styles.postAuthor}>
                      {toReadableText(defect.modifiedByName ?? defect.createdByName)}
                    </Text>
                    <Text style={styles.postDate}>
                      {`${t('app.taskStepPost.edited')} ${formatRelativeTime(modifiedOrCreatedOnUtc)}`}
                    </Text>
                  </View>
                </View>

                {updateLoadingFull ? (
                  <View style={styles.loaderWrap}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  </View>
                ) : null}

                {/* New description input (at top, like web) */}
                <View style={styles.descriptionInputWrap}>
                  <TextInput
                    style={styles.descriptionInput}
                    value={updateDescription}
                    onChangeText={setUpdateDescription}
                    multiline
                    numberOfLines={4}
                    editable={!updateSubmitting}
                    placeholder={t('app.taskStepPost.addDescription')}
                    placeholderTextColor="#9da2b2"
                  />
                  {updateDescription.trim() ? (
                    <TouchableOpacity
                      style={styles.clearDescriptionButton}
                      onPress={() => setUpdateDescription('')}
                      disabled={updateSubmitting}
                    >
                      <MaterialIcons name="close" size={16} color="#5a5e69" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Description history */}
                {((defect.comments ?? []) as DefectCommentDTO[]).length > 0 ? (
                  <View style={styles.commentsSection}>
                    <Text style={styles.updateSectionLabel}>{t('app.taskStepPost.descriptions')}</Text>
                    {((defect.comments ?? []) as DefectCommentDTO[])
                      .slice()
                      .sort((a, b) => new Date(b.createdOnUtc).getTime() - new Date(a.createdOnUtc).getTime())
                      .map((comment) => (
                        <View key={comment.id} style={styles.commentRow}>
                          <MaterialIcons name="account-circle" size={28} color="#b9bdc8" />
                          <View style={styles.commentBody}>
                            <View style={styles.commentMeta}>
                              <Text style={styles.commentAuthor}>
                                {comment.createdByUser?.fullName ?? comment.createdByName}
                              </Text>
                              <Text style={styles.commentTime}>
                                {formatRelativeTime(comment.createdOnUtc)}
                              </Text>
                            </View>
                            <Text style={styles.commentText}>{comment.text}</Text>
                          </View>
                        </View>
                      ))}
                  </View>
                ) : null}

                {/* Status row */}
                <View style={styles.updateStatusRow}>
                  <Text style={styles.updateStatusLabel}>{t('app.task.statusLabel')}</Text>
                  <View style={styles.statusChipsRow}>
                    {([
                      { value: 'Open', label: t('app.taskStepPost.statusOpen') },
                      { value: 'Closed', label: t('app.taskStepPost.statusClosed') },
                      { value: 'Cancelled', label: t('app.taskStepPost.statusCancelled') },
                    ] as const).map((statusOption) => (
                      <TouchableOpacity
                        key={statusOption.value}
                        style={[
                          styles.statusChip,
                          updateStatus === statusOption.value && styles.statusChipActive,
                        ]}
                        onPress={() => setUpdateStatus(statusOption.value)}
                        disabled={updateSubmitting}
                      >
                        <Text
                          style={[
                            styles.statusChipText,
                            updateStatus === statusOption.value && styles.statusChipTextActive,
                          ]}
                        >
                          {statusOption.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Asset name (read-only) */}
                <View style={styles.readOnlyField}>
                  <Text style={styles.readOnlyLabel}>{t('app.taskStepPost.assetName')}</Text>
                  <Text style={styles.readOnlyValue}>{assetName ?? defect.assetName ?? '-'}</Text>
                </View>

                {/* GPS */}
                <View style={styles.readOnlyFieldRow}>
                  <Text style={styles.readOnlyLabel}>{t('app.taskStepPost.gpsPosition')}</Text>
                  {defectGpsCoords ? (
                    <Text style={styles.readOnlyAutoText}>
                      {`${defectGpsCoords.lat.toFixed(5)}, ${defectGpsCoords.lng.toFixed(5)}`}
                    </Text>
                  ) : (
                    <Text style={styles.readOnlyAutoText}>{t('app.taskStepPost.auto')}</Text>
                  )}
                  <TouchableOpacity
                    style={styles.readOnlyLinkButton}
                    onPress={() => handleViewDefectGps(defect)}
                  >
                    <Text style={styles.readOnlyLinkText}>{t('app.common.view')}</Text>
                  </TouchableOpacity>
                </View>

                {/* Remediation details */}
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>{t('app.feed.remediationDetails')}</Text>
                  <TextInput
                    style={[styles.fieldInput, styles.fieldTextArea]}
                    value={updateRemediation}
                    onChangeText={setUpdateRemediation}
                    multiline
                    numberOfLines={3}
                    editable={!updateSubmitting}
                  />
                </View>

                {/* Existing defect images */}
                {(defect.files ?? []).length > 0 ? (
                  <View style={styles.filesList}>
                    {(defect.files ?? []).map((file, i) =>
                      file.thumbnailUrl ?? file.url ? (
                        <View key={`existing-${i}`} style={styles.imagePreviewWrap}>
                          <Image
                            source={{ uri: file.thumbnailUrl ?? file.url }}
                            style={styles.imagePreview}
                            resizeMode="cover"
                          />
                        </View>
                      ) : null
                    )}
                  </View>
                ) : null}

                {/* New image upload */}
                <TouchableOpacity
                  style={[styles.uploadArea, styles.uploadAreaUpdate]}
                  onPress={addUpdateFiles}
                  disabled={updateSubmitting}
                >
                  <MaterialIcons name="add-photo-alternate" size={27} color="#595959" />
                </TouchableOpacity>

                {updateFiles.length > 0 ? (
                  <View style={styles.filesList}>
                    {updateFiles.map((file) =>
                      isImageFile(file) ? (
                        <View key={`${file.uri}-${file.name}`} style={styles.imagePreviewWrap}>
                          <Image source={{ uri: file.uri }} style={styles.imagePreview} resizeMode="cover" />
                          <TouchableOpacity
                            style={styles.imageRemoveButton}
                            onPress={() => setUpdateFiles((prev) => prev.filter((f) => f !== file))}
                            disabled={updateSubmitting}
                          >
                            <MaterialIcons name="close" size={16} color="#ffffff" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View key={`${file.uri}-${file.name}`} style={styles.fileRow}>
                          <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                          <TouchableOpacity
                            onPress={() => setUpdateFiles((prev) => prev.filter((f) => f !== file))}
                            disabled={updateSubmitting}
                          >
                            <MaterialIcons name="close" size={16} color="#696f7f" />
                          </TouchableOpacity>
                        </View>
                      )
                    )}
                  </View>
                ) : null}

                {updateError ? <Text style={styles.errorText}>{updateError}</Text> : null}

                <View style={[styles.actionButtons, styles.actionButtonsUpdate]}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={closeUpdateDefect}
                    disabled={updateSubmitting}
                  >
                    <Text style={styles.cancelButtonText}>{t('app.modal.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.postButton, updateSubmitting && styles.buttonDisabled]}
                    onPress={() => { submitUpdateDefect().catch(() => {}); }}
                    disabled={updateSubmitting}
                  >
                    {updateSubmitting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.postButtonText}>{t('app.common.save')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* ── Read-only expanded view (match web: creator, Defect heading, label-value fields, image) ── */
              <View>
                <View style={styles.postHead}>
                  <MaterialIcons name="account-circle" size={30} color="#b9bdc8" />
                  <View style={styles.postHeadTextWrap}>
                    <Text style={styles.postAuthor}>{toReadableText(defect.createdByName)}</Text>
                    <Text style={styles.postDate}>
                      {defect.modifiedOnUtc
                        ? `${t('app.taskStepPost.edited')} ${formatRelativeTime(defect.modifiedOnUtc)}`
                        : `${t('app.taskStepPost.created')} ${formatRelativeTime(defect.createdOnUtc)}`}
                    </Text>
                  </View>
                </View>
                <Text style={styles.defectBodyHeading}>{t('app.feed.defect')}</Text>
                <View style={styles.defectFieldRow}>
                  <Text style={styles.defectFieldLabel}>{t('app.taskStepPost.defectNumber')}</Text>
                  <Text style={styles.defectFieldValue}>{toReadableText(defect.defectNumber)}</Text>
                </View>
                <View style={styles.defectFieldRow}>
                  <Text style={styles.defectFieldLabel}>{t('app.task.statusLabel')}</Text>
                  <Text style={styles.defectFieldValue}>{getDefectStatusLabel(defect.statusCode)}</Text>
                </View>
                <View style={styles.defectFieldRow}>
                  <Text style={styles.defectFieldLabel}>{t('app.taskStepPost.defectDescription')}</Text>
                  <Text style={styles.defectFieldValue}>{toReadableText(defect.description)}</Text>
                </View>
                <View style={styles.defectFieldRow}>
                  <Text style={styles.defectFieldLabel}>{t('app.taskStepPost.assetName')}</Text>
                  <Text style={styles.defectFieldValue}>{toReadableText(assetName ?? defect.assetName)}</Text>
                </View>
                <View style={styles.defectFieldRow}>
                  <Text style={styles.defectFieldLabel}>{t('app.feed.remediationDetails')}</Text>
                  <Text style={styles.defectFieldValue}>{toReadableText(defectRemediationDetails)}</Text>
                </View>
                {(defect.files ?? []).length > 0 ? (
                  <View style={styles.defectImagesWrap}>
                    {(defect.files ?? []).map((file, i) =>
                      file.thumbnailUrl ?? file.url ? (
                        <Image
                          key={`ro-${i}`}
                          source={{ uri: file.thumbnailUrl ?? file.url }}
                          style={styles.defectBodyImage}
                          resizeMode="cover"
                        />
                      ) : null
                    )}
                  </View>
                ) : null}
              </View>
            )}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={closeModal}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropPressArea} onPress={closeModal} activeOpacity={1} />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('app.taskStepPost.postsTitle')}</Text>
            <TouchableOpacity onPress={closeModal} disabled={submitting}>
              <MaterialIcons name="close" size={24} color="#2f3444" />
            </TouchableOpacity>
          </View>

          {canCreateDefect ? (
            <View style={styles.tabsRow}>
              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'posts' && styles.tabItemActive]}
                onPress={() => setActiveTab('posts')}
              >
                <Text
                  style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {t('app.taskStepPost.postsTab')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'defects' && styles.tabItemActive]}
                onPress={() => setActiveTab('defects')}
              >
                <Text
                  style={[styles.tabText, activeTab === 'defects' && styles.tabTextActive]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {t('app.taskStepPost.viewDefectsTab', {
                    asset: assetName ?? t('app.taskStepPost.assetFallback'),
                  })}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {activeTab === 'posts' ? (
              <View style={styles.createCard}>
                <View style={styles.descriptionHeader}>
                  <Text style={styles.descriptionLabel}>{t('app.tasksScreen.description')}</Text>
                  {canCreateDefect ? (
                    <TouchableOpacity
                      style={styles.inlineCheckboxRow}
                      onPress={() => setIsDefect((current) => !current)}
                      disabled={submitting}
                    >
                      <MaterialIcons
                        name={isDefect ? 'check-box' : 'check-box-outline-blank'}
                        size={18}
                        color={isDefect ? theme.colors.primary : '#9da2b2'}
                      />
                      <Text style={styles.inlineCheckboxText}>{t('app.taskStepPost.isDefectToggle')}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.descriptionInputWrap}>
                  <TextInput
                    style={styles.descriptionInput}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                    editable={!submitting}
                  />
                  {description.trim() ? (
                    <TouchableOpacity
                      style={styles.clearDescriptionButton}
                      onPress={() => setDescription('')}
                      disabled={submitting}
                    >
                      <MaterialIcons name="close" size={16} color="#5a5e69" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {isDefect ? (
                  <>
                    <View style={styles.readOnlyField}>
                      <Text style={styles.readOnlyLabel}>{t('app.taskStepPost.assetName')}</Text>
                      <Text style={styles.readOnlyValue}>{assetName ?? '-'}</Text>
                    </View>
                    <View style={styles.readOnlyFieldRow}>
                      <Text style={styles.readOnlyLabel}>{t('app.taskStepPost.gpsPosition')}</Text>
                      {gpsCoords ? (
                        <Text style={styles.readOnlyAutoText}>
                          {`${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)}`}
                        </Text>
                      ) : (
                        <Text style={styles.readOnlyAutoText}>{t('app.taskStepPost.auto')}</Text>
                      )}
                      <TouchableOpacity
                        style={styles.readOnlyLinkButton}
                        onPress={handleViewGps}
                        disabled={gpsLoading}
                      >
                        {gpsLoading ? (
                          <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                          <Text style={styles.readOnlyLinkText}>
                            {gpsCoords ? t('app.taskStepPost.changePin') : t('app.common.view')}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                    <View style={styles.fieldBlock}>
                      <Text style={styles.fieldLabel}>{t('app.feed.remediationDetails')}</Text>
                      <TextInput
                        style={[styles.fieldInput, styles.fieldTextArea]}
                        value={remediationDetails}
                        onChangeText={setRemediationDetails}
                        multiline
                        numberOfLines={3}
                        editable={!submitting}
                      />
                    </View>
                    {templateLoading ? (
                      <View style={styles.loaderWrap}>
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                      </View>
                    ) : (
                      additionalFields.map((field) => renderCustomField(field))
                    )}
                  </>
                ) : null}

                <TouchableOpacity
                  style={styles.uploadArea}
                  onPress={() => {
                    addFiles();
                  }}
                  disabled={submitting}
                >
                  <MaterialIcons name="add-photo-alternate" size={27} color="#595959" />
                </TouchableOpacity>

                {files.length > 0 ? (
                  <View style={styles.filesList}>
                    {files.map((file) =>
                      isImageFile(file) ? (
                        <View key={`${file.uri}-${file.name}`} style={styles.imagePreviewWrap}>
                          <Image
                            source={{ uri: file.uri }}
                            style={styles.imagePreview}
                            resizeMode="cover"
                          />
                          <TouchableOpacity
                            style={styles.imageRemoveButton}
                            onPress={() => removeFile(file)}
                            disabled={submitting}
                          >
                            <MaterialIcons name="close" size={16} color="#ffffff" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View key={`${file.uri}-${file.name}`} style={styles.fileRow}>
                          <Text style={styles.fileName} numberOfLines={1}>
                            {file.name}
                          </Text>
                          <TouchableOpacity onPress={() => removeFile(file)} disabled={submitting}>
                            <MaterialIcons name="close" size={16} color="#696f7f" />
                          </TouchableOpacity>
                        </View>
                      )
                    )}
                  </View>
                ) : null}

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={resetComposer} disabled={submitting}>
                    <Text style={styles.cancelButtonText}>{t('app.modal.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.postButton, submitting && styles.buttonDisabled]}
                    onPress={submit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.postButtonText}>{t('app.taskDetail.stepPost')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            <View style={styles.postsContainer}>
              {activeTab === 'defects' ? (
                defectsLoading ? (
                  <View style={styles.loaderWrap}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  </View>
                ) : defectsError ? (
                  <Text style={styles.errorText}>{defectsError}</Text>
                ) : defects.length === 0 ? (
                  <Text style={styles.emptyText}>{t('app.taskStepPost.noDefects')}</Text>
                ) : (
                  <View style={styles.defectsAccordionWrap}>
                    {defects.map((defect) => renderDefectItem(defect))}
                  </View>
                )
              ) : postsLoading ? (
                <View style={styles.loaderWrap}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
              ) : postsError ? (
                <Text style={styles.errorText}>{postsError}</Text>
              ) : mainPosts.length === 0 && otherPosts.length === 0 ? (
                <Text style={styles.emptyText}>{t('app.taskStepPost.noPosts')}</Text>
              ) : (
                <>
                  {mainPosts.map((post) => renderPostItem(post))}
                  {otherPosts.length > 0 ? (
                    <>
                      <Text style={styles.otherPostsHeading}>{t('app.taskStepPost.otherPosts')}</Text>
                      {otherPosts.map((post) => renderPostItem(post))}
                    </>
                  ) : null}
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  backdropPressArea: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    height: '85%',
    maxHeight: '92%',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#d5dae8',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 31,
    fontWeight: '600',
    color: '#242832',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 2,
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  tabItem: {
    flex: 1,
    minHeight: 42,
    backgroundColor: '#edf1fa',
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabItemActive: {
    backgroundColor: '#ffffff',
    borderTopWidth: 2,
    borderTopColor: '#2f3fb0',
  },
  tabText: {
    color: '#6d7390',
    fontSize: 15,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#2f3fb0',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  createCard: {
    borderWidth: 1,
    borderColor: '#d6deee',
    borderRadius: 4,
    backgroundColor: '#ffffff',
    padding: 10,
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  descriptionLabel: {
    color: '#2a2f3d',
    fontSize: 14,
    fontWeight: '500',
  },
  inlineCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineCheckboxText: {
    color: '#2c303d',
    fontSize: 13,
  },
  descriptionInputWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  descriptionInput: {
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#e2e5ee',
    backgroundColor: '#ecf0fa',
    color: '#1d2230',
    minHeight: 90,
    paddingHorizontal: 10,
    paddingTop: 10,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  clearDescriptionButton: {
    position: 'absolute',
    right: 8,
    top: 8,
  },
  readOnlyField: {
    marginBottom: 8,
  },
  readOnlyFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  readOnlyLabel: {
    color: '#303544',
    fontSize: 13,
    marginBottom: 2,
  },
  readOnlyValue: {
    color: '#1f2231',
    fontSize: 15,
    paddingBottom: 4,
  },
  readOnlyAutoText: {
    color: '#4f576a',
    fontSize: 13,
  },
  readOnlyLinkButton: {
    paddingHorizontal: 2,
  },
  readOnlyLinkText: {
    color: '#2f5cca',
    fontSize: 13,
  },
  fieldBlock: {
    marginBottom: 10,
  },
  fieldLabel: {
    color: '#2c303d',
    fontSize: 13,
    marginBottom: 6,
  },
  fieldInput: {
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#e2e5ee',
    backgroundColor: '#ecf0fa',
    minHeight: 42,
    paddingHorizontal: 10,
    color: '#202635',
    fontSize: 15,
  },
  fieldTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  checkboxFieldRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  checkboxFieldText: {
    color: '#2c303d',
    fontSize: 17,
  },
  optionChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  optionChip: {
    minHeight: 32,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#bec7dc',
    backgroundColor: '#f6f8fd',
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionChipSelected: {
    backgroundColor: '#2f3fb0',
    borderColor: '#2f3fb0',
  },
  optionChipText: {
    color: '#2c3550',
    fontSize: 14,
  },
  optionChipTextSelected: {
    color: '#ffffff',
  },
  uploadArea: {
    minHeight: 76,
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#b8becd',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  uploadAreaUpdate: {
    marginTop: 8,
  },
  filesList: {
    marginTop: 8,
    gap: 6,
  },
  imagePreviewWrap: {
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 4,
  },
  imageRemoveButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileRow: {
    minHeight: 34,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e5ee',
    borderRadius: 4,
    backgroundColor: '#f9fbff',
  },
  fileName: {
    flex: 1,
    color: '#2f3446',
    fontSize: 13,
    paddingRight: 8,
  },
  errorText: {
    marginTop: 8,
    color: '#cc3737',
    fontSize: 13,
  },
  actionButtons: {
    marginTop: 10,
    gap: 8,
  },
  actionButtonsUpdate: {
    marginTop: 14,
  },
  cancelButton: {
    minHeight: 40,
    borderRadius: 3,
    backgroundColor: '#7380a2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  postButton: {
    minHeight: 40,
    borderRadius: 3,
    backgroundColor: '#243aa8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  postsContainer: {
    marginTop: 12,
    gap: 12,
  },
  defectsAccordionWrap: {
    marginTop: 0,
  },
  emptyText: {
    color: '#6e7790',
    fontSize: 16,
  },
  loaderWrap: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postItemBlock: {
    gap: 8,
  },
  postKind: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  postKindDefect: {
    color: '#d84747',
  },
  postKindObservation: {
    color: '#0ca356',
  },
  postCard: {
    borderWidth: 1,
    borderColor: '#d7deed',
    borderRadius: 4,
    backgroundColor: '#ffffff',
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  postHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  postHeadTextWrap: {
    flex: 1,
  },
  postAuthor: {
    color: '#242933',
    fontSize: 15,
    fontWeight: '700',
  },
  postDate: {
    color: '#4c5265',
    fontSize: 12,
  },
  postLabel: {
    color: '#2b2f3b',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  defectMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  defectMetaText: {
    color: '#4c5369',
    fontSize: 13,
  },
  postText: {
    color: '#171b27',
    fontSize: 14,
    marginBottom: 8,
  },
  postPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 6,
    gap: 5,
  },
  pillDefect: {
    backgroundColor: '#fef3f2',
  },
  pillObservation: {
    backgroundColor: 'rgba(251,188,11,0.15)',
  },
  pillStepCompletion: {
    backgroundColor: '#eafaf3',
  },
  postPillDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  postPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  pillTextDefect: {
    color: '#b42318',
  },
  pillTextObservation: {
    color: '#c99400',
  },
  pillTextStepCompletion: {
    color: '#0ca356',
  },
  postKindHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1e2a',
    marginBottom: 10,
  },
  postObservationText: {
    fontSize: 14,
    color: '#1a1e2b',
    marginBottom: 4,
  },
  otherPostsHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1e2a',
    textAlign: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  postFieldBlock: {
    marginBottom: 8,
  },
  postFieldLabel: {
    fontSize: 12,
    color: '#8a90a4',
    marginBottom: 2,
  },
  postFieldValue: {
    fontSize: 14,
    color: '#1a1e2b',
  },
  postImagesRow: {
    marginTop: 10,
    gap: 6,
  },
  postThumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 4,
  },
  defectAccordionItem: {
    borderWidth: 1,
    borderColor: '#dde2ef',
    borderRadius: 4,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    marginBottom: 8,
  },
  defectAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#eef0f7',
  },
  defectAccordionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2233',
  },
  defectUpdateButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
  },
  defectUpdateButtonText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  defectAccordionBody: {
    borderTopWidth: 1,
    borderTopColor: '#eaecf5',
    padding: 15,
    backgroundColor: '#ffffff',
  },
  defectBodyHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2233',
    marginBottom: 10,
  },
  defectFieldRow: {
    marginBottom: 10,
  },
  defectFieldLabel: {
    fontSize: 14,
    color: '#959292',
    marginBottom: 2,
  },
  defectFieldValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  defectImagesWrap: {
    marginTop: 12,
    gap: 8,
  },
  defectBodyImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 4,
  },
  commentsSection: {
    marginBottom: 12,
  },
  updateSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2b2f3b',
    marginBottom: 8,
  },
  commentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  commentBody: {
    flex: 1,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2233',
  },
  commentTime: {
    fontSize: 12,
    color: '#8a90a4',
  },
  commentText: {
    fontSize: 13,
    color: '#2a2f3d',
    lineHeight: 18,
  },
  updateStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  updateStatusLabel: {
    fontSize: 13,
    color: '#303544',
    minWidth: 44,
  },
  statusChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#bec7dc',
    backgroundColor: '#f5f7fd',
  },
  statusChipActive: {
    backgroundColor: '#2f3fb0',
    borderColor: '#2f3fb0',
  },
  statusChipText: {
    fontSize: 13,
    color: '#2c3550',
  },
  statusChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
