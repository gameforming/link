export function addRequest(state, username) {

  state.requests.push({
    id: crypto.randomUUID(),
    username,
    createdAt: Date.now()
  });

}

export function removeRequest(state, id) {

  state.requests = state.requests.filter(request => {
    return request.id !== id;
  });

}
