/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { db } from "./firebase";
import { ref, onChildAdded } from "firebase/database";

export function useChatMessages(chatId: string) {
    const [messages, setMessages] = useState<any[]>([]);

    useEffect(() => {
        const messagesRef = ref(db, `chats/${chatId}/messages`);
        const unsubscribe = onChildAdded(messagesRef, (snapshot) => {
            setMessages((prev) => [...prev, { id: snapshot.key, ...snapshot.val() }]);
        });
        return () => unsubscribe();
    }, [chatId]);

    return messages;
}
