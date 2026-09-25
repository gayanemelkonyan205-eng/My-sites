export const bottomItems = [
  { key: 'dashboard', icon: '⌂', label: 'Գլխավոր' },
  { key: 'study', icon: '▦', label: 'Ուսում' },
  { key: 'chat', icon: '✦', label: 'Չատ' },
  { key: 'notifications', icon: '●', label: 'Ծանուցում' },
  { key: 'more', icon: '•••', label: 'Ավելին' }
];
const studyViews = new Set(['schedule', 'homework', 'files', 'polls']);
const moreViews = new Set(['announcements', 'events', 'board', 'classmates', 'profile', 'admin', 'superadmin']);
export function sectionForView(view) {
  if (view === 'dashboard') return 'dashboard';
  if (studyViews.has(view)) return 'study';
  if (view === 'chat') return 'chat';
  if (view === 'notifications') return 'notifications';
  if (moreViews.has(view)) return 'more';
  return 'more';
}
