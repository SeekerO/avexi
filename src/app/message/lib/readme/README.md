# Chat App - New Features Implementation

This package contains 4 major new features for your chat application:

1. **Nickname Management** - Set custom nicknames for contacts in 1-on-1 chats
2. **Group Chat Settings** - Update group names and add/remove members
3. **Add Members to Groups** - Invite new users to existing group chats
4. **Unread Notifications** - Show notification badges on sidebar icons and chat list

---

## 📦 Files Included

### Core Implementation Files

1. **`chatActions.ts`** ⭐
   - Firebase database operations for all features
   - Functions: `setUserNickname()`, `updateGroupName()`, `addUsersToGroupChat()`, `markMessagesAsRead()`, `setUnreadCount()`
   - Location: Copy to `/lib/firebase/firebase.actions/` (or your actions folder)

2. **`useNicknames.tsx`** ⭐
   - Custom React hooks for real-time data fetching
   - Hooks: `useNicknames()`, `useGroupChatSettings()`, `useUnreadCounts()`
   - Location: Copy to `/lib/hooks/` (or your hooks folder)

3. **`ChatModals.tsx`** ⭐
   - Three reusable modal components
   - Components: `NicknameModal`, `GroupNameModal`, `AddMembersModal`
   - Location: Copy to your components folder

### Integration Examples

4. **`ChatRoomHeader.tsx`**
   - Complete header component with all features integrated
   - Shows best practices for using modals and actions
   - Reference implementation for ChatRoomPanel

5. **`EnhancedChatListPanel.tsx`**
   - Chat list with unread notification badges
   - Shows how to display unread counts and notification dots
   - Reference implementation for ChatListPanel

### Documentation

6. **`IMPLEMENTATION_GUIDE.md`**
   - Step-by-step integration instructions
   - Code snippets and usage examples
   - Database structure documentation

7. **`firebase-security-rules.json`**
   - Firebase Security Rules for the new features
   - Must be applied to your Firebase project

---

## 🚀 Quick Start

### Step 1: Copy Core Files
```bash
# Copy to your project:
cp chatActions.ts src/lib/firebase/firebase.actions/
cp useNicknames.tsx src/lib/hooks/
cp ChatModals.tsx src/components/
```

### Step 2: Update Firebase Security Rules
1. Go to Firebase Console → Realtime Database → Rules
2. Copy the content from `firebase-security-rules.json`
3. Merge with your existing rules
4. Deploy

### Step 3: Integrate into ChatRoomPanel
```typescript
// At the top of your ChatRoomPanel component:
import { useNicknames, useGroupChatSettings, useUnreadCounts } from '@/lib/hooks/useNicknames';
import { setUserNickname, updateGroupName, addUsersToGroupChat } from '@/lib/firebase/firebase.actions/chatActions';
import { NicknameModal, GroupNameModal, AddMembersModal } from '@/components/ChatModals';
import { ChatRoomHeader } from '@/components/ChatRoomHeader';

// Replace your existing header with:
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
```

### Step 4: Integrate into ChatListPanel
```typescript
// At the top of ChatListPanel:
import { useUnreadCounts } from '@/lib/hooks/useNicknames';
import { clearUnreadMessages } from '@/lib/firebase/firebase.actions/chatActions';

// Add in component:
const unreadCounts = useUnreadCounts(currentUserId);

// When rendering each chat:
{unreadCounts[chat.id] > 0 && (
    <span className="flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-semibold rounded-full">
        {unreadCounts[chat.id] > 99 ? '99+' : unreadCounts[chat.id]}
    </span>
)}

// When user selects a chat:
const handleSelectChat = (chatId: string) => {
    clearUnreadMessages(chatId, currentUserId);
    onSelectChat(chatId);
};
```

### Step 5: Add Notification Dot to Sidebar
```typescript
// In your main layout or sidebar component:
import { useUnreadCounts } from '@/lib/hooks/useNicknames';

// Get unread data:
const unreadCounts = useUnreadCounts(currentUserId);
const hasUnread = Object.values(unreadCounts).some(count => count > 0);

// Add to chat icon:
<div className="relative">
    <ChatIcon />
    {hasUnread && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
    )}
</div>
```

---

## 📖 Feature Documentation

### 1. Nickname Management

**What it does:**
- Users can set custom nicknames for contacts in 1-on-1 chats
- Each user has their own nicknames (not shared)
- Nicknames are 1-30 characters

**Database Structure:**
```
chats/{chatId}/nicknames/{currentUserId}/{targetUserId}
├── nickname: "Custom Name"
└── setAt: timestamp
```

**Key Functions:**
```typescript
// Set a nickname
await setUserNickname(chatId, currentUserId, targetUserId, "Alex");

// Get a nickname
const nick = await getNickname(chatId, currentUserId, targetUserId);

// Remove a nickname
await removeNickname(chatId, currentUserId, targetUserId);
```

**Component Usage:**
```typescript
const nicknames = useNicknames(chatId, currentUserId);
const displayName = nicknames[otherUserId]?.nickname || otherUserName;
```

---

### 2. Group Chat Name Management

**What it does:**
- Allows group members to rename the group chat
- Changes are visible to all members
- Tracks who updated the name

**Database Structure:**
```
chats/{chatId}
├── name: "Group Name"
├── isGroupChat: true
├── updatedAt: timestamp
└── updatedBy: userId
```

**Key Functions:**
```typescript
// Update group name
await updateGroupName(chatId, currentUserId, "New Group Name");

// Get settings
const settings = useGroupChatSettings(chatId);
```

---

### 3. Add Members to Group

**What it does:**
- Add existing users to a group chat
- Automatically creates system message
- Updates user's chat list

**Database Structure:**
```
chats/{chatId}/users/{userId}: true
userChats/{userId}/{chatId}: true
```

**Key Functions:**
```typescript
// Add one or more users
await addUsersToGroupChat(chatId, currentUserId, ["user1", "user2"]);
```

**System Message:**
Automatically creates: `"2 new member(s) added by userId"`

---

### 4. Unread Notifications

**What it does:**
- Track unread messages per chat
- Show badges in chat list (with count)
- Show notification dot on sidebar icon
- Clear unread when chat is opened

**Database Structure:**
```
userChats/{userId}/{chatId}/unreadCount: number
chats/{chatId}/messages/{messageId}/reads/{userId}: timestamp
```

**Key Functions:**
```typescript
// Mark messages as read
await markMessagesAsRead(chatId, ["msg1", "msg2"], userId);

// Set unread count
await setUnreadCount(chatId, userId, 5);

// Clear unread (set to 0)
await clearUnreadMessages(chatId, userId);

// Get all unread counts
const unreadCounts = useUnreadCounts(userId);
```

**Display:**
```typescript
// Badge in chat list
{unreadCounts[chatId] > 0 && (
    <span className="badge">{unreadCounts[chatId]}</span>
)}

// Notification dot on icon
{hasUnread && <span className="dot" />}
```

---

## 🔧 TypeScript Interfaces

### Component Props

**NicknameModal:**
```typescript
{
    isOpen: boolean;
    onClose: () => void;
    targetUserName: string;
    currentNickname: string | null;
    onSave: (nickname: string) => Promise<void>;
    loading: boolean;
    error: string | null;
}
```

**GroupNameModal:**
```typescript
{
    isOpen: boolean;
    onClose: () => void;
    currentGroupName: string | null;
    onSave: (name: string) => Promise<void>;
    loading: boolean;
    error: string | null;
}
```

**AddMembersModal:**
```typescript
{
    isOpen: boolean;
    onClose: () => void;
    availableUsers: UserProfile[];
    currentMembers: Record<string, boolean>;
    onAdd: (userIds: string[]) => Promise<void>;
    loading: boolean;
    error: string | null;
}
```

---

## ⚠️ Important Notes

### Security
- All operations require user authentication
- Firebase Security Rules MUST be updated (see Step 2)
- Users can only modify their own nicknames
- Only group members can change group settings
- Only group members can add new members

### Best Practices
1. **Always use try-catch** when calling functions
2. **Show loading states** during operations
3. **Display error messages** to users
4. **Clear unread count** when opening a chat
5. **Set unread count** when new messages arrive

### Common Mistakes to Avoid
- ❌ Not updating Firebase Security Rules
- ❌ Not clearing unread messages when opening a chat
- ❌ Not handling errors from async functions
- ❌ Not setting loading states during operations
- ❌ Hardcoding paths instead of using functions

---

## 🧪 Testing Checklist

- [ ] Nickname can be set in 1-on-1 chat
- [ ] Nickname displays in chat header
- [ ] Nickname can be edited
- [ ] Nickname persists after reload
- [ ] Group name can be updated
- [ ] Group name displays in header
- [ ] Can add members to group chat
- [ ] Added members appear in group
- [ ] System message appears when members added
- [ ] Unread badge shows in chat list
- [ ] Unread count decrements when chat is opened
- [ ] Unread badge shows correct number
- [ ] Notification dot appears on icon
- [ ] Notification dot disappears when all chats read
- [ ] All modals close after successful operation
- [ ] Error messages display properly

---

## 📱 Mobile Responsiveness

All components are fully responsive:
- Modals scale to fit mobile screens
- Chat list badges align properly
- Touch-friendly button sizes (min 44×44px)
- Modals use overflow handling for mobile

---

## 🎨 Styling

All components use:
- Tailwind CSS for styling
- Consistent color scheme (indigo, blue, green, red)
- Dark theme (matches your existing design)
- Smooth transitions and animations
- Accessibility best practices

---

## 🔗 Related Docs

- See `IMPLEMENTATION_GUIDE.md` for detailed integration steps
- See `ChatRoomHeader.tsx` for complete header example
- See `EnhancedChatListPanel.tsx` for chat list example

---

## 💡 Tips & Tricks

### Customize Modal Colors
Each modal has its own color theme:
- **NicknameModal**: Indigo theme
- **GroupNameModal**: Blue theme
- **AddMembersModal**: Green theme

Change colors in `ChatModals.tsx` by updating the class names.

### Add More Modal Features
The modals are self-contained. You can:
- Add validation
- Add preview
- Add undo functionality
- Add confirmation steps

### Extend Unread Tracking
To track unread by message sender:
```typescript
// Store: unreadCounts[chatId][senderId]
// Display: "2 new from Alice, 1 new from Bob"
```

---

## 🚨 Troubleshooting

### Unread counts not updating
- Check that `useUnreadCounts` is properly imported
- Verify Firebase listener is active
- Check browser console for errors

### Nicknames not saving
- Verify Security Rules are deployed
- Check user authentication status
- Look for error messages in console

### Modals not opening
- Check that state is properly set
- Verify onClick handlers are attached
- Check for JavaScript errors

### Notification badge not showing
- Verify `unreadCounts` object structure
- Check that unread count > 0
- Ensure CSS classes are applied

---

## 📞 Support

For issues:
1. Check the console for error messages
2. Review Security Rules configuration
3. Verify all imports are correct
4. Check database structure matches documentation
5. Refer to IMPLEMENTATION_GUIDE.md

---

## 📝 License

Use these files in your project as needed.

---

## 🎯 Next Steps

1. ✅ Copy files to your project
2. ✅ Update Firebase Security Rules
3. ✅ Import components and hooks
4. ✅ Integrate into ChatRoomPanel
5. ✅ Integrate into ChatListPanel
6. ✅ Test all features
7. ✅ Deploy to production

Happy coding! 🚀
