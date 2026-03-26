// IMPLEMENTATION_GUIDE.md

# Chat Features Implementation Guide

This guide explains how to integrate the new chat features into your existing codebase.

## Features Added

### 1. **Nickname Management (1-on-1 Chats)**
Allow users to set custom nicknames for contacts in one-on-one conversations.

**Key Files:**
- `chatActions.ts` - `setUserNickname()`, `getNickname()`, `removeNickname()`
- `useNicknames.tsx` - `useNicknames` hook
- `ChatModals.tsx` - `NicknameModal` component

**Database Structure:**
```
chats/{chatId}/nicknames/{currentUserId}/{targetUserId}
└── nickname: "Custom Name"
└── setAt: timestamp
```

**Usage in ChatRoomPanel:**
```typescript
import { useNicknames } from '@/path/to/useNicknames';
import { setUserNickname } from '@/path/to/chatActions';
import { NicknameModal } from '@/path/to/ChatModals';

// In your component:
const nicknames = useNicknames(chatId, currentUserId);
const [nickModalOpen, setNickModalOpen] = useState(false);

const handleSaveNickname = async (nickname: string) => {
    await setUserNickname(chatId, currentUserId, otherUserId, nickname);
};

// Display in header with edit button
<button onClick={() => setNickModalOpen(true)}>
    {nicknames[otherUserId]?.nickname || otherUserName}
</button>

<NicknameModal
    isOpen={nickModalOpen}
    onClose={() => setNickModalOpen(false)}
    targetUserName={otherUserName}
    currentNickname={nicknames[otherUserId]?.nickname || null}
    onSave={handleSaveNickname}
    loading={false}
    error={null}
/>
```

---

### 2. **Group Chat Name Management**
Allow users to update group chat names.

**Key Files:**
- `chatActions.ts` - `updateGroupName()`
- `useNicknames.tsx` - `useGroupChatSettings` hook
- `ChatModals.tsx` - `GroupNameModal` component

**Database Structure:**
```
chats/{chatId}
├── name: "Group Name"
├── isGroupChat: true
├── updatedAt: timestamp
└── updatedBy: userId
```

**Usage in ChatRoomPanel:**
```typescript
import { useGroupChatSettings } from '@/path/to/useNicknames';
import { updateGroupName } from '@/path/to/chatActions';
import { GroupNameModal } from '@/path/to/ChatModals';

// In your component:
const groupSettings = useGroupChatSettings(chatId);
const [groupNameModalOpen, setGroupNameModalOpen] = useState(false);

const handleSaveGroupName = async (name: string) => {
    await updateGroupName(chatId, currentUserId, name);
};

// Display in header
<h2>{groupSettings.name || 'Unnamed Group'}</h2>

<GroupNameModal
    isOpen={groupNameModalOpen}
    onClose={() => setGroupNameModalOpen(false)}
    currentGroupName={groupSettings.name || null}
    onSave={handleSaveGroupName}
    loading={false}
    error={null}
/>
```

---

### 3. **Add Members to Group Chat**
Allow users to add new members to an existing group chat.

**Key Files:**
- `chatActions.ts` - `addUsersToGroupChat()`
- `ChatModals.tsx` - `AddMembersModal` component

**Database Structure:**
```
chats/{chatId}/users/{userId}: true
userChats/{userId}/{chatId}: true
```

**System Message:**
The feature automatically creates a system message when users are added:
```
"N new member(s) added by userId"
```

**Usage in ChatRoomPanel:**
```typescript
import { addUsersToGroupChat } from '@/path/to/chatActions';
import { AddMembersModal } from '@/path/to/ChatModals';

// In your component:
const [addMembersOpen, setAddMembersOpen] = useState(false);

const handleAddMembers = async (userIds: string[]) => {
    await addUsersToGroupChat(chatId, currentUserId, userIds);
};

<AddMembersModal
    isOpen={addMembersOpen}
    onClose={() => setAddMembersOpen(false)}
    availableUsers={allUsers}
    currentMembers={chatParticipants}
    onAdd={handleAddMembers}
    loading={false}
    error={null}
/>
```

---

### 4. **Unread Message Indicators & Notification Badges**
Show notification badges on chat icons in the sidebar when there are unread messages.

**Key Files:**
- `chatActions.ts` - `markMessagesAsRead()`, `clearUnreadMessages()`, `setUnreadCount()`
- `useNicknames.tsx` - `useUnreadCounts` hook

**Database Structure:**
```
userChats/{userId}/{chatId}/unreadCount: number
chats/{chatId}/messages/{messageId}/reads/{userId}: timestamp
```

**Implementation Steps:**

#### 4.1 Track Unread Messages When Messages Arrive
```typescript
import { setUnreadCount } from '@/path/to/chatActions';

// When a new message arrives and the chat is NOT currently open:
if (selectedChatId !== chatId) {
    const currentCount = unreadCounts[chatId] || 0;
    await setUnreadCount(chatId, currentUserId, currentCount + 1);
}
```

#### 4.2 Clear Unread When User Opens Chat
```typescript
import { clearUnreadMessages } from '@/path/to/chatActions';

// In ChatRoomPanel effect when chatId changes:
useEffect(() => {
    if (chatId) {
        clearUnreadMessages(chatId, currentUserId);
    }
}, [chatId, currentUserId]);
```

#### 4.3 Display Notification Badge in Chat List
```typescript
import { useUnreadCounts } from '@/path/to/useNicknames';

// In ChatListPanel:
const unreadCounts = useUnreadCounts(currentUserId);

// In chat item rendering:
{unreadCounts[chat.id] > 0 && (
    <span className="ml-auto flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-semibold rounded-full">
        {unreadCounts[chat.id] > 99 ? '99+' : unreadCounts[chat.id]}
    </span>
)}
```

#### 4.4 Display Notification Dot on Sidebar Icon
```typescript
// In the main page component's sidebar icon:
const hasUnread = Object.values(unreadCounts).some(count => count > 0);

<div className="relative">
    <ChatIcon />
    {hasUnread && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
    )}
</div>
```

---

## Firebase Security Rules Recommendations

```json
{
  "rules": {
    "chats": {
      "{chatId}": {
        "nicknames": {
          "{userId}": {
            ".read": "auth.uid === $userId",
            ".write": "auth.uid === $userId"
          }
        },
        "users": {
          "{uid}": {
            ".read": "root.child('chats').child($chatId).child('users').child(auth.uid).exists()",
            ".write": "root.child('chats').child($chatId).child('users').child(auth.uid).exists()"
          }
        },
        "messages": {
          "{messageId}": {
            "reads": {
              "{userId}": {
                ".write": "auth.uid === $userId"
              }
            }
          }
        }
      }
    },
    "userChats": {
      "{userId}": {
        "$chatId": {
          ".read": "auth.uid === $userId",
          ".write": "auth.uid === $userId"
        }
      }
    }
  }
}
```

---

## Integration Checklist

- [ ] Copy `chatActions.ts` to `/lib/firebase/firebase.actions/` (or your actions directory)
- [ ] Copy `useNicknames.tsx` to `/lib/hooks/` (or your hooks directory)
- [ ] Copy `ChatModals.tsx` to your components directory
- [ ] Import and integrate `NicknameModal` in `ChatRoomPanel` (header section)
- [ ] Import and integrate `GroupNameModal` in `ChatRoomPanel` (header section)
- [ ] Import and integrate `AddMembersModal` in `ChatRoomPanel` (header section)
- [ ] Add `useUnreadCounts` hook to `ChatListPanel`
- [ ] Add notification badge rendering to each chat item in sidebar
- [ ] Add notification dot to sidebar chat icon in main layout
- [ ] Clear unread count when opening a chat
- [ ] Set unread count when new messages arrive (if chat not open)
- [ ] Update Firebase Security Rules to allow new operations
- [ ] Test all features thoroughly

---

## Usage Examples

### Complete ChatListPanel Integration with Notification Badges

```typescript
// In ChatListPanel component:

import { useUnreadCounts } from '@/lib/hooks/useNicknames';

const ChatListPanel = ({ ... }) => {
    const unreadCounts = useUnreadCounts(currentUserId);
    
    return (
        <div>
            {chatsWithUnread.map((chat) => (
                <div
                    key={chat.id}
                    className={`relative flex items-center px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                        selectedChatId === chat.id
                            ? 'bg-white/10'
                            : 'hover:bg-white/[0.05]'
                    }`}
                    onClick={() => onSelectChat(chat.id)}
                >
                    {/* Chat content */}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/85">
                            {chat.name}
                        </p>
                    </div>
                    
                    {/* Notification Badge */}
                    {unreadCounts[chat.id] > 0 && (
                        <span className="ml-2 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-semibold rounded-full flex-shrink-0">
                            {unreadCounts[chat.id] > 99 ? '99+' : unreadCounts[chat.id]}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
};
```

---

## Notes

- **Nicknames** are stored per-user, so each person can have unique nicknames for the same contact
- **Group names** are shared across all group members
- **Unread counts** are user-specific and update in real-time
- **System messages** are automatically created for group member additions/removals
- All features include **error handling** and **loading states**
- **Firebase Security Rules** must be updated for new database paths to work properly

---

## Support

For questions or issues during integration, refer to your existing Firebase setup in `/lib/firebase/firebase.ts` and ensure all imports are pointing to the correct paths in your project structure.
