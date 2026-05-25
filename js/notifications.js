export function updateNotificationBadge(state) {

  const badge = document.getElementById(
    'notification-badge'
  );

  const total = state.contacts.reduce((sum, contact) => {
    return sum + contact.unread;
  }, 0);

  badge.textContent = total;

}
