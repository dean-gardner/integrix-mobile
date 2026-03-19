import type { MaterialIconsIconName } from '@react-native-vector-icons/material-icons';

const ADMIN_ROLE = 'Admin';

export type DrawerMenuItem = {
  key: string;
  titleKey: string;
  route: string;
  icon: MaterialIconsIconName;
  requiredRoles?: string[];
  isVisibleForMobile?: boolean;
};

export type DrawerMenuGroup = {
  titleKey: string;
  items: DrawerMenuItem[];
};

export const drawerMenuGroups: DrawerMenuGroup[] = [
  {
    titleKey: 'drawer.groupAssets',
    items: [
      {
        key: 'Dashboard',
        titleKey: 'drawer.dashboard',
        route: 'Dashboard',
        icon: 'dashboard',
        isVisibleForMobile: false,
      },
      { key: 'Feed', titleKey: 'drawer.feed', route: 'Feed', icon: 'ballot' },
      {
        key: 'CompanyAssets',
        titleKey: 'drawer.assets',
        route: 'CompanyAssets',
        icon: 'list-alt',
        requiredRoles: [ADMIN_ROLE],
        isVisibleForMobile: false,
      },
    ],
  },
  {
    titleKey: 'drawer.groupInspections',
    items: [
      { key: 'Documents', titleKey: 'drawer.documents', route: 'Documents', icon: 'auto-stories' },
      { key: 'Tasks', titleKey: 'drawer.tasks', route: 'Tasks', icon: 'task' },
      {
        key: 'Defects',
        titleKey: 'drawer.defects',
        route: 'Defects',
        icon: 'gpp-bad',
        isVisibleForMobile: false,
      },
    ],
  },
  {
    titleKey: 'drawer.groupUserMgmt',
    items: [
      { key: 'Users', titleKey: 'drawer.users', route: 'Users', icon: 'people-outline' },
      {
        key: 'Teams',
        titleKey: 'drawer.teams',
        route: 'Teams',
        icon: 'diversity-3',
        requiredRoles: [ADMIN_ROLE],
        isVisibleForMobile: false,
      },
    ],
  },
  {
    titleKey: 'drawer.groupProfile',
    items: [
      {
        key: 'EditProfile',
        titleKey: 'drawer.editProfile',
        route: 'EditProfile',
        icon: 'manage-accounts',
      },
      {
        key: 'Subscription',
        titleKey: 'drawer.subscription',
        route: 'Subscription',
        icon: 'card-membership',
      },
    ],
  },
];
