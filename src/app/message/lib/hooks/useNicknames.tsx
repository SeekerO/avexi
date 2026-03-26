// useNicknames.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase/firebase';

interface Nickname {
    nickname: string;
    setAt?: number;
}

/**
 * Custom hook to fetch and listen for nicknames that the current user has set.
 * @param chatId The ID of the chat.
 * @param currentUserId The UID of the current user.
 * @returns An object mapping targetUserId -> Nickname
 */
export const useNicknames = (chatId: string, currentUserId: string) => {
    const [nicknames, setNicknames] = useState<Record<string, Nickname>>({});

    useEffect(() => {
        if (!chatId || !currentUserId) {
            setNicknames({});
            return;
        }

        // Reference to the nicknames node for this user in this chat
        const nicknamesRef = ref(db, `chats/${chatId}/nicknames/${currentUserId}`);

        // Listener for real-time updates to nicknames
        const unsubscribe = onValue(nicknamesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setNicknames(data);
            } else {
                setNicknames({});
            }
        });

        return () => unsubscribe();
    }, [chatId, currentUserId]);

    return nicknames;
};

// ═══════════════════════════════════════════════════════════════════

interface GroupChatSettings {
    name: string;
    isGroupChat: boolean;
    updatedAt?: number;
    updatedBy?: string;
}

/**
 * Custom hook to fetch and listen for group chat settings (name, etc).
 * @param chatId The ID of the group chat.
 * @returns Group chat settings object.
 */
export const useGroupChatSettings = (chatId: string) => {
    const [settings, setSettings] = useState<Partial<GroupChatSettings>>({});

    useEffect(() => {
        if (!chatId) {
            setSettings({});
            return;
        }

        const chatRef = ref(db, `chats/${chatId}`);

        const unsubscribe = onValue(chatRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setSettings({
                    name: data.name || null,
                    isGroupChat: data.isGroupChat || false,
                    updatedAt: data.updatedAt,
                    updatedBy: data.updatedBy,
                });
            } else {
                setSettings({});
            }
        });

        return () => unsubscribe();
    }, [chatId]);

    return settings;
};

// ═══════════════════════════════════════════════════════════════════

interface UnreadData {
    [chatId: string]: number;
}

/**
 * Custom hook to fetch and listen for unread message counts across all chats for a user.
 * @param userId The UID of the user.
 * @returns An object mapping chatId -> unreadCount
 */
export const useUnreadCounts = (userId: string) => {
    const [unreadCounts, setUnreadCounts] = useState<UnreadData>({});

    useEffect(() => {
        if (!userId) {
            setUnreadCounts({});
            return;
        }

        const userChatsRef = ref(db, `userChats/${userId}`);

        const unsubscribe = onValue(userChatsRef, (snapshot) => {
            const data = snapshot.val();
            const counts: UnreadData = {};

            if (data) {
                Object.keys(data).forEach((chatId) => {
                    if (data[chatId].unreadCount) {
                        counts[chatId] = data[chatId].unreadCount;
                    }
                });
            }

            setUnreadCounts(counts);
        });

        return () => unsubscribe();
    }, [userId]);

    return unreadCounts;
};
