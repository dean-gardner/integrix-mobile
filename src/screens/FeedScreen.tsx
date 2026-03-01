import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { AppDispatch, RootState } from '../store';
import {
  fetchFeedItems,
  fetchMoreFeedItems,
  setFeedFilteringOption,
  resetFeed,
} from '../store/feedSlice';
import {
  fetchTasks,
  goToTasksPage,
  setTasksFilteringOption,
} from '../store/tasksSlice';
import { TaskTypeEnum } from '../types/task';
import type { TaskReadDTO } from '../types/task';
import type { FeedItemDTO } from '../types/feed';
import { theme } from '../theme';
import {
  defaultFeedTaskIndicatorColor,
  feedEmptyStateText,
  feedTabOptions,
  feedTaskFilterOptions,
  type FeedTabKey,
  type FeedTaskFilterId,
} from '../config/feedScreen';
import { FeedTabSwitch } from '../components/feed/FeedTabSwitch';
import { TaskFilterSelect } from '../components/feed/TaskFilterSelect';
import { FeedTaskCard } from '../components/feed/FeedTaskCard';
import { FeedPostCard } from '../components/feed/FeedPostCard';
import { Paginator } from '../components/Paginator';

type TaskWithFeedMeta = TaskReadDTO & {
  companyTeamId?: number;
  isSharedWithMe?: boolean;
};

export default function FeedScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const scrollRef = useRef<ScrollView>(null);
  const user = useSelector((s: RootState) => s.auth.user);
  const feedState = useSelector((s: RootState) => s.feed);
  const tasksState = useSelector((s: RootState) => s.tasks);

  const [activeTab, setActiveTab] = useState<FeedTabKey>('feed');
  const [selectedTaskFilterId, setSelectedTaskFilterId] = useState<FeedTaskFilterId | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const selectedTaskFilter = useMemo(
    () =>
      selectedTaskFilterId
        ? feedTaskFilterOptions.find((filter) => filter.id === selectedTaskFilterId) ?? null
        : null,
    [selectedTaskFilterId]
  );

  const [loadingMoreFeed, setLoadingMoreFeed] = useState(false);

  useEffect(() => {
    if (!feedState.isLoading) setLoadingMoreFeed(false);
  }, [feedState.isLoading]);

  const tasksPageSize = tasksState.filteringModel?.pageSize || 10;
  const tasksTotalPages = Math.max(1, Math.ceil(tasksState.totalCount / tasksPageSize));
  const tasksCurrentPage = (tasksState.filteringModel?.pageNumber ?? 0) + 1;

  useEffect(() => {
    dispatch(setFeedFilteringOption({ field: 'pageNumber', value: 0 }));
    dispatch(setFeedFilteringOption({ field: 'pageSize', value: 10 }));
    dispatch(fetchFeedItems());

    dispatch(setTasksFilteringOption({ field: 'pageSize', value: 10 }));
    dispatch(setTasksFilteringOption({ field: 'sortingField', value: 'createdOnUtc' }));
    dispatch(setTasksFilteringOption({ field: 'sortingOrder', value: 1 }));

    return () => {
      dispatch(resetFeed());
    };
  }, [dispatch]);

  useEffect(() => {
    dispatch(setTasksFilteringOption({ field: 'pageNumber', value: 0 }));

    if (!selectedTaskFilter) {
      dispatch(setTasksFilteringOption({ field: 'type', value: TaskTypeEnum.AllFeedTasks }));
      dispatch(setTasksFilteringOption({ field: 'createdById', value: null }));
      dispatch(fetchTasks());
      return;
    }

    if (selectedTaskFilter.useCurrentUserId) {
      dispatch(setTasksFilteringOption({ field: 'createdById', value: user?.id ?? null }));
      dispatch(setTasksFilteringOption({ field: 'type', value: null }));
      dispatch(fetchTasks());
      return;
    }

    dispatch(setTasksFilteringOption({ field: 'createdById', value: null }));
    dispatch(setTasksFilteringOption({ field: 'type', value: selectedTaskFilter.taskType }));
    dispatch(fetchTasks());
  }, [dispatch, selectedTaskFilter, user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    dispatch(setFeedFilteringOption({ field: 'pageNumber', value: 0 }));
    dispatch(setTasksFilteringOption({ field: 'pageNumber', value: 0 }));
    await Promise.all([
      dispatch(fetchFeedItems()).unwrap().catch(() => {}),
      dispatch(fetchTasks()).unwrap().catch(() => {}),
    ]);
    setRefreshing(false);
  }, [dispatch]);

  const openTaskDetail = useCallback(
    (task: TaskReadDTO, taskStepId?: string, scrollToSteps?: boolean) => {
      (navigation.navigate as (name: string, params?: object) => void)('TaskDetail', {
        task,
        taskStepId: taskStepId ?? null,
        scrollToSteps: scrollToSteps ?? false,
      });
    },
    [navigation]
  );

  const openTaskFromFeedPost = useCallback(
    (post: FeedItemDTO) => {
      if (!post.taskId) return;

      const taskFromList = tasksState.items.find((task) => task.id === post.taskId);
      const versionId =
        (typeof post.versionId === 'string' ? post.versionId : null) ??
        (typeof taskFromList?.versionId === 'string' ? taskFromList.versionId : null);

      if (!versionId) return;

      const mergedTask: TaskReadDTO = {
        ...(taskFromList ?? {}),
        id: post.taskId,
        taskNumber:
          (typeof taskFromList?.taskNumber === 'string' ? taskFromList.taskNumber : null) ??
          (typeof post.taskNo === 'string' ? post.taskNo : null) ??
          post.taskId,
        versionId,
        documentId:
          (typeof post.documentId === 'string' ? post.documentId : null) ??
          (typeof taskFromList?.documentId === 'string' ? taskFromList.documentId : undefined),
        description:
          (typeof post.taskTitle === 'string' ? post.taskTitle : null) ??
          (typeof post.description === 'string' ? post.description : null) ??
          (typeof taskFromList?.description === 'string' ? taskFromList.description : undefined),
        workOrderNumber:
          (typeof post.workOrderNumber === 'string' ? post.workOrderNumber : null) ??
          (typeof taskFromList?.workOrderNumber === 'string' ? taskFromList.workOrderNumber : null),
        notificationNumber:
          (typeof post.notificationNumber === 'string' ? post.notificationNumber : null) ??
          (typeof taskFromList?.notificationNumber === 'string' ? taskFromList.notificationNumber : null),
        projectNumber:
          (typeof post.projectNumber === 'string' ? post.projectNumber : null) ??
          (typeof taskFromList?.projectNumber === 'string' ? taskFromList.projectNumber : null),
        asset:
          typeof post.assetName === 'string'
            ? { id: 0, name: post.assetName }
            : (taskFromList?.asset as TaskReadDTO['asset']),
      };

      const stepId = typeof post.taskStepId === 'string' ? post.taskStepId : undefined;
      openTaskDetail(mergedTask, stepId, true);
    },
    [openTaskDetail, tasksState.items]
  );

  const onScroll = useCallback((event: { nativeEvent: { contentOffset: { y: number } } }) => {
    const shouldShow = event.nativeEvent.contentOffset.y > 420;
    setShowBackToTop((current) => (current === shouldShow ? current : shouldShow));
  }, []);

  const resolveTaskIndicatorColor = useCallback(
    (task: TaskWithFeedMeta): string => {
      if (selectedTaskFilter) return selectedTaskFilter.indicatorColor;

      const iStartedFilter = feedTaskFilterOptions.find((f) => f.id === 'iStarted');
      const myTeamFilter = feedTaskFilterOptions.find((f) => f.id === 'myTeam');
      const sharedFilter = feedTaskFilterOptions.find((f) => f.id === 'sharedWithMe');

      if (task.createdById && task.createdById === user?.id) {
        return iStartedFilter?.indicatorColor ?? defaultFeedTaskIndicatorColor;
      }
      if (
        typeof task.companyTeamId === 'number' &&
        typeof user?.companyTeamId === 'number' &&
        task.companyTeamId === user.companyTeamId
      ) {
        return myTeamFilter?.indicatorColor ?? defaultFeedTaskIndicatorColor;
      }
      if (task.isSharedWithMe) {
        return sharedFilter?.indicatorColor ?? defaultFeedTaskIndicatorColor;
      }
      return defaultFeedTaskIndicatorColor;
    },
    [selectedTaskFilter, user?.companyTeamId, user?.id]
  );

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <FeedTabSwitch tabs={feedTabOptions} activeTab={activeTab} onTabPress={setActiveTab} />

        {activeTab === 'feed' ? (
          <View style={styles.feedSection}>
            {feedState.isLoading && feedState.items.length === 0 ? (
              <View style={styles.loader}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : feedState.error ? (
              <Text style={styles.errorText}>{feedState.error}</Text>
            ) : feedState.items.length === 0 ? (
              <Text style={styles.emptyStateText}>{feedEmptyStateText}</Text>
            ) : (
              <View style={styles.feedList}>
                {feedState.items.map((item) => (
                  <FeedPostCard
                    key={item.id}
                    post={item}
                    userCompanyId={user?.companyId ?? null}
                    onOpenTask={openTaskFromFeedPost}
                  />
                ))}
                {!feedState.noMorePages ? (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={() => {
                      if (loadingMoreFeed || feedState.isLoading) return;
                      setLoadingMoreFeed(true);
                      dispatch(fetchMoreFeedItems());
                    }}
                    disabled={loadingMoreFeed || feedState.isLoading}
                  >
                    {loadingMoreFeed ? (
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                      <Text style={styles.loadMoreText}>Load more</Text>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>
        ) : (
          <View>
            <View style={styles.tasksHeader}>
              <Text style={styles.tasksTitle}>Tasks in progress</Text>
              <TouchableOpacity style={styles.seeAllLink} onPress={() => navigation.navigate('Tasks' as never)}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>

            <TaskFilterSelect
              options={feedTaskFilterOptions}
              selectedFilterId={selectedTaskFilterId}
              onSelect={setSelectedTaskFilterId}
            />

            <View style={styles.tasksList}>
              {tasksState.isLoading && tasksState.items.length === 0 ? (
                <View style={styles.loader}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
              ) : tasksState.items.length === 0 ? (
                <Text style={styles.emptyStateText}>No tasks yet.</Text>
              ) : (
                <>
                  {tasksState.items.map((task) => (
                    <FeedTaskCard
                      key={task.id}
                      task={task}
                      indicatorColor={resolveTaskIndicatorColor(task as TaskWithFeedMeta)}
                      onPress={() => openTaskDetail(task)}
                    />
                  ))}

                  <Paginator
                    currentPage={tasksCurrentPage}
                    totalPages={tasksTotalPages}
                    isLoading={tasksState.isLoading}
                    onPageChange={(page) => {
                      dispatch(goToTasksPage(page));
                      scrollRef.current?.scrollTo({ y: 0, animated: true });
                    }}
                  />
                </>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {showBackToTop ? (
        <TouchableOpacity
          style={styles.backToTopButton}
          onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          activeOpacity={0.85}
        >
          <MaterialIcons name="keyboard-double-arrow-up" size={30} color="#ffffff" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: 10,
    paddingTop: 14,
    paddingBottom: 86,
  },
  feedSection: {
    minHeight: 240,
  },
  loader: {
    paddingVertical: 22,
    alignItems: 'center',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#5a6784',
  },
  feedList: {
    gap: 12,
  },
  tasksHeader: {
    marginTop: 2,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tasksTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: '#2f3138',
  },
  seeAllLink: {
    minWidth: 70,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(25, 118, 210, 0.08)',
    alignItems: 'center',
  },
  seeAllText: {
    color: '#1976d2',
    fontSize: 13,
    fontWeight: '500',
  },
  tasksList: {
    marginTop: 14,
    gap: 8,
  },
  loadMoreButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
    marginTop: 4,
  },
  loadMoreText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  backToTopButton: {
    position: 'absolute',
    right: 10,
    bottom: 20,
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: '#243aa8',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
