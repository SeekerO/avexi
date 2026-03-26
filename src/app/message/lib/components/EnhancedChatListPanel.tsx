// EnhancedChatListPanel.tsx
// This is an EXAMPLE showing how to integrate unread badges into your existing ChatListPanel
// Copy the relevant sections and merge them into your actual ChatListPanel component

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react';
import { useUnreadCounts } from '../hooks/useNicknames'; // Adjust path as needed
import { clearUnreadMessages } from '../actions/chatActions'; // Adjust path as needed
import { Search, Plus, MoreVertical, Trash2, Bell } from 'lucide-react';

interface ChatListItemProps {
    id: string;
    name: string | null;
    isGroupChat?: boolean;
    lastMessageContent?: string;
    unreadCount?: number;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onDelete?: (id: string) => void;
    onlineStatus?: boolean;
}

// ═══════════════════════════════════════════════════════════════════
//  ENHANCED CHAT LIST ITEM WITH UNREAD BADGE
// ═══════════════════════════════════════════════════════════════════
const ChatListItem = ({
    id,
    name,
    isGroupChat,
    lastMessageContent,
    unreadCount,
    isSelected,
    onSelect,
    onDelete,
    onlineStatus,
}: ChatListItemProps) => {
    return (
        <div
            className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer group ${isSelected
                    ? 'bg-white/10 border border-white/[0.06]'
                    : 'hover:bg-white/[0.05] border border-transparent'
                }`}
            onClick={() => onSelect(id)}
        >
            {/* Avatar Section */}
            <div className="relative flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-semibold">
                {name?.[0]?.toUpperCase() || '?'}

                {/* Online Status Indicator */}
                {onlineStatus && (
                    <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-[#0d0d1a] rounded-full" />
                )}
            </div>

            {/* Chat Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-white/85 truncate">
                        {name || 'Unnamed Chat'}
                    </h3>
                    {isGroupChat && (
                        <span className="text-xs text-white/40 px-1.5 py-0.5 bg-white/[0.05] rounded">
                            Group
                        </span>
                    )}
                </div>
                <p className="text-xs text-white/40 truncate">
                    {lastMessageContent || 'No messages yet'}
                </p>
            </div>

            {/* Unread Badge */}
            {unreadCount && unreadCount > 0 && (
                <div className="flex-shrink-0 flex items-center gap-2">
                    <span className="flex items-center justify-center min-w-[20px] h-5 bg-red-500 text-white text-xs font-semibold rounded-full px-1.5">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                </div>
            )}

            {/* Delete Button (hover) */}
            {onDelete && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(id);
                    }}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 transition-all"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════
//  SIDEBAR ICON WITH NOTIFICATION DOT
// ═══════════════════════════════════════════════════════════════════
export const ChatSidebarIcon = ({
    onClick,
    hasUnread,
}: {
    onClick: () => void;
    hasUnread: boolean;
}) => {
    return (
        <button
            onClick={onClick}
            className="relative p-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white/60 hover:text-white transition-all"
            title="Messages"
        >
            <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
            </svg>

            {/* Notification Pulse Dot */}
            {hasUnread && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-[#0d0d1a] rounded-full animate-pulse" />
            )}
        </button>
    );
};

// ═══════════════════════════════════════════════════════════════════
//  COMPLETE EXAMPLE: ChatListPanel with Unread Integration
// ═══════════════════════════════════════════════════════════════════
interface Chat {
    id: string;
    name: string | null;
    isGroupChat?: boolean;
    lastMessageContent?: string;
    createdAt: number;
}

export const ExampleChatListPanelWithUnread = ({
    currentUserId,
    selectedChatId,
    onSelectChat,
    chats,
}: {
    currentUserId: string;
    selectedChatId: string | null;
    onSelectChat: (id: string) => void;
    chats: Chat[];
}) => {
    const [search, setSearch] = useState('');
    const unreadCounts = useUnreadCounts(currentUserId);

    // Handle when user clicks on a chat - clear unread count
    const handleSelectChat = (chatId: string) => {
        clearUnreadMessages(chatId, currentUserId).catch(console.error);
        onSelectChat(chatId);
    };

    // Check if there are any unread messages
    const hasAnyUnread = Object.values(unreadCounts).some((count) => count > 0);

    const filteredChats = chats.filter(
        (chat) =>
            !search ||
            chat.name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-[#0d0d1a] border-r border-white/[0.06]">
            {/* Header */}
            <div className="flex-shrink-0 px-4 py-4 border-b border-white/[0.06]">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white/85">
                        Messages
                    </h2>
                    {hasAnyUnread && (
                        <span className="flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-semibold rounded-full">
                            {Object.values(unreadCounts).filter((c) => c > 0).length}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search chats..."
                            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-xs text-white/85 placeholder-white/25 focus:outline-none focus:border-indigo-500/50"
                        />
                    </div>
                    <button className="flex-shrink-0 p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-white/40 hover:text-white/60 transition-colors">
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                {filteredChats.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs text-white/40">
                        No chats found
                    </div>
                ) : (
                    filteredChats.map((chat) => (
                        <ChatListItem
                            key={chat.id}
                            id={chat.id}
                            name={chat.name}
                            isGroupChat={chat.isGroupChat}
                            lastMessageContent={chat.lastMessageContent}
                            unreadCount={unreadCounts[chat.id] || 0}
                            isSelected={selectedChatId === chat.id}
                            onSelect={handleSelectChat}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════
//  QUICK INTEGRATION SNIPPET
// ═══════════════════════════════════════════════════════════════════
/*
To integrate into your existing ChatListPanel:

1. Import the hooks and actions:
   import { useUnreadCounts } from '@/lib/hooks/useNicknames';
   import { clearUnreadMessages } from '@/lib/firebase/firebase.actions/chatActions';

2. Add in your component:
   const unreadCounts = useUnreadCounts(currentUserId);

3. When rendering each chat item, add the badge:
   {unreadCounts[chat.id] > 0 && (
       <span className="flex items-center justify-center min-w-[20px] h-5 bg-red-500 text-white text-xs font-semibold rounded-full px-1.5">
           {unreadCounts[chat.id] > 99 ? '99+' : unreadCounts[chat.id]}
       </span>
   )}

4. When user selects a chat:
   const handleSelectChat = (chatId: string) => {
       clearUnreadMessages(chatId, currentUserId);
       onSelectChat(chatId);
   };

5. Add the notification dot to your sidebar icon (if not already there):
   {hasAnyUnread && (
       <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
   )}
*/
