import React, { useState, useEffect, useRef, useMemo } from "react";
import { FaRegCommentDots, FaTimes, FaUser, FaUserShield, FaCheck, FaCheckDouble } from "react-icons/fa";
import { toast } from "../utils/toast";
import { getLiveChatMessages, sendLiveChatMessage } from "../api";
import { LiveChatWebSocket } from "../utils/websocket";

const LiveChatWidget = ({ hideLauncher = false }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const lastMessageCountRef = useRef(0);
  const shouldAutoScrollRef = useRef(true);
  const typingTimeoutRef = useRef(null);
  const lastTypingSentRef = useRef(0);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (open && token) {
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
          },
          null, // Unread count not needed for user widget
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
            console.log("Typing indicator received:", data);
            if (data.is_admin) {
              setIsTyping(data.typing);
            }
          }
        );
        wsRef.current.connect();
      }
      
      // Fallback polling every 2 seconds (in case WebSocket fails)
      const interval = setInterval(() => {
        if (document.visibilityState === "visible") {
          fetchMessages(false); // Silent refresh, no loading indicator
        }
      }, 2000); // 2 seconds
      
      return () => {
        clearInterval(interval);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        if (wsRef.current) {
          // Stop typing when closing
          wsRef.current.send({ type: "typing", typing: false, is_admin: false });
          wsRef.current.disconnect();
          wsRef.current = null;
        }
      };
    } else if (!open && wsRef.current) {
      // Disconnect when widget is closed
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.send({ type: "typing", typing: false, is_admin: false });
      }
      wsRef.current.disconnect();
      wsRef.current = null;
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
    };
  }, [open, token]);

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
      const response = await getLiveChatMessages({ limit: 60 });
      const sorted = (response.data || []).sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
      const previousCount = lastMessageCountRef.current;
      setMessages(sorted);
      lastMessageCountRef.current = sorted.length;
      
      // Only auto-scroll if this is initial load or new messages were added
      if (showLoading || sorted.length > previousCount) {
        setTimeout(() => scrollToBottom(showLoading), 100);
      }
    } catch (error) {
      console.error("Failed to load chat messages:", error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Allow external components to toggle the chat widget (e.g. combined support button)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleToggle = () => {
      setOpen((prev) => !prev);
    };

    window.addEventListener("toggleLiveChatWidget", handleToggle);
    return () => {
      window.removeEventListener("toggleLiveChatWidget", handleToggle);
    };
  }, []);

  // Track scroll position to determine if user is at bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      shouldAutoScrollRef.current = isNearBottom();
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [open]);

  // Reset message count when chat opens
  useEffect(() => {
    if (open) {
      lastMessageCountRef.current = 0;
      shouldAutoScrollRef.current = true;
    }
  }, [open]);

  const handleTyping = (value) => {
    setDraft(value);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing status if there's text
    if (value.trim() && wsRef.current) {
      const now = Date.now();
      // Throttle typing events to every 2 seconds
      if (now - lastTypingSentRef.current > 2000) {
        console.log("Sending typing indicator: true");
        wsRef.current.send({ 
          type: "typing", 
          typing: true,
          is_admin: false 
        });
        lastTypingSentRef.current = now;
      }
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (wsRef.current) {
        console.log("Sending typing indicator: false");
        wsRef.current.send({ 
          type: "typing", 
          typing: false,
          is_admin: false 
        });
      }
    }, 3000);
  };

  const handleSend = async () => {
    if (!draft.trim()) {
      toast.error("Please enter a message before sending.");
      return;
    }
    if (!token) {
      toast.error("Please log in to send a chat message.");
      return;
    }

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.send({ type: "typing", typing: false });
    }

    setSending(true);
    try {
      await sendLiveChatMessage({ message: draft.trim() });
      setDraft("");
      // Force scroll to bottom when user sends a message
      shouldAutoScrollRef.current = true;
      await fetchMessages(false); // Silent refresh after sending
      setTimeout(() => scrollToBottom(true), 100);
      toast.success("Message sent! Our team will reply shortly.");
    } catch (error) {
      console.error("Send chat message failed:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    // Send message on Enter (without Shift), allow Shift+Enter for new line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sending && draft.trim() && token) {
        handleSend();
      }
    }
  };

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

  const formatFullTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentGroup = null;

    messages.forEach((message) => {
      const messageDate = new Date(message.created_at).toDateString();
      const isAdmin = message.is_admin;

      if (!currentGroup || currentGroup.date !== messageDate || currentGroup.isAdmin !== isAdmin) {
        currentGroup = {
          date: messageDate,
          isAdmin,
          messages: [],
        };
        groups.push(currentGroup);
      }
      currentGroup.messages.push(message);
    });

    return groups;
  }, [messages]);

  const renderMessages = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">Loading messages…</p>
          </div>
        </div>
      );
    }

    if (!messages.length) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
            <FaRegCommentDots className="text-2xl text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            No messages yet
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Say hi to start a conversation
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
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
                const showName = isFirstInGroup && isAdmin;

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
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 px-1">
                          {message.user_name || "Admin"}
                        </span>
                      )}
                      <div
                        className={`relative rounded-2xl px-4 py-2.5 shadow-sm transition-all duration-200 ${
                          isAdmin
                            ? "bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/30 dark:to-pink-800/30 text-pink-900 dark:text-pink-100 rounded-tl-sm"
                            : "bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-tr-sm"
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
                          {!isAdmin && (
                            <span className="text-[10px]">
                              {message.is_read ? (
                                <FaCheckDouble className="text-pink-200" />
                              ) : (
                                <FaCheck />
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
      </div>
    );
  };

  const chatContainer = (
    <div className="fixed bottom-20 left-4 right-4 md:bottom-24 md:left-auto md:right-6 md:w-72 lg:w-96 z-[1100] rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-800 dark:text-white">
                Live Support
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
              Chat with our team
            </p>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          aria-label="Close chat"
        >
          <FaTimes />
        </button>
      </div>
      <div 
        ref={messagesContainerRef}
        className="h-80 px-4 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
      >
        {token ? (
          <>
            {renderMessages()}
            {isTyping && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 py-2 px-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
                <span className="text-xs font-medium text-pink-600 dark:text-pink-400">Admin is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
              <FaRegCommentDots className="text-2xl text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Please sign in to use live chat
            </p>
          </div>
        )}
      </div>
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
        <textarea
          value={draft}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder={token ? "Enter your question..." : "Login to chat"}
          className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          disabled={!token || sending}
        />
        <button
          onClick={handleSend}
          disabled={!token || sending}
          className="mt-2 w-full rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition-colors"
        >
          {sending ? "Sending…" : "Send message"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {open && chatContainer}
      {!hideLauncher && (
        <button
          onClick={() => setOpen(!open)}
          className="fixed bottom-5 left-4 z-[1100] flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-pink-600 px-5 text-sm font-semibold text-white shadow-xl transition-all hover:from-pink-600 hover:to-pink-700 md:bottom-6 md:left-auto md:right-6"
          aria-label="Open chat"
        >
          <FaRegCommentDots className="shrink-0 text-white" />
          <span className="hidden sm:inline">Chat with us</span>
        </button>
      )}
    </>
  );
};

export default LiveChatWidget;

