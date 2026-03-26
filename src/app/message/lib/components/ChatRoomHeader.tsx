// ChatRoomHeader.tsx
// EXAMPLE: Enhanced ChatRoomPanel header with all new features integrated

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, MoreVertical, Edit3, Users, Info } from 'lucide-react';
import { useNicknames, useGroupChatSettings } from '../hooks/useNicknames'; // Adjust path
import {
    setUserNickname,
    updateGroupName,
    addUsersToGroupChat,
} from '../actions/chatActions'; // Adjust path
import {
    NicknameModal,
    GroupNameModal,
    AddMembersModal,
} from './ChatModals'; // Adjust path

interface ChatRoomHeaderProps {
    chatId: string;
    currentUserId: string;
    otherUserId?: string; // For 1-on-1 chats
    otherUserName?: string;
    isGroupChat: boolean;
    groupMembers?: Record<string, boolean>;
    allUsers?: Array<{ uid: string; name: string; email: string; photoURL: string | null }>;
    onBack?: () => void;
    onDelete?: () => void;
}

export const ChatRoomHeader = ({
    chatId,
    currentUserId,
    otherUserId,
    otherUserName,
    isGroupChat,
    groupMembers = {},
    allUsers = [],
    onBack,
    onDelete,
}: ChatRoomHeaderProps) => {
    // Hooks
    const nicknames = useNicknames(chatId, currentUserId);
    const groupSettings = useGroupChatSettings(chatId);

    // State
    const [showMenu, setShowMenu] = useState(false);
    const [nicknameModalOpen, setNicknameModalOpen] = useState(false);
    const [groupNameModalOpen, setGroupNameModalOpen] = useState(false);
    const [addMembersModalOpen, setAddMembersModalOpen] = useState(false);
    const [nicknameLoading, setNicknameLoading] = useState(false);
    const [groupNameLoading, setGroupNameLoading] = useState(false);
    const [addMembersLoading, setAddMembersLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string | null>>({
        nickname: null,
        groupName: null,
        addMembers: null,
    });

    // Get display name (use nickname if available)
    const getDisplayName = () => {
        if (isGroupChat) {
            return groupSettings.name || 'Unnamed Group';
        }
        if (otherUserId && nicknames[otherUserId]) {
            return nicknames[otherUserId].nickname;
        }
        return otherUserName || 'Chat';
    };

    // Get member count for group
    const memberCount = Object.keys(groupMembers).length;

    // Handle save nickname
    const handleSaveNickname = async (nickname: string) => {
        if (!otherUserId) return;
        try {
            setNicknameLoading(true);
            setErrors((prev) => ({ ...prev, nickname: null }));
            await setUserNickname(chatId, currentUserId, otherUserId, nickname);
        } catch (error) {
            setErrors((prev) => ({
                ...prev,
                nickname: (error as any).message || 'Failed to save nickname',
            }));
            throw error;
        } finally {
            setNicknameLoading(false);
        }
    };

    // Handle save group name
    const handleSaveGroupName = async (name: string) => {
        try {
            setGroupNameLoading(true);
            setErrors((prev) => ({ ...prev, groupName: null }));
            await updateGroupName(chatId, currentUserId, name);
        } catch (error) {
            setErrors((prev) => ({
                ...prev,
                groupName: (error as any).message || 'Failed to update group name',
            }));
            throw error;
        } finally {
            setGroupNameLoading(false);
        }
    };

    // Handle add members
    const handleAddMembers = async (userIds: string[]) => {
        try {
            setAddMembersLoading(true);
            setErrors((prev) => ({ ...prev, addMembers: null }));
            await addUsersToGroupChat(chatId, currentUserId, userIds);
        } catch (error) {
            setErrors((prev) => ({
                ...prev,
                addMembers: (error as any).message || 'Failed to add members',
            }));
            throw error;
        } finally {
            setAddMembersLoading(false);
        }
    };

    return (
        <div className="flex-shrink-0 px-4 py-3.5 border-b border-white/[0.06] bg-[#0d0d1a] flex items-center justify-between gap-4">
            {/* Left: Back button + info */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="flex-shrink-0 p-2 -m-2 text-white/40 hover:text-white/60 transition-colors lg:hidden"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                )}

                <div className="min-w-0 flex-1">
                    {/* Display Name - clickable for editing */}
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-white/85 truncate">
                            {getDisplayName()}
                        </h2>

                        {!isGroupChat && otherUserId && (
                            <button
                                onClick={() => setNicknameModalOpen(true)}
                                className="flex-shrink-0 p-1 text-white/30 hover:text-white/60 transition-colors"
                                title="Edit nickname"
                            >
                                <Edit3 className="w-3 h-3" />
                            </button>
                        )}

                        {isGroupChat && (
                            <button
                                onClick={() => setGroupNameModalOpen(true)}
                                className="flex-shrink-0 p-1 text-white/30 hover:text-white/60 transition-colors"
                                title="Edit group name"
                            >
                                <Edit3 className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Subtitle */}
                    <p className="text-xs text-white/40 mt-0.5">
                        {isGroupChat
                            ? `${memberCount} member${memberCount !== 1 ? 's' : ''}`
                            : 'Direct message'}
                    </p>
                </div>
            </div>

            {/* Right: Action buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
                {isGroupChat && (
                    <button
                        onClick={() => setAddMembersModalOpen(true)}
                        className="p-2 rounded-lg hover:bg-white/[0.05] text-white/40 hover:text-white/70 transition-colors"
                        title="Add members"
                    >
                        <Users className="w-4 h-4" />
                    </button>
                )}

                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 rounded-lg hover:bg-white/[0.05] text-white/40 hover:text-white/70 transition-colors"
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {showMenu && (
                        <div className="absolute right-0 mt-2 w-40 bg-[#13132b] border border-white/[0.08] rounded-xl shadow-lg z-20">
                            {!isGroupChat && (
                                <button
                                    onClick={() => {
                                        setNicknameModalOpen(true);
                                        setShowMenu(false);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-xs text-white/60 hover:text-white hover:bg-white/[0.05] border-b border-white/[0.06] transition-colors flex items-center gap-2"
                                >
                                    <Edit3 className="w-3 h-3" />
                                    Edit nickname
                                </button>
                            )}

                            {isGroupChat && (
                                <>
                                    <button
                                        onClick={() => {
                                            setGroupNameModalOpen(true);
                                            setShowMenu(false);
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-xs text-white/60 hover:text-white hover:bg-white/[0.05] border-b border-white/[0.06] transition-colors flex items-center gap-2"
                                    >
                                        <Edit3 className="w-3 h-3" />
                                        Edit group name
                                    </button>
                                    <button
                                        onClick={() => {
                                            setAddMembersModalOpen(true);
                                            setShowMenu(false);
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-xs text-white/60 hover:text-white hover:bg-white/[0.05] border-b border-white/[0.06] transition-colors flex items-center gap-2"
                                    >
                                        <Users className="w-3 h-3" />
                                        Add members
                                    </button>
                                </>
                            )}

                            <button
                                onClick={() => {
                                    onDelete?.();
                                    setShowMenu(false);
                                }}
                                className="w-full px-4 py-2.5 text-left text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                            >
                                <Info className="w-3 h-3" />
                                Delete chat
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {!isGroupChat && otherUserId && otherUserName && (
                <NicknameModal
                    isOpen={nicknameModalOpen}
                    onClose={() => setNicknameModalOpen(false)}
                    targetUserName={otherUserName}
                    currentNickname={
                        nicknames[otherUserId]?.nickname || null
                    }
                    onSave={handleSaveNickname}
                    loading={nicknameLoading}
                    error={errors.nickname}
                />
            )}

            {isGroupChat && (
                <>
                    <GroupNameModal
                        isOpen={groupNameModalOpen}
                        onClose={() => setGroupNameModalOpen(false)}
                        currentGroupName={groupSettings.name || null}
                        onSave={handleSaveGroupName}
                        loading={groupNameLoading}
                        error={errors.groupName}
                    />

                    <AddMembersModal
                        isOpen={addMembersModalOpen}
                        onClose={() => setAddMembersModalOpen(false)}
                        availableUsers={allUsers}
                        currentMembers={groupMembers}
                        onAdd={handleAddMembers}
                        loading={addMembersLoading}
                        error={errors.addMembers}
                    />
                </>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════
//  INTEGRATION INTO EXISTING ChatRoomPanel
// ═══════════════════════════════════════════════════════════════════

/*
USAGE in ChatRoomPanel:

1. Replace the existing header section with:

   <ChatRoomHeader
       chatId={chatId}
       currentUserId={currentUserId}
       otherUserId={isGroupChat ? undefined : otherUserId}
       otherUserName={isGroupChat ? undefined : otherUserName}
       isGroupChat={isGroupChat}
       groupMembers={chatParticipants}
       allUsers={allUsers}
       onBack={onBack}
       onDelete={() => setConfirmDelete(true)}
   />

2. Make sure you have these props/state in ChatRoomPanel:
   - chatId: string
   - currentUserId: string
   - isGroupChat: boolean
   - otherUserId?: string
   - otherUserName?: string
   - chatParticipants: Record<string, boolean>
   - allUsers: UserProfile[]
   - onBack?: () => void
   - setConfirmDelete: (value: boolean) => void

3. The component handles all modal states internally!
*/
