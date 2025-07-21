import { db } from "./firebase";
import { ref, set } from "firebase/database";

export async function setTyping(
  chatId: string,
  userId: string,
  isTyping: boolean
) {
  const typingRef = ref(db, `chats/${chatId}/typing/${userId}`);
  await set(typingRef, isTyping);
}
