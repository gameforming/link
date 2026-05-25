import {
  STORAGE_KEYS,
  save,
  load
} from './storage.js';

import {
  createMessage,
  addMessage,
  calculateRemaining
} from './messages.js';

import {
  addContact,
  removeContact
} from './contacts.js';

import {
  addRequest,
  removeRequest
} from './requests.js';

import {
  createGroup
} from './groups.js';

import {
  updateNotificationBadge
} from './notifications.js';

import {
  getVisibleMessages
} from './virtualization.js';

import {
  RULES_HTML
} from './rules.js';

const state = {

  contacts: load(STORAGE_KEYS.contacts),
  requests: load(STORAGE_KEYS.requests),
  messages: load(STORAGE_KEYS.messages),
  groups: load(STORAGE_KEYS.groups),

  globalMessageIndex: Number(
    localStorage.getItem(STORAGE_KEYS.globalIndex)
  ) || 0,

  currentChat: null,
  pendingDelete: null

};

const contactsList = document.getElementById('contacts-list');
const requestsList = document.getElementById('requests-list');
const groupsList = document.getElementById('groups-list');
const rulesContent = document.getElementById('rules-content');

const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

const chatTitle = document.getElementById('chat-title');

const modal = document.getElementById('confirm-modal');
const cancelDelete = document.getElementById('cancel-delete');
const confirmDelete = document.getElementById('confirm-delete');

boot();

function boot() {

  setupTabs();

  setupEvents();

  renderContacts();
  renderRequests();
  renderGroups();
  renderMessages();

  rulesContent.innerHTML = RULES_HTML;

  if (!state.contacts.length) {
    seedDemoData();
  }

  updateNotificationBadge(state);

}

function saveAll() {

  save(STORAGE_KEYS.contacts, state.contacts);
  save(STORAGE_KEYS.requests, state.requests);
  save(STORAGE_KEYS.messages, state.messages);
  save(STORAGE_KEYS.groups, state.groups);

  localStorage.setItem(
    STORAGE_KEYS.globalIndex,
    state.globalMessageIndex
  );

}

function setupTabs() {

  const buttons = document.querySelectorAll('.tab-button');
  const panels = document.querySelectorAll('.panel');

  buttons.forEach(button => {

    button.addEventListener('click', () => {

      buttons.forEach(btn => {
        btn.classList.remove('active');
      });

      panels.forEach(panel => {
        panel.classList.remove('active');
      });

      button.classList.add('active');

      document
        .getElementById(`${button.dataset.tab}-panel`)
        .classList.add('active');

    });

  });

}

function setupEvents() {

  sendBtn.addEventListener('click', sendMessage);

  messageInput.addEventListener('keydown', event => {

    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {

      event.preventDefault();

      sendMessage();

    }

  });

  cancelDelete.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  confirmDelete.addEventListener('click', () => {

    if (!state.pendingDelete) return;

    removeContact(state, state.pendingDelete);

    saveAll();

    renderContacts();

    modal.classList.add('hidden');

  });

  document
    .getElementById('add-contact-btn')
    .addEventListener('click', () => {

      const username = prompt('Naam contact');

      if (!username) return;

      addContact(state, username);

      saveAll();

      renderContacts();

    });

  document
    .getElementById('create-group-btn')
    .addEventListener('click', () => {

      const name = prompt('Groep naam');

      if (!name) return;

      createGroup(state, name);

      saveAll();

      renderGroups();

    });

}

function sendMessage() {

  const text = messageInput.value.trim();

  if (!text) return;

  const message = createMessage(
    state,
    'You',
    text
  );

  addMessage(state, message);

  saveAll();

  renderMessages();

  messageInput.value = '';

}

function renderContacts() {

  contactsList.innerHTML = '';

  state.contacts.forEach(contact => {

    const div = document.createElement('div');

    div.className = 'contact-item';

    div.innerHTML = `

      <div class="contact-left">

        <div class="contact-name">
          ${contact.username}
        </div>

        <div class="contact-meta">
          unread: ${contact.unread}
        </div>

      </div>

      <div class="contact-actions">

        <button class="accept-btn open-btn">
          Open
        </button>

        <button class="delete-btn delete-btn-contact">
          Delete
        </button>

      </div>

    `;

    div
      .querySelector('.open-btn')
      .addEventListener('click', () => {

        state.currentChat = contact.id;

        chatTitle.textContent = contact.username;

      });

    div
      .querySelector('.delete-btn-contact')
      .addEventListener('click', () => {

        state.pendingDelete = contact.id;

        modal.classList.remove('hidden');

      });

    contactsList.appendChild(div);

  });

}

function renderRequests() {

  requestsList.innerHTML = '';

  state.requests.forEach(request => {

    const div = document.createElement('div');

    div.className = 'request-item';

    div.innerHTML = `

      <div class="contact-left">

        <div class="contact-name">
          ${request.username}
        </div>

      </div>

      <div class="contact-actions">

        <button class="accept-btn accept-request">
          Accept
        </button>

        <button class="delete-btn delete-request">
          Delete
        </button>

      </div>

    `;

    div
      .querySelector('.accept-request')
      .addEventListener('click', () => {

        addContact(state, request.username);

        removeRequest(state, request.id);

        saveAll();

        renderContacts();
        renderRequests();

      });

    div
      .querySelector('.delete-request')
      .addEventListener('click', () => {

        removeRequest(state, request.id);

        saveAll();

        renderRequests();

      });

    requestsList.appendChild(div);

  });

}

function renderGroups() {

  groupsList.innerHTML = '';

  state.groups.forEach(group => {

    const div = document.createElement('div');

    div.className = 'contact-item';

    div.innerHTML = `

      <div class="contact-left">

        <div class="contact-name">
          ${group.name}
        </div>

        <div class="contact-meta">
          leden: ${group.members.length}
        </div>

      </div>

    `;

    groupsList.appendChild(div);

  });

}

function renderMessages() {

  messagesContainer.innerHTML = '';

  const visible = getVisibleMessages(state.messages);

  visible.forEach(message => {

    const div = document.createElement('div');

    div.className = 'message';

    if (message.sender === 'You') {
      div.classList.add('self');
    }

    div.innerHTML = `

      <div class="message-header">

        <span>
          ${message.sender}
        </span>

        <span>
          ${new Date(message.createdAt)
            .toLocaleTimeString()}
        </span>

      </div>

      <div class="message-content">
        ${escapeHtml(message.message)}
      </div>

      <div class="message-counter">
        ${calculateRemaining(state, message)} berichten tot delete
      </div>

    `;

    messagesContainer.appendChild(div);

  });

  messagesContainer.scrollTop = messagesContainer.scrollHeight;

}

function escapeHtml(text) {

  const div = document.createElement('div');

  div.textContent = text;

  return div.innerHTML;

}

function seedDemoData() {

  addContact(state, 'Alex');
  addContact(state, 'Sarah');

  addRequest(state, 'Mike');

  saveAll();

  renderContacts();
  renderRequests();

}
