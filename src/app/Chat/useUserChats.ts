import { db } from "./firebase";
import { ref, onValue } from "firebase/database";
import { useEffect, useState } from "react";

export function useUserChats(userId: string) {
  const [chats, setChats] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const refUserChats = ref(db, `userChats/${userId}`);
    onValue(refUserChats, (snapshot) => {
      const chatIds = snapshot.val() || {};
      const promises = Object.keys(chatIds).map(async (id) => {
        const chatRef = ref(db, `chats/${id}/name`);
        return new Promise<{ id: string; name: string }>((resolve) =>
          onValue(chatRef, (snap) => resolve({ id, name: snap.val() }), {
            onlyOnce: true,
          })
        );
      });
      Promise.all(promises).then(setChats);
    });
  }, [userId]);

  return chats;
}
