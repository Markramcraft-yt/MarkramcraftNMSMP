import { useEffect, useRef, useState } from 'react';
import { Send, MoreVertical } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { messagesAPI } from '../services/api';
import { sendMessage, notifyTyping, notifyStopTyping } from '../services/signalr';
import { useAuthStore } from '../store/authStore';
import { formatDistanceToNow } from 'date-fns';

export default function ChatWindow() {
  const { currentChannelId, messages } = useChatStore();
  const { user } = useAuthStore();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (currentChannelId) {
      loadMessages();
    }
  }, [currentChannelId]);

  const loadMessages = async () => {
    if (!currentChannelId) return;
    try {
      setLoading(true);
      await messagesAPI.getMessages(currentChannelId, 50, 0);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !currentChannelId) return;

    try {
      await sendMessage(currentChannelId, content);
      setContent('');
      await notifyStopTyping(currentChannelId);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleTyping = () => {
    if (!currentChannelId) return;

    notifyTyping(currentChannelId);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      notifyStopTyping(currentChannelId);
    }, 2000);
  };

  const channelMessages = currentChannelId ? messages[currentChannelId] || [] : [];

  if (!currentChannelId) {
    return (
      <div className="flex-1 bg-slate-800 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <p className="text-xl">Select a channel to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-800 flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-slate-400">Loading messages...</div>
          </div>
        ) : channelMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-slate-400 text-center">
              <p className="text-lg">No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          </div>
        ) : (
          channelMessages.map((msg) => (
            <div key={msg.id} className="group hover:bg-slate-700/50 p-2 rounded transition">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {msg.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-white text-sm">{msg.username}</span>
                    <span className="text-xs text-slate-400">
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-slate-200 text-sm break-words">{msg.content}</p>
                </div>
                {msg.userId === user?.id && (
                  <button className="hidden group-hover:block p-1 hover:bg-slate-600 rounded">
                    <MoreVertical className="w-4 h-4 text-slate-400" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              handleTyping();
            }}
            placeholder="Message #channel..."
            className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 placeholder-slate-400"
          />
          <button
            type="submit"
            disabled={!content.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg p-2 transition"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
