import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  getLiveChatMessages,
  sendLiveChatMessage,
  markLiveChatMessageRead,
  endLiveChatSession,
} from "../../api";
import { toast } from "../../utils/toast";
import { LiveChatWebSocket } from "../../utils/websocket";
import { FaUser, FaUserShield, FaCheck, FaCheckDouble, FaCircle, FaTimes } from "react-icons/fa";
import ConfirmModal from "../../components/shared/ConfirmModal";

const LiveChatAdminPanel = ({ refreshSignal = 0, onUnreadCountChange }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const lastMessageCountRef = useRef(0);
  const shouldAutoScrollRef = useRef(true);
  const typingTimeoutRef = useRef(null);
  const lastTypingSentRef = useRef(0);
  const userTypingMapRef = useRef({});

  const isNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const threshold = 100; // pixels from bottom
    return (
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold
    );
  };

  const scrollToBottom = (force = false) => {
    if (force || shouldAutoScrollRef.current || isNearBottom()) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      shouldAutoScrollRef.current = true;
    }
  };

  const fetchMessages = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const response = await getLiveChatMessages({ limit: 200 });
      setMessages(response.data || []);
    } catch (error) {
      console.error("Failed to load chat logs:", error);
      if (showLoading) {
        toast.error("Unable to fetch live chat history.");
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const conversations = useMemo(() => {
    const map = new Map();
    messages.forEach((message) => {
      const userId = message.user_id;
      if (!userId) return;
      const existing = map.get(userId) || {
        user_id: userId,
        user_name: message.user_name || message.username || "Unknown user",
        email: message.user_email,
        messages: [],
        lastTime: message.created_at,
        unread: false,
      };
      existing.lastTime = message.created_at;
      if (!existing.messages.includes(message)) {
        existing.messages.push(message);
      }
      if (!message.is_admin && !message.is_read) {
        existing.unread = true;
      }
      map.set(userId, existing);
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastTime) - new Date(a.lastTime)
    );
  }, [messages]);

  const selectedMessages = useMemo(() => {
    return messages
      .filter((msg) => msg.user_id === selectedUserId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, [messages, selectedUserId]);

  // Track scroll position to determine if user is at bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      shouldAutoScrollRef.current = isNearBottom();
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [selectedUserId]);

  // Reset and auto-scroll when user selection changes (initial load)
  useEffect(() => {
    if (selectedUserId) {
      lastMessageCountRef.current = 0;
      shouldAutoScrollRef.current = true;
      if (selectedMessages.length > 0) {
        setTimeout(() => scrollToBottom(true), 200);
        lastMessageCountRef.current = selectedMessages.length;
      }
    }
  }, [selectedUserId]);

  useEffect(() => {
    fetchMessages(true); // Show loading on initial load
    
    // Connect WebSocket for real-time updates
    if (!wsRef.current) {
        wsRef.current = new LiveChatWebSocket(
        (message) => {
          // New message received
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === message.id)) {
              return prev;
            }
            const updated = [...prev, message].sort(
              (a, b) => new Date(a.created_at || a.timestamp) - new Date(b.created_at || b.timestamp)
            );
            // Auto-scroll to bottom when new message arrives (only if near bottom)
            setTimeout(() => scrollToBottom(false), 100);
            return updated;
          });
          // Refresh messages to get full list (silent)
          fetchMessages(false);
        },
        (count) => {
          // Unread count update
          if (onUnreadCountChange) {
            onUnreadCountChange(count);
          }
        },
        (error) => {
          console.error("WebSocket error:", error);
        },
        () => {
          console.log("WebSocket connected");
        },
        () => {
          console.log("WebSocket disconnected");
        },
        (data) => {
          // Typing indicator received
          console.log("Admin panel - Typing indicator received:", data);
          if (data.user_id) {
            userTypingMapRef.current[data.user_id] = data.typing;
            // Update typing state if this is the selected user
            if (data.user_id === selectedUserId) {
              console.log("Setting typing state to:", data.typing);
              setIsTyping(data.typing);
            }
          }
        }
      );
      wsRef.current.connect();
    }

    // Fallback polling (less frequent since we have WebSocket)
    const interval = setInterval(() => {
      fetchMessages(false); // Silent refresh, no loading indicator
    }, 2000); // Poll every 2 seconds as fallback
    
    return () => {
      clearInterval(interval);
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
    };
  }, [refreshTrigger, refreshSignal]);

  useEffect(() => {
    if (!selectedUserId && conversations.length) {
      setSelectedUserId(conversations[0].user_id);
    }
  }, [conversations, selectedUserId]);

  // Auto-scroll when new messages are added to selected conversation
  useEffect(() => {
    if (selectedUserId && selectedMessages.length > 0) {
      const currentCount = selectedMessages.length;
      // Only auto-scroll if new messages were added (not just on every update)
      if (currentCount > lastMessageCountRef.current) {
        setTimeout(() => scrollToBottom(false), 100);
      }
      lastMessageCountRef.current = currentCount;
    }
  }, [selectedMessages.length, selectedUserId]);

  const handleTyping = (value) => {
    setReply(value);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing status if there's text and a user is selected
    if (value.trim() && selectedUserId && wsRef.current) {
      const now = Date.now();
      // Throttle typing events to every 2 seconds
      if (now - lastTypingSentRef.current > 2000) {
        console.log("Admin sending typing indicator: true for user", selectedUserId);
        wsRef.current.send({ 
          type: "typing", 
          typing: true, 
          user_id: selectedUserId,
          is_admin: true 
        });
        lastTypingSentRef.current = now;
      }
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (wsRef.current && selectedUserId) {
        console.log("Admin sending typing indicator: false for user", selectedUserId);
        wsRef.current.send({ 
          type: "typing", 
          typing: false, 
          user_id: selectedUserId,
          is_admin: true 
        });
      }
    }, 3000);
  };

  const handleReply = async () => {
    if (!selectedUserId) {
      toast.error("Select a user before replying.");
      return;
    }
    if (!reply.trim()) {
      toast.error("Enter a response before sending.");
      return;
    }

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.send({ 
        type: "typing", 
        typing: false, 
        user_id: selectedUserId,
        is_admin: true 
      });
    }

    setSending(true);
    try {
      await sendLiveChatMessage({
        message: reply.trim(),
        is_admin: true,
        user_id: selectedUserId,
      });
      setReply("");
      setRefreshTrigger((prev) => prev + 1);
      toast.success("Reply sent.");
      // Force scroll to bottom when admin sends a message
      shouldAutoScrollRef.current = true;
      setTimeout(() => scrollToBottom(true), 100);
    } catch (error) {
      console.error("Failed to send chat reply:", error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || "Unable to send reply.";
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    // Send message on Enter (without Shift), allow Shift+Enter for new line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sending && reply.trim() && selectedUserId) {
        handleReply();
      }
    }
  };

  const handleMarkRead = async () => {
    const unreadIds = selectedMessages
      .filter((msg) => !msg.is_admin && !msg.is_read)
      .map((msg) => msg.id);
    if (!unreadIds.length) return;
    try {
      await Promise.all(unreadIds.map((id) => markLiveChatMessageRead(id)));
      setRefreshTrigger((prev) => prev + 1);
      toast.success("Marked as read.");
    } catch (error) {
      console.error("Failed to mark chat read:", error);
      toast.error("Could not mark messages as read.");
    }
  };

  const handleEndSession = async () => {
    if (!selectedUserId) {
      toast.error("No user selected.");
      return;
    }

    setEndingSession(true);
    try {
      const response = await endLiveChatSession(selectedUserId);
      toast.success(response.data?.message || "Session ended and messages deleted.");
      
      // Clear the selected user and refresh messages
      setSelectedUserId(null);
      setReply("");
      setRefreshTrigger((prev) => prev + 1);
      await fetchMessages(true);
      
      // Close modal
      setShowEndSessionModal(false);
    } catch (error) {
      console.error("Failed to end session:", error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || "Unable to end session.";
      toast.error(errorMessage);
    } finally {
      setEndingSession(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
        Live Chat Messages
      </h2>
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="col-span-1 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Recent Conversations
            </p>
            <button
              onClick={() => fetchMessages(true)}
              className="text-xs text-primary hover:underline"
            >
              Refresh
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">Loading…</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No chat messages yet.
              </div>
            ) : (
              conversations.map((conversation) => {
                const lastMessage = conversation.messages[conversation.messages.length - 1];
                const unreadCount = conversation.messages.filter(
                  (msg) => !msg.is_admin && !msg.is_read
                ).length;
                const formatLastTime = (dateString) => {
                  if (!dateString) return "";
                  const date = new Date(dateString);
                  const now = new Date();
                  const diffMs = now - date;
                  const diffMins = Math.floor(diffMs / 60000);
                  const diffHours = Math.floor(diffMs / 3600000);
                  const diffDays = Math.floor(diffMs / 86400000);

                  if (diffMins < 1) return "Just now";
                  if (diffMins < 60) return `${diffMins}m ago`;
                  if (diffHours < 24) return `${diffHours}h ago`;
                  if (diffDays < 7) return `${diffDays}d ago`;
                  return date.toLocaleDateString([], { month: "short", day: "numeric" });
                };

                return (
                  <button
                    key={conversation.user_id}
                    onClick={() => setSelectedUserId(conversation.user_id)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-800 transition-all duration-200 ${
                      selectedUserId === conversation.user_id
                        ? "bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/50 dark:to-blue-800/50 border-l-4 border-l-primary"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-semibold shadow-md">
                          <FaUser className="text-sm" />
                        </div>
                        {conversation.unread && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center">
                            <span className="text-[8px] text-white font-bold">
                              {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">
                            {conversation.user_name}
                          </span>
                          {lastMessage && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">
                              {formatLastTime(lastMessage.created_at)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">
                          {conversation.email}
                        </p>
                        {lastMessage && (
                          <p className="text-[11px] text-gray-600 dark:text-gray-300 truncate flex items-center gap-1">
                            <span className="truncate">
                              {lastMessage.message.length > 40
                                ? `${lastMessage.message.substring(0, 40)}...`
                                : lastMessage.message}
                            </span>
                            {lastMessage.is_admin && (
                              <span className="text-[8px] text-pink-500 flex-shrink-0">
                                <FaUserShield />
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
        <div className="col-span-1 xl:col-span-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Conversation
                  </p>
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/30">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
                    </span>
                    <span className="text-[10px] font-semibold text-pink-600 dark:text-pink-400">LIVE</span>
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedMessages.length
                    ? `Between you and ${selectedMessages[0].user_name || "user"}`
                    : "Select a user to view chats"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {selectedUserId && (
                <button
                  onClick={() => setShowEndSessionModal(true)}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                  title="End session and delete all messages"
                >
                  <FaTimes className="text-xs" />
                  End Session
                </button>
              )}
              <button
                onClick={handleMarkRead}
                className="text-xs text-pink-600 dark:text-pink-400 hover:underline"
              >
                Mark as read
              </button>
            </div>
          </div>
          <div 
            ref={messagesContainerRef}
            className="space-y-4 px-4 py-4 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
          >
            {selectedMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                  <FaUser className="text-2xl text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Choose a conversation
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Select a user to view chat history
                </p>
              </div>
            )}
            {selectedMessages.length > 0 && (() => {
              const groupedMessages = [];
              let currentGroup = null;

              selectedMessages.forEach((message) => {
                const messageDate = new Date(message.created_at).toDateString();
                const isAdmin = message.is_admin;

                if (!currentGroup || currentGroup.date !== messageDate || currentGroup.isAdmin !== isAdmin) {
                  currentGroup = {
                    date: messageDate,
                    isAdmin,
                    messages: [],
                  };
                  groupedMessages.push(currentGroup);
                }
                currentGroup.messages.push(message);
              });

              const formatTime = (dateString) => {
                const date = new Date(dateString);
                const now = new Date();
                const diffMs = now - date;
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMs / 3600000);
                const diffDays = Math.floor(diffMs / 86400000);

                if (diffMins < 1) return "Just now";
                if (diffMins < 60) return `${diffMins}m ago`;
                if (diffHours < 24) return `${diffHours}h ago`;
                if (diffDays < 7) return `${diffDays}d ago`;
                return date.toLocaleDateString([], { month: "short", day: "numeric" });
              };

              return (
                <>
                  {groupedMessages.map((group, groupIndex) => {
                    const isAdmin = group.isAdmin;
                    const showDateSeparator = groupIndex === 0 || 
                      new Date(group.date).toDateString() !== new Date(groupedMessages[groupIndex - 1].date).toDateString();

                    return (
                      <React.Fragment key={`${group.date}-${groupIndex}`}>
                        {showDateSeparator && (
                          <div className="flex items-center justify-center py-2">
                            <div className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full">
                              {new Date(group.date).toLocaleDateString([], {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                              })}
                            </div>
                          </div>
                        )}
                        {group.messages.map((message, msgIndex) => {
                          const isFirstInGroup = msgIndex === 0;
                          const showAvatar = isFirstInGroup;
                          const showName = isFirstInGroup;
                          const isUnread = !message.is_admin && !message.is_read;

                          return (
                            <div
                              key={message.id}
                              className={`flex items-end gap-2 group ${
                                isAdmin ? "justify-start" : "justify-end"
                              }`}
                            >
                              {isAdmin && showAvatar && (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center text-white text-xs font-semibold shadow-md flex-shrink-0">
                                  <FaUserShield className="text-sm" />
                                </div>
                              )}
                              <div
                                className={`flex flex-col max-w-[75%] ${
                                  isAdmin ? "items-start" : "items-end"
                                }`}
                              >
                                {showName && (
                                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 px-1 flex items-center gap-1">
                                    {isAdmin ? "You" : message.user_name || "User"}
                                    {isUnread && (
                                      <FaCircle className="text-[6px] text-red-500" />
                                    )}
                                  </span>
                                )}
                                <div
                                  className={`relative rounded-2xl px-4 py-2.5 shadow-sm transition-all duration-200 ${
                                    isAdmin
                                      ? "bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/30 dark:to-pink-800/30 text-pink-900 dark:text-pink-100 rounded-tl-sm"
                                      : `bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-tr-sm ${
                                          isUnread ? "ring-2 ring-red-200 dark:ring-red-800" : ""
                                        }`
                                  }`}
                                >
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                    {message.message}
                                  </p>
                                  <div
                                    className={`flex items-center gap-1.5 mt-1.5 ${
                                      isAdmin
                                        ? "text-pink-600 dark:text-pink-300"
                                        : "text-white/80"
                                    }`}
                                  >
                                    <span className="text-[10px]">
                                      {formatTime(message.created_at)}
                                    </span>
                                    {isAdmin && (
                                      <span className="text-[10px]">
                                        {message.is_read ? (
                                          <FaCheckDouble className="text-pink-500" />
                                        ) : (
                                          <FaCheck className="text-gray-400" />
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {!isAdmin && showAvatar && (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center text-white text-xs font-semibold shadow-md flex-shrink-0">
                                  <FaUser className="text-sm" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </>
              );
            })()}
            {isTyping && selectedUserId && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 py-2 px-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
                <span className="text-xs font-medium text-pink-600 dark:text-pink-400">
                  {selectedMessages[0]?.user_name || "User"} is typing...
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800">
            <textarea
              rows={3}
              value={reply}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a reply"
              className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={handleReply}
                disabled={sending}
                className="rounded-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 transition-colors"
              >
                {sending ? "Sending…" : "Send reply"}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* End Session Confirmation Modal */}
      <ConfirmModal
        isOpen={showEndSessionModal}
        onClose={() => setShowEndSessionModal(false)}
        onConfirm={handleEndSession}
        title="End Chat Session"
        message={`Are you sure you want to end this chat session? This will delete all messages between you and ${selectedMessages[0]?.user_name || "the user"}. This action cannot be undone.`}
        confirmText={endingSession ? "Ending..." : "End Session"}
        cancelText="Cancel"
        type="danger"
        disabled={endingSession}
      />
    </div>
  );
};

export default LiveChatAdminPanel;

