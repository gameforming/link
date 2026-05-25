const MAX_MESSAGES = 1000;

export function createMessage(state, sender, text) {

  state.globalMessageIndex++;

  return {
    id: crypto.randomUUID(),
    sender,
    message: text,
    createdIndex: state.globalMessageIndex,
    createdAt: Date.now()
  };

}

export function calculateRemaining(state, message) {

  return MAX_MESSAGES - (
    state.globalMessageIndex - message.createdIndex
  );

}

export function cleanupMessages(state) {

  state.messages = state.messages.filter(message => {

    return calculateRemaining(state, message) > 0;

  });

  if (state.messages.length > MAX_MESSAGES) {

    state.messages = state.messages.slice(-MAX_MESSAGES);

}
