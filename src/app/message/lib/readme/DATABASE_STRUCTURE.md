// DATABASE_STRUCTURE.md

# Firebase Realtime Database Structure

Complete reference for all new database paths and structures.

---

## 📊 Database Tree

```
firebase_root/
│
├── chats/
│   └── {chatId}/
│       ├── name: string (group name only)
│       ├── isGroupChat: boolean
│       ├── createdAt: timestamp
│       ├── updatedAt: timestamp (when name was updated)
│       ├── updatedBy: string (userId who updated name)
│       │
│       ├── users/
│       │   ├── {userId1}: true
│       │   ├── {userId2}: true
│       │   └── {userId3}: true
│       │
│       ├── messages/
│       │   └── {messageId}/
│       │       ├── senderId: string
│       │       ├── content: string
│       │       ├── type: "text" | "file"
│       │       ├── timestamp: number
│       │       ├── isEdited: boolean (optional)
│       │       ├── editedAt: timestamp (optional)
│       │       │
│       │       └── reads/ ⭐ NEW
│       │           ├── {userId1}: timestamp
│       │           ├── {userId2}: timestamp
│       │           └── {userId3}: timestamp
│       │
│       ├── nicknames/ ⭐ NEW
│       │   └── {currentUserId}/
│       │       ├── {targetUserId}/
│       │       │   ├── nickname: string
│       │       │   └── setAt: timestamp
│       │       └── {otherUserId}/
│       │           ├── nickname: string
│       │           └── setAt: timestamp
│       │
│       └── typing/
│           ├── {userId1}: boolean
│           └── {userId2}: boolean
│
├── userChats/ ⭐ NEW (Enhanced)
│   └── {userId}/
│       ├── {chatId1}/
│       │   ├── unreadCount: number ⭐ NEW
│       │   └── (other metadata)
│       ├── {chatId2}/
│       │   ├── unreadCount: number ⭐ NEW
│       │   └── (other metadata)
│       └── {chatId3}/
│           ├── unreadCount: number ⭐ NEW
│           └── (other metadata)
│
├── presence/
│   ├── {userId1}: boolean
│   └── {userId2}: boolean
│
└── users/
    └── {userId}/
        ├── name: string
        ├── email: string
        ├── photoURL: string (optional)
        └── canChat: boolean
```

---

## 📍 Path Reference

### Nicknames (⭐ NEW)
```
Path: chats/{chatId}/nicknames/{currentUserId}/{targetUserId}

Structure:
{
  "nickname": "Alex",
  "setAt": 1703001234567
}

Read Access:
- Owner only (the user who set it)

Write Access:
- Owner only + must be chat member

Valid Values:
- nickname: string, 1-30 characters
- setAt: server timestamp
```

**Example:**
```
chats/chat123/nicknames/user1/user2
{
  "nickname": "Mom",
  "setAt": 1703001234567
}

chats/chat123/nicknames/user2/user1
{
  "nickname": "Alex",
  "setAt": 1703001234567
}
```

---

### Group Settings (⭐ ENHANCED)
```
Path: chats/{chatId}

Enhanced Fields:
{
  "name": "Project Team",
  "isGroupChat": true,
  "createdAt": 1703000000000,
  "updatedAt": 1703001234567,     ⭐ NEW
  "updatedBy": "user1",            ⭐ NEW
  "users": { ... },
  "messages": { ... }
}

Read Access:
- Chat members only

Write Access:
- Chat members (for name field)
- createdAt/isGroupChat: immutable

Validation:
- name: 1-50 characters
- isGroupChat: boolean (immutable)
```

---

### Read Receipts (⭐ NEW)
```
Path: chats/{chatId}/messages/{messageId}/reads/{userId}

Value Type:
- timestamp (server-generated)

Structure:
{
  "reads": {
    "user1": 1703001234567,
    "user2": 1703001234590,
    "user3": 1703001234600
  }
}

Read Access:
- Chat members

Write Access:
- User can only mark their own messages as read

Use Case:
- Track who has read each message
- Show "read" indicators in chat
- Calculate unread message count
```

**Example:**
```
chats/chat123/messages/msg1/reads/user1 = 1703001234567
chats/chat123/messages/msg1/reads/user2 = 1703001234590

// Means user1 read msg1 at 1703001234567
// And user2 read msg1 at 1703001234590
```

---

### Unread Count (⭐ NEW)
```
Path: userChats/{userId}/{chatId}/unreadCount

Value Type:
- integer, >= 0

Structure:
userChats/user1/chat1/unreadCount = 5
userChats/user1/chat2/unreadCount = 0
userChats/user1/chat3 = (no unreadCount field)

Read Access:
- User only

Write Access:
- User only

Behavior:
- Optional field (only set if unreadCount > 0)
- Can be deleted to clear unread
- Should be cleared when user opens chat
```

---

## 🔄 Operation Flows

### Setting a Nickname (1-on-1 Chat)

1. **User Action**: Opens chat and clicks "Edit nickname"
2. **Modal Shows**: NicknameModal opens
3. **User Input**: Types nickname
4. **Save**: Calls `setUserNickname(chatId, currentUserId, targetUserId, nickname)`
5. **Database Write**:
   ```
   chats/{chatId}/nicknames/{currentUserId}/{targetUserId} = {
     nickname: "Alex",
     setAt: <server-timestamp>
   }
   ```
6. **UI Update**: Hook updates, display name changes
7. **Listener**: Real-time update via `useNicknames` hook

---

### Updating Group Name

1. **User Action**: Opens group chat and clicks edit
2. **Modal Shows**: GroupNameModal opens with current name
3. **User Input**: Types new group name
4. **Save**: Calls `updateGroupName(chatId, currentUserId, newName)`
5. **Database Write**:
   ```
   chats/{chatId} = {
     name: "New Group Name",
     updatedAt: <server-timestamp>,
     updatedBy: "user1"
   }
   ```
6. **All Members See**: Update via `useGroupChatSettings` hook
7. **History**: updatedAt and updatedBy logged for audit trail

---

### Adding Members to Group

1. **User Action**: Clicks "Add members" button
2. **Modal Shows**: AddMembersModal with list of available users
3. **User Selects**: Checks boxes for users to add
4. **Save**: Calls `addUsersToGroupChat(chatId, currentUserId, [uid1, uid2])`
5. **Database Writes**:
   ```
   chats/{chatId}/users/uid1 = true
   chats/{chatId}/users/uid2 = true
   userChats/uid1/{chatId} = true
   userChats/uid2/{chatId} = true
   chats/{chatId}/messages/{newId} = {
     senderId: "SYSTEM",
     content: "2 new member(s) added by user1",
     type: "text",
     timestamp: <now>,
     isSystemMessage: true
   }
   ```
6. **Result**: New members see group, system message appears

---

### Tracking Unread Messages

**When message arrives but chat not open:**
```typescript
// In message listener (if chatId !== selectedChatId)
const currentCount = unreadCounts[chatId] || 0;
await setUnreadCount(chatId, userId, currentCount + 1);

// Database:
userChats/{userId}/{chatId}/unreadCount = 1
```

**When user opens chat:**
```typescript
// In ChatRoomPanel effect
await clearUnreadMessages(chatId, userId);

// Database:
userChats/{userId}/{chatId}/unreadCount = null (deleted)
```

**When displaying list:**
```typescript
// Real-time from useUnreadCounts hook
{unreadCounts[chatId] > 0 && (
  <Badge>{unreadCounts[chatId]}</Badge>
)}
```

---

## 💾 Data Types & Validation

### String Fields
- **chat.name**: Max 50 characters, required for groups
- **nickname**: Max 30 characters, required
- **message.content**: Max 5000 characters typically

### Numeric Fields
- **timestamp/createdAt**: Unix milliseconds
- **unreadCount**: Integer >= 0
- **reads[userId]**: Server timestamp

### Boolean Fields
- **users[userId]**: Must be true if exists
- **isGroupChat**: Cannot be changed after creation

### Special Fields
- **updatedBy**: Must match auth.uid
- **senderId**: Must match auth.uid for user messages
- **setAt**: Must be server timestamp (now)

---

## 🔐 Security Rules Summary

### Nicknames
```
✓ Can read own nicknames
✓ Can write own nicknames
✗ Cannot read others' nicknames
✗ Cannot write others' nicknames
```

### Group Name
```
✓ Group members can read
✓ Group members can write (update)
✗ Non-members cannot access
✗ Cannot change isGroupChat flag
```

### Read Receipts
```
✓ Chat members can read all
✓ Users can mark themselves as read
✗ Cannot mark others as read
✗ Cannot delete receipts
```

### Unread Count
```
✓ Users can read their own counts
✓ Users can write their own counts
✗ Cannot modify others' counts
```

---

## 📊 Data Size Estimates

### Nicknames
- Per nickname: ~100 bytes
- Per user (10 1-on-1 chats): ~1 KB
- Total (1000 users): ~1 MB

### Read Receipts
- Per message: ~50 bytes per reader
- Per group of 5 (100 messages): ~25 KB
- Scales with member count and message volume

### Unread Counts
- Per entry: ~50 bytes
- Per user (20 chats): ~1 KB
- Total (1000 users): ~1 MB

---

## 🚀 Optimization Tips

1. **Archive Old Reads**: Delete reads > 30 days old
2. **Batch Unread Updates**: Batch multiple reads into single update
3. **Index Optimization**: Add indexes for frequently queried paths
4. **Pagination**: Don't fetch all nicknames at once
5. **Caching**: Cache unread counts client-side

---

## 📝 Example Firebase Rules

```json
{
  "rules": {
    "chats": {
      "{chatId}": {
        "nicknames": {
          "{userId}": {
            ".read": "auth.uid == $userId",
            ".write": "auth.uid == $userId"
          }
        },
        "messages": {
          "{msgId}": {
            "reads": {
              "{uid}": {
                ".write": "auth.uid == $uid"
              }
            }
          }
        }
      }
    },
    "userChats": {
      "{userId}": {
        "{chatId}": {
          ".write": "auth.uid == $userId"
        }
      }
    }
  }
}
```

---

## 🔍 Debugging Tips

### Check Unread Count
```javascript
// In Firebase Console
chats/chat1 → users → (check members)
userChats/user1/chat1/unreadCount (should show number)
```

### Check Nicknames
```javascript
// In Firebase Console
chats/chat1/nicknames/user1/user2 (should show nickname object)
```

### Check Reads
```javascript
// In Firebase Console
chats/chat1/messages/msg1/reads (should show user → timestamp map)
```

### Listen to Updates
```typescript
// In console
import { onValue, ref } from 'firebase/database';
onValue(ref(db, `chats/chat1/nicknames`), snap => 
  console.log('Nicknames:', snap.val())
);
```

---

## 📋 Migration Checklist

If adding these features to existing database:

- [ ] Backup existing database
- [ ] Deploy new Security Rules
- [ ] Test new features in development
- [ ] Monitor database growth
- [ ] Document any custom paths
- [ ] Train team on new features
- [ ] Plan unread count initialization
- [ ] Set up database cleanup rules for old reads

---

## 🔗 Related Documentation

- See `IMPLEMENTATION_GUIDE.md` for integration steps
- See `firebase-security-rules.json` for complete rules
- See `chatActions.ts` for all database operations
- See `README.md` for feature overview

