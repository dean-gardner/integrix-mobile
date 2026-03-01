import type { MaterialIconsIconName } from '@react-native-vector-icons/material-icons';

const ADMIN_ROLE = 'Admin';

export type DrawerMenuItem = {
  key: string;
  title: string;
  route: string;
  icon: MaterialIconsIconName;
  requiredRoles?: string[];
  isVisibleForMobile?: boolean;
};

export type DrawerMenuGroup = {
  title: string;
  items: DrawerMenuItem[];
};

export const drawerMenuGroups: DrawerMenuGroup[] = [
  {
    title: 'Assets and Activities',
    items: [
      { key: 'Dashboard', title: 'Dashboard', route: 'Dashboard', icon: 'dashboard', isVisibleForMobile: false },
      { key: 'Feed', title: 'Activity Feed', route: 'Feed', icon: 'ballot' },
      { key: 'CompanyAssets', title: 'Assets', route: 'CompanyAssets', icon: 'list-alt', requiredRoles: [ADMIN_ROLE], isVisibleForMobile: false },
    ],
  },
  {
    title: 'Inspections and Defects',
    items: [
      { key: 'Documents', title: 'Documents', route: 'Documents', icon: 'auto-stories' },
      { key: 'Tasks', title: 'Tasks', route: 'Tasks', icon: 'task' },
      { key: 'Defects', title: 'Defects', route: 'Defects', icon: 'gpp-bad', isVisibleForMobile: false },
    ],
  },
  {
    title: 'User management',
    items: [
      { key: 'Users', title: 'Users', route: 'Users', icon: 'people-outline' },
      { key: 'Teams', title: 'Teams', route: 'Teams', icon: 'diversity-3', requiredRoles: [ADMIN_ROLE], isVisibleForMobile: false },
    ],
  },
  {
    title: 'User profile',
    items: [
      { key: 'EditProfile', title: 'Edit My Profile', route: 'EditProfile', icon: 'manage-accounts' },
      { key: 'Subscription', title: 'Subscription', route: 'Subscription', icon: 'card-membership' },
    ],
  },
];
