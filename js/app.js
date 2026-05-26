// =====================================
// STATE
// =====================================

const state = {
  currentUser: null,
  currentChat: null,
  contacts: [],
  requests: [],
  groups: [],
  messages: [],
  notifications: 0
};

// =====================================
// DOM
// =====================================

const messagesContainer = document.getElementById("messages-container");
const contactsContainer = document.getElementById("contacts-container");
const requestsContainer = document.getElementById("requests-container");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-btn");
const clearChatBtn = document.getElementById("clear-chat-btn");
const notificationBadge = document.getElementById("notification-badge");

const usernameInput = document.getElementById("username-input");
const saveUsernameBtn = document.getElementById("save-username-btn");

const requestUserInput = document.getElementById("request-user-input");
const sendRequestBtn = document.getElementById("send-request-btn");

// =====================================
// USER INIT
// =====================================

function initUser() {

  let user = localStorage.getItem("chat_user");

  if (!user) {
    user = "user_" + Math.floor(Math.random() * 9999);
    localStorage.setItem("chat_user", user);
  }

  state.currentUser = user;

  if (usernameInput) {
    usernameInput.value = user;
  }

}

initUser();

// =====================================
// STORAGE HELPERS
// =====================================

function storageKey(type) {
  return `${type}_${state.currentUser}`;
}

function loadStorage(type, fallback = []) {

  try {

    const data = localStorage.getItem(storageKey(type));

    if (!data) return fallback;

    return JSON.parse(data);

  } catch {

    return fallback;

  }

}

function saveStorage(type, value) {

  localStorage.setItem(
    storageKey(type),
    JSON.stringify(value)
  );

}

// =====================================
// LOAD STATE
// =====================================

state.contacts = loadStorage("contacts", []);
state.requests = loadStorage("requests", []);
state.groups = loadStorage("groups", []);
state.messages = loadStorage("messages", []);

// =====================================
// ADMIN SUPPORT
// =====================================

if (!state.contacts.includes("ADMIN_SUPPORT")) {

  state.contacts.unshift("ADMIN_SUPPORT");

  saveStorage("contacts", state.contacts);
}

// =====================================
// WEBSOCKET
// =====================================

const ws = new WebSocket(
  "wss://YOUR-RENDER-URL.onrender.com"
);

ws.onopen = () => {

  ws.send(JSON.stringify({
    type: "register",
    userId: state.currentUser
  }));

  console.log("Connected to websocket");

};

ws.onclose = () => {
  console.log("Disconnected from websocket");
};

ws.onerror = (err) => {
  console.log(err);
};

// =====================================
// RECEIVE
// =====================================

ws.onmessage = (event) => {

  const data = JSON.parse(event.data);

  // REGISTERED
  if (data.type === "registered") {

    console.log("Registered:", data.userId);

    return;
  }

  // ERROR
  if (data.type === "error") {

    alert(data.message);

    return;
  }

  // REQUEST
  if (data.type === "request") {

    addRequest(data.from);

    return;
  }

  // MESSAGE
  if (data.type === "message") {

    const message = {
      sender: data.from,
      text: data.text,
      self: data.self || false,
      createdAt: data.createdAt,
      chat: data.self
        ? state.currentChat
        : data.from,
      deleteCounter: 1000
    };

    state.messages.push(message);

    // LIMIT 1000
    if (state.messages.length > 1000) {

      state.messages.shift();

      state.messages = state.messages.map(msg => ({
        ...msg,
        deleteCounter: Math.min(
          (msg.deleteCounter || 0) + 1,
          1000
        )
      }));

    }

    saveStorage("messages", state.messages);

    // NOTIFICATIONS
    if (
      !data.self &&
      state.currentChat !== data.from
    ) {

      state.notifications++;

      renderNotifications();
    }

    renderMessages();

  }

};

// =====================================
// USERNAME SAVE
// =====================================

if (saveUsernameBtn) {

  saveUsernameBtn.onclick = () => {

    const value = usernameInput.value.trim();

    if (!value) return;

    localStorage.setItem("chat_user", value);

    location.reload();

  };

}

// =====================================
// CONTACTS
// =====================================

function addContact(name) {

  if (!name || !name.trim()) return;

  if (state.contacts.includes(name)) return;

  if (state.contacts.length >= 40) {

    alert("Max contacts reached");

    return;
  }

  state.contacts.push(name);

  saveStorage("contacts", state.contacts);

  renderContacts();

}

function removeContact(name) {

  const confirmed = confirm(
    `Delete ${name}?`
  );

  if (!confirmed) return;

  state.contacts = state.contacts.filter(
    contact => contact !== name
  );

  saveStorage("contacts", state.contacts);

  renderContacts();

}

function renderContacts() {

  contactsContainer.innerHTML = "";

  if (!state.contacts.length) {

    contactsContainer.innerHTML = `
      <div class="empty-state">
        No contacts
      </div>
    `;

    return;
  }

  state.contacts.forEach(contact => {

    const div = document.createElement("div");

    div.className = "contact-item";

    div.innerHTML = `
      <div class="contact-left">
        <div class="contact-name">${contact}</div>
        <div class="contact-meta">
          Click to open chat
        </div>
      </div>

      <div class="contact-actions">
        <button class="delete-btn">
          Delete
        </button>
      </div>
    `;

    div.querySelector(".contact-left")
      .onclick = () => {

      state.currentChat = contact;

      renderMessages();

    };

    div.querySelector(".delete-btn")
      .onclick = () => {

      removeContact(contact);

    };

    contactsContainer.appendChild(div);

  });

}

// =====================================
// REQUESTS
// =====================================

function addRequest(name) {

  if (!name) return;

  if (state.requests.includes(name)) return;

  state.requests.push(name);

  saveStorage("requests", state.requests);

  renderRequests();

}

function acceptRequest(name) {

  addContact(name);

  state.requests = state.requests.filter(
    request => request !== name
  );

  saveStorage("requests", state.requests);

  renderRequests();

}

function deleteRequest(name) {

  state.requests = state.requests.filter(
    request => request !== name
  );

  saveStorage("requests", state.requests);

  renderRequests();

}

function renderRequests() {

  requestsContainer.innerHTML = "";

  if (!state.requests.length) {

    requestsContainer.innerHTML = `
      <div class="empty-state">
        No requests
      </div>
    `;

    return;
  }

  state.requests.forEach(request => {

    const div = document.createElement("div");

    div.className = "request-item";

    div.innerHTML = `
      <div class="contact-left">
        <div class="contact-name">${request}</div>
        <div class="contact-meta">
          Incoming request
        </div>
      </div>

      <div class="contact-actions">

        <button class="accept-btn">
          Accept
        </button>

        <button class="delete-btn">
          Delete
        </button>

      </div>
    `;

    div.querySelector(".accept-btn")
      .onclick = () => {

      acceptRequest(request);

    };

    div.querySelector(".delete-btn")
      .onclick = () => {

      deleteRequest(request);

    };

    requestsContainer.appendChild(div);

  });

}

// =====================================
// SEND REQUEST
// =====================================

if (sendRequestBtn) {

  sendRequestBtn.onclick = () => {

    const target =
      requestUserInput.value.trim();

    if (!target) return;

    ws.send(JSON.stringify({
      type: "request",
      to: target
    }));

    requestUserInput.value = "";

  };

}

// =====================================
// GROUPS
// =====================================

function createGroup(name, members = []) {

  state.groups.push({
    name,
    members,
    createdAt: Date.now()
  });

  saveStorage("groups", state.groups);

}

// =====================================
// SEND MESSAGE
// =====================================

function sendMessage(to, text) {

  if (!to) {

    alert("No chat selected");

    return;
  }

  if (!text.trim()) return;

  ws.send(JSON.stringify({
    type: "message",
    to,
    text
  }));

}

// =====================================
// RENDER MESSAGES
// =====================================

function renderMessages() {

  messagesContainer.innerHTML = "";

  const messages = state.messages.filter(
    message => message.chat === state.currentChat
  );

  messages.forEach(message => {

    const div = document.createElement("div");

    div.className = message.self
      ? "message self"
      : "message";

    const time = new Date(
      message.createdAt
    ).toLocaleTimeString();

    div.innerHTML = `
      <div class="message-header">
        <span>${message.sender}</span>
        <span>${time}</span>
      </div>

      <div class="message-content">
        ${message.text}
      </div>

      <div class="message-delete-counter">
        Deletes in: ${message.deleteCounter}
      </div>
    `;

    messagesContainer.appendChild(div);

  });

  messagesContainer.scrollTop =
    messagesContainer.scrollHeight;

}

// =====================================
// NOTIFICATIONS
// =====================================

function renderNotifications() {

  if (!notificationBadge) return;

  notificationBadge.textContent =
    state.notifications;

  if (state.notifications <= 0) {

    notificationBadge.style.display = "none";

  } else {

    notificationBadge.style.display = "flex";

  }

}

// =====================================
// CLEAR CHAT
// =====================================

function clearCurrentChat() {

  if (!state.currentChat) return;

  const confirmed = confirm(
    `Clear chat with ${state.currentChat}?`
  );

  if (!confirmed) return;

  state.messages = state.messages.filter(
    message => message.chat !== state.currentChat
  );

  saveStorage("messages", state.messages);

  renderMessages();

}

// =====================================
// SIDEBAR TAB SWITCHING
// =====================================

function switchPanel(id) {

  document.querySelectorAll(".panel")
    .forEach(panel => {

      panel.classList.remove("active");

    });

  document.querySelectorAll(".tab-button")
    .forEach(button => {

      button.classList.remove("active");

    });

  const targetPanel =
    document.getElementById(id);

  if (targetPanel) {
    targetPanel.classList.add("active");
  }

  const activeButton =
    document.querySelector(
      `[data-panel='${id}']`
    );

  if (activeButton) {
    activeButton.classList.add("active");
  }

}

// FIX SIDEBAR BUTTONS

document
  .querySelectorAll(".tab-button")
  .forEach(button => {

    button.onclick = () => {

      const panel =
        button.dataset.panel;

      switchPanel(panel);

    };

  });

// =====================================
// RULES
// =====================================

function renderRules() {

  const rules =
    document.getElementById("rules-content");

  if (!rules) return;

  rules.innerHTML = `

    <h2>Rules & Information</h2>

    <p>
      This app uses a Render WebSocket backend.
    </p>

    <p>
      Messages are routed live between users.
    </p>

    <p>
      localStorage stores:
      contacts,
      messages,
      requests,
      groups
      and settings.
    </p>

    <p>
      Messages are capped at 1000.
      Oldest messages get deleted.
    </p>

    <p>
      Contacts are capped at 40.
    </p>

    <p>
      ADMIN_SUPPORT can be used to
      report bugs and issues.
    </p>

  `;

}

// =====================================
// EVENTS
// =====================================

if (sendButton) {

  sendButton.onclick = () => {

    sendMessage(
      state.currentChat,
      messageInput.value
    );

    messageInput.value = "";

  };

}

if (messageInput) {

  messageInput.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {

        event.preventDefault();

        sendButton.click();

      }

    }
  );

}

if (clearChatBtn) {

  clearChatBtn.onclick = clearCurrentChat;

}

// =====================================
// INIT
// =====================================

renderContacts();
renderRequests();
renderMessages();
renderNotifications();
renderRules();

console.log("Chat app initialized");
