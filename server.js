import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';
import helmet from 'helmet';

import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const wss = new WebSocketServer({
  server
});

const PORT = process.env.PORT || 3000;

app.use(helmet());

app.use(express.static(__dirname));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

const users = new Map();

async function saveUser(username) {
  try {
    await supabase
      .from('users')
      .upsert({
        username
      });
  } catch (err) {
    console.error('Save user error:', err);
  }
}

async function saveOfflineMessage(
  senderUsername,
  receiverUsername,
  content,
  delivered
) {
  try {
    await supabase
      .from('messages')
      .insert({
        sender_username: senderUsername,
        receiver_username: receiverUsername,
        content,
        delivered
      });
  } catch (err) {
    console.error('Save message error:', err);
  }
}

async function getOfflineMessages(username) {
  try {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('receiver_username', username)
      .eq('delivered', false)
      .order('created_at', {
        ascending: true
      });

    return data || [];
  } catch (err) {
    console.error('Get offline messages error:', err);
    return [];
  }
}

async function markMessagesDelivered(username) {
  try {
    await supabase
      .from('messages')
      .update({
        delivered: true
      })
      .eq('receiver_username', username)
      .eq('delivered', false);
  } catch (err) {
    console.error('Update delivered error:', err);
  }
}

wss.on('connection', (ws) => {

  let currentUsername = null;

  console.log('Client connected');

  ws.send(JSON.stringify({
    type: 'connected'
  }));

  ws.on('message', async (rawMessage) => {

    try {

      const data = JSON.parse(rawMessage.toString());

      // LOGIN
      if (data.type === 'login') {

        const username = String(data.username || '')
          .trim();

        if (!username) {
          return;
        }

        currentUsername = username;

        users.set(username, ws);

        await saveUser(username);

        ws.send(JSON.stringify({
          type: 'login_success',
          username
        }));

        // OFFLINE MESSAGES
        const offlineMessages =
          await getOfflineMessages(username);

        ws.send(JSON.stringify({
          type: 'offline_messages',
          messages: offlineMessages
        }));

        await markMessagesDelivered(username);

        // SEND USER LIST
        const onlineUsers = [...users.keys()];

        wss.clients.forEach(client => {

          if (
            client.readyState === 1
          ) {

            client.send(JSON.stringify({
              type: 'users',
              users: onlineUsers
            }));

          }

        });

      }

      // MESSAGE
      if (data.type === 'message') {

        const targetUsername =
          String(data.targetUsername || '')
            .trim();

        const message =
          String(data.message || '')
            .trim();

        if (
          !targetUsername ||
          !message ||
          !currentUsername
        ) {
          return;
        }

        const targetSocket =
          users.get(targetUsername);

        const payload = {
          type: 'message',
          sender: currentUsername,
          message,
          createdAt: Date.now()
        };

        // USER ONLINE
        if (
          targetSocket &&
          targetSocket.readyState === 1
        ) {

          targetSocket.send(
            JSON.stringify(payload)
          );

          await saveOfflineMessage(
            currentUsername,
            targetUsername,
            message,
            true
          );

        }

        // USER OFFLINE
        else {

          await saveOfflineMessage(
            currentUsername,
            targetUsername,
            message,
            false
          );

        }

        // ECHO BACK TO SENDER
        ws.send(JSON.stringify({
          type: 'message_sent',
          targetUsername,
          message
        }));

      }

    }

    catch (err) {

      console.error(err);

      ws.send(JSON.stringify({
        type: 'error',
        message: 'Server error'
      }));

    }

  });

  ws.on('close', () => {

    console.log('Client disconnected');

    if (currentUsername) {
      users.delete(currentUsername);
    }

    const onlineUsers = [...users.keys()];

    wss.clients.forEach(client => {

      if (
        client.readyState === 1
      ) {

        client.send(JSON.stringify({
          type: 'users',
          users: onlineUsers
        }));

      }

    });

  });

});

app.get('/health', (req, res) => {

  res.json({
    status: 'ok'
  });

});

server.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );

});
