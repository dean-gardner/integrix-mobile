import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Linking,
  InteractionManager,
  Image,
} from 'react-native';
import { launchCamera, launchImageLibrary, type Asset as ImagePickerAsset } from 'react-native-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import { useRoute, RouteProp } from '@react-navigation/native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import NetInfo from '@react-native-community/netinfo';
import type { AppDispatch, RootState } from '../store';
import {
  fetchTaskById,
  clearCurrentTask,
  changeCurrentTaskStatus,
  shareCurrentTaskWithUser,
  unshareCurrentTaskWithUser,
  editTaskEntry,
} from '../store/tasksSlice';
import { changeTaskStepStatus, getTaskSectionsWithTaskSteps } from '../api/tasks';
import { createDefect as apiCreateDefect, getTaskStepDefects } from '../api/defects';
import { createObservation as apiCreateObservation } from '../api/observations';
import { getUsersBySearch } from '../api/users';
import { getTaskPosts } from '../api/feed';
import type {
  TaskReadDTO,
  TaskSectionWithStepsDTO,
  TaskFileDTO,
  TaskStepReadDTO,
} from '../types/task';
import type { DefectFilteringModel, DefectReadDTO } from '../types/defect';
import type { FeedItemDTO, FilteringModel } from '../types/feed';
import type { FoundUserDTO } from '../types/user';
import { UserPickerModal } from '../components/UserPickerModal';
import { screenStyles } from '../styles/screenStyles';
import { theme } from '../theme';
import { config } from '../config';
import { getToken } from '../storage/tokenStorage';
import {
  getCachedTaskSections,
  isTaskAvailableOffline,
  markTaskAvailableOffline,
  setCachedTaskSections,
  setCachedTaskStepDefects,
  setCachedTaskStepPosts,
} from '../storage/taskOfflineCache';
import {
  formatDateTime,
  getElapsedTime,
  getTaskStatusAction,
  getTaskStatusLabel,
  parseVerificationStatus,
  verificationStatusToApiString,
  TASK_STATUS_CANCELLED,
  TASK_STATUS_COMPLETE,
  TASK_STEP_COMPLETED_WITH_RECORD,
  TASK_STEP_NOT_COMPLETED,
} from '../config/taskDetail';
import { TaskStepCard } from '../components/taskDetail/TaskStepCard';
import { TaskStepPostModal, type TaskStepPostPayload } from '../components/taskDetail/TaskStepPostModal';

type TaskDetailParams = { task: TaskReadDTO; taskStepId?: string | null; scrollToSteps?: boolean };

const OFFLINE_POSTS_FILTER_MODEL: FilteringModel = {
  pageNumber: 0,
  pageSize: 20,
};

const OFFLINE_DEFECTS_FILTER_MODEL: DefectFilteringModel = {
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

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif']);

type CompletionPhotoFile = {
  uri: string;
  type: string;
  name: string;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function mapCompletionAsset(asset: ImagePickerAsset): CompletionPhotoFile | null {
  if (!asset.uri) return null;
  const extension = asset.type?.split('/')[1] ?? 'jpg';
  return {
    uri: asset.uri,
    type: asset.type ?? 'image/jpeg',
    name: asset.fileName?.trim() || `completion-${Date.now()}-${Math.random()}.${extension}`,
  };
}

function toAbsoluteUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) {
    return `${config.apiUrl}${url.slice(1)}`;
  }
  return `${config.apiUrl}${url}`;
}

function getFileExtensionFromUrl(url: string): string {
  const cleanUrl = url.split('?')[0].split('#')[0];
  const parts = cleanUrl.split('.');
  return parts.length > 1 ? (parts[parts.length - 1] ?? '').toLowerCase() : '';
}

function isImageUrl(url: string): boolean {
  const ext = getFileExtensionFromUrl(url);
  return IMAGE_EXTENSIONS.has(ext);
}

function collectTaskFileUrls(files: TaskFileDTO[]): string[] {
  return files
    .map((file) => toAbsoluteUrl((typeof file.url === 'string' ? file.url : null) ?? null))
    .filter((url): url is string => Boolean(url));
}

function collectPostUrls(posts: FeedItemDTO[]): string[] {
  const urls = new Set<string>();
  posts.forEach((post) => {
    const avatarUrl = toAbsoluteUrl(
      typeof post.createdByPhotoUrl === 'string' ? post.createdByPhotoUrl : null
    );
    if (avatarUrl) urls.add(avatarUrl);
    const files = Array.isArray(post.files) ? post.files : [];
    files.forEach((file) => {
      const fileUrl = toAbsoluteUrl(typeof file.url === 'string' ? file.url : null);
      if (fileUrl) urls.add(fileUrl);
      const thumbnailUrl = toAbsoluteUrl(
        typeof file.thumbnailUrl === 'string' ? file.thumbnailUrl : null
      );
      if (thumbnailUrl) urls.add(thumbnailUrl);
    });
  });
  return Array.from(urls);
}

function collectDefectUrls(defects: DefectReadDTO[]): string[] {
  const urls = new Set<string>();
  defects.forEach((defect) => {
    const avatarUrl = toAbsoluteUrl(
      typeof defect.createdByPhotoUrl === 'string' ? defect.createdByPhotoUrl : null
    );
    if (avatarUrl) urls.add(avatarUrl);
    const files = Array.isArray(defect.files) ? defect.files : [];
    files.forEach((file) => {
      const fileUrl = toAbsoluteUrl(typeof file.url === 'string' ? file.url : null);
      if (fileUrl) urls.add(fileUrl);
      const thumbnailUrl = toAbsoluteUrl(
        typeof file.thumbnailUrl === 'string' ? file.thumbnailUrl : null
      );
      if (thumbnailUrl) urls.add(thumbnailUrl);
    });
  });
  return Array.from(urls);
}

async function warmUrl(url: string, token: string | null): Promise<void> {
  if (!url) return;

  if (isImageUrl(url)) {
    const prefetched = await Image.prefetch(url).catch(() => false);
    if (prefetched) return;
  }

  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  await fetch(url, { method: 'GET', headers }).catch(() => {});
}

export default function TaskDetailScreen() {
  const route = useRoute<RouteProp<{ params: TaskDetailParams }, 'params'>>();
  const dispatch = useDispatch<AppDispatch>();
  const scrollRef = useRef<ScrollView>(null);
  const stepLayoutMap = useRef<Record<string, number>>({});
  const targetStepId = route.params?.taskStepId ?? null;
  const scrollToSteps = route.params?.scrollToSteps ?? !targetStepId;
  const { currentTask, currentTaskLoading, isActionLoading } = useSelector(
    (s: RootState) => s.tasks
  );
  const routeTask = route.params?.task;
  const task = currentTask?.id === routeTask?.id ? currentTask : routeTask;

  const [pickerVisible, setPickerVisible] = useState(false);
  const [shareQuery, setShareQuery] = useState('');
  const [shareSearchResults, setShareSearchResults] = useState<FoundUserDTO[]>([]);
  const [shareSearchLoading, setShareSearchLoading] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [workOrderNumber, setWorkOrderNumber] = useState('');
  const [notificationNumber, setNotificationNumber] = useState('');
  const [projectNumber, setProjectNumber] = useState('');
  const [assetId, setAssetId] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [sections, setSections] = useState<TaskSectionWithStepsDTO[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
  const [stepStatuses, setStepStatuses] = useState<Record<string, number | null>>({});
  const [statusUpdatingStepId, setStatusUpdatingStepId] = useState<string | null>(null);
  const [statusUpdatingAction, setStatusUpdatingAction] = useState<'skip' | 'done' | null>(null);
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [postTaskStep, setPostTaskStep] = useState<TaskStepReadDTO | null>(null);
  const [doneConfirmVisible, setDoneConfirmVisible] = useState(false);
  const [doneConfirmTaskStep, setDoneConfirmTaskStep] = useState<TaskStepReadDTO | null>(null);
  const [doneConfirmDescription, setDoneConfirmDescription] = useState('');
  const [doneConfirmFiles, setDoneConfirmFiles] = useState<CompletionPhotoFile[]>([]);
  const [doneConfirmError, setDoneConfirmError] = useState<string | null>(null);
  const [doneConfirmSubmitting, setDoneConfirmSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isPreparingOfflineData, setIsPreparingOfflineData] = useState(false);
  const [isOfflineReady, setIsOfflineReady] = useState(false);

  const fetchSections = useCallback(async (taskId: string) => {
    const res = await getTaskSectionsWithTaskSteps(taskId);
    return (res.data ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
  }, []);

  const allTaskStepIds = useMemo(
    () => sections.flatMap((section) => section.taskSteps.map((taskStep) => taskStep.id)),
    [sections]
  );

  useEffect(() => {
    if (routeTask?.versionId && routeTask?.id) {
      dispatch(fetchTaskById({ versionId: routeTask.versionId, taskId: routeTask.id }));
    }
    return () => {
      dispatch(clearCurrentTask());
    };
  }, [dispatch, routeTask?.id, routeTask?.versionId]);

  const resolveSectionToExpand = useCallback(
    (ordered: TaskSectionWithStepsDTO[]): string | null => {
      if (targetStepId) {
        const containing = ordered.find((s) =>
          s.taskSteps.some((step) => step.id === targetStepId)
        );
        if (containing) return containing.id;
      }
      return ordered[0]?.id ?? null;
    },
    [targetStepId]
  );

  useEffect(() => {
    let cancelled = false;
    const loadSections = async () => {
      if (!task?.id) return;
      setSectionsLoading(true);
      setExpandedSectionId(null);
      try {
        const ordered = await fetchSections(task.id);
        if (cancelled) return;
        setSections(ordered);
        setExpandedSectionId(resolveSectionToExpand(ordered));
        await setCachedTaskSections(task.id, ordered);
      } catch {
        const cachedSections = await getCachedTaskSections(task.id);
        if (cancelled) return;
        if (cachedSections.length > 0) {
          setSections(cachedSections);
          setExpandedSectionId(resolveSectionToExpand(cachedSections));
        } else {
          setSections([]);
          setExpandedSectionId(null);
        }
      } finally {
        if (!cancelled) {
          setSectionsLoading(false);
        }
      }
    };

    loadSections().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fetchSections, resolveSectionToExpand, task?.id]);

  useEffect(() => {
    const initialMap: Record<string, number | null> = {};
    sections.forEach((section) => {
      section.taskSteps.forEach((taskStep) => {
        initialMap[taskStep.id] = null;
      });
    });
    const taskStepVerifications = Array.isArray(task?.taskStepsVerifications)
      ? task.taskStepsVerifications
      : [];
    taskStepVerifications.forEach((verification) => {
      if (!verification.taskStepId) return;
      if (!(verification.taskStepId in initialMap)) return;
      initialMap[verification.taskStepId] = parseVerificationStatus(verification.verificationStatusCode);
    });
    setStepStatuses(initialMap);
  }, [sections, task?.taskStepsVerifications]);

  useEffect(() => {
    if (!targetStepId || sectionsLoading) return;

    // Poll until stepLayoutMap has the step's Y (populated by onLayout after render).
    const interval = setInterval(() => {
      const stepY = stepLayoutMap.current[targetStepId];
      if (stepY !== undefined) {
        clearInterval(interval);
        // stepY is relative to taskStepsPanel, which is inside panel.
        // Add panelOffsetY + taskStepsOffsetInPanel to get absolute scroll Y.
        const base = (panelOffsetY ?? 0) + (taskStepsOffsetInPanel ?? 0);
        InteractionManager.runAfterInteractions(() => {
          scrollRef.current?.scrollTo({ y: Math.max(0, base + stepY - 60), animated: true });
        });
      }
    }, 80);

    const timeout = setTimeout(() => clearInterval(interval), 4000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetStepId, sectionsLoading, expandedSectionId, panelOffsetY, taskStepsOffsetInPanel]);

  const [panelOffsetY, setPanelOffsetY] = useState<number | null>(null);
  const [taskStepsOffsetInPanel, setTaskStepsOffsetInPanel] = useState<number | null>(null);
  // Use route.key — unique per navigation push — so the guard resets on every new open.
  const scrollGuardKey = useRef<string | null>(null);
  const didScrollToSteps = useRef(false);

  const routeKey = route.key;
  if (scrollGuardKey.current !== routeKey) {
    scrollGuardKey.current = routeKey;
    didScrollToSteps.current = false;
  }

  useEffect(() => {
    // Only handle plain "scroll to steps panel" when there's no specific step to scroll to.
    if (!scrollToSteps || targetStepId || sectionsLoading || didScrollToSteps.current) {
      return;
    }
    if (panelOffsetY == null || taskStepsOffsetInPanel == null) return;

    const y = panelOffsetY + taskStepsOffsetInPanel;
    let interaction: { cancel?: () => void } | null = null;
    const t = setTimeout(() => {
      interaction = InteractionManager.runAfterInteractions(() => {
        didScrollToSteps.current = true;
        scrollRef.current?.scrollTo({ y, animated: true });
      });
    }, 150);

    return () => {
      clearTimeout(t);
      interaction?.cancel?.();
    };
  }, [
    scrollToSteps,
    targetStepId,
    sectionsLoading,
    panelOffsetY,
    taskStepsOffsetInPanel,
  ]);

  useEffect(() => {
    NetInfo.fetch().then((state) => {
      setIsOnline(state.isConnected !== false);
    });
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected !== false);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!task?.id) {
      setIsOfflineReady(false);
      return;
    }
    isTaskAvailableOffline(task.id)
      .then((ready) => {
        setIsOfflineReady(ready);
      })
      .catch(() => {
        setIsOfflineReady(false);
      });
  }, [task?.id]);

  if (!task) {
    return (
      <View style={screenStyles.container}>
        <Text style={screenStyles.muted}>Task not found.</Text>
      </View>
    );
  }

  const canChangeStatus = Boolean(task.documentId && task.versionId && task.id);
  const taskStatusLabel = getTaskStatusLabel(task.status);
  const statusAction = getTaskStatusAction(task.status);
  const sharedUsers = task.usersSharedWith ?? [];
  const attachmentFiles: TaskFileDTO[] = Array.isArray(task.documentFiles) ? task.documentFiles : [];
  const allStepsRecorded =
    allTaskStepIds.length > 0 &&
    allTaskStepIds.every((taskStepId) => stepStatuses[taskStepId] !== null && stepStatuses[taskStepId] !== undefined);
  const canFinalise =
    canChangeStatus &&
    allStepsRecorded &&
    task.status !== TASK_STATUS_COMPLETE &&
    task.status !== TASK_STATUS_CANCELLED;

  const handlePrepareOfflineData = async () => {
    if (!task.id) return;
    if (!isOnline) {
      Alert.alert('Offline mode', 'You can not cache task while offline.');
      return;
    }
    if (sections.length === 0) {
      Alert.alert('Offline mode', 'Task steps are still loading. Try again in a moment.');
      return;
    }

    setIsPreparingOfflineData(true);
    try {
      await setCachedTaskSections(task.id, sections);
      const urls = new Set<string>(collectTaskFileUrls(attachmentFiles));
      let hasAnyStepCached = false;

      for (const section of sections) {
        for (const taskStep of section.taskSteps) {
          try {
            const postsResponse = await getTaskPosts(task.id, taskStep.id, OFFLINE_POSTS_FILTER_MODEL);
            const posts = Array.isArray(postsResponse.data?.items) ? postsResponse.data.items : [];
            await setCachedTaskStepPosts(task.id, taskStep.id, posts);
            collectPostUrls(posts).forEach((url) => {
              urls.add(url);
            });
            hasAnyStepCached = true;
          } catch {
            // Keep going for other task steps.
          }

          try {
            const defectsResponse = await getTaskStepDefects(
              task.id,
              taskStep.id,
              OFFLINE_DEFECTS_FILTER_MODEL
            );
            const defects = Array.isArray(defectsResponse.data?.items) ? defectsResponse.data.items : [];
            await setCachedTaskStepDefects(task.id, taskStep.id, defects);
            collectDefectUrls(defects).forEach((url) => {
              urls.add(url);
            });
            hasAnyStepCached = true;
          } catch {
            // Defects cache is best effort.
          }
        }
      }

      const token = await getToken();
      await Promise.all(
        Array.from(urls).map(async (url) => {
          await warmUrl(url, token);
        })
      );

      await markTaskAvailableOffline(task.id);
      setIsOfflineReady(true);
      Alert.alert(
        'Offline mode',
        hasAnyStepCached
          ? 'Task is available offline.'
          : 'Task basics are available offline, but no task-step posts/defects were cached.'
      );
    } catch {
      Alert.alert('Offline mode', 'Failed to cache task for offline use.');
    } finally {
      setIsPreparingOfflineData(false);
    }
  };

  const changeStatus = async (status: number) => {
    if (!task.documentId || !task.versionId || !task.id) return;
    try {
      await dispatch(
        changeCurrentTaskStatus({
          documentId: task.documentId,
          versionId: task.versionId,
          taskId: task.id,
          status,
        })
      ).unwrap();
    } catch (e) {
      Alert.alert('Task', (e as string) || 'Failed to update task status.');
    }
  };

  const handleTaskStatusAction = () => {
    if (statusAction.nextStatus == null || !canChangeStatus) return;
    Alert.alert(statusAction.label, `Are you sure you want to ${statusAction.label.toLowerCase()}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        onPress: () => {
          changeStatus(statusAction.nextStatus!);
        },
      },
    ]);
  };

  const handleFinaliseTask = () => {
    if (!canFinalise) {
      Alert.alert('Task', 'Not all task steps are recorded.');
      return;
    }
    Alert.alert('Finalise task', 'Are you sure you want to finalise this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Finalise',
        onPress: () => {
          changeStatus(TASK_STATUS_COMPLETE);
        },
      },
    ]);
  };

  const sharedUserEmails = useMemo(
    () => new Set((task?.usersSharedWith ?? []).map((u) => u.email.toLowerCase())),
    [task?.usersSharedWith]
  );

  useEffect(() => {
    const trimmed = shareQuery.trim();
    if (trimmed.length < 2) {
      setShareSearchResults([]);
      setShareSearchLoading(false);
      return;
    }
    let cancelled = false;
    setShareSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await getUsersBySearch({
          search: trimmed,
          shouldFindTeams: true,
          onlyRegisteredUsers: false,
          onlyCompanyTeamUsers: false,
          includeOwnPerson: true,
        });
        if (cancelled) return;
        const list = (res.data ?? []).filter(
          (u) => !sharedUserEmails.has((u.email ?? '').toLowerCase())
        );
        setShareSearchResults(list);
      } catch {
        if (!cancelled) setShareSearchResults([]);
      } finally {
        if (!cancelled) setShareSearchLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [shareQuery, sharedUserEmails]);

  const handleUserPick = async (user: FoundUserDTO) => {
    if (!task.documentId || !task.versionId || !task.id) return;
    try {
      await dispatch(
        shareCurrentTaskWithUser({
          documentId: task.documentId,
          versionId: task.versionId,
          taskId: task.id,
          user,
        })
      ).unwrap();
      setShareQuery('');
      setShareSearchResults([]);
    } catch (e) {
      Alert.alert('Task', (e as string) || 'Failed to share task.');
    }
  };

  const handleUnshareUser = async (user: FoundUserDTO) => {
    if (!task.documentId || !task.versionId || !task.id) return;
    try {
      await dispatch(
        unshareCurrentTaskWithUser({
          documentId: task.documentId,
          versionId: task.versionId,
          taskId: task.id,
          user,
        })
      ).unwrap();
    } catch (e) {
      Alert.alert('Task', (e as string) || 'Failed to unshare task.');
    }
  };

  const handleSharePress = useCallback(() => {
    const typed = shareQuery.trim().toLowerCase();
    if (isValidEmail(typed)) {
      handleUserPick({ fullName: null, email: typed, userId: null, companyTeam: null }).catch(() => {});
      return;
    }
    setPickerVisible(true);
  }, [shareQuery, handleUserPick]);

  const openEdit = () => {
    setWorkOrderNumber(task.workOrderNumber ?? '');
    setNotificationNumber(task.notificationNumber ?? '');
    setProjectNumber(task.projectNumber ?? '');
    setAssetId(task.asset?.id != null ? String(task.asset.id) : '');
    setEditError(null);
    setEditVisible(true);
  };

  const submitEdit = async () => {
    if (!task.documentId || !task.versionId || !task.id) {
      setEditError('Task is missing document/version context.');
      return;
    }
    try {
      await dispatch(
        editTaskEntry({
          documentId: task.documentId,
          versionId: task.versionId,
          taskId: task.id,
          model: {
            workOrderNumber: (workOrderNumber ?? '').trim() || null,
            notificationNumber: (notificationNumber ?? '').trim() || null,
            projectNumber: (projectNumber ?? '').trim() || null,
            assetId: assetId.trim() ? Number(assetId) : null,
            asset: task.asset ? { id: task.asset.id, name: task.asset.name } : null,
            usersSharedWith: task.usersSharedWith ?? [],
          },
        })
      ).unwrap();
      setEditVisible(false);
    } catch (e) {
      setEditError((e as string) || 'Failed to edit task.');
    }
  };

  const closePostModal = () => {
    setPostModalVisible(false);
    setPostTaskStep(null);
  };

  const handlePostTaskStep = (taskStep: TaskStepReadDTO) => {
    setPostTaskStep(taskStep);
    setPostModalVisible(true);
  };

  const openDoneConfirmationModal = useCallback((taskStep: TaskStepReadDTO) => {
    setDoneConfirmTaskStep(taskStep);
    setDoneConfirmDescription('');
    setDoneConfirmFiles([]);
    setDoneConfirmError(null);
    setDoneConfirmVisible(true);
  }, []);

  const closeDoneConfirmationModal = useCallback(() => {
    if (doneConfirmSubmitting) return;
    setDoneConfirmVisible(false);
    setDoneConfirmTaskStep(null);
    setDoneConfirmDescription('');
    setDoneConfirmFiles([]);
    setDoneConfirmError(null);
  }, [doneConfirmSubmitting]);

  const pickDoneConfirmationPhoto = useCallback(() => {
    if (doneConfirmSubmitting) return;
    const pickFromSource = (source: 'camera' | 'gallery') => {
      const picker = source === 'camera' ? launchCamera : launchImageLibrary;
      picker({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.9,
      })
        .then((result) => {
          if (result.didCancel) return;
          const mapped = (result.assets ?? [])
            .map(mapCompletionAsset)
            .filter((file): file is CompletionPhotoFile => file !== null);
          if (mapped.length === 0) return;
          setDoneConfirmFiles((prev) => {
            const existing = new Set(prev.map((f) => `${f.uri}::${f.name}`));
            const merged = [...prev];
            mapped.forEach((file) => {
              const key = `${file.uri}::${file.name}`;
              if (!existing.has(key)) {
                existing.add(key);
                merged.push(file);
              }
            });
            return merged;
          });
          setDoneConfirmError(null);
        })
        .catch(() => {
          setDoneConfirmError('Failed to pick photo.');
        });
    };

    Alert.alert('Add Photo', '', [
      { text: 'Take Photo', onPress: () => pickFromSource('camera') },
      { text: 'Choose from Gallery', onPress: () => pickFromSource('gallery') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [doneConfirmSubmitting]);

  const handleSubmitTaskStepPost = async (
    payload: TaskStepPostPayload,
    taskStep: TaskStepReadDTO
  ) => {
    if (!task.id || !task.versionId) {
      throw new Error('Task is missing task/version context.');
    }

    const formData = new FormData();
    formData.append('Description', payload.description);
    formData.append('Comments[0]', payload.description);
    formData.append('TaskStepId', taskStep.id);
    formData.append('TaskId', task.id);
    payload.files.forEach((file) => {
      formData.append('Files', {
        uri: file.uri,
        type: file.type,
        name: file.name,
      } as unknown as Blob);
    });

    if (payload.kind === 'defect') {
      formData.append('IsAutoSetPosition', 'true');
      formData.append('RemediationDetails', payload.remediationDetails);

      if (payload.template) {
        formData.append('TemplateId', payload.template.id);
        payload.template.fields.forEach((field, index) => {
          formData.append(`DefectFieldsValues[${index}].Name`, field.name);
          formData.append(
            `DefectFieldsValues[${index}].Type`,
            field.type != null ? String(field.type) : ''
          );
          formData.append(`DefectFieldsValues[${index}].Id`, field.id);

          let value = payload.fieldValues[field.id] ?? '';
          const lowerFieldName = field.name.toLowerCase();
          if (lowerFieldName.includes('description')) {
            value = payload.description;
          } else if (lowerFieldName.includes('asset') && task.asset?.name) {
            value = task.asset.name;
          } else if (lowerFieldName.includes('gps') && !value) {
            value = 'auto';
          } else if (field.type === 1 && !value) {
            value = 'false';
          }

          formData.append(`DefectFieldsValues[${index}].Value`, value);
        });
      }

      await apiCreateDefect(formData);
    } else {
      await apiCreateObservation(formData);
    }

    await dispatch(fetchTaskById({ versionId: task.versionId, taskId: task.id })).unwrap();
    try {
      const orderedSections = await fetchSections(task.id);
      setSections(orderedSections);
      setExpandedSectionId((prev) =>
        prev && orderedSections.some((section) => section.id === prev)
          ? prev
          : orderedSections[0]?.id ?? null
      );
    } catch {
      // Keep current accordion state if sections refresh fails.
    }
  };

  const handleToggleTaskStepStatus = async (taskStepId: string, targetStatus: number | null) => {
    const documentId = task.documentId ?? currentTask?.documentId;
    const versionId = task.versionId ?? currentTask?.versionId;
    const taskId = task.id ?? currentTask?.id;
    if (!documentId || !versionId || !taskId) {
      Alert.alert('Task', 'Task context is not ready yet. Please wait and try again.');
      return;
    }
    setStatusUpdatingStepId(taskStepId);
    setStatusUpdatingAction(targetStatus === TASK_STEP_NOT_COMPLETED ? 'skip' : 'done');
    try {
      const res = await changeTaskStepStatus(
        documentId,
        versionId,
        taskId,
        taskStepId,
        verificationStatusToApiString(targetStatus)
      );
      const updatedTaskStepId = res.data.taskStepId ?? taskStepId;
      const updatedStatus = parseVerificationStatus(res.data.verificationStatusCode);
      setStepStatuses((prev) => ({ ...prev, [updatedTaskStepId]: updatedStatus }));
      await dispatch(fetchTaskById({ versionId, taskId })).unwrap();
    } catch (e) {
      Alert.alert('Task', (e as string) || 'Failed to update task step status.');
    } finally {
      setStatusUpdatingStepId(null);
      setStatusUpdatingAction(null);
    }
  };

  const handleConfirmDoneWithPhoto = useCallback(async () => {
    if (!doneConfirmTaskStep) return;
    if (doneConfirmFiles.length === 0) {
      setDoneConfirmError('At least one photo is required.');
      return;
    }

    setDoneConfirmSubmitting(true);
    setDoneConfirmError(null);
    try {
      await handleSubmitTaskStepPost(
        {
          kind: 'observation',
          description: doneConfirmDescription.trim() || 'Step completion confirmation',
          files: doneConfirmFiles,
        },
        doneConfirmTaskStep
      );
      await handleToggleTaskStepStatus(doneConfirmTaskStep.id, TASK_STEP_COMPLETED_WITH_RECORD);
      setDoneConfirmVisible(false);
      setDoneConfirmTaskStep(null);
      setDoneConfirmDescription('');
      setDoneConfirmFiles([]);
    } catch (e) {
      setDoneConfirmError((e as string) || 'Failed to mark task step as done.');
    } finally {
      setDoneConfirmSubmitting(false);
    }
  }, [
    doneConfirmDescription,
    doneConfirmFiles,
    doneConfirmTaskStep,
    handleSubmitTaskStepPost,
    handleToggleTaskStepStatus,
  ]);

  const handleToggleTaskStepDone = (taskStep: TaskStepReadDTO) => {
    const currentStatus = stepStatuses[taskStep.id] ?? null;
    if (currentStatus === TASK_STEP_COMPLETED_WITH_RECORD) {
      return handleToggleTaskStepStatus(taskStep.id, null);
    }
    openDoneConfirmationModal(taskStep);
    return Promise.resolve();
  };

  const handleToggleTaskStepSkip = (taskStepId: string) => {
    const currentStatus = stepStatuses[taskStepId] ?? null;
    const nextStatus = currentStatus === TASK_STEP_NOT_COMPLETED
      ? null
      : TASK_STEP_NOT_COMPLETED;
    return handleToggleTaskStepStatus(taskStepId, nextStatus);
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.offlineBar}>
        {isOfflineReady ? (
          <View style={styles.offlineReadyRow}>
            <MaterialIcons name="check" size={20} color={theme.colors.success} />
            <Text style={styles.offlineReadyText}>Task is available offline</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.offlineButton, (!isOnline || isPreparingOfflineData) && styles.buttonDisabled]}
            activeOpacity={0.8}
            onPress={() => {
              handlePrepareOfflineData().catch(() => {});
            }}
            disabled={!isOnline || isPreparingOfflineData}
          >
            {isPreparingOfflineData ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.offlineButtonText}>Make available offline</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View
        style={styles.panel}
        onLayout={(e) => {
          setPanelOffsetY(e.nativeEvent.layout.y);
        }}
      >
        <View style={styles.infoPanel}>
          <View style={styles.infoRow}>
            <Text style={styles.infoText}>Asset: {task.asset?.name ?? '-'}</Text>
            <TouchableOpacity onPress={openEdit} disabled={isActionLoading}>
              <MaterialIcons name="edit" size={20} color="#6e7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.infoText}>Status: {taskStatusLabel}</Text>
            <TouchableOpacity
              style={[
                styles.statusButton,
                (statusAction.nextStatus == null || !canChangeStatus || isActionLoading) && styles.buttonDisabled,
              ]}
              onPress={handleTaskStatusAction}
              disabled={statusAction.nextStatus == null || !canChangeStatus || isActionLoading}
            >
              <Text style={styles.statusButtonText}>{statusAction.label}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.infoText}>Start Date: {formatDateTime(task.createdOnUtc)}</Text>
          <Text style={styles.infoText}>Elapsed Time: {getElapsedTime(task.createdOnUtc)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Attachments:</Text>
          {attachmentFiles.length === 0 ? (
            <Text style={styles.mutedText}>No attachments</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator>
              {attachmentFiles.map((file, index) => (
                <TouchableOpacity
                  key={`${file.url ?? file.name ?? 'file'}-${index}`}
                  style={styles.attachmentChip}
                  onPress={() => {
                    if (typeof file.url === 'string') {
                      Linking.openURL(file.url).catch(() => {});
                    }
                  }}
                >
                  <MaterialIcons name="description" size={18} color="#666f81" />
                  <Text style={styles.attachmentText} numberOfLines={1}>
                    {file.name ?? 'Attachment'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.shareRow}>
            <TextInput
              style={styles.shareInput}
              value={shareQuery}
              onChangeText={setShareQuery}
              onSubmitEditing={handleSharePress}
              returnKeyType="done"
              placeholder="Enter users (for external users..."
              placeholderTextColor="#7e7e85"
            />
            <TouchableOpacity style={styles.shareButton} onPress={handleSharePress}>
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
          {shareSearchLoading ? (
            <View style={styles.shareSearchLoader}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null}
          {!shareSearchLoading && shareSearchResults.length > 0 ? (
            <View style={styles.shareSearchResults}>
              <ScrollView
                style={styles.shareSearchResultsScroll}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                {shareSearchResults.map((user, idx) => (
                  <TouchableOpacity
                    key={`${user.email}-${user.userId ?? idx}`}
                    style={styles.shareSearchResultRow}
                    onPress={() => {
                      handleUserPick(user);
                      setShareQuery('');
                      setShareSearchResults([]);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.shareSearchResultName}>
                      {user.fullName || user.email}
                    </Text>
                    {user.fullName ? (
                      <Text style={styles.shareSearchResultEmail}>{user.email}</Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <Text style={styles.sharedWithTitle}>Shared with:</Text>
          {sharedUsers.length === 0 ? (
            <Text style={styles.mutedText}>No users yet.</Text>
          ) : (
            sharedUsers.map((user, index) => (
              <View key={`${user.userId ?? user.email}-${index}`} style={styles.sharedUserRow}>
                <View style={styles.sharedUserTexts}>
                  <Text style={styles.sharedUserName}>{user.fullName || user.email}</Text>
                  {user.fullName ? <Text style={styles.sharedUserEmail}>{user.email}</Text> : null}
                </View>
                <TouchableOpacity
                  style={[styles.removeUserButton, (!canChangeStatus || isActionLoading) && styles.buttonDisabled]}
                  onPress={() => handleUnshareUser(user)}
                  disabled={!canChangeStatus || isActionLoading}
                >
                  <MaterialIcons name="close" size={26} color="#7b7b82" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View
          style={styles.taskStepsPanel}
          onLayout={(e) => {
            setTaskStepsOffsetInPanel(e.nativeEvent.layout.y);
          }}
        >
          <View style={styles.taskStepsTab}>
            <Text style={styles.taskStepsTabText}>Task steps</Text>
          </View>

          {sectionsLoading || currentTaskLoading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : sections.length === 0 ? (
            <Text style={styles.mutedText}>No task steps found.</Text>
          ) : (
            sections.map((section, sectionIndex) => {
              const isOpen = expandedSectionId === section.id;
              return (
                <View
                  key={section.id}
                  style={styles.sectionAccordion}
                  onLayout={(e) => {
                    stepLayoutMap.current[`__section_${section.id}`] = e.nativeEvent.layout.y;
                  }}
                >
                  <TouchableOpacity
                    style={styles.sectionHeader}
                    onPress={() => {
                      setExpandedSectionId((prev) => (prev === section.id ? null : section.id));
                    }}
                  >
                    <Text style={styles.sectionHeaderText}>
                      {sectionIndex + 1}. {section.sectionTitle}
                    </Text>
                  </TouchableOpacity>

                  {isOpen ? (
                    <View style={styles.sectionBody}>
                      {section.taskSteps.map((taskStep, taskStepIndex) => (
                        <View
                          key={taskStep.id}
                          onLayout={(e) => {
                            stepLayoutMap.current[taskStep.id] = e.nativeEvent.layout.y +
                              (stepLayoutMap.current[`__section_${section.id}`] ?? 0);
                          }}
                        >
                          <TaskStepCard
                            orderLabel={`${sectionIndex + 1}.${taskStepIndex + 1}`}
                            taskStep={taskStep}
                            status={stepStatuses[taskStep.id] ?? null}
                            statusUpdating={statusUpdatingStepId === taskStep.id}
                            statusUpdatingAction={statusUpdatingStepId === taskStep.id ? statusUpdatingAction : null}
                          onPostPress={() => handlePostTaskStep(taskStep)}
                          onSkipPress={() => handleToggleTaskStepSkip(taskStep.id)}
                          onDonePress={() => handleToggleTaskStepDone(taskStep)}
                          />
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>

        <TouchableOpacity
          style={[styles.finaliseButton, (!canFinalise || isActionLoading) && styles.finaliseButtonDisabled]}
          onPress={handleFinaliseTask}
          disabled={!canFinalise || isActionLoading}
        >
          <Text style={styles.finaliseButtonText}>Finalise task</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Copyright © 2025 Integri-X. All rights reserved</Text>
      </View>
      <TouchableOpacity
        style={styles.backToTopButton}
        onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
      >
        <MaterialIcons name="keyboard-double-arrow-up" size={30} color="#ffffff" />
      </TouchableOpacity>

      <Modal
        visible={doneConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDoneConfirmationModal}
      >
        <View style={styles.doneConfirmBackdrop}>
          <View style={styles.doneConfirmCard}>
            <View style={styles.doneConfirmHeaderRow}>
              <Text
                style={styles.doneConfirmTitle}
                maxFontSizeMultiplier={1.2}
                accessibilityRole="header"
              >
                Photo confirmation
              </Text>
              <TouchableOpacity
                onPress={closeDoneConfirmationModal}
                disabled={doneConfirmSubmitting}
                style={styles.doneConfirmCloseBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <MaterialIcons name="close" size={22} color="#2f3444" />
              </TouchableOpacity>
            </View>
            <Text style={styles.doneConfirmSubtitle} maxFontSizeMultiplier={1.3}>
              Add a description and at least one photo to mark this step done.
            </Text>

            <Text style={styles.doneConfirmLabel}>Description</Text>
            <View style={styles.doneConfirmInputWrap}>
              <TextInput
                style={styles.doneConfirmInput}
                value={doneConfirmDescription}
                onChangeText={setDoneConfirmDescription}
                multiline
                numberOfLines={4}
                placeholder="Add notes about the completion..."
                placeholderTextColor="#a0a6b6"
                editable={!doneConfirmSubmitting}
              />
              {doneConfirmDescription.trim() ? (
                <TouchableOpacity
                  style={styles.doneConfirmClear}
                  onPress={() => setDoneConfirmDescription('')}
                  disabled={doneConfirmSubmitting}
                >
                  <MaterialIcons name="close" size={16} color="#5a5e69" />
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.doneConfirmUploadArea}
              onPress={pickDoneConfirmationPhoto}
              disabled={doneConfirmSubmitting}
            >
              <MaterialIcons name="add-photo-alternate" size={28} color="#4d535f" />
            </TouchableOpacity>

            {doneConfirmFiles.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.doneConfirmFilesRow}>
                {doneConfirmFiles.map((file) => (
                  <View key={`${file.uri}-${file.name}`} style={styles.doneConfirmFileThumbWrap}>
                    <Image source={{ uri: file.uri }} style={styles.doneConfirmFileThumb} />
                    <TouchableOpacity
                      style={styles.doneConfirmFileRemove}
                      onPress={() =>
                        setDoneConfirmFiles((prev) =>
                          prev.filter((entry) => !(entry.uri === file.uri && entry.name === file.name))
                        )
                      }
                      disabled={doneConfirmSubmitting}
                    >
                      <MaterialIcons name="close" size={14} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            {doneConfirmError ? <Text style={styles.doneConfirmError}>* {doneConfirmError}</Text> : null}

            <TouchableOpacity
              style={styles.doneConfirmCancelBtn}
              onPress={closeDoneConfirmationModal}
              disabled={doneConfirmSubmitting}
            >
              <Text style={styles.doneConfirmCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.doneConfirmSubmitBtn, doneConfirmSubmitting && styles.buttonDisabled]}
              onPress={() => {
                handleConfirmDoneWithPhoto().catch(() => {});
              }}
              disabled={doneConfirmSubmitting}
            >
              {doneConfirmSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.doneConfirmSubmitText}>Mark Done</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <UserPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleUserPick}
        title="Share task with user"
        initialQuery={pickerVisible ? shareQuery : undefined}
      />

      <TaskStepPostModal
        visible={postModalVisible}
        taskStep={postTaskStep}
        taskId={task.id}
        assetName={task.asset?.name ?? null}
        onClose={closePostModal}
        onSubmit={handleSubmitTaskStepPost}
      />

      <Modal visible={editVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.editModalCard}>
            <Text style={styles.modalTitle}>Edit task</Text>
            <View style={styles.editModalBody}>
              <ScrollView
                style={styles.editModalScroll}
                contentContainerStyle={styles.editModalScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
              >
              {editError ? (
                <View style={screenStyles.errorBox}>
                  <Text style={screenStyles.errorText}>{editError}</Text>
                </View>
              ) : null}
              <Text style={screenStyles.formLabel}>Work order</Text>
              <TextInput
                style={screenStyles.formInput}
                value={workOrderNumber}
                onChangeText={setWorkOrderNumber}
                placeholder="Work order number"
                placeholderTextColor="#6c757d"
                editable={!isActionLoading}
              />
              <Text style={screenStyles.formLabel}>Notification</Text>
              <TextInput
                style={screenStyles.formInput}
                value={notificationNumber}
                onChangeText={setNotificationNumber}
                placeholder="Notification number"
                placeholderTextColor="#6c757d"
                editable={!isActionLoading}
              />
              <Text style={screenStyles.formLabel}>Project</Text>
              <TextInput
                style={screenStyles.formInput}
                value={projectNumber}
                onChangeText={setProjectNumber}
                placeholder="Project number"
                placeholderTextColor="#6c757d"
                editable={!isActionLoading}
              />
              <Text style={screenStyles.formLabel}>Asset ID</Text>
              <TextInput
                style={screenStyles.formInput}
                value={assetId}
                onChangeText={setAssetId}
                placeholder="Asset ID"
                placeholderTextColor="#6c757d"
                keyboardType="number-pad"
                editable={!isActionLoading}
              />
              </ScrollView>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditVisible(false)}
                disabled={isActionLoading}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSaveBtn,
                  screenStyles.formButton,
                  styles.modalSaveBtnInRow,
                  isActionLoading && styles.buttonDisabled,
                ]}
                onPress={submitEdit}
                disabled={isActionLoading}
              >
                {isActionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={screenStyles.formButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingBottom: 26,
  },
  offlineBar: {
    minHeight: 54,
    borderBottomWidth: 1,
    borderBottomColor: '#dee4ec',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
  },
  offlineButton: {
    minHeight: 38,
    borderRadius: 3,
    backgroundColor: '#7380a0',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  offlineButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  offlineReadyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offlineReadyText: {
    color: '#5f6c8e',
    fontSize: 14,
  },
  panel: {
    marginTop: 10,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#d7dfef',
    borderRadius: 4,
    backgroundColor: '#f7f9ff',
    padding: 12,
  },
  infoPanel: {
    paddingHorizontal: 6,
    paddingBottom: 8,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  infoText: {
    color: '#131722',
    fontSize: 15,
    flex: 1,
  },
  statusButton: {
    minHeight: 34,
    borderRadius: 3,
    backgroundColor: '#243aa8',
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#d7deed',
    borderRadius: 6,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    padding: 12,
  },
  cardTitle: {
    color: '#1e2433',
    fontSize: 16,
    marginBottom: 10,
  },
  attachmentChip: {
    height: 34,
    borderRadius: 17,
    backgroundColor: '#e6e7ec',
    paddingHorizontal: 10,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 330,
  },
  attachmentText: {
    color: '#353b49',
    fontSize: 14,
    flexShrink: 1,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  shareInput: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#6f727d',
    color: '#1a1b21',
    fontSize: 16,
    paddingVertical: 6,
  },
  shareButton: {
    minWidth: 62,
    minHeight: 36,
    borderRadius: 3,
    backgroundColor: '#6e7fb0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  shareButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  shareSearchLoader: {
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 4,
  },
  shareSearchResults: {
    maxHeight: 200,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e2e8',
    borderRadius: 4,
    backgroundColor: '#fafbfc',
    overflow: 'hidden',
    elevation: 2,
  },
  shareSearchResultsScroll: {
    maxHeight: 200,
  },
  shareSearchResultRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8eaef',
  },
  shareSearchResultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1b21',
    marginBottom: 2,
  },
  shareSearchResultEmail: {
    fontSize: 13,
    color: '#6c757d',
  },
  sharedWithTitle: {
    color: '#14151c',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  sharedUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  sharedUserTexts: {
    flex: 1,
    paddingRight: 8,
  },
  sharedUserName: {
    color: '#14151c',
    fontSize: 15,
  },
  sharedUserEmail: {
    color: '#72757f',
    fontSize: 14,
    marginTop: 2,
  },
  removeUserButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskStepsPanel: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#d7deed',
    borderRadius: 4,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  taskStepsTab: {
    borderTopWidth: 3,
    borderTopColor: '#2f3fb0',
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
  },
  taskStepsTabText: {
    fontSize: 16,
    color: '#2c3ca5',
    fontWeight: '500',
  },
  sectionAccordion: {
    borderTopWidth: 1,
    borderTopColor: '#e4e8f4',
  },
  sectionHeader: {
    minHeight: 52,
    backgroundColor: '#eceff7',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  sectionHeaderText: {
    color: '#2f3fa5',
    fontSize: 16,
    fontWeight: '500',
  },
  sectionBody: {
    backgroundColor: '#eceff7',
    paddingBottom: 10,
  },
  loader: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  finaliseButton: {
    marginTop: 12,
    minHeight: 38,
    borderRadius: 3,
    backgroundColor: '#243aa8',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finaliseButtonDisabled: {
    opacity: 0.55,
  },
  finaliseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footerRow: {
    marginTop: 14,
    alignItems: 'center',
  },
  footerText: {
    color: '#606f8f',
    fontSize: 14,
  },
  backToTopButton: {
    position: 'absolute',
    right: 22,
    bottom: 18,
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: '#243aa8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mutedText: {
    color: '#747b8f',
    fontSize: 14,
  },
  doneConfirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  doneConfirmCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d6dceb',
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  /** Matches web MUI DialogTitle (h6): ~1.25rem, medium weight */
  doneConfirmHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  doneConfirmCloseBtn: {
    marginTop: 2,
    marginLeft: 8,
  },
  doneConfirmTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 26,
    flex: 1,
    letterSpacing: 0.15,
  },
  /** MUI DialogContentText-style secondary line */
  doneConfirmSubtitle: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.body,
    lineHeight: 20,
    marginBottom: 12,
  },
  doneConfirmLabel: {
    color: '#161b27',
    fontSize: 14,
    marginBottom: 6,
  },
  doneConfirmInputWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  doneConfirmInput: {
    minHeight: 100,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#dce1ee',
    backgroundColor: '#eef2fb',
    textAlignVertical: 'top',
    paddingHorizontal: 10,
    paddingTop: 10,
    color: '#1b2231',
    fontSize: 15,
  },
  doneConfirmClear: {
    position: 'absolute',
    right: 8,
    top: 8,
  },
  doneConfirmUploadArea: {
    minHeight: 78,
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#b8becd',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  doneConfirmFilesRow: {
    marginBottom: 6,
  },
  doneConfirmFileThumbWrap: {
    width: 82,
    height: 82,
    borderRadius: 6,
    marginRight: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  doneConfirmFileThumb: {
    width: '100%',
    height: '100%',
  },
  doneConfirmFileRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneConfirmError: {
    color: '#d3294a',
    fontSize: 14,
    marginBottom: 8,
  },
  doneConfirmCancelBtn: {
    minHeight: 42,
    borderRadius: 3,
    backgroundColor: '#7a86a8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  doneConfirmCancelText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  doneConfirmSubmitBtn: {
    minHeight: 42,
    borderRadius: 3,
    backgroundColor: '#616ec5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneConfirmSubmitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  editModalCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    padding: theme.spacing.cardPadding,
    height: '85%',
    maxHeight: '90%',
  },
  editModalBody: {
    flex: 1,
    minHeight: 0,
  },
  editModalScroll: {
    flex: 1,
  },
  editModalScrollContent: {
    paddingBottom: 8,
  },
  modalCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    padding: theme.spacing.cardPadding,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
    flexShrink: 0,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalSaveBtn: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtnInRow: {
    marginTop: 0,
  },
  modalCancelBtnText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
