// =============================
// STATE
// =============================

const state = {
  currentUser: null,
  currentChat: null,
  contacts: [],
  requests: [],
  groups: [],
  messages: [],
  notifications: 0
};

// =============================
// DOM
// =============================

const messagesContainer = document.getElementById("messages-container");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-btn");
const contactsContainer = document.getElementById("contacts-container");
const requestsContainer = document.getElementById("requests-container");
const notificationBadge = document.getElementById("notification-badge");
const clearChatBtn = document.getElementById("clear-chat-btn");
const addContactBtn = document.getElementById("add-contact-btn");

// =============================
// USER SYSTEM
// =============================

function initUser() {

  let user = localStorage.getItem("chat_user");

  if (!user) {

    user = prompt("Choose username");

    if (!user || !user.trim()) {
      user = "user_" + Math.floor(Math.random() * 9999);
    }

    localStorage.setItem("chat_user", user);
  }

  state.currentUser = user;

}

initUser();

// =============================
// STORAGE HELPERS
// =============================

function getStorageKey(type) {
  return `${type}_${state.currentUser}`;
}

function loadStorage(type, fallback = []) {

  try {

    const data = localStorage.getItem(getStorageKey(type));

    if (!data) return fallback;

    return JSON.parse(data);

  } catch {
    return fallback;
  }

}

function saveStorage(type, data) {

  localStorage.setItem(
    getStorageKey(type),
    JSON.stringify(data)
  );

}

// =============================
// LOAD STATE
// =============================

state.contacts = loadStorage("contacts", []);
state.requests = loadStorage("requests", []);
state.groups = loadStorage("groups", []);
state.messages = loadStorage("messages", []);

// =============================
// WEBSOCKET
// =============================

const ws = new WebSocket(
  "wss://link-9ec2.onrender.com"
);

ws.onopen = () => {

  ws.send(JSON.stringify({
    type: "register",
    userId: state.currentUser
  }));

  console.log("Connected to server");

};

ws.onclose = () => {
  console.log("Disconnected from server");
};

ws.onerror = (err) => {
  console.log(err);
};

// =============================
// RECEIVE MESSAGES
// =============================

ws.onmessage = (event) => {

  const data = JSON.parse(event.data);

  // REGISTERED
  if (data.type === "registered") {
    console.log("Registered as", data.userId);
    return;
  }

  // ERROR
  if (data.type === "error") {
    alert(data.message);
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
      ttl: 1000
    };

    state.messages.push(message);

    // MAX 1000
    if (state.messages.length > 1000) {

      state.messages.shift();

      // TTL UPDATE
      state.messages = state.messages.map(m => ({
        ...m,
        ttl: Math.min((m.ttl || 0) + 1, 1000)
      }));
    }

    saveStorage("messages", state.messages);

    // Notifications
    if (!data.self && state.currentChat !== data.from) {
      state.notifications++;
      renderNotifications();
    }

    renderMessages();
  }

};

// =============================
// CONTACTS
// =============================

function addContact(name) {

  if (!name || !name.trim()) return;

  if (state.contacts.includes(name)) return;

  if (state.contacts.length >= 40) {
    alert("Max 40 contacts");
    return;
  }

  state.contacts.push(name);

  saveStorage("contacts", state.contacts);

  renderContacts();
}

function removeContact(name) {

  const confirmed = confirm(
    `Delete contact ${name}?`
  );

  if (!confirmed) return;

  state.contacts = state.contacts.filter(
    c => c !== name
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
        <div class="contact-meta">Click to open chat</div>
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

// =============================
// REQUESTS
// =============================

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
    r => r !== name
  );

  saveStorage("requests", state.requests);

  renderRequests();
}

function deleteRequest(name) {

  state.requests = state.requests.filter(
    r => r !== name
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

  state.requests.forEach(req => {

    const div = document.createElement("div");

    div.className = "request-item";

    div.innerHTML = `
      <div class="contact-left">
        <div class="contact-name">${req}</div>
        <div class="contact-meta">Incoming request</div>
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
      .onclick = () => acceptRequest(req);

    div.querySelector(".delete-btn")
      .onclick = () => deleteRequest(req);

    requestsContainer.appendChild(div);
  });
}

// =============================
// GROUPS
// =============================

function createGroup(name, members = []) {

  state.groups.push({
    name,
    members,
    createdAt: Date.now()
  });

  saveStorage("groups", state.groups);
}

// =============================
// SEND MESSAGE
// =============================

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

// =============================
// RENDER MESSAGES
// =============================

function renderMessages() {

  messagesContainer.innerHTML = "";

  const filtered = state.messages.filter(
    msg => msg.chat === state.currentChat
  );

  filtered.forEach(msg => {

    const div = document.createElement("div");

    div.className = msg.self
      ? "message self"
      : "message";

    const time = new Date(
      msg.createdAt
    ).toLocaleTimeString();

    div.innerHTML = `
      <div class="message-header">
        <span>${msg.sender}</span>
        <span>${time}</span>
      </div>

      <div class="message-content">
        ${msg.text}
      </div>

      <div class="message-counter">
        Deletes in: ${msg.ttl}
      </div>
    `;

    messagesContainer.appendChild(div);
  });

  messagesContainer.scrollTop =
    messagesContainer.scrollHeight;
}

// =============================
// NOTIFICATIONS
// =============================

function renderNotifications() {

  notificationBadge.textContent =
    state.notifications;

  if (state.notifications <= 0) {
    notificationBadge.style.display = "none";
  } else {
    notificationBadge.style.display = "flex";
  }

}

// =============================
// CLEAR CHAT
// =============================

function clearCurrentChat() {

  if (!state.currentChat) return;

  const confirmed = confirm(
    `Clear chat with ${state.currentChat}?`
  );

  if (!confirmed) return;

  state.messages = state.messages.filter(
    m => m.chat !== state.currentChat
  );

  saveStorage("messages", state.messages);

  renderMessages();
}

// =============================
// TABS
// =============================

function switchPanel(id) {

  document.querySelectorAll(".panel")
    .forEach(panel => {
      panel.classList.remove("active");
    });

  document.querySelectorAll(".tab-button")
    .forEach(btn => {
      btn.classList.remove("active");
    });

  document.getElementById(id)
    .classList.add("active");

  document.querySelector(`[data-panel='${id}']`)
    .classList.add("active");
}

// =============================
// RULES TAB
// =============================

function renderRules() {

  const rules = document.getElementById("rules-content");

  if (!rules) return;

  rules.innerHTML = `

    <h3>How this app works</h3>

    <p>
      This chat app uses a Render WebSocket server.
      Messages are routed live between connected users.
    </p>

    <p>
      localStorage is used for caching:
      contacts, messages, requests and groups.
    </p>

    <p>
      The server does not permanently store messages.
      It only routes messages to online users.
    </p>

    <p>
      Max messages stored locally: 1000.
      Max contacts: 40.
    </p>

  `;
}

// =============================
// EVENTS
// =============================

sendButton.onclick = () => {

  sendMessage(
    state.currentChat,
    messageInput.value
  );

  messageInput.value = "";
};

messageInput.addEventListener("keydown", (e) => {

  if (e.key === "Enter" && !e.shiftKey) {

    e.preventDefault();

    sendButton.click();
  }

});

clearChatBtn.onclick = clearCurrentChat;

addContactBtn.onclick = () => {

  const name = prompt("Contact username");

  addContact(name);
};

// =============================
// INIT
// =============================

renderContacts();
renderRequests();
renderMessages();
renderNotifications();
renderRules();

console.log("App initialized");
