// AdminPanel.tsx
"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useCallback } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "./firebase";
import Image from "next/image"; // Assuming Next.js Image component for optimization

// Interface for user profile data
interface UserProfile {
  uid: string;
  name: string;
  profilePic: string | null;
  email: string;
  isAdmin: boolean;
  canChat: boolean;
}

// Props for the AdminPanel component
interface AdminPanelProps {
  currentUserId: string; // The UID of the currently logged-in admin user
}

export default function AdminPanel({ currentUserId }: AdminPanelProps) {
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Listener for all user profiles in the 'users' node
    const usersRef = ref(db, "users");
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const usersData = snapshot.val();
      if (usersData) {
        // Convert the users data object into an array of UserProfile objects
        const usersList = Object.keys(usersData).map((uid) => ({
          uid,
          name: usersData[uid].name || usersData[uid].email, // Use name or email
          profilePic: usersData[uid].profilePic || null,
          email: usersData[uid].email,
          isAdmin: usersData[uid].isAdmin || false, // Default to false if not set
          canChat:
            usersData[uid].canChat !== undefined // Default to true if not set
              ? usersData[uid].canChat
              : true,
        }));
        setAllUsers(usersList);
      } else {
        setAllUsers([]); // No users found
      }
    });

    // Listener for user presence (online/offline status) in the 'presence' node
    const presenceRef = ref(db, "presence");
    const unsubscribePresence = onValue(presenceRef, (snapshot) => {
      const presenceData = snapshot.val() || {};
      const onlineStatus: Record<string, boolean> = {};
      // Iterate through presence data to determine online status
      for (const uid in presenceData) {
        // A user is considered online if their presence value is 'true'
        // If it's a timestamp, they are offline (last seen at that timestamp)
        onlineStatus[uid] = presenceData[uid] === true;
      }
      setOnlineUsers(onlineStatus);
    });

    // Cleanup function to unsubscribe from listeners when the component unmounts
    return () => {
      unsubscribeUsers();
      unsubscribePresence();
    };
  }, []); // Empty dependency array means this effect runs once on mount

  // Callback function to toggle a user's 'canChat' status
  const handleToggleCanChat = useCallback(
    async (userId: string, currentCanChatStatus: boolean) => {
      try {
        const userRef = ref(db, `users/${userId}`);
        // Update the 'canChat' property to the opposite of its current status
        await update(userRef, { canChat: !currentCanChatStatus });
        console.log(
          `User ${userId} canChat status toggled to ${!currentCanChatStatus}`
        );
      } catch (error) {
        console.error("Error toggling canChat status:", error);
        // In a real application, you'd use a custom modal instead of alert
        // For this example, alert is used as a simple feedback mechanism
        alert("Failed to update user chat permission.");
      }
    },
    [] // Empty dependency array means this callback is memoized and doesn't recreate
  );

  return (
    <div className="p-4 h-full overflow-y-auto bg-white rounded-lg shadow-md font-sans">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-3">Admin Panel - User Management</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allUsers.length === 0 ? (
          <p className="col-span-full text-center text-gray-500 text-lg py-10">
            No users found.
          </p>
        ) : (
          // Map through all users and display their information
          allUsers.map((user) => (
            <div
              key={user.uid}
              className="border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col items-center bg-gray-50 hover:shadow-md transition-shadow duration-200"
            >
              {user.profilePic && (
                <Image
                  width={80}
                  height={80}
                  src={user.profilePic}
                  alt={`${user.name}'s profile`}
                  className="w-20 h-20 rounded-full mb-3 object-cover border-2 border-blue-300"
                />
              )}
              <h3 className="font-semibold text-xl text-gray-900 mb-1">{user.name}</h3>
              <p className="text-sm text-gray-600 mb-2 truncate max-w-full">{user.email}</p>
              <p className="text-xs text-gray-500 mb-3">UID: {user.uid.substring(0, 8)}...</p> {/* Truncate UID for display */}

              {/* Online Status Indicator */}
              <div className="flex items-center mt-2">
                <span
                  className={`w-3 h-3 rounded-full mr-2 ${onlineUsers[user.uid] ? "bg-green-500" : "bg-gray-400"
                    }`}
                ></span>
                <span className="text-sm font-medium text-gray-700">
                  {onlineUsers[user.uid] ? "Online" : "Offline"}
                </span>
              </div>

              {/* Can Chat Toggle */}
              <div className="mt-4 flex items-center space-x-3">
                <span className="text-base font-medium text-gray-800">Can Chat:</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={user.canChat}
                    onChange={() => handleToggleCanChat(user.uid, user.canChat)}
                    // Prevent an admin from disabling their own chat permission
                    disabled={user.uid === currentUserId}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                {user.uid === currentUserId && (
                  <span className="text-xs text-gray-500 ml-2">
                    (You cannot disable your own chat)
                  </span>
                )}
              </div>

              {/* Admin Status */}
              <div className="mt-3 text-sm text-gray-700">
                Admin Status:{" "}
                <span
                  className={`font-bold ${user.isAdmin ? "text-green-600" : "text-red-600"
                    }`}
                >
                  {user.isAdmin ? "Yes" : "No"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

