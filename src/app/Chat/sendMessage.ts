import { db } from "./firebase";
import { ref, push, serverTimestamp } from "firebase/database";

export async function sendMessage(
  chatId: string,
  senderId: string,
  content: string,
  type = "text"
) {
  const messagesRef = ref(db, `chats/${chatId}/messages`);
  await push(messagesRef, {
    senderId,
    content,
    type,
    timestamp: serverTimestamp(),
  });
}
