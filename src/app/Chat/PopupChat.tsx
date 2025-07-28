// PopupChat.tsx
"use client";
import React, { useState } from 'react';
import ChatRoom from './ChatRoom'; // Chat room component
import { useAuth } from './AuthContext'; // Authentication context
import { CgLogOut } from "react-icons/cg"; // Logout icon
import ChatList from './ChatList'; // Chat list component
import { IoArrowBackCircle } from "react-icons/io5"; // Back icon
import AdminPanel from './AdminPanel'; // Admin panel component

export default function PopupChat() {
    const [isOpen, setIsOpen] = useState(false); // State to control chat popup visibility
    const [currentChatId, setCurrentChatId] = useState<string | null>(null); // State for the currently selected chat room
    const [showAdminPanel, setShowAdminPanel] = useState(false); // State to control admin panel visibility
    const { user, loginWithGoogle, logout } = useAuth(); // Get user, login, and logout functions from AuthContext

    // Toggles the main chat popup open/closed
    const toggleChat = () => {
        setIsOpen(!isOpen);
        if (isOpen) {
            // When closing the chat, reset current chat and hide admin panel
            setCurrentChatId(null);
            setShowAdminPanel(false);
        }
    };

    // Handles Google login click
    const handleLoginClick = async () => {
        try {
            await loginWithGoogle();
        } catch (error) {
            console.error("Google login failed:", error);
            // In a real app, you'd show a user-friendly error message here (e.g., a toast notification)
        }
    };

    // Handles logout click
    const handleLogoutClick = () => {
        logout(); // Log out the user
        setIsOpen(false); // Close the chat popup
        setCurrentChatId(null); // Clear selected chat
        setShowAdminPanel(false); // Hide admin panel
    };

    // Callback function to select a specific chat room
    const handleSelectChat = (chatId: string) => {
        setCurrentChatId(chatId); // Set the selected chat ID
        setShowAdminPanel(false); // Hide admin panel if a chat is selected
    };

    // Navigates back to the chat list or hides the admin panel
    const handleBackToChatList = () => {
        setCurrentChatId(null); // Clear current chat
        setShowAdminPanel(false); // Hide admin panel
    };

    // Toggles the visibility of the admin panel
    const handleToggleAdminPanel = () => {
        setShowAdminPanel(prev => !prev); // Toggle admin panel state
        setCurrentChatId(null); // Clear current chat when opening admin panel
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 font-sans">
            {/* Main button to open/close the chat popup */}
            <button
                onClick={toggleChat}
                className="bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300 ease-in-out transform hover:scale-105"
                aria-expanded={isOpen}
                aria-controls="chat-popup-window"
            >
                {isOpen ? 'Close Chat' : 'Open Chat'}
            </button>

            {/* Chat Popup Window */}
            {isOpen && (
                <div
                    id="chat-popup-window"
                    className="bg-white rounded-xl shadow-2xl p-4 w-[90vw] max-w-[800px] h-[70vh] flex flex-col fixed bottom-20 right-4 animate-fade-in-up"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="chat-popup-title"
                >
                    {/* Header section with title and navigation */}
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
                        {/* Back button for chat room or admin panel */}
                        {(currentChatId || showAdminPanel) && (
                            <button
                                onClick={handleBackToChatList}
                                className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
                                title="Back to Chat List"
                            >
                                <IoArrowBackCircle size={30} />
                            </button>
                        )}
                        <h2 id="chat-popup-title" className="text-xl font-bold text-gray-800 flex-grow text-center">
                            {showAdminPanel ? "Admin Panel" : (currentChatId ? "Chat Room" : "KKK Chats")}
                        </h2>
                        {/* Close button for the popup */}
                        <button
                            onClick={toggleChat}
                            className="text-gray-500 hover:text-gray-700 text-3xl p-1 rounded-full hover:bg-gray-100 transition-colors"
                            title="Close Chat"
                        >
                            &times;
                        </button>
                    </div>

                    {/* Conditional rendering based on authentication status */}
                    {!user ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-6">
                            <p className="text-lg text-gray-700">Please log in to access the chat.</p>
                            <button
                                onClick={handleLoginClick}
                                className="bg-green-600 text-white rounded-lg px-6 py-3 text-lg font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 shadow-md"
                            >
                                Login with Google
                            </button>
                        </div>
                    ) : (
                        // Render ChatList, ChatRoom, or AdminPanel based on state
                        <div className="flex-grow overflow-hidden">
                            {showAdminPanel ? (
                                <AdminPanel currentUserId={user.uid} />
                            ) : currentChatId ? (
                                <ChatRoom chatId={currentChatId} canChat={user.canChat ?? false} />
                            ) : (
                                <ChatList onSelectChat={handleSelectChat} currentUserId={user.uid} canChat={user.canChat ?? false} />
                            )}
                        </div>
                    )}

                    {/* Footer section with user info and action buttons */}
                    {user && (
                        <div className='flex items-center justify-between mt-4 pt-3 border-t border-gray-200'>
                            {/* Logout button */}
                            <button
                                title="Logout"
                                onClick={handleLogoutClick}
                                className="bg-red-500 text-white rounded-lg px-4 py-2 hover:bg-red-600 flex items-center gap-2 font-semibold text-sm transition-colors shadow-sm"
                            >
                                <CgLogOut size={22} /> Logout
                            </button>

                            {/* Admin Panel button (only for admins) */}
                            {user.isAdmin && (
                                <button
                                    title="Admin Panel"
                                    onClick={handleToggleAdminPanel}
                                    className="bg-purple-600 text-white rounded-lg px-4 py-2 hover:bg-purple-700 flex items-center gap-2 ml-auto font-semibold text-sm transition-colors shadow-sm"
                                >
                                    Admin Panel
                                </button>
                            )}

                            <div className="text-sm text-gray-600 ml-4">
                                Logged in as: <span className="font-medium">{user.displayName || user.email}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

