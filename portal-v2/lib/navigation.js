export const primaryDestinations = [
  { key: 'home', label: 'Գլխավոր', icon: 'home' },
  { key: 'study', label: 'Ուսում', icon: 'book' },
  { key: 'chat', label: 'Չատ', icon: 'chat' },
  { key: 'notifications', label: 'Ծանուց.', icon: 'bell' },
  { key: 'more', label: 'Ավելին', icon: 'grid' }
];

const commonMore = [
  { key: 'schedule', label: 'Դասացուցակ', icon: 'calendar' },
  { key: 'homework', label: 'Տնայիններ', icon: 'check' },
  { key: 'announcements', label: 'Հայտարարություններ', icon: 'megaphone' },
  { key: 'board', label: 'Տախտակ', icon: 'board' },
  { key: 'polls', label: 'Հարցումներ', icon: 'chart' },
  { key: 'files', label: 'Ֆայլեր', icon: 'folder' },
  { key: 'classmates', label: 'Դասընկերներ', icon: 'people' },
  { key: 'profile', label: 'Պրոֆիլ', icon: 'user' }
];

export function buildRoleDestinations(role) {
  const items = [...commonMore];
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    items.push({ key: 'admin', label: 'Admin Workspace', icon: 'wrench', privileged: true });
    items.push({ key: 'admin-requests', label: 'Admin Requests', icon: 'approve', privileged: true });
  }
  if (role === 'SUPER_ADMIN') {
    items.push({ key: 'superadmin', label: 'Control Center', icon: 'shield', privileged: true });
  }
  return items;
}

export function isDestinationAllowed(key, role) {
  if (primaryDestinations.some((item) => item.key === key && key !== 'more')) return true;
  return buildRoleDestinations(role).some((item) => item.key === key);
}
