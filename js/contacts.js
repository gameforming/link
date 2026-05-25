const MAX_CONTACTS = 40;

export function addContact(state, username) {

  if (state.contacts.length >= MAX_CONTACTS) {

    alert('Max contacten bereikt');

    return false;

  }

  const exists = state.contacts.some(contact => {
    return contact.username === username;
  });

  if (exists) {
    return false;
  }

  state.contacts.push({
    id: crypto.randomUUID(),
    username,
    addedAt: Date.now(),
    unread: 0
  });

  return true;

}

export function removeContact(state, id) {

  state.contacts = state.contacts.filter(contact => {
    return contact.id !== id;
  });

}
