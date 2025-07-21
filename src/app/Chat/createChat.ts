/* eslint-disable @typescript-eslint/no-explicit-any */

import { db } from "./firebase";
import { push, ref, set, update } from "firebase/database";

export async function createChat(
  chatName: string,
  creatorId: string, // This should be user.uid
  participantIds: string[] // These should be user.uid's
) {
  const newChatRef = push(ref(db, "chats"));
  const chatId = newChatRef.key!;
  const participants = Object.fromEntries(
    participantIds.map((id) => [id, true]) // 'id' here must be a Firebase UID
  );

  await set(newChatRef, {
    name: chatName,
    createdBy: creatorId,
    participants, // The keys of this object are the issue
    createdAt: Date.now(),
  });

  const updates: Record<string, any> = {};
  for (const id of participantIds) {
    updates[`userChats/${id}/${chatId}`] = true;
  }
  await update(ref(db), updates);

  return chatId;
}
