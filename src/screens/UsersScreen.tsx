import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import type { AppDispatch, RootState } from '../store';
import { getRoles } from '../api/auth';
import { InviteTeamMemberModal } from '../components/users/InviteTeamMemberModal';
import { theme } from '../theme';
import { formatDateTime } from '../config/taskDetail';
import {
  toInvitationStatusLabel,
  type UserInvitationCreateDTO,
  type UserInvitationReadDTO,
} from '../types/invitation';
import type { RoleDTO, UserReadDTO } from '../types/user';
import { fetchTeams } from '../store/teamsSlice';
import { fetchUsers, setUsersFilter } from '../store/usersSlice';
import {
  createInvitation,
  fetchUserInvitations,
  setUserInvitationsFilter,
} from '../store/userInvitationsSlice';
import { useTranslation } from 'react-i18next';

type UsersTab = 'members' | 'invitations';

type UsersTableRow = {
  id: string;
  fullName: string;
  email: string;
  team: string;
  role?: string;
  license?: string;
  lastAccess?: string;
  status?: string;
  sendOn?: string;
};

/** Fixed column widths so the table overflows horizontally and can scroll (web parity). */
const CHECK_COL_W = 40;
const COL_FULL_NAME_W = 168;
const COL_EMAIL_W = 220;
const COL_TEAM_W = 148;
const COL_LICENSE_W = 96;
const COL_ROLE_W = 104;
const COL_LAST_ACCESS_W = 156;
const COL_STATUS_W = 104;
const COL_SEND_ON_W = 156;

const MEMBERS_TABLE_MIN_WIDTH =
  CHECK_COL_W +
  COL_FULL_NAME_W +
  COL_EMAIL_W +
  COL_TEAM_W +
  COL_LICENSE_W +
  COL_ROLE_W +
  COL_LAST_ACCESS_W;

const INVITATIONS_TABLE_MIN_WIDTH =
  CHECK_COL_W + COL_FULL_NAME_W + COL_EMAIL_W + COL_TEAM_W + COL_STATUS_W + COL_SEND_ON_W;

const ADMIN_ROLE = 'Admin';
const PAGE_SIZE_OPTIONS = [10, 25, 100];

function mapUserToTableRow(user: UserReadDTO): UsersTableRow {
  const computedFullName =
    user.fullName?.trim() ||
    `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() ||
    user.email;
  const license = user.subscriptionTariff?.trim();
  return {
    id: user.id,
    fullName: computedFullName,
    email: user.email,
    team: user.team?.trim() ? user.team : '—',
    role: user.role?.trim() ? user.role : '—',
    license: license && license.length > 0 ? license : '—',
    lastAccess: formatDateTime(user.lastAccessUtc),
  };
}

function mapInvitationToTableRow(invitation: UserInvitationReadDTO): UsersTableRow {
  return {
    id: invitation.id,
    fullName: invitation.fullName || invitation.email,
    email: invitation.email,
    team: invitation.team?.trim() ? invitation.team : '—',
    status: toInvitationStatusLabel(invitation.status),
    sendOn: formatDateTime(invitation.sendOn),
  };
}

export default function UsersScreen() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = useSelector((s: RootState) => s.auth.user);
  const teams = useSelector((s: RootState) => s.teams.items);
  const {
    items: users,
    isLoading: usersLoading,
    error: usersError,
    totalCount: usersTotalCount,
    filteringModel: usersFilteringModel,
  } = useSelector((s: RootState) => s.users);
  const {
    items: invitations,
    isLoading: invitationsLoading,
    error: invitationsError,
    totalCount: invitationsTotalCount,
    filteringModel: invitationsFilteringModel,
  } = useSelector((s: RootState) => s.userInvitations);

  const [initialized, setInitialized] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<UsersTab>('members');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedInvitationIds, setSelectedInvitationIds] = useState<string[]>([]);

  const [inviteVisible, setInviteVisible] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [roles, setRoles] = useState<RoleDTO[]>([]);

  const isAdmin = Boolean(currentUser?.roles?.includes(ADMIN_ROLE));
  const membersTabLabel = isAdmin ? t('app.users.tabUsers') : t('app.users.tabMembers');
  const invitationsTabLabel = isAdmin ? t('app.users.tabInvitesAdmin') : t('app.users.tabInvites');

  const teamRows = useMemo(() => users.map(mapUserToTableRow), [users]);
  const invitationRows = useMemo(
    () => invitations.map(mapInvitationToTableRow),
    [invitations]
  );
  const rows = activeTab === 'members' ? teamRows : invitationRows;

  const activeError = activeTab === 'members' ? usersError : invitationsError;
  const activeLoading = activeTab === 'members' ? usersLoading : invitationsLoading;
  const activeTotalCount = activeTab === 'members' ? usersTotalCount : invitationsTotalCount;
  const activeFilteringModel =
    activeTab === 'members' ? usersFilteringModel : invitationsFilteringModel;
  const pageSize = Math.max(1, activeFilteringModel.pageSize || 10);
  const pageNumber = Math.max(0, activeFilteringModel.pageNumber || 0);
  const pageCount = Math.max(1, Math.ceil(activeTotalCount / pageSize));
  const fromIndex = activeTotalCount === 0 ? 0 : pageNumber * pageSize + 1;
  const toIndex = activeTotalCount === 0 ? 0 : Math.min(activeTotalCount, (pageNumber + 1) * pageSize);

  const selectedIds = activeTab === 'members' ? selectedMemberIds : selectedInvitationIds;
  const allRowsSelected = rows.length > 0 && rows.every((row) => selectedIds.includes(row.id));
  const someRowsSelected = !allRowsSelected && rows.some((row) => selectedIds.includes(row.id));

  useEffect(() => {
    dispatch(setUsersFilter({ pageNumber: 0, pageSize: 10 }));
    dispatch(setUserInvitationsFilter({ pageNumber: 0, pageSize: 10 }));
    setInitialized(true);
  }, [dispatch]);

  useEffect(() => {
    if (!initialized || activeTab !== 'members') return;
    dispatch(fetchUsers());
  }, [activeTab, dispatch, initialized, usersFilteringModel]);

  useEffect(() => {
    if (!initialized || activeTab !== 'invitations') return;
    dispatch(fetchUserInvitations());
  }, [activeTab, dispatch, initialized, invitationsFilteringModel]);

  const updateActivePage = (nextPageNumber: number) => {
    if (activeTab === 'members') {
      dispatch(setUsersFilter({ pageNumber: nextPageNumber }));
      return;
    }
    dispatch(setUserInvitationsFilter({ pageNumber: nextPageNumber }));
  };

  const updateActivePageSize = (nextPageSize: number) => {
    if (activeTab === 'members') {
      dispatch(setUsersFilter({ pageNumber: 0, pageSize: nextPageSize }));
      return;
    }
    dispatch(setUserInvitationsFilter({ pageNumber: 0, pageSize: nextPageSize }));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'members') {
        await dispatch(fetchUsers()).unwrap();
      } else {
        await dispatch(fetchUserInvitations()).unwrap();
      }
    } catch {
      // Keep visible state and errors from slices.
    } finally {
      setRefreshing(false);
    }
  };

  const openPageSizeMenu = () => {
    Alert.alert(t('app.common.rowsPerPage'), t('app.common.selectRowCount'), [
      ...PAGE_SIZE_OPTIONS.map((size) => ({
        text: String(size),
        onPress: () => updateActivePageSize(size),
      })),
      { text: t('app.modal.cancel'), style: 'cancel' },
    ]);
  };

  const toggleRowSelection = (id: string) => {
    if (activeTab === 'members') {
      setSelectedMemberIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
      return;
    }
    setSelectedInvitationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisibleRows = () => {
    const visibleIds = rows.map((row) => row.id);
    if (activeTab === 'members') {
      setSelectedMemberIds((prev) =>
        allRowsSelected ? prev.filter((id) => !visibleIds.includes(id)) : [...new Set([...prev, ...visibleIds])]
      );
      return;
    }
    setSelectedInvitationIds((prev) =>
      allRowsSelected ? prev.filter((id) => !visibleIds.includes(id)) : [...new Set([...prev, ...visibleIds])]
    );
  };

  const openInviteModal = () => {
    if (currentUser?.companyId) {
      dispatch(fetchTeams(currentUser.companyId));
    }
    setInviteError(null);
    setInviteVisible(true);
    getRoles()
      .then((res) => {
        setRoles(res.data ?? []);
      })
      .catch(() => {
        setRoles([]);
        setInviteError('Failed to load roles.');
      });
  };

  const closeInviteModal = () => {
    setInviteVisible(false);
    setInviteError(null);
  };

  const submitInvitation = async (model: UserInvitationCreateDTO) => {
    const nonAdminRoleId =
      roles.find((role) => role.name.toLowerCase() === 'user')?.id ?? roles[0]?.id ?? '';
    const roleId = isAdmin ? model.userRoleId : nonAdminRoleId;
    const teamId = isAdmin ? model.companyTeamId : currentUser?.companyTeamId ?? null;

    if (!roleId) {
      setInviteError('Role is not available yet. Try again.');
      throw new Error('Role is not available.');
    }
    if (teamId == null || teamId === 0) {
      setInviteError(
        teamId === 0
          ? 'You must be assigned to a team before inviting members.'
          : 'Team is not available yet. Try again.'
      );
      throw new Error('Team is not available.');
    }

    setInviteSubmitting(true);
    setInviteError(null);
    try {
      await dispatch(
        createInvitation({
          ...model,
          userRoleId: roleId,
          companyTeamId: teamId,
        })
      ).unwrap();
      await dispatch(fetchUserInvitations()).unwrap();
      setActiveTab('invitations');
      Alert.alert(t('app.users.inviteSentTitle'), t('app.users.inviteSentBody'));
    } catch (e) {
      const fallback = 'Failed to invite team member.';
      const message =
        typeof e === 'string'
          ? e || fallback
          : (e as { message?: string })?.message ?? fallback;
      setInviteError(message);
      throw new Error(message);
    } finally {
      setInviteSubmitting(false);
    }
  };

  const tableMinWidth =
    activeTab === 'members' ? MEMBERS_TABLE_MIN_WIDTH : INVITATIONS_TABLE_MIN_WIDTH;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>{t('app.users.usersTitle')}</Text>

        <TouchableOpacity style={styles.inviteButton} onPress={openInviteModal} activeOpacity={0.85}>
          <Text style={styles.inviteButtonText}>{t('app.users.inviteMember')}</Text>
        </TouchableOpacity>

        <View style={styles.tabsPanel}>
          <View style={styles.tabsTopLine} />
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'members' && styles.tabButtonActive]}
              onPress={() => setActiveTab('members')}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
                {membersTabLabel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'invitations' && styles.tabButtonActive]}
              onPress={() => setActiveTab('invitations')}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabText, activeTab === 'invitations' && styles.tabTextActive]}>
                {invitationsTabLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeError ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{activeError}</Text>
          </View>
        ) : null}

        {activeLoading && rows.length === 0 ? (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              {activeTab === 'members' ? t('app.users.noMembers') : t('app.users.noInvites')}
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator
            keyboardShouldPersistTaps="handled"
            style={styles.tableHScroll}
            contentContainerStyle={styles.tableHScrollContent}
          >
            <View style={[styles.tableSheet, { minWidth: tableMinWidth }]}>
              <View style={styles.tableHeader}>
                <TouchableOpacity
                  onPress={toggleSelectAllVisibleRows}
                  hitSlop={8}
                  style={styles.checkCell}
                >
                  <MaterialIcons
                    name={
                      allRowsSelected
                        ? 'check-box'
                        : someRowsSelected
                          ? 'indeterminate-check-box'
                          : 'check-box-outline-blank'
                    }
                    size={22}
                    color="#7e8086"
                  />
                </TouchableOpacity>
                <Text style={[styles.headerText, styles.colFullNameHeader]}>
                  {t('app.users.colFullName')}
                </Text>
                <Text style={[styles.headerText, styles.colEmailHeader]}>{t('app.users.colEmail')}</Text>
                <Text style={[styles.headerText, styles.colTeamHeader]}>{t('app.users.colTeam')}</Text>
                {activeTab === 'members' ? (
                  <>
                    <Text style={[styles.headerText, styles.colLicenseHeader]}>
                      {t('app.users.colLicense')}
                    </Text>
                    <Text style={[styles.headerText, styles.colRoleHeader]}>{t('app.users.colRole')}</Text>
                    <Text style={[styles.headerText, styles.colLastAccessHeader]}>
                      {t('app.users.colLastAccess')}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.headerText, styles.colStatusHeader]}>
                      {t('app.users.colStatus')}
                    </Text>
                    <Text style={[styles.headerText, styles.colSendOnHeader]}>
                      {t('app.users.colSendOn')}
                    </Text>
                  </>
                )}
              </View>

              {rows.map((row) => {
                const checked = selectedIds.includes(row.id);
                return (
                  <View key={row.id} style={styles.dataRow}>
                    <TouchableOpacity
                      onPress={() => toggleRowSelection(row.id)}
                      hitSlop={8}
                      style={styles.checkCell}
                    >
                      <MaterialIcons
                        name={checked ? 'check-box' : 'check-box-outline-blank'}
                        size={22}
                        color="#7e8086"
                      />
                    </TouchableOpacity>
                    <Text style={[styles.rowText, styles.colFullNameCell]} numberOfLines={1}>
                      {row.fullName}
                    </Text>
                    <Text style={[styles.rowText, styles.colEmailCell]} numberOfLines={1}>
                      {row.email}
                    </Text>
                    <Text style={[styles.rowText, styles.colTeamCell]} numberOfLines={1}>
                      {row.team}
                    </Text>
                    {activeTab === 'members' ? (
                      <>
                        <Text style={[styles.rowText, styles.colLicenseCell]} numberOfLines={1}>
                          {row.license}
                        </Text>
                        <Text style={[styles.rowText, styles.colRoleCell]} numberOfLines={1}>
                          {row.role}
                        </Text>
                        <Text style={[styles.rowText, styles.colLastAccessCell]} numberOfLines={1}>
                          {row.lastAccess}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.rowText, styles.colStatusCell]} numberOfLines={1}>
                          {row.status}
                        </Text>
                        <Text style={[styles.rowText, styles.colSendOnCell]} numberOfLines={1}>
                          {row.sendOn}
                        </Text>
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}

        <View style={styles.paginationRow}>
          <TouchableOpacity style={styles.pageSizeControl} onPress={openPageSizeMenu} activeOpacity={0.75}>
            <Text style={styles.pageSizeText}>{pageSize}</Text>
            <MaterialIcons name="arrow-drop-down" size={18} color="#6a6f78" />
          </TouchableOpacity>

          <Text style={styles.rangeText}>
            {fromIndex}-{toIndex} of {activeTotalCount}
          </Text>

          <View style={styles.paginationArrows}>
            <TouchableOpacity
              onPress={() => updateActivePage(pageNumber - 1)}
              disabled={pageNumber <= 0}
              style={styles.arrowButton}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="chevron-left"
                size={22}
                color={pageNumber <= 0 ? '#c4c6cd' : '#9ba0aa'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => updateActivePage(pageNumber + 1)}
              disabled={pageNumber >= pageCount - 1}
              style={styles.arrowButton}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="chevron-right"
                size={22}
                color={pageNumber >= pageCount - 1 ? '#c4c6cd' : '#9ba0aa'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <InviteTeamMemberModal
        visible={inviteVisible}
        isAdmin={isAdmin}
        roles={roles}
        teams={teams}
        currentTeamId={currentUser?.companyTeamId ?? null}
        loading={inviteSubmitting}
        error={inviteError}
        onClose={closeInviteModal}
        onSubmit={submitInvitation}
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
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 26,
  },
  panel: {
    borderWidth: 1,
    borderColor: '#d8ddea',
    borderRadius: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  panelTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: '#1f2a40',
    marginBottom: 12,
  },
  inviteButton: {
    minHeight: 44,
    borderRadius: 3,
    backgroundColor: '#2639a8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  inviteButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  tabsPanel: {
    borderWidth: 1,
    borderColor: '#d8deee',
    borderRadius: 3,
    overflow: 'hidden',
  },
  tabsTopLine: {
    height: 4,
    backgroundColor: '#2741b2',
  },
  tabsRow: {
    flexDirection: 'row',
  },
  tabButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d9deea',
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
  },
  tabText: {
    fontSize: 15,
    color: '#3f4550',
    fontWeight: '400',
  },
  tabTextActive: {
    color: '#2639a8',
  },
  errorWrap: {
    marginTop: 12,
    backgroundColor: '#fee',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 13,
  },
  tableHScroll: {
    marginTop: 10,
    flexGrow: 0,
  },
  tableHScrollContent: {
    paddingBottom: 4,
  },
  tableSheet: {
    flexDirection: 'column',
  },
  tableHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#d8dbe2',
    paddingHorizontal: 2,
  },
  checkCell: {
    width: CHECK_COL_W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    color: '#2a2f38',
    fontSize: 14,
    fontWeight: '600',
  },
  colFullNameHeader: {
    width: COL_FULL_NAME_W,
    paddingLeft: 10,
  },
  colEmailHeader: {
    width: COL_EMAIL_W,
    paddingLeft: 10,
  },
  colTeamHeader: {
    width: COL_TEAM_W,
    paddingLeft: 10,
  },
  colLicenseHeader: {
    width: COL_LICENSE_W,
    paddingLeft: 10,
  },
  colRoleHeader: {
    width: COL_ROLE_W,
    paddingLeft: 10,
  },
  colLastAccessHeader: {
    width: COL_LAST_ACCESS_W,
    paddingLeft: 10,
  },
  colStatusHeader: {
    width: COL_STATUS_W,
    paddingLeft: 10,
  },
  colSendOnHeader: {
    width: COL_SEND_ON_W,
    paddingLeft: 10,
  },
  dataRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#d8dbe2',
    paddingHorizontal: 2,
  },
  rowText: {
    color: '#272b33',
    fontSize: 14,
  },
  colFullNameCell: {
    width: COL_FULL_NAME_W,
    paddingLeft: 10,
    paddingRight: 4,
  },
  colEmailCell: {
    width: COL_EMAIL_W,
    paddingLeft: 10,
    paddingRight: 4,
  },
  colTeamCell: {
    width: COL_TEAM_W,
    paddingLeft: 10,
    paddingRight: 4,
  },
  colLicenseCell: {
    width: COL_LICENSE_W,
    paddingLeft: 10,
    paddingRight: 4,
  },
  colRoleCell: {
    width: COL_ROLE_W,
    paddingLeft: 10,
    paddingRight: 4,
  },
  colLastAccessCell: {
    width: COL_LAST_ACCESS_W,
    paddingLeft: 10,
    paddingRight: 4,
  },
  colStatusCell: {
    width: COL_STATUS_W,
    paddingLeft: 10,
    paddingRight: 4,
  },
  colSendOnCell: {
    width: COL_SEND_ON_W,
    paddingLeft: 10,
    paddingRight: 4,
  },
  loader: {
    paddingVertical: 22,
    alignItems: 'center',
  },
  emptyWrap: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#7c8190',
    fontSize: 14,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageSizeControl: {
    minWidth: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageSizeText: {
    color: '#3e4350',
    fontSize: 14,
  },
  rangeText: {
    color: '#3e4350',
    fontSize: 14,
  },
  paginationArrows: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  arrowButton: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
