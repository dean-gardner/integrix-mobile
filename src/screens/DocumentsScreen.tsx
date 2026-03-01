import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import type { AppDispatch, RootState } from '../store';
import { fetchDocuments, goToDocumentsPage, setDocumentsFilter } from '../store/documentsSlice';
import { createTaskEntry } from '../store/tasksSlice';
import { screenStyles } from '../styles/screenStyles';
import { theme } from '../theme';
import type { DocumentVersionReadDTO } from '../types/document';
import type { TaskCreateDTO, TaskReadDTO } from '../types/task';
import {
  defaultDocumentsFilterForm,
  defaultDocumentsSortField,
  defaultDocumentsSortOrder,
  defaultDocumentsStatusValue,
  defaultDocumentsTypeValue,
  DOCUMENT_STATUS_ALL_VALUE,
  documentSortFieldOptions,
  documentSortOrderOptions,
  documentStatusOptions,
  documentTypeOptions,
} from '../config/documentsScreen';
import { DocumentsSelect } from '../components/documents/DocumentsSelect';
import { DocumentsListCard } from '../components/documents/DocumentsListCard';
import { DocumentsSortModal } from '../components/documents/DocumentsSortModal';
import { DocumentsFilterModal } from '../components/documents/DocumentsFilterModal';
import { StartTaskModal } from '../components/documents/StartTaskModal';
import { ShareDocumentModal } from '../components/documents/ShareDocumentModal';
import { IntegrixLoader } from '../components/IntegrixLoader';
import { Paginator } from '../components/Paginator';

export default function DocumentsScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const documentsState = useSelector((s: RootState) => s.documents);
  const user = useSelector((s: RootState) => s.auth.user);
  const { items, isLoading, error, filteringModel, totalCount } = documentsState;

  const [initialized, setInitialized] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [hasAppliedFilters, setHasAppliedFilters] = useState(false);
  const [startTaskVisible, setStartTaskVisible] = useState(false);
  const [startTaskDocument, setStartTaskDocument] = useState<DocumentVersionReadDTO | null>(null);
  const [startTaskSubmitting, setStartTaskSubmitting] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareModalDocument, setShareModalDocument] = useState<DocumentVersionReadDTO | null>(null);

  const selectedStatusValue = useMemo(
    () =>
      typeof filteringModel.versionStatusCode === 'number'
        ? filteringModel.versionStatusCode
        : DOCUMENT_STATUS_ALL_VALUE,
    [filteringModel.versionStatusCode]
  );

  const selectedTypeValue = useMemo(
    () => (typeof filteringModel.type === 'number' ? filteringModel.type : null),
    [filteringModel.type]
  );

  const currentSortingField = useMemo(
    () =>
      typeof filteringModel.sortingField === 'string' && filteringModel.sortingField
        ? filteringModel.sortingField
        : defaultDocumentsSortField,
    [filteringModel.sortingField]
  );

  const currentSortingOrder = useMemo(
    () =>
      typeof filteringModel.sortingOrder === 'number'
        ? filteringModel.sortingOrder
        : defaultDocumentsSortOrder,
    [filteringModel.sortingOrder]
  );

  const pageSize = filteringModel.pageSize || 10;
  const pageCount = Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize)));
  const currentPage = Math.min(pageCount, (filteringModel.pageNumber ?? 0) + 1);

  useEffect(() => {
    dispatch(
      setDocumentsFilter({
        pageNumber: 0,
        pageSize: 10,
        versionStatusCode: defaultDocumentsStatusValue,
        type: defaultDocumentsTypeValue,
        sortingField: defaultDocumentsSortField,
        sortingOrder: defaultDocumentsSortOrder,
        ...defaultDocumentsFilterForm,
      })
    );
    setInitialized(true);
  }, [dispatch]);

  useEffect(() => {
    if (!initialized) return;
    dispatch(fetchDocuments());
  }, [dispatch, filteringModel, initialized]);

  const onRefresh = async () => {
    setRefreshing(true);
    dispatch(setDocumentsFilter({ pageNumber: 0 }));
    await dispatch(fetchDocuments()).unwrap().catch(() => {});
    setRefreshing(false);
  };

  const openDocument = (document: DocumentVersionReadDTO) => {
    (navigation.navigate as (name: string, params?: object) => void)('DocumentDetail', {
      document,
    });
  };

  const openShareDocument = (document: DocumentVersionReadDTO) => {
    setShareModalDocument(document);
    setShareModalVisible(true);
  };

  const closeShareDocumentModal = () => {
    setShareModalVisible(false);
    setShareModalDocument(null);
  };

  const handleStartTask = (document: DocumentVersionReadDTO) => {
    setStartTaskDocument(document);
    setStartTaskVisible(true);
  };

  const handleCloseStartTask = () => {
    if (startTaskSubmitting) return;
    setStartTaskVisible(false);
    setStartTaskDocument(null);
  };

  const handleSubmitStartTask = async (model: TaskCreateDTO, document: DocumentVersionReadDTO) => {
    setStartTaskSubmitting(true);
    try {
      const createdTask = await dispatch(
        createTaskEntry({
          documentId: document.documentId,
          versionId: document.id,
          model,
        })
      ).unwrap();

      setStartTaskVisible(false);
      setStartTaskDocument(null);

      const taskForRoute: TaskReadDTO = {
        id: createdTask.id,
        taskNumber: createdTask.taskNumber ?? createdTask.id,
        description: createdTask.description ?? document.description,
        workOrderNumber:
          (typeof createdTask.workOrderNumber === 'string' ? createdTask.workOrderNumber : null) ??
          model.workOrderNumber,
        notificationNumber:
          (typeof createdTask.notificationNumber === 'string'
            ? createdTask.notificationNumber
            : null) ?? model.notificationNumber,
        projectNumber:
          (typeof createdTask.projectNumber === 'string' ? createdTask.projectNumber : null) ??
          model.projectNumber,
        versionId:
          (typeof createdTask.versionId === 'string' ? createdTask.versionId : null) ?? document.id,
        documentId:
          (typeof createdTask.documentId === 'string' ? createdTask.documentId : null) ??
          document.documentId,
        createdOnUtc: createdTask.createdOnUtc,
        createdById: createdTask.createdById,
        taskStepsCount: createdTask.taskStepsCount,
        taskStepsDone: createdTask.taskStepsDone,
        asset: createdTask.asset ?? model.asset ?? undefined,
      };

      (navigation.navigate as (name: string, params?: object) => void)('TaskDetail', {
        task: taskForRoute,
      });
    } catch (e) {
      Alert.alert('Start task', (e as string) || 'Failed to start task.');
    } finally {
      setStartTaskSubmitting(false);
    }
  };

  const handleStatusChange = (value: number) => {
    dispatch(
      setDocumentsFilter({
        pageNumber: 0,
        versionStatusCode: value === DOCUMENT_STATUS_ALL_VALUE ? null : value,
      })
    );
  };

  const handleTypeChange = (value: number | null) => {
    dispatch(
      setDocumentsFilter({
        pageNumber: 0,
        type: value,
      })
    );
  };

  const handleApplySorting = (next: { sortingField: string; sortingOrder: number }) => {
    setSortModalVisible(false);
    dispatch(
      setDocumentsFilter({
        pageNumber: 0,
        sortingField: next.sortingField,
        sortingOrder: next.sortingOrder,
      })
    );
  };

  const handleApplyFilter = (nextFilter: {
    documentNumberStr: string;
    description: string;
    createdByName: string;
  }) => {
    setFilterModalVisible(false);
    const hasValues = Object.values(nextFilter).some((v) => v.trim() !== '');
    setHasAppliedFilters(hasValues);
    dispatch(
      setDocumentsFilter({
        pageNumber: 0,
        ...nextFilter,
      })
    );
  };

  const handleGoToPage = (page: number) => {
    dispatch(goToDocumentsPage(page));
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.panel}>
        <View style={styles.topFilterRow}>
          <Text style={styles.topFilterLabel}>Status</Text>
          <DocumentsSelect
            value={selectedStatusValue}
            options={documentStatusOptions}
            onChange={handleStatusChange}
          />
        </View>

        <View style={styles.topFilterRow}>
          <Text style={styles.topFilterLabel}>Type</Text>
          <DocumentsSelect
            value={selectedTypeValue}
            options={documentTypeOptions}
            onChange={handleTypeChange}
          />
        </View>

        <View style={styles.actionBar}>
          <View style={styles.filterSortBar}>
            <TouchableOpacity
              style={styles.filterSortButton}
              onPress={() => setFilterModalVisible(true)}
            >
              <Text style={[styles.filterSortText, hasAppliedFilters && styles.filterSortTextActive]}>
                Filter
              </Text>
              <MaterialIcons
                name="filter-alt"
                size={21}
                color={hasAppliedFilters ? theme.colors.primary : '#2f3a59'}
              />
            </TouchableOpacity>
            <View style={styles.filterSortDivider} />
            <TouchableOpacity
              style={styles.filterSortButton}
              onPress={() => setSortModalVisible(true)}
            >
              <Text style={styles.filterSortText}>Sort</Text>
              <MaterialIcons name="sort" size={21} color="#2f3a59" />
            </TouchableOpacity>
          </View>
        </View>

        {error ? (
          <View style={screenStyles.errorBox}>
            <Text style={screenStyles.errorText}>{error}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.loader}>
            <IntegrixLoader size={44} />
          </View>
        ) : items.length === 0 ? (
          <Text style={styles.emptyText}>No documents found.</Text>
        ) : (
          <View>
            {items.map((document) => (
              <DocumentsListCard
                key={document.id}
                document={document}
                onStartTask={handleStartTask}
                onView={openDocument}
                onShare={openShareDocument}
              />
            ))}
          </View>
        )}

        {items.length > 0 ? (
          <Paginator
            currentPage={currentPage}
            totalPages={pageCount}
            isLoading={isLoading}
            onPageChange={handleGoToPage}
          />
        ) : null}
      </View>

      <DocumentsSortModal
        visible={sortModalVisible}
        sortingField={currentSortingField}
        sortingOrder={currentSortingOrder}
        sortingFieldOptions={documentSortFieldOptions}
        sortingOrderOptions={documentSortOrderOptions}
        onClose={() => setSortModalVisible(false)}
        onApply={handleApplySorting}
      />

      <DocumentsFilterModal
        visible={filterModalVisible}
        initialValues={{
          documentNumberStr: filteringModel.documentNumberStr ?? '',
          description: filteringModel.description ?? '',
          createdByName: filteringModel.createdByName ?? '',
        }}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilter}
        onResetFlag={() => setHasAppliedFilters(false)}
      />

      <StartTaskModal
        visible={startTaskVisible}
        document={startTaskDocument}
        companyId={user?.companyId ?? null}
        submitting={startTaskSubmitting}
        onClose={handleCloseStartTask}
        onSubmit={handleSubmitStartTask}
        onOpenAssetsPage={() => {
          handleCloseStartTask();
          navigation.navigate('CompanyAssets' as never);
        }}
      />

      <ShareDocumentModal
        visible={shareModalVisible}
        document={shareModalDocument}
        onClose={closeShareDocumentModal}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    paddingBottom: 16,
  },
  panel: {
    borderWidth: 1,
    borderColor: '#d7dfef',
    borderRadius: 4,
    backgroundColor: '#f7f9ff',
    padding: 12,
    minHeight: 620,
  },
  topFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  topFilterLabel: {
    width: 58,
    color: '#101214',
    fontSize: 16,
    fontWeight: '700',
  },
  actionBar: {
    marginTop: 10,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  filterSortBar: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#eae8f1',
    borderRadius: 4,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#dadee8',
    shadowOpacity: 0.75,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  filterSortButton: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  filterSortText: {
    color: '#2f3a59',
    fontSize: 16,
  },
  filterSortTextActive: {
    color: theme.colors.primary,
  },
  filterSortDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#d9d9d9',
  },
  loader: {
    minHeight: 360,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 20,
    color: '#6a748f',
    fontSize: 14,
  },
});
