import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store';
import { fetchDocumentById, editDocument } from '../store/documentsSlice';
import {
  duplicateDocument,
  generateDocumentReport,
  getDocumentHistory,
  getDocumentSectionTaskSteps,
  getDocumentSections,
} from '../api/documents';
import { changeTaskStepStatus, getTaskById, getTaskSectionsWithTaskSteps } from '../api/tasks';
import { createDefect as apiCreateDefect } from '../api/defects';
import { createObservation as apiCreateObservation } from '../api/observations';
import type {
  DocumentAuditTrailDTO,
  DocumentSectionReadDTO,
  DocumentTaskStepReadDTO,
  DocumentVersionReadDTO,
} from '../types/document';
import type { TaskStepReadDTO, TaskWithDetailsReadDTO } from '../types/task';
import { ShareDocumentModal } from '../components/documents/ShareDocumentModal';
import { TaskStepPostModal, type TaskStepPostPayload } from '../components/taskDetail/TaskStepPostModal';
import { screenStyles } from '../styles/screenStyles';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';
import { taskReferencingOptions } from '../config/documentCreate';
import {
  parseVerificationStatus,
  verificationStatusToApiString,
  stripHtmlToText,
  TASK_STATUS_IN_PROGRESS,
  TASK_STEP_COMPLETED_WITH_RECORD,
  TASK_STEP_NOT_COMPLETED,
} from '../config/taskDetail';

type DocumentDetailParams = { document: DocumentVersionReadDTO; openShare?: boolean };
type DetailTab = 'document' | 'history';
type StatusActionKind = 'skip' | 'done' | null;

type ParsedHistoryDescription = {
  text: string;
  linkText?: string;
};

function normalizeHistoryText(value?: string): string {
  return stripHtmlToText(value ?? '') || '-';
}

function parseHistoryDescription(value?: string): ParsedHistoryDescription {
  const raw = value ?? '';
  const anchorMatch = raw.match(/<a[^>]*>(.*?)<\/a>/i);
  if (!anchorMatch) {
    return { text: normalizeHistoryText(raw) };
  }

  const anchorRaw = anchorMatch[0];
  const linkText = normalizeHistoryText(anchorMatch[1]);
  const text = normalizeHistoryText(raw.replace(anchorRaw, ''));

  return {
    text,
    linkText: linkText === '-' ? undefined : linkText,
  };
}

function buildTaskStepStatuses(task: TaskWithDetailsReadDTO | null): Record<string, number | null> {
  const map: Record<string, number | null> = {};
  const verifications = Array.isArray(task?.taskStepsVerifications) ? task.taskStepsVerifications : [];
  verifications.forEach((verification) => {
    if (!verification?.taskStepId) return;
    map[verification.taskStepId] = parseVerificationStatus(verification.verificationStatusCode);
  });
  return map;
}

async function openExternalUrl(url: string): Promise<boolean> {
  if (!url) return false;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

function mapTaskStepToDocumentTaskStep(taskStep: TaskStepReadDTO): DocumentTaskStepReadDTO {
  return {
    id: taskStep.id,
    sortOrder: taskStep.sortOrder,
    taskDescription: taskStep.taskDescription,
    postsCount: taskStep.postsCount,
    canUserCreateDefect: taskStep.canUserCreateDefect,
    files: taskStep.files ?? undefined,
    defectFieldsTemplate: taskStep.defectFieldsTemplate,
  };
}

export default function DocumentDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: DocumentDetailParams }, 'params'>>();
  const dispatch = useDispatch<AppDispatch>();
  const paramDoc = route.params?.document;
  const currentDocument = useSelector((s: RootState) => s.documents.currentDocument);
  const doc = paramDoc?.id === currentDocument?.id ? currentDocument : paramDoc;

  const [activeTab, setActiveTab] = useState<DetailTab>('document');
  const [isTaskDetailsExpanded, setIsTaskDetailsExpanded] = useState(true);
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);

  const [sections, setSections] = useState<DocumentSectionReadDTO[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [sectionsError, setSectionsError] = useState<string | null>(null);
  const [sectionTasks, setSectionTasks] = useState<Record<string, DocumentTaskStepReadDTO[]>>({});
  const [sectionTaskLoading, setSectionTaskLoading] = useState<Record<string, boolean>>({});
  const [sectionTaskError, setSectionTaskError] = useState<Record<string, string | null>>({});

  const [task, setTask] = useState<TaskWithDetailsReadDTO | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [stepStatuses, setStepStatuses] = useState<Record<string, number | null>>({});
  const [statusUpdatingStepId, setStatusUpdatingStepId] = useState<string | null>(null);
  const [statusUpdatingAction, setStatusUpdatingAction] = useState<StatusActionKind>(null);

  const [history, setHistory] = useState<DocumentAuditTrailDTO[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [editVisible, setEditVisible] = useState(false);
  const [editDescription, setEditDescription] = useState(doc?.description ?? '');
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareAutoOpened, setShareAutoOpened] = useState(false);
  const [cloning, setCloning] = useState(false);

  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingLargePdf, setDownloadingLargePdf] = useState(false);
  const [exportReportUrl, setExportReportUrl] = useState<string | null>(doc?.exportReportUrl ?? null);
  const [exportLargeReportUrl, setExportLargeReportUrl] = useState<string | null>(
    doc?.exportLargeReportUrl ?? null
  );

  const [postModalVisible, setPostModalVisible] = useState(false);
  const [postTaskStep, setPostTaskStep] = useState<TaskStepReadDTO | null>(null);
  const [postingStepId, setPostingStepId] = useState<string | null>(null);
  const [readOnlyWarningVisible, setReadOnlyWarningVisible] = useState<'mark' | 'post' | null>(null);

  const documentTaskId = useMemo(() => {
    if (!doc || typeof doc.task !== 'object' || doc.task == null) return null;
    return typeof doc.task.id === 'string' ? doc.task.id : null;
  }, [doc]);

  const isPublishedDocument = useMemo(() => {
    return String(doc?.versionStatusCode ?? '').trim().toLowerCase() === 'published';
  }, [doc?.versionStatusCode]);

  const canPostOnTaskStep = Boolean(task?.id) && isPublishedDocument;
  const canChangeTaskStepStatus =
    Boolean(task?.id) && isPublishedDocument && task?.status === TASK_STATUS_IN_PROGRESS;

  useEffect(() => {
    if (paramDoc?.documentId && paramDoc?.id) {
      dispatch(fetchDocumentById({ documentId: paramDoc.documentId, versionId: paramDoc.id }));
    }
  }, [dispatch, paramDoc?.documentId, paramDoc?.id]);

  useEffect(() => {
    setEditDescription(doc?.description ?? '');
    setExportReportUrl(doc?.exportReportUrl ?? null);
    setExportLargeReportUrl(doc?.exportLargeReportUrl ?? null);
    setHistory([]);
    setHistoryLoaded(false);
    setHistoryError(null);
    setTask(null);
    setStepStatuses({});
    setExpandedSectionId(null);
  }, [doc?.description, doc?.exportLargeReportUrl, doc?.exportReportUrl, doc?.id]);

  useEffect(() => {
    setShareAutoOpened(false);
  }, [paramDoc?.id]);

  useEffect(() => {
    if (!route.params?.openShare || shareAutoOpened) return;
    setShareModalVisible(true);
    setShareAutoOpened(true);
  }, [route.params?.openShare, shareAutoOpened]);

  useEffect(() => {
    let isCancelled = false;

    const loadTask = async () => {
      if (!doc?.id || !documentTaskId) {
        setTask(null);
        setStepStatuses({});
        return;
      }

      setTaskLoading(true);
      try {
        const response = await getTaskById(doc.id, documentTaskId);
        if (isCancelled) return;
        setTask(response.data ?? null);
        setStepStatuses(buildTaskStepStatuses(response.data ?? null));
      } catch {
        if (!isCancelled) {
          setTask(null);
          setStepStatuses({});
        }
      } finally {
        if (!isCancelled) {
          setTaskLoading(false);
        }
      }
    };

    loadTask().catch(() => { });
    return () => {
      isCancelled = true;
    };
  }, [doc?.id, documentTaskId]);

  useEffect(() => {
    let isCancelled = false;

    const loadSections = async () => {
      if (!doc?.documentId || !doc?.id) return;
      setSections([]);
      setSectionTasks({});
      setSectionTaskLoading({});
      setSectionTaskError({});
      setSectionsError(null);
      setExpandedSectionId(null);
      setSectionsLoading(true);

      try {
        if (documentTaskId) {
          const response = await getTaskSectionsWithTaskSteps(documentTaskId);
          const orderedTaskSections = [...(response.data ?? [])].sort(
            (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
          );
          if (isCancelled) return;

          const mappedSections: DocumentSectionReadDTO[] = orderedTaskSections.map((section) => ({
            id: section.id,
            sectionTitle: section.sectionTitle,
            sortOrder: section.sortOrder ?? 0,
          }));
          const mappedTaskSteps: Record<string, DocumentTaskStepReadDTO[]> = {};
          orderedTaskSections.forEach((section) => {
            mappedTaskSteps[section.id] = (section.taskSteps ?? []).map((taskStep) =>
              mapTaskStepToDocumentTaskStep(taskStep)
            );
          });

          setSections(mappedSections);
          setSectionTasks(mappedTaskSteps);
          return;
        }

        const response = await getDocumentSections(doc.documentId, doc.id);
        const orderedSections = [...(response.data ?? [])].sort(
          (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
        );
        if (isCancelled) return;
        setSections(orderedSections);
      } catch {
        if (!isCancelled) {
          setSections([]);
          setSectionsError(t('app.documentDetail.loadSectionsFail'));
        }
      } finally {
        if (!isCancelled) {
          setSectionsLoading(false);
        }
      }
    };

    loadSections().catch(() => { });
    return () => {
      isCancelled = true;
    };
  }, [doc?.documentId, doc?.id, documentTaskId, t]);

  const loadSectionTasks = useCallback(
    async (sectionId: string) => {
      if (!doc?.documentId || !doc?.id) return;
      setSectionTaskLoading((prev) => ({ ...prev, [sectionId]: true }));
      setSectionTaskError((prev) => ({ ...prev, [sectionId]: null }));

      try {
        const response = await getDocumentSectionTaskSteps(doc.documentId, doc.id, sectionId);
        const orderedTasks = [...(response.data ?? [])].sort(
          (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
        );
        setSectionTasks((prev) => ({ ...prev, [sectionId]: orderedTasks }));
      } catch {
        setSectionTasks((prev) => ({ ...prev, [sectionId]: [] }));
        setSectionTaskError((prev) => ({ ...prev, [sectionId]: t('app.documentDetail.loadTaskStepsFail') }));
      } finally {
        setSectionTaskLoading((prev) => ({ ...prev, [sectionId]: false }));
      }
    },
    [doc?.documentId, doc?.id, t]
  );

  useEffect(() => {
    let isCancelled = false;

    const loadHistory = async () => {
      if (!doc?.id || activeTab !== 'history' || historyLoaded) return;
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const response = await getDocumentHistory(doc.id);
        if (!isCancelled) {
          setHistory(response.data ?? []);
          setHistoryLoaded(true);
        }
      } catch {
        if (!isCancelled) {
          setHistory([]);
          setHistoryError(t('app.documentDetail.loadHistoryFail'));
          setHistoryLoaded(true);
        }
      } finally {
        if (!isCancelled) {
          setHistoryLoading(false);
        }
      }
    };

    loadHistory().catch(() => { });
    return () => {
      isCancelled = true;
    };
  }, [activeTab, doc?.id, historyLoaded, t]);

  const taskReferencing = useMemo(() => {
    const referencingCode =
      typeof doc?.taskReferencingType === 'number' ? doc.taskReferencingType : undefined;
    return taskReferencingOptions.find((option) => option.value === referencingCode);
  }, [doc?.taskReferencingType]);

  const openEdit = () => {
    if (!doc) return;
    setEditDescription(doc.description ?? '');
    setEditError(null);
    setEditVisible(true);
  };

  const submitEdit = async () => {
    if (!doc) return;
    const description = (editDescription ?? '').trim();
    setEditError(null);
    setEditing(true);
    try {
      const formData = new FormData();
      formData.append('Description', description);
      await dispatch(
        editDocument({
          documentId: doc.documentId,
          versionId: doc.id,
          model: formData,
        })
      ).unwrap();
      setEditVisible(false);
    } catch (e) {
      const message =
        typeof e === 'string'
          ? e
          : (e as { message?: string } | null)?.message ?? t('app.documentDetail.editDocFail');
      setEditError(message);
    } finally {
      setEditing(false);
    }
  };

  const handleCloneDocument = useCallback(() => {
    if (!doc) return;

    Alert.alert(
      t('app.documentDetail.cloneTitle'),
      t('app.documentDetail.cloneConfirmName', {
        name: doc.documentNumberStr ?? doc.documentNo ?? '',
      }),
      [
        { text: t('app.modal.cancel'), style: 'cancel' },
        {
          text: t('app.documentDetail.cloneOkBtn'),
          onPress: async () => {
            setCloning(true);
            try {
              const response = await duplicateDocument(doc.id);
              const cloned = response.data;
              Alert.alert(t('app.alerts.document'), t('app.document.cloneOk'));
              (navigation.navigate as (name: string, params?: object) => void)('DocumentDetail', {
                document: cloned,
              });
            } catch {
              Alert.alert(t('app.alerts.document'), t('app.document.cloneFail'));
            } finally {
              setCloning(false);
            }
          },
        },
      ]
    );
  }, [doc, navigation, t]);

  const handleDownloadReport = useCallback(
    async (isLarge: boolean) => {
      if (!doc) return;
      if (isLarge) {
        setDownloadingLargePdf(true);
      } else {
        setDownloadingPdf(true);
      }

      try {
        const existingUrl = isLarge
          ? doc.exportLargeReportUrl ?? exportLargeReportUrl ?? doc.exportReportUrl ?? exportReportUrl
          : doc.exportReportUrl ?? exportReportUrl ?? doc.exportLargeReportUrl ?? exportLargeReportUrl;

        if (existingUrl) {
          const opened = await openExternalUrl(existingUrl);
          if (!opened) {
            Alert.alert(t('app.alerts.download'), t('app.document.downloadFail'));
          }
          return;
        }

        const response = await generateDocumentReport(doc.documentId, doc.id, isLarge);
        const nextReportUrl = response.data?.exportReportUrl ?? null;
        const nextLargeUrl = response.data?.exportLargeReportUrl ?? null;
        if (nextReportUrl !== null) {
          setExportReportUrl(nextReportUrl);
        }
        if (nextLargeUrl !== null) {
          setExportLargeReportUrl(nextLargeUrl);
        }

        const generatedUrl = isLarge ? nextLargeUrl ?? nextReportUrl : nextReportUrl ?? nextLargeUrl;
        if (generatedUrl) {
          const opened = await openExternalUrl(generatedUrl);
          if (!opened) {
            Alert.alert(t('app.alerts.download'), t('app.document.downloadFail'));
          }
        } else {
          Alert.alert(t('app.alerts.download'), t('app.document.exportProgress'));
        }
      } catch {
        Alert.alert(t('app.alerts.download'), t('app.document.exportFail'));
      } finally {
        if (isLarge) {
          setDownloadingLargePdf(false);
        } else {
          setDownloadingPdf(false);
        }
      }
    },
    [doc, exportLargeReportUrl, exportReportUrl, t]
  );

  const openPostForTaskStep = useCallback(
    (_taskStep: DocumentTaskStepReadDTO) => {
      setReadOnlyWarningVisible('post');
    },
    []
  );

  const closePostModal = () => {
    setPostModalVisible(false);
    setPostTaskStep(null);
  };

  const handleSubmitTaskStepPost = useCallback(
    async (payload: TaskStepPostPayload, taskStep: TaskStepReadDTO) => {
      if (!task?.id || !task.versionId) {
        throw new Error('Task is missing task/version context.');
      }

      setPostingStepId(taskStep.id);
      try {
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

        try {
          const taskResponse = await getTaskById(task.versionId, task.id);
          setTask(taskResponse.data ?? null);
          setStepStatuses(buildTaskStepStatuses(taskResponse.data ?? null));
        } catch {
          // Keep UI state as-is if refresh fails.
        }

        try {
          const sectionsResponse = await getTaskSectionsWithTaskSteps(task.id);
          const orderedTaskSections = [...(sectionsResponse.data ?? [])].sort(
            (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
          );
          const mappedSections: DocumentSectionReadDTO[] = orderedTaskSections.map((section) => ({
            id: section.id,
            sectionTitle: section.sectionTitle,
            sortOrder: section.sortOrder ?? 0,
          }));
          const mappedTaskSteps: Record<string, DocumentTaskStepReadDTO[]> = {};
          orderedTaskSections.forEach((section) => {
            mappedTaskSteps[section.id] = (section.taskSteps ?? []).map((taskStepItem) =>
              mapTaskStepToDocumentTaskStep(taskStepItem)
            );
          });
          setSections(mappedSections);
          setSectionTasks(mappedTaskSteps);
          setExpandedSectionId((prev) =>
            prev && mappedSections.some((section) => section.id === prev) ? prev : null
          );
        } catch {
          // Keep previous sections if refresh fails.
        }
      } finally {
        setPostingStepId(null);
      }
    },
    [task]
  );

  const handleTaskStepStatusChange = useCallback(
    (_taskStepId: string, _targetStatus: number, _actionKind: StatusActionKind) => {
      setReadOnlyWarningVisible('mark');
    },
    []
  );

  if (!doc) {
    return (
      <View style={screenStyles.container}>
        <Text style={screenStyles.muted}>{t('app.documentDetail.notFound')}</Text>
      </View>
    );
  }

  const renderTaskStepCard = (
    sectionIndex: number,
    taskStepIndex: number,
    taskStep: DocumentTaskStepReadDTO
  ) => {
    const orderLabel = `${sectionIndex + 1}.${taskStepIndex + 1}`;
    const description =
      stripHtmlToText(taskStep.taskDescription) ||
      t('app.taskDetail.stepDescriptionFallback', { order: orderLabel });
    const status = stepStatuses[taskStep.id] ?? null;
    const isDone = status === TASK_STEP_COMPLETED_WITH_RECORD;
    const isSkipped = status === TASK_STEP_NOT_COMPLETED;
    const isUpdatingThisStep = statusUpdatingStepId === taskStep.id;
    const isSkipUpdating = isUpdatingThisStep && statusUpdatingAction === 'skip';
    const isDoneUpdating = isUpdatingThisStep && statusUpdatingAction === 'done';

    return (
      <View key={`${taskStep.id}-${orderLabel}`} style={styles.stepCard}>
        <Text style={styles.stepCardTitle}>{t('app.taskDetail.taskStepHeading', { order: orderLabel })}</Text>
        <Text style={styles.stepCardDescription}>{description}</Text>
        <View style={styles.stepButtonsRow}>
          <TouchableOpacity
            style={[
              styles.stepActionButton,
              postingStepId === taskStep.id && styles.stepActionDisabled,
            ]}
            onPress={() => openPostForTaskStep(taskStep)}
            disabled={postingStepId === taskStep.id}
          >
            {postingStepId === taskStep.id ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.stepActionText}>{t('app.taskDetail.stepPost')}</Text>
            )}
          </TouchableOpacity>

          {!isDone ? (
            <TouchableOpacity
              style={[
                styles.stepActionButton,
                isSkipped && styles.stepActionSkipActive,
                isUpdatingThisStep && styles.stepActionDisabled,
              ]}
              onPress={() => handleTaskStepStatusChange(taskStep.id, TASK_STEP_NOT_COMPLETED, 'skip')}
              disabled={isUpdatingThisStep}
            >
              {isSkipUpdating ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.stepActionText}>
                  {isSkipped ? t('app.taskDetail.stepSkipped') : t('app.taskDetail.stepSkip')}
                </Text>
              )}
            </TouchableOpacity>
          ) : null}

          {!isSkipped ? (
            <TouchableOpacity
              style={[
                styles.stepActionButton,
                isDone && styles.stepActionDoneActive,
                isUpdatingThisStep && styles.stepActionDisabled,
              ]}
              onPress={() => handleTaskStepStatusChange(taskStep.id, TASK_STEP_COMPLETED_WITH_RECORD, 'done')}
              disabled={isUpdatingThisStep}
            >
              {isDoneUpdating ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <View style={styles.doneButtonInner}>
                  <Text style={styles.stepActionText}>{t('app.taskDetail.stepDone')}</Text>
                  {isDone ? <MaterialIcons name="check" size={16} color="#ffffff" /> : null}
                </View>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  const renderDocumentTab = () => (
    <View style={styles.documentContentWrap}>
      <View style={styles.taskWrapper}>
        <TouchableOpacity
          style={[
            styles.taskHeaderBase,
            isTaskDetailsExpanded ? styles.taskHeaderExpanded : styles.taskHeaderCollapsed,
          ]}
          activeOpacity={0.85}
          onPress={() => setIsTaskDetailsExpanded((prev) => !prev)}
        >
          <Text style={styles.taskHeaderText}>{t('app.documentCreate.taskDetails')}</Text>
          <MaterialIcons
            name={isTaskDetailsExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={22}
            color={isTaskDetailsExpanded ? '#5ea5d9' : '#1f2739'}
          />
        </TouchableOpacity>

        {isTaskDetailsExpanded ? (
          <View style={styles.taskBodyCard}>
            <Text style={styles.infoLabel}>{t('app.documentDetail.documentTitle')}</Text>
            <Text style={styles.infoValue}>{doc.description || '—'}</Text>

            <Text style={[styles.infoLabel, styles.taskReferenceLabel]}>
              {t('app.documentDetail.taskReferencing')}
            </Text>
            <View style={styles.referencingRow}>
              <Text style={styles.infoValue}>{taskReferencing?.label ?? '—'}</Text>
              {taskReferencing?.tooltip ? (
                <TouchableOpacity
                  onPress={() => Alert.alert(t('app.document.taskRef'), taskReferencing.tooltip)}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <MaterialIcons name="info" size={16} color="#6d7f9d" />
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={styles.taskBodyDivider} />
          </View>
        ) : null}

        {sectionsLoading || taskLoading ? (
          <View style={styles.sectionLoader}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : sectionsError ? (
          <View style={styles.sectionErrorBox}>
            <Text style={styles.sectionErrorText}>{sectionsError}</Text>
          </View>
        ) : sections.length === 0 ? (
          <View style={styles.emptySectionsBox}>
            <Text style={styles.emptySectionsText}>{t('app.documentDetail.noSections')}</Text>
          </View>
        ) : (
          sections.map((section, sectionIndex) => {
            const isSectionOpen = expandedSectionId === section.id;
            const sectionRows = sectionTasks[section.id] ?? [];
            return (
              <View key={section.id}>
                <TouchableOpacity
                  style={[
                    styles.sectionRowBase,
                    isSectionOpen ? styles.sectionRowExpanded : styles.sectionRowCollapsed,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => {
                    const nextExpandedSectionId = isSectionOpen ? null : section.id;
                    setExpandedSectionId(nextExpandedSectionId);
                    if (
                      nextExpandedSectionId &&
                      sectionTasks[section.id] === undefined &&
                      !sectionTaskLoading[section.id]
                    ) {
                      loadSectionTasks(section.id).catch(() => { });
                    }
                  }}
                >
                  <Text style={styles.sectionTitle}>{(section.sectionTitle ?? '').toUpperCase()}</Text>
                  <MaterialIcons
                    name={isSectionOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={22}
                    color={isSectionOpen ? '#5ea5d9' : '#1f2739'}
                  />
                </TouchableOpacity>

                {isSectionOpen ? (
                  <View style={styles.sectionBody}>
                    {sectionTaskLoading[section.id] ? (
                      <View style={styles.sectionBodyLoader}>
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                      </View>
                    ) : sectionTaskError[section.id] ? (
                      <Text style={styles.sectionTaskErrorText}>{sectionTaskError[section.id]}</Text>
                    ) : sectionRows.length === 0 ? (
                      <Text style={styles.sectionTaskEmptyText}>
                        {t('app.documentDetail.noTaskStepsInSection')}
                      </Text>
                    ) : (
                      sectionRows.map((taskStep, taskStepIndex) =>
                        renderTaskStepCard(sectionIndex, taskStepIndex, taskStep)
                      )
                    )}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </View>
    </View>
  );

  const renderHistoryTab = () => {
    if (historyLoading) {
      return (
        <View style={styles.historyLoader}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      );
    }

    if (historyError) {
      return (
        <View style={styles.historyErrorBox}>
          <Text style={styles.historyErrorText}>{historyError}</Text>
        </View>
      );
    }

    if (!history.length) {
      return (
        <View style={styles.emptyHistoryBox}>
          <Text style={styles.emptyHistoryText}>{t('app.documentDetail.noHistory')}</Text>
        </View>
      );
    }

    return (
      <View style={styles.historyTable}>
        <View style={[styles.historyRow, styles.historyHeaderRow]}>
          <Text style={[styles.historyHeaderText, styles.historyActionCell]}>
            {t('app.documentDetail.historyAction')}
          </Text>
          <Text style={[styles.historyHeaderText, styles.historyUserCell]}>
            {t('app.documentDetail.historyUser')}
          </Text>
        </View>

        {history.map((item, index) => {
          const parsedDescription = parseHistoryDescription(item.description);
          return (
            <View key={`${item.id}-${index}`} style={styles.historyRow}>
              <View style={styles.historyActionCell}>
                <Text style={styles.historyActionText} numberOfLines={1}>
                  {parsedDescription.text}
                  {parsedDescription.linkText ? ' ' : ''}
                  {parsedDescription.linkText ? (
                    <Text style={styles.historyLinkText}>({parsedDescription.linkText})</Text>
                  ) : null}
                </Text>
              </View>
              <Text style={styles.historyUserText} numberOfLines={1}>
                {item.userName}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={styles.pageTitle}>{t('app.documentDetail.pageTitle')}</Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setShareModalVisible(true)}>
            <MaterialIcons name="share" size={21} color="#111111" />
          </TouchableOpacity>
        </View>

        <View style={styles.documentMetaWrap}>
          <Text style={styles.metaText}>
            <Text style={styles.metaLabel}>{t('app.documentDetail.documentNumberLabel')}</Text>
            {doc.documentNumberStr ?? doc.documentNo}
          </Text>
          <Text style={styles.metaText}>
            <Text style={styles.metaLabel}>{t('app.documentDetail.documentTitleLabel')}</Text>
            {doc.description || '—'}
          </Text>
          <Text style={styles.metaText}>
            <Text style={styles.metaLabel}>{t('app.documentDetail.documentVersionLabel')}</Text>
            {doc.versionNo ?? '—'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.downloadButton, downloadingPdf && styles.buttonDisabled]}
          onPress={() => {
            handleDownloadReport(false).catch(() => { });
          }}
          disabled={downloadingPdf}
        >
          {downloadingPdf ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.downloadButtonText}>{t('app.documentDetail.downloadPdf')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.downloadButton, downloadingLargePdf && styles.buttonDisabled]}
          onPress={() => {
            handleDownloadReport(true).catch(() => { });
          }}
          disabled={downloadingLargePdf}
        >
          {downloadingLargePdf ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.downloadButtonText}>{t('app.documentDetail.downloadLargePdf')}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.tabsWrap}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'document' && styles.tabButtonActive]}
            onPress={() => setActiveTab('document')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'document' && styles.tabButtonTextActive]}>
              {t('app.documentDetail.tabDocument')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'history' && styles.tabButtonTextActive]}>
              {t('app.documentDetail.tabHistory')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabPanel}>{activeTab === 'document' ? renderDocumentTab() : renderHistoryTab()}</View>
      </View>

      <Modal visible={editVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('app.documentDetail.editTitle')}</Text>
            {editError ? (
              <View style={screenStyles.errorBox}>
                <Text style={screenStyles.errorText}>{editError}</Text>
              </View>
            ) : null}
            <Text style={screenStyles.formLabel}>{t('app.tasksScreen.description')}</Text>
            <TextInput
              style={[screenStyles.formInput, styles.textArea]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder={t('app.tasksScreen.description')}
              placeholderTextColor="#6c757d"
              multiline
              numberOfLines={4}
              editable={!editing}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditVisible(false)}
                disabled={editing}
              >
                <Text style={styles.cancelBtnText}>{t('app.modal.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[screenStyles.formButton, editing && styles.buttonDisabled]}
                onPress={() => {
                  submitEdit().catch(() => { });
                }}
                disabled={editing}
              >
                {editing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={screenStyles.formButtonText}>{t('app.common.save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TaskStepPostModal
        visible={postModalVisible}
        taskStep={postTaskStep}
        taskId={task?.id ?? documentTaskId ?? undefined}
        assetName={task?.asset?.name ?? null}
        onClose={closePostModal}
        onSubmit={handleSubmitTaskStepPost}
      />

      <ShareDocumentModal
        visible={shareModalVisible}
        document={doc}
        onClose={() => setShareModalVisible(false)}
      />

      <Modal visible={readOnlyWarningVisible !== null} transparent animationType="fade" onRequestClose={() => setReadOnlyWarningVisible(null)}>
        <View style={styles.warningOverlay}>
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>{t('app.documentDetail.warningTitle')}</Text>
            <TouchableOpacity style={styles.warningClose} onPress={() => setReadOnlyWarningVisible(null)}>
              <MaterialIcons name="close" size={20} color="#555" />
            </TouchableOpacity>
            <Text style={styles.warningBody}>
              {readOnlyWarningVisible === 'post'
                ? t('app.documentDetail.readOnlyPostWarning')
                : t('app.documentDetail.readOnlyMarkWarning')}
            </Text>
            <TouchableOpacity style={styles.warningButton} onPress={() => setReadOnlyWarningVisible(null)}>
              <Text style={styles.warningButtonText}>{t('app.modal.close')}</Text>
            </TouchableOpacity>
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
    paddingHorizontal: 8,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#374569',
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  iconButton: {
    minWidth: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentMetaWrap: {
    marginBottom: 10,
  },
  metaText: {
    color: '#2f3f63',
    fontSize: 16,
    lineHeight: 24,
  },
  metaLabel: {
    fontWeight: '700',
    color: '#2f3f63',
  },
  downloadButton: {
    backgroundColor: '#2438ad',
    borderRadius: 4,
    minHeight: 44,
    width: 200,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  downloadButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  tabsWrap: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  tabButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#d5dbea',
    borderTopWidth: 0,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: '#dee2eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#f7f9fd',
    borderTopWidth: 4,
    borderTopColor: '#2d3cb2',
  },
  tabButtonText: {
    color: '#2f3d66',
    fontSize: 16,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: '#223494',
  },
  tabPanel: {
    marginTop: 0,
    borderRadius: 8,
    backgroundColor: '#f9fbff',
    padding: 10,
  },
  documentContentWrap: {
    padding: 8,
    backgroundColor: '#f5f7fc',
  },
  taskWrapper: {
    borderRadius: 4,
    backgroundColor: '#f3f5fa',
    padding: 0,
  },
  taskHeaderBase: {
    minHeight: 52,
    borderRadius: 3,
    margin: 8,
    marginBottom: 0,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskHeaderExpanded: {
    backgroundColor: '#d6dbe5',
  },
  taskHeaderCollapsed: {
    backgroundColor: '#f7f7f9',
  },
  taskHeaderText: {
    color: '#2f3b56',
    fontSize: 17,
    fontWeight: '700',
  },
  taskBodyCard: {
    marginTop: 10,
    marginHorizontal: 14,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  infoLabel: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  infoValue: {
    color: '#111111',
    fontSize: 14,
    lineHeight: 20,
  },
  taskReferenceLabel: {
    marginTop: 10,
  },
  referencingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskBodyDivider: {
    marginTop: 14,
    height: 1,
    backgroundColor: '#e4e6ef',
  },
  sectionLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  sectionErrorBox: {
    margin: 8,
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#ffe9e9',
  },
  sectionErrorText: {
    color: '#b43333',
    fontSize: 13,
  },
  emptySectionsBox: {
    margin: 8,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d7ddeb',
    backgroundColor: '#ffffff',
  },
  emptySectionsText: {
    color: '#5b6e88',
    fontSize: 14,
  },
  sectionRowBase: {
    marginTop: 8,
    marginHorizontal: 8,
    minHeight: 52,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#d2d9e8',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionRowExpanded: {
    backgroundColor: '#d6dbe5',
  },
  sectionRowCollapsed: {
    backgroundColor: '#f7f7f9',
  },
  sectionTitle: {
    flex: 1,
    color: '#2a324a',
    fontSize: 15,
    fontWeight: '700',
    paddingRight: 8,
  },
  sectionBody: {
    marginTop: 0,
    marginHorizontal: 8,
    marginBottom: 8,
    padding: 8,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#d2d9e8',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: '#f7f7f9',
  },
  sectionBodyLoader: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  sectionTaskErrorText: {
    color: '#b43333',
    fontSize: 13,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  sectionTaskEmptyText: {
    color: '#5b6e88',
    fontSize: 13,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  stepCard: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dde2ef',
    borderRadius: 6,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    padding: 14,
  },
  stepCardTitle: {
    textAlign: 'center',
    color: '#2d3957',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 14,
  },
  stepCardDescription: {
    color: '#141a26',
    fontSize: 15,
    marginBottom: 12,
  },
  stepButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepActionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 3,
    backgroundColor: '#7482a5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActionSkipActive: {
    backgroundColor: '#ce5d65',
  },
  stepActionDoneActive: {
    backgroundColor: '#243aa8',
  },
  stepActionDisabled: {
    opacity: 0.55,
  },
  stepActionText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  doneButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  historyLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  historyErrorBox: {
    borderRadius: 6,
    backgroundColor: '#ffe9e9',
    padding: 10,
  },
  historyErrorText: {
    color: '#b43333',
    fontSize: 13,
  },
  emptyHistoryBox: {
    borderWidth: 1,
    borderColor: '#d7ddea',
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  emptyHistoryText: {
    color: '#5b6e88',
    fontSize: 14,
  },
  historyTable: {
    backgroundColor: '#f7f7f9',
  },
  historyRow: {
    minHeight: 52,
    borderTopWidth: 1,
    borderTopColor: '#d4d7df',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  historyHeaderRow: {
    borderTopWidth: 0,
  },
  historyHeaderText: {
    color: '#222222',
    fontSize: 16,
    fontWeight: '700',
  },
  historyActionCell: {
    flex: 1,
    paddingRight: 8,
  },
  historyUserCell: {
    width: 110,
  },
  historyActionText: {
    color: '#1f2431',
    fontSize: 14,
  },
  historyLinkText: {
    color: '#2d49b6',
  },
  historyUserText: {
    width: 110,
    color: '#1f2431',
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelBtnText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  warningOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  warningCard: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 20,
    width: '100%',
    maxWidth: 380,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1e2a',
    marginBottom: 12,
    marginRight: 28,
  },
  warningClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  warningBody: {
    fontSize: 14,
    color: '#4a5068',
    lineHeight: 20,
    marginBottom: 20,
  },
  warningButton: {
    alignSelf: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
    paddingHorizontal: 32,
    paddingVertical: 10,
  },
  warningButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
