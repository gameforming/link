export function createGroup(state, name) {

  state.groups.push({
    id: crypto.randomUUID(),
    name,
    members: [],
    createdAt: Date.now()
  });

}

export function addMemberToGroup(group, contactId) {

  if (!group.members.includes(contactId)) {
    group.members.push(contactId);
  }

}
