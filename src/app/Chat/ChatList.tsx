// ChatList.tsx
"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useCallback } from 'react';
import { useUserChats } from './useUserChats';
import { useAuth } from './AuthContext';
import { createChat } from './createChat';
import { ref, onValue } from 'firebase/database';
import { db } from './firebase';
import Image from 'next/image';

import { FaUserGroup } from "react-icons/fa6";
import { IoPersonSharp } from "react-icons/io5";
import { IoMdNotifications } from "react-icons/io";
interface ChatListProps {
    onSelectChat: (chatId: string) => void;
    currentUserId: string;
    canChat: boolean;
}

interface UserProfile {
    uid: string;
    name: string;
    profilePic: string | null;
    email: string;
    canChat: boolean;
}

interface ChatMessage {
    id: string;
    senderId: string;
    content: string;
    timestamp: number;
}



interface ChatWithUnread {
    id: string;
    name: string | null;
    participants: Record<string, boolean>;
    type?: 'one-to-one' | 'group';
    unreadCount?: number;
    lastMessageTimestamp?: number;
    createdAt: number;
    isGroupChat?: boolean;
    lastMessageSenderName?: string;
    lastMessageContent?: string;
}

export default function ChatList({ onSelectChat, currentUserId, canChat }: ChatListProps) {
    const { user } = useAuth();
    const rawUserChats = useUserChats(currentUserId);
    console.log("ChatList Render - Raw User Chats received:", rawUserChats);


    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [newChatName, setNewChatName] = useState<string>('');
    const [chatsWithUnread, setChatsWithUnread] = useState<ChatWithUnread[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});

    // Effect to fetch all users and their online presence
    // This hook fetches all users *except* the current user for the selection list.
    // The current user's profile is handled separately by `user` object from AuthContext.
    useEffect(() => {
        const usersRef = ref(db, "users");
        const presenceRef = ref(db, "presence");

        const unsubscribeUsers = onValue(usersRef, (snapshot) => {
            const usersData = snapshot.val();
            if (usersData) {
                const usersList = Object.keys(usersData)
                    .filter((uid) => {
                        // Keep this filter, as allUsers is primarily for displaying *other* users
                        const shouldInclude = uid !== currentUserId && (usersData[uid].canChat ?? true);
                        return shouldInclude;
                    })
                    .map((uid) => ({
                        uid,
                        name: usersData[uid].name || usersData[uid].email,
                        profilePic: usersData[uid].profilePic || null,
                        email: usersData[uid].email,
                        canChat: usersData[uid].canChat ?? true,
                    }));
                setAllUsers(usersList);
                console.log("All OTHER Users Fetched:", usersList.length, "users.");
            } else {
                setAllUsers([]);
                console.log("No users data found in Firebase.");
            }
        });

        const unsubscribePresence = onValue(presenceRef, (snapshot) => {
            const presenceData = snapshot.val();
            if (presenceData) {
                const onlineStatus: Record<string, boolean> = {};
                for (const uid in presenceData) {
                    onlineStatus[uid] = presenceData[uid] === true;
                }
                setOnlineUsers(onlineStatus);
            } else {
                setOnlineUsers({});
            }
        });

        return () => {
            unsubscribeUsers();
            unsubscribePresence();
        };
    }, [currentUserId]);


    // Effect to handle chat messages and unread counts for existing chats
    useEffect(() => {
        if (!user || rawUserChats.length === 0 || !canChat || allUsers.length === 0) {
            if (chatsWithUnread.length > 0) {
                setChatsWithUnread([]);
            }
            console.log("Skipping chat message processing: user, rawUserChats, canChat, or allUsers not ready.", { user: !!user, rawChats: rawUserChats.length, canChat, allUsersReady: allUsers.length > 0 });
            return;
        }

        const unsubs: (() => void)[] = [];
        const tempChats: Record<string, ChatWithUnread> = {};

        rawUserChats.forEach((chat) => {
            console.log(`Processing chat ID: ${chat.id}, participants:`, (chat as any).participants, `isGroupChat:`, (chat as any).isGroupChat);


            const userChatMetaRef = ref(db, `userChats/${user.uid}/${chat.id}`);
            const unsubscribeUserRead = onValue(userChatMetaRef, (userChatMetaSnapshot) => {
                const lastReadMessageId = userChatMetaSnapshot.val()?.lastReadMessageId || null;

                const messagesRef = ref(db, `chats/${chat.id}/messages`);
                const unsubscribeMessages = onValue(messagesRef, (messagesSnapshot) => {
                    const messagesData = messagesSnapshot.val();

                    let unreadCount = 0;
                    let latestMessageTimestamp: number = chat.createdAt;
                    let lastMessageSenderId: string | undefined;
                    let lastMessageContent: string | undefined;

                    if (messagesData) {
                        const messageList: ChatMessage[] = Object.keys(messagesData).map(key => ({ id: key, ...messagesData[key] }));
                        if (messageList.length > 0) {
                            messageList.sort((a, b) => a.timestamp - b.timestamp);
                            const lastMessage = messageList[messageList.length - 1];
                            latestMessageTimestamp = lastMessage.timestamp;
                            lastMessageSenderId = lastMessage.senderId;
                            lastMessageContent = lastMessage.content;
                        }

                        unreadCount = messageList.filter((msg: ChatMessage) =>
                            msg.senderId !== user.uid &&
                            (!lastReadMessageId || msg.id > lastReadMessageId)
                        ).length;
                    }

                    // --- CRITICAL CHANGE HERE for sender name resolution ---
                    let senderName: string | undefined;
                    if (lastMessageSenderId) {
                        if (lastMessageSenderId === user.uid) {
                            senderName = "You"; // If current user sent the last message
                        } else {
                            // Find other user's name from allUsers list
                            senderName = allUsers.find(u => u.uid === lastMessageSenderId)?.name || 'Unknown User';
                        }
                    }
                    // --- END CRITICAL CHANGE ---

                    const updatedChat: ChatWithUnread = {
                        ...chat,
                        unreadCount,
                        lastMessageTimestamp: latestMessageTimestamp,
                        lastMessageSenderName: senderName,
                        lastMessageContent: lastMessageContent
                    };

                    tempChats[chat.id] = updatedChat;
                    setChatsWithUnread(Object.values(tempChats));
                });
                unsubs.push(unsubscribeMessages);
            });
            unsubs.push(unsubscribeUserRead);
        });

        return () => {
            console.log("Cleanup for chat listeners.");
            unsubs.forEach(unsub => unsub());
        };
    }, [user, rawUserChats, currentUserId, canChat, allUsers]);


    const handleCreateChat = async () => {
        if (!user || !canChat) return;
        if (selectedUsers.length === 0 && newChatName.trim() === '') {
            alert('Please select at least one other user or provide a group chat name.');
            return;
        }

        try {
            const chatId = await createChat(
                newChatName.trim() === '' ? null : newChatName.trim(),
                user.uid,
                selectedUsers
            );
            onSelectChat(chatId);
            setSelectedUsers([]);
            setNewChatName('');
        } catch (error: any) {
            console.error("Error creating chat:", error);
            alert(`Failed to create chat: ${error.message}`);
        }
    };

    const handleUserSelect = (uid: string) => {
        setSelectedUsers(prev =>
            prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
        );
    };

    const handleOneToOneChat = async (targetUserId: string) => {
        if (!user || !canChat) return;
        try {
            const chatId = await createChat(null, user.uid, [targetUserId]);
            onSelectChat(chatId);
            setNewChatName('');
            setSelectedUsers([]);
        } catch (error: any) {
            console.error("Error creating 1-on-1 chat:", error);
            alert(`Failed to create direct chat: ${error.message}`);
        }
    };

    const getChatDisplayName = useCallback((chat: ChatWithUnread) => {
        console.log("getChatDisplayName processing chat:", chat);

        if (chat.name) {
            return chat.name;
        }

        const chatUserIds = Object.keys(chat.participants || {});
        console.log(`Chat ID: ${chat.id}, Chat User IDs (from participants):`, chatUserIds);

        if (chatUserIds.length === 2) {
            const otherUserId = chatUserIds.find(uId => uId !== user?.uid);
            console.log(`Other User ID for DM:`, otherUserId);

            if (otherUserId) {
                const otherUser = allUsers.find(u => u.uid === otherUserId);
                console.log(`Found Other User for DM:`, otherUser);

                if (otherUser) {
                    return otherUser.name;
                } else {
                    return `Loading Name... (${otherUserId.slice(0, 4)}...)`;
                }
            }
            return "Direct Message (Invalid Users)";
        }

        if (chatUserIds.length > 2) {
            const otherParticipants = chatUserIds.filter(uId => uId !== user?.uid);
            if (otherParticipants.length > 0 && allUsers.length > 0) {
                const participantNames = otherParticipants
                    .map(uId => allUsers.find(u => u.uid === uId)?.name || 'Unknown User')
                    .join(', ');
                return `Group: ${participantNames}`;
            }
            return "Unnamed Group Chat";
        }

        return "Unknown Chat";
    }, [allUsers, user?.uid]);

    if (!user) {
        return <div className="p-4 text-center text-gray-600">Please log in to view chats.</div>;
    }

    if (!canChat) {
        return (
            <div className="p-4 text-center text-red-600 font-semibold bg-red-50 rounded-lg shadow-sm">
                You do not have permission to view or create chats. Please contact an administrator.
            </div>
        );
    }

    return (
        <div className="flex h-full font-sans ">
            {/* Your Chats Section */}
            <div className="w-1/2 border-r border-gray-200 p-4 overflow-y-auto bg-white dark:bg-gray-800 rounded-l-lg shadow-inner">
                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Your Chats</h3>
                <ul className="space-y-3">
                    {chatsWithUnread.length === 0 && (
                        <li className="text-gray-500 dark:text-white text-sm py-4 text-center">No chats found. Create a new one!</li>
                    )}
                    {chatsWithUnread
                        .sort((a, b) => (b.lastMessageTimestamp || b.createdAt) - (a.lastMessageTimestamp || a.createdAt))
                        .map((chat) => (
                            <li
                                key={chat.id}
                                onClick={() => onSelectChat(chat.id)}
                                className="cursor-pointer p-3 rounded-lg hover:dark:bg-blue-500 hover:bg-gray-200 transition-colors duration-200 flex flex-col justify-between items-start border border-gray-100"
                            >
                                <div className="flex justify-between w-full items-center">
                                    <span className="font-medium text-gray-800 dark:text-white text-base flex gap-1 items-center">
                                        {chat.isGroupChat ? <FaUserGroup /> : <IoPersonSharp />} {getChatDisplayName(chat)}
                                    </span>
                                    {chat.unreadCount !== 0 && (
                                        <div className=' text-white  text-md bg-red-600 rounded-full w-fit px-2 h-7 flex items-center justify-center'>
                                            <IoMdNotifications size={19} />
                                            <span className="">
                                                {chat.unreadCount}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {chat.lastMessageContent && (
                                    <p className="text-sm text-gray-500 dark:text-gray-200 mt-1 truncate w-full gap-1 flex items-center">
                                        {/* Simplified logic here as senderName is already resolved */}
                                        {chat.lastMessageSenderName && (
                                            <span className="font-semibold">
                                                {chat.lastMessageSenderName}:
                                            </span>
                                        )}
                                        {chat.lastMessageContent}
                                    </p>
                                )}
                            </li>
                        ))}
                </ul>
            </div>

            {/* Create Chat Section */}
            <div className="w-1/2 p-4 overflow-y-auto bg-white dark:bg-slate-800 rounded-r-lg shadow-inner">
                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Create New Chat</h3>
                <div className="mb-5">
                    <label htmlFor="newChatName" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-400">
                        Group Chat Name (Optional for 1-on-1)
                    </label>
                    <input
                        type="text"
                        id="newChatName"
                        value={newChatName}
                        onChange={(e) => setNewChatName(e.target.value)}
                        placeholder="e.g., Team Project, Family Chat"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <h4 className="text-base font-semibold mb-3 text-gray-800 dark:text-gray-400">Select Users:</h4>
                <ul className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 p-3 rounded-md mb-5 bg-gray-50 dark:bg-gray-800 ">
                    {allUsers.length === 0 && (
                        <li className="text-gray-500 text-sm py-2 text-center">No other users available to chat with.</li>
                    )}
                    {allUsers.map((u) => {
                        const isOnline = onlineUsers[u.uid];
                        return (
                            <li key={u.uid} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-b-0">
                                <label htmlFor={`user-${u.uid}`} className="flex items-center text-sm cursor-pointer flex-grow text-gray-700 dark:text-gray-300">
                                    {u.profilePic && (
                                        <div className="relative">
                                            <Image
                                                width={32}
                                                height={32}
                                                src={u.profilePic}
                                                alt={u.name}
                                                className="w-8 h-8 rounded-full mr-3 object-cover border border-gray-200"
                                            />
                                            <span className={`absolute bottom-0 right-2 w-3 h-3 ${isOnline ? "bg-green-500" : "bg-gray-400"} rounded-full border-2 border-white`}></span>
                                        </div>
                                    )}
                                    <span className="font-medium">{u.name}</span>
                                </label>
                                <button
                                    onClick={() => handleOneToOneChat(u.uid)}
                                    className="ml-2 bg-blue-500 text-white text-xs px-5 py-1.5 rounded-full hover:bg-blue-600"
                                >
                                    DM
                                </button>
                                <input
                                    type="checkbox"
                                    id={`user-${u.uid}`}
                                    checked={selectedUsers.includes(u.uid)}
                                    onChange={() => handleUserSelect(u.uid)}
                                    className="ml-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                            </li>
                        );
                    })}
                </ul>
                <button
                    onClick={handleCreateChat}
                    disabled={selectedUsers.length === 0 && newChatName.trim() === ''}
                    className="w-full bg-green-600 text-white font-semibold rounded-lg px-5 py-2.5 hover:bg-green-700 disabled:opacity-50"
                >
                    Create Chat
                </button>
            </div>
        </div>
    );
}