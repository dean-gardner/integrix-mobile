import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import type { AppDispatch, RootState } from '../store';
import { fetchTasks, goToTasksPage, setTasksFilter } from '../store/tasksSlice';
import { screenStyles } from '../styles/screenStyles';
import { theme } from '../theme';
import { TaskTypeEnum } from '../types/task';
import type { TaskReadDTO } from '../types/task';
import { DocumentsSelect } from '../components/documents/DocumentsSelect';
import { DocumentsSortModal } from '../components/documents/DocumentsSortModal';
import { TasksListCard } from '../components/tasks/TasksListCard';
import { TasksFilterModal } from '../components/tasks/TasksFilterModal';
import { Paginator } from '../components/Paginator';
import {
  defaultTasksSortField,
  defaultTasksSortOrder,
  defaultTasksStatusValue,
  defaultTasksTypeValue,
  parseTaskReferenceFilter,
  TASK_STATUS_ALL_VALUE,
  toTaskReferenceFilterValue,
  type TasksFilterForm,
} from '../config/tasksScreen';

export default function TasksScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const tasksState = useSelector((s: RootState) => s.tasks);
  const { items, isLoading, error, filteringModel, totalCount } = tasksState;

  const [initialized, setInitialized] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [hasAppliedFilters, setHasAppliedFilters] = useState(false);

  const selectedStatusValue = useMemo(
    () =>
      typeof filteringModel.status === 'number' ? filteringModel.status : TASK_STATUS_ALL_VALUE,
    [filteringModel.status]
  );

  const selectedTypeValue = useMemo(
    () => (typeof filteringModel.type === 'number' ? filteringModel.type : null),
    [filteringModel.type]
  );

  const currentSortingField = useMemo(
    () =>
      typeof filteringModel.sortingField === 'string' && filteringModel.sortingField
        ? filteringModel.sortingField
        : defaultTasksSortField,
    [filteringModel.sortingField]
  );

  const currentSortingOrder = useMemo(
    () =>
      typeof filteringModel.sortingOrder === 'number'
        ? filteringModel.sortingOrder
        : defaultTasksSortOrder,
    [filteringModel.sortingOrder]
  );

  const taskReferenceFilter = useMemo(
    () => parseTaskReferenceFilter(filteringModel.taskReference),
    [filteringModel.taskReference]
  );

  const currentFilterValues = useMemo<TasksFilterForm>(
    () => ({
      taskNumber: filteringModel.taskNumber ?? '',
      description: filteringModel.description ?? '',
      taskReferenceField: taskReferenceFilter.taskReferenceField,
      taskReference: taskReferenceFilter.taskReference,
      createdBy: filteringModel.createdBy ?? '',
    }),
    [
      filteringModel.createdBy,
      filteringModel.description,
      filteringModel.taskNumber,
      taskReferenceFilter.taskReference,
      taskReferenceFilter.taskReferenceField,
    ]
  );

  const pageSize = filteringModel.pageSize || 10;
  const pageCount = Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize)));
  const currentPage = Math.min(pageCount, (filteringModel.pageNumber ?? 0) + 1);

  const taskStatusOptionsT = useMemo(
    () => [
      { value: TASK_STATUS_ALL_VALUE, label: t('app.taskFilter.all') },
      { value: 0, label: t('app.tasksScreen.inProgress') },
      { value: 1, label: t('app.tasksScreen.complete') },
      { value: 2, label: t('app.tasksScreen.cancelled') },
    ],
    [t]
  );
  const taskTypeOptionsT = useMemo(
    () => [
      { value: null as number | null, label: t('app.taskFilter.all') },
      { value: TaskTypeEnum.TeamTasks, label: t('app.tasksScreen.teamTasks') },
      { value: TaskTypeEnum.SharedTasks, label: t('app.tasksScreen.sharedTasks') },
    ],
    [t]
  );
  const taskSortFieldOptionsT = useMemo(
    () => [
      { value: 'taskNumber', label: t('app.tasksScreen.taskNo') },
      { value: 'createdOnUtc', label: t('app.tasksScreen.date') },
      { value: 'description', label: t('app.tasksScreen.description') },
      { value: 'assetName', label: t('app.tasksScreen.asset') },
      { value: 'status', label: t('app.tasks.status') },
      { value: 'createdBy', label: t('app.tasksScreen.createdBy') },
    ],
    [t]
  );
  const taskSortOrderOptionsT = useMemo(
    () => [
      { value: 0, label: t('app.tasksScreen.ascending') },
      { value: 1, label: t('app.tasksScreen.descending') },
    ],
    [t]
  );

  useEffect(() => {
    dispatch(
      setTasksFilter({
        pageNumber: 0,
        pageSize: 10,
        status: defaultTasksStatusValue,
        type: defaultTasksTypeValue,
        createdById: null,
        taskNumber: null,
        description: null,
        taskReference: null,
        createdBy: null,
        sortingField: defaultTasksSortField,
        sortingOrder: defaultTasksSortOrder,
      })
    );
    setInitialized(true);
  }, [dispatch]);

  useEffect(() => {
    if (!initialized) return;
    dispatch(fetchTasks());
  }, [dispatch, filteringModel, initialized]);

  const onRefresh = async () => {
    setRefreshing(true);
    dispatch(setTasksFilter({ pageNumber: 0 }));
    await dispatch(fetchTasks()).unwrap().catch(() => {});
    setRefreshing(false);
  };

  const openTask = (task: TaskReadDTO) => {
    (navigation.navigate as (name: string, params?: object) => void)('TaskDetail', { task });
  };

  const handleStatusChange = (value: number) => {
    dispatch(
      setTasksFilter({
        pageNumber: 0,
        status: value === TASK_STATUS_ALL_VALUE ? null : value,
      })
    );
  };

  const handleTypeChange = (value: number | null) => {
    dispatch(
      setTasksFilter({
        pageNumber: 0,
        type: value,
      })
    );
  };

  const handleApplySorting = (next: { sortingField: string; sortingOrder: number }) => {
    setSortModalVisible(false);
    dispatch(
      setTasksFilter({
        pageNumber: 0,
        sortingField: next.sortingField,
        sortingOrder: next.sortingOrder,
      })
    );
  };

  const handleApplyFilter = (nextFilter: TasksFilterForm) => {
    setFilterModalVisible(false);
    const taskNumber = nextFilter.taskNumber.trim() || null;
    const description = nextFilter.description.trim() || null;
    const createdBy = nextFilter.createdBy.trim() || null;
    const taskReference = toTaskReferenceFilterValue(
      nextFilter.taskReferenceField,
      nextFilter.taskReference
    );
    setHasAppliedFilters(Boolean(taskNumber || description || createdBy || taskReference));
    dispatch(
      setTasksFilter({
        pageNumber: 0,
        taskNumber,
        description,
        createdBy,
        taskReference,
      })
    );
  };

  const handleGoToPage = (page: number) => {
    dispatch(goToTasksPage(page));
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
          <Text style={styles.topFilterLabel}>{t('app.tasks.status')}</Text>
          <DocumentsSelect
            value={selectedStatusValue}
            options={taskStatusOptionsT}
            onChange={handleStatusChange}
          />
        </View>

        <View style={styles.topFilterRow}>
          <Text style={styles.topFilterLabel}>{t('app.tasks.type')}</Text>
          <DocumentsSelect
            value={selectedTypeValue}
            options={taskTypeOptionsT}
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
                {t('app.tasks.filter')}
              </Text>
              <MaterialIcons
                name="filter-alt"
                size={21}
                color={hasAppliedFilters ? theme.colors.primary : '#2f3a59'}
              />
            </TouchableOpacity>
            <View style={styles.filterSortDivider} />
            <TouchableOpacity style={styles.filterSortButton} onPress={() => setSortModalVisible(true)}>
              <Text style={styles.filterSortText}>{t('app.tasks.sort')}</Text>
              <MaterialIcons name="sort" size={21} color="#2f3a59" />
            </TouchableOpacity>
          </View>
        </View>

        {error ? (
          <View style={screenStyles.errorBox}>
            <Text style={screenStyles.errorText}>{error}</Text>
          </View>
        ) : null}

        {isLoading && items.length === 0 ? (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : items.length === 0 ? (
          <Text style={styles.emptyText}>{t('app.tasks.empty')}</Text>
        ) : (
          <View>
            {items.map((task) => (
              <TasksListCard
                key={task.id}
                task={task}
                onViewTask={openTask}
                onOpenActions={openTask}
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
        sortingFieldOptions={taskSortFieldOptionsT}
        sortingOrderOptions={taskSortOrderOptionsT}
        onClose={() => setSortModalVisible(false)}
        onApply={handleApplySorting}
      />

      <TasksFilterModal
        visible={filterModalVisible}
        initialValues={currentFilterValues}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilter}
        onResetFlag={() => setHasAppliedFilters(false)}
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
  },
  filterSortBar: {
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
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 20,
    color: '#6a748f',
    fontSize: 14,
  },
});
