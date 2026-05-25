export const STORAGE_KEYS = {
  contacts: 'ls_contacts',
  requests: 'ls_requests',
  messages: 'ls_messages',
  groups: 'ls_groups',
  notifications: 'ls_notifications',
  globalIndex: 'ls_globalIndex'
};

export function save(key, value) {

  try {

    localStorage.setItem(
      key,
      JSON.stringify(value)
    );

  } catch (error) {

    console.error('Save error', error);

  }

}

export function load(key, fallback = []) {

  try {

    const value = localStorage.getItem(key);

    if (!value) return fallback;

    return JSON.parse(value);

}
