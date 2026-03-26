// types.ts
// Complete TypeScript interfaces for the new chat features

/**
 * ═══════════════════════════════════════════════════════════════
 *                    DATA MODELS
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Represents a custom nickname for a user in 1-on-1 chats
 * Each user can have unique nicknames for the same contact
 */
export interface Nickname {
  nickname: string;      // Custom name (1-30 characters)
  setAt?: number;        // Timestamp when nickname was set
}

/**
 * Mapping of target user IDs to their nicknames
 * key: targetUserId, value: Nickname object
 */
export interface NicknameMap {
  [targetUserId: string]: Nickname;
}

/**
 * Group chat settings
 */
export interface GroupChatSettings {
  name: string | null;     // Group display name
  isGroupChat: boolean;    // Always true for groups
  updatedAt?: number;      // Timestamp of last update
  updatedBy?: string;      // UserId who last updated
}

/**
 * Read receipt for a single message
 * Maps userId to timestamp when they read the message
 */
export interface ReadReceipts {
  [userId: string]: number;  // timestamp
}

/**
 * Message with read receipt information
 */
export interface MessageWithReads {
  id: string;
  senderId: string;
  content: string;
  type: "text" | "file";
  timestamp: number;
  isEdited?: boolean;
  editedAt?: number;
  reads?: ReadReceipts;           // Who read this message
  isSystemMessage?: boolean;      // System messages (members added, etc)
}

/**
 * User profile information
 * Used for authentication and user data
 */
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
  canChat?: boolean;  // Permission to send messages
}

/**
 * Chat participant information
 * Extends UserProfile for chat-specific context
 */
export interface ChatParticipant {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
}

/**
 * Map of user IDs to boolean (true = is member)
 */
export interface UserMemberMap {
  [userId: string]: boolean;
}

/**
 * Unread message counts per chat
 */
export interface UnreadCounts {
  [chatId: string]: number;
}

/**
 * ═══════════════════════════════════════════════════════════════
 *                    REQUEST/RESPONSE TYPES
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Request to set a user nickname
 */
export interface SetNicknameRequest {
  chatId: string;
  currentUserId: string;
  targetUserId: string;
  nickname: string;
}

/**
 * Request to update group name
 */
export interface UpdateGroupNameRequest {
  chatId: string;
  currentUserId: string;
  newGroupName: string;
}

/**
 * Request to add members to group
 */
export interface AddMembersRequest {
  chatId: string;
  currentUserId: string;
  userIdsToAdd: string[];
}

/**
 * Request to remove member from group
 */
export interface RemoveMemberRequest {
  chatId: string;
  currentUserId: string;
  userIdToRemove: string;
}

/**
 * Request to mark messages as read
 */
export interface MarkMessagesAsReadRequest {
  chatId: string;
  messageIds: string[];
  userId: string;
}

/**
 * Request to set unread count
 */
export interface SetUnreadCountRequest {
  chatId: string;
  userId: string;
  count: number;
}

/**
 * ═══════════════════════════════════════════════════════════════
 *                    COMPONENT PROPS
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Props for NicknameModal component
 */
export interface NicknameModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserName: string;
  currentNickname: string | null;
  onSave: (nickname: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

/**
 * Props for GroupNameModal component
 */
export interface GroupNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGroupName: string | null;
  onSave: (name: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

/**
 * Props for AddMembersModal component
 */
export interface AddMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableUsers: ChatParticipant[];
  currentMembers: UserMemberMap;
  onAdd: (userIds: string[]) => Promise<void>;
  loading: boolean;
  error: string | null;
}

/**
 * Props for ChatRoomHeader component
 */
export interface ChatRoomHeaderProps {
  chatId: string;
  currentUserId: string;
  otherUserId?: string;         // For 1-on-1 chats
  otherUserName?: string;       // For 1-on-1 chats
  isGroupChat: boolean;
  groupMembers?: UserMemberMap;
  allUsers?: ChatParticipant[];
  onBack?: () => void;
  onDelete?: () => void;
}

/**
 * ═══════════════════════════════════════════════════════════════
 *                    HOOK RETURN TYPES
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Return type for useNicknames hook
 * Maps targetUserId to Nickname object
 */
export type UseNicknamesReturn = NicknameMap;

/**
 * Return type for useGroupChatSettings hook
 */
export type UseGroupChatSettingsReturn = Partial<GroupChatSettings>;

/**
 * Return type for useUnreadCounts hook
 */
export type UseUnreadCountsReturn = UnreadCounts;

/**
 * ═══════════════════════════════════════════════════════════════
 *                    ERROR TYPES
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Custom error class for chat operations
 */
export class ChatError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = "ChatError";
  }
}

/**
 * Error codes for different operations
 */
export enum ChatErrorCode {
  CHAT_NOT_FOUND = "CHAT_NOT_FOUND",
  MESSAGE_NOT_FOUND = "MESSAGE_NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  INVALID_OPERATION = "INVALID_OPERATION",
  NICKNAME_INVALID = "NICKNAME_INVALID",
  GROUP_NAME_INVALID = "GROUP_NAME_INVALID",
  NO_USERS_TO_ADD = "NO_USERS_TO_ADD",
  USER_NOT_MEMBER = "USER_NOT_MEMBER",
  OPERATION_FAILED = "OPERATION_FAILED",
}

/**
 * ═══════════════════════════════════════════════════════════════
 *                    STATE MANAGEMENT
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * State for NicknameModal
 */
export interface NicknameModalState {
  isOpen: boolean;
  targetUserId?: string;
  targetUserName?: string;
  loading: boolean;
  error: string | null;
}

/**
 * State for GroupNameModal
 */
export interface GroupNameModalState {
  isOpen: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * State for AddMembersModal
 */
export interface AddMembersModalState {
  isOpen: boolean;
  selectedUserIds: string[];
  searchTerm: string;
  loading: boolean;
  error: string | null;
}

/**
 * Combined modal states
 */
export interface ChatModalsState {
  nickname: NicknameModalState;
  groupName: GroupNameModalState;
  addMembers: AddMembersModalState;
}

/**
 * ═══════════════════════════════════════════════════════════════
 *                    UTILITY TYPES
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Async function signature for database operations
 */
export type AsyncOperation<T = void> = () => Promise<T>;

/**
 * Callback function for modal actions
 */
export type ModalActionCallback = (data: any) => Promise<void>;

/**
 * Event handler for chat operations
 */
export type ChatEventHandler = (event: ChatEvent) => void;

/**
 * Events that can be emitted by chat operations
 */
export interface ChatEvent {
  type:
  | "nickname_set"
  | "group_name_updated"
  | "members_added"
  | "member_removed"
  | "message_read"
  | "unread_count_changed";
  chatId: string;
  userId: string;
  timestamp: number;
  data?: any;
}

/**
 * ═══════════════════════════════════════════════════════════════
 *                    VALIDATION SCHEMAS
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Validation rules for different fields
 */
export const ValidationRules = {
  NICKNAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9\s\-'\.áéíóúÁÉÍÓÚñÑ]*$/,  // Alphanumeric + common chars
  },
  GROUP_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z0-9\s\-'\.áéíóúÁÉÍÓÚñÑ]*$/,
  },
  MESSAGE_CONTENT: {
    MAX_LENGTH: 5000,
  },
} as const;

/**
 * Helper function to validate nickname
 */
export function isValidNickname(nickname: string): boolean {
  return (
    nickname.length >= ValidationRules.NICKNAME.MIN_LENGTH &&
    nickname.length <= ValidationRules.NICKNAME.MAX_LENGTH &&
    ValidationRules.NICKNAME.PATTERN.test(nickname)
  );
}

/**
 * Helper function to validate group name
 */
export function isValidGroupName(name: string): boolean {
  return (
    name.length >= ValidationRules.GROUP_NAME.MIN_LENGTH &&
    name.length <= ValidationRules.GROUP_NAME.MAX_LENGTH &&
    ValidationRules.GROUP_NAME.PATTERN.test(name)
  );
}

/**
 * ═══════════════════════════════════════════════════════════════
 *                    DATABASE PATHS (CONST)
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Firebase Realtime Database path constants
 */
export const DB_PATHS = {
  CHATS: "chats",
  USERS: "users",
  USER_CHATS: "userChats",
  PRESENCE: "presence",

  // Nested paths
  NICKNAMES: (chatId: string, userId: string) =>
    `chats/${chatId}/nicknames/${userId}`,

  MESSAGES: (chatId: string) =>
    `chats/${chatId}/messages`,

  MESSAGE_READS: (chatId: string, messageId: string) =>
    `chats/${chatId}/messages/${messageId}/reads`,

  CHAT_USERS: (chatId: string) =>
    `chats/${chatId}/users`,

  UNREAD_COUNT: (userId: string, chatId: string) =>
    `userChats/${userId}/${chatId}/unreadCount`,
} as const;

/**
 * ═══════════════════════════════════════════════════════════════
 *                    AGGREGATE TYPES
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Complete chat data with all new features
 */
export interface EnhancedChatData {
  id: string;
  name: string | null;
  isGroupChat: boolean;
  users: UserMemberMap;
  messages: MessageWithReads[];
  nicknames?: NicknameMap;  // For current user's nicknames
  settings?: GroupChatSettings;
  updatedAt?: number;
  updatedBy?: string;
  createdAt: number;
}

/**
 * User chat with unread info
 */
export interface UserChatWithUnread {
  chatId: string;
  chatName: string | null;
  isGroupChat: boolean;
  unreadCount: number;
  lastMessage?: string;
  lastMessageTimestamp?: number;
  participants: ChatParticipant[];
}

/**
 * Complete chat room state
 */
export interface ChatRoomState {
  chatId: string;
  isGroupChat: boolean;
  chatName: string | null;
  participants: ChatParticipant[];
  messages: MessageWithReads[];
  nicknames: NicknameMap;
  unreadCount: number;
  settings: GroupChatSettings;
  isLoading: boolean;
  error: string | null;
}

/**
 * Export all types as namespace for convenience
 */
export namespace ChatFeatures {
  export type Nickname = import("./types").Nickname;
  export type NicknameMap = import("./types").NicknameMap;
  export type GroupChatSettings = import("./types").GroupChatSettings;
  export type ReadReceipts = import("./types").ReadReceipts;
  export type UnreadCounts = import("./types").UnreadCounts;
}