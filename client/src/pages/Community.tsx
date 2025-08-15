import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import debounce from 'lodash.debounce';
import {
  MessageSquare,
  Plus,
  Search,
  Filter,
  Heart,
  Reply,
  Send,
  TrendingUp,
  Clock,
  User,
  BookOpen,
  Hash,
  ChevronDown,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Bookmark,
  Edit3,
  Trash2,
  Flag,
  MoreHorizontal,
  Pin,
  Lock,
  Unlock,
  Eye,
  Star,
  Award,
  Users,
  Calendar,
  Image as ImageIcon,
  Paperclip,
  X,
  AlertCircle,
  CheckCircle2,
  Settings
} from 'lucide-react';

// Mock API functions (replace with actual API calls)
const mockApi = {
  async fetchCurrentUser() {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      id: 'user_' + Math.random().toString(36).substr(2, 9),
      name: 'Alex Johnson',
      email: 'alex.johnson@university.edu',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=alex${Math.random()}`,
      course: 'Computer Science',
      year: '3rd Year',
      reputation: 1250,
      role: 'student',
      badges: ['Top Contributor', 'Helpful', 'Expert'],
      joinedDate: '2023-01-15',
      totalPosts: 45,
      totalLikes: 234
    };
  },

  async fetchThreads({ page = 1, pageSize = 10, q = '', course = '', topic = '', sort = 'recent' } = {}) {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
    
    // Generate mock threads
    const mockThreads = Array.from({ length: pageSize }, (_, i) => ({
      id: `thread_${page}_${i}`,
      title: `Sample Discussion ${page * pageSize + i + 1}: ${q || 'General Topic'}`,
      content: `This is a sample discussion content about ${topic || 'various topics'}. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`,
      author: `User ${Math.floor(Math.random() * 100)}`,
      authorId: `user_${Math.floor(Math.random() * 100)}`,
      authorAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=user${Math.random()}`,
      authorReputation: Math.floor(Math.random() * 1000) + 100,
      course: course === 'all' ? ['Computer Science', 'Physics', 'Mathematics'][Math.floor(Math.random() * 3)] : course,
      topic: topic || ['Discussion', 'Study Group', 'Resources'][Math.floor(Math.random() * 3)],
      timestamp: `${Math.floor(Math.random() * 24)} hours ago`,
      likes: Math.floor(Math.random() * 50),
      dislikes: Math.floor(Math.random() * 10),
      replies: Math.floor(Math.random() * 20),
      views: Math.floor(Math.random() * 500) + 50,
      isLiked: Math.random() > 0.7,
      isDisliked: false,
      isBookmarked: Math.random() > 0.8,
      isPinned: Math.random() > 0.9,
      isLocked: Math.random() > 0.95,
      tags: ['javascript', 'react', 'programming'].slice(0, Math.floor(Math.random() * 3) + 1),
      hasAttachment: Math.random() > 0.7,
      attachmentType: Math.random() > 0.5 ? 'image' : 'document',
      isSolved: Math.random() > 0.8,
      priority: Math.random() > 0.9 ? 'high' : 'normal'
    }));

    return {
      items: mockThreads,
      meta: {
        page,
        totalPages: 5,
        total: 50,
        hasNextPage: page < 5
      }
    };
  },

  async createThread(formData) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const data = Object.fromEntries(formData);
    return {
      id: 'thread_' + Date.now(),
      title: data.title,
      content: data.content,
      author: data.authorName,
      authorId: data.authorId,
      timestamp: 'Just now',
      likes: 0,
      replies: 0,
      views: 1,
      tags: JSON.parse(data.tags || '[]')
    };
  },

  async fetchReplies(threadId) {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const generateReplies = (parentId = null, depth = 0, count = Math.floor(Math.random() * 5) + 1) => {
      if (depth > 3) return [];
      
      return Array.from({ length: count }, (_, i) => {
        const id = `reply_${threadId}_${parentId || 'root'}_${i}`;
        const reply = {
          id,
          threadId,
          parentId,
          content: `This is a sample reply at depth ${depth}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
          author: `User ${Math.floor(Math.random() * 100)}`,
          authorId: `user_${Math.floor(Math.random() * 100)}`,
          authorAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=reply${Math.random()}`,
          authorReputation: Math.floor(Math.random() * 500) + 50,
          timestamp: `${Math.floor(Math.random() * 48)} hours ago`,
          likes: Math.floor(Math.random() * 20),
          dislikes: Math.floor(Math.random() * 5),
          isLiked: Math.random() > 0.8,
          isDisliked: false,
          depth,
          children: depth < 2 && Math.random() > 0.6 ? generateReplies(id, depth + 1, Math.floor(Math.random() * 3) + 1) : []
        };
        return reply;
      });
    };
    
    return generateReplies();
  }
};

// Enhanced Thread interface
interface Thread {
  id: string;
  title: string;
  content: string;
  author: string;
  authorId: string;
  authorAvatar?: string;
  authorReputation: number;
  course: string;
  topic: string;
  timestamp: string;
  likes: number;
  dislikes: number;
  replies: number;
  views: number;
  isLiked: boolean;
  isDisliked: boolean;
  isBookmarked: boolean;
  isPinned: boolean;
  isLocked: boolean;
  isSolved: boolean;
  priority: 'normal' | 'high';
  tags: string[];
  hasAttachment: boolean;
  attachmentType?: 'image' | 'document';
}

interface Reply {
  id: string;
  threadId: string;
  parentId?: string;
  content: string;
  author: string;
  authorId: string;
  authorAvatar?: string;
  authorReputation: number;
  timestamp: string;
  likes: number;
  dislikes: number;
  isLiked: boolean;
  isDisliked: boolean;
  depth: number;
  children: Reply[];
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  course: string;
  year: string;
  reputation: number;
  role: string;
  badges: string[];
  joinedDate: string;
  totalPosts: number;
  totalLikes: number;
}

// Enhanced TagInput Component
const TagInput = React.memo(({ value = [], onChange }: { value: string[]; onChange: (v: string[]) => void }) => {
  const [text, setText] = useState('');
  const [suggestions] = useState(['javascript', 'react', 'programming', 'algorithms', 'data-structures', 'web-development', 'mobile', 'databases']);

  const addTagFromText = useCallback(() => {
    const t = text.trim().toLowerCase();
    if (!t || value.includes(t)) return;
    onChange([...value, t]);
    setText('');
  }, [text, value, onChange]);

  const removeTag = useCallback((tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  }, [value, onChange]);

  const filteredSuggestions = suggestions.filter(s => 
    s.toLowerCase().includes(text.toLowerCase()) && !value.includes(s)
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
            <Hash className="w-3 h-3" />
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="ml-1 text-primary/70 hover:text-primary"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      
      <div className="relative">
        <input
          type="text"
          placeholder="Add tags..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTagFromText();
            }
          }}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        
        {text && filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-10 max-h-32 overflow-y-auto">
            {filteredSuggestions.slice(0, 5).map(suggestion => (
              <button
                key={suggestion}
                onClick={() => {
                  onChange([...value, suggestion]);
                  setText('');
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Hash className="w-3 h-3" />
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

// Reply Component with nested structure
const ReplyComponent = React.memo(({ 
  reply, 
  onLike, 
  onDislike, 
  onReply, 
  currentUser,
  level = 0 
}: { 
  reply: Reply; 
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onReply: (parentId: string, content: string) => void;
  currentUser: User | null;
  level?: number;
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showChildren, setShowChildren] = useState(true);

  const handleSubmitReply = () => {
    if (!replyText.trim()) return;
    onReply(reply.id, replyText.trim());
    setReplyText('');
    setShowReplyForm(false);
  };

  const maxDepth = 4;
  const canNest = level < maxDepth;

  return (
    <div className={`${level > 0 ? 'ml-6 border-l-2 border-gray-100 pl-4' : ''}`}>
      <div className="bg-gray-50/50 rounded-lg p-4 mb-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <img 
              src={reply.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.author}`} 
              alt={reply.author}
              className="w-8 h-8 rounded-full"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{reply.author}</span>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                  {reply.authorReputation} rep
                </span>
              </div>
              <span className="text-xs text-gray-500">{reply.timestamp}</span>
            </div>
          </div>
          
          <button className="text-gray-400 hover:text-gray-600">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-gray-700 mb-3">{reply.content}</p>

        <div className="flex items-center gap-4">
          <button
            onClick={() => onLike(reply.id)}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${
              reply.isLiked 
                ? 'bg-green-100 text-green-700' 
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <ThumbsUp className="w-3 h-3" />
            {reply.likes}
          </button>
          
          <button
            onClick={() => onDislike(reply.id)}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${
              reply.isDisliked 
                ? 'bg-red-100 text-red-700' 
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <ThumbsDown className="w-3 h-3" />
            {reply.dislikes}
          </button>

          {canNest && (
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-full hover:bg-gray-100"
            >
              <Reply className="w-3 h-3" />
              Reply
            </button>
          )}

          {reply.children.length > 0 && (
            <button
              onClick={() => setShowChildren(!showChildren)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              {showChildren ? (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Hide {reply.children.length} replies
                </>
              ) : (
                <>
                  <ChevronRight className="w-3 h-3" />
                  Show {reply.children.length} replies
                </>
              )}
            </button>
          )}
        </div>

        {showReplyForm && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex gap-2">
              <img 
                src={currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.name}`}
                alt="You"
                className="w-6 h-6 rounded-full mt-1"
              />
              <div className="flex-1">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  className="w-full px-3 py-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                  rows={2}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSubmitReply}
                    disabled={!replyText.trim()}
                    className="px-3 py-1 text-xs bg-primary text-white rounded-md disabled:opacity-50"
                  >
                    Reply
                  </button>
                  <button
                    onClick={() => {
                      setShowReplyForm(false);
                      setReplyText('');
                    }}
                    className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showChildren && reply.children.map((childReply) => (
        <ReplyComponent
          key={childReply.id}
          reply={childReply}
          onLike={onLike}
          onDislike={onDislike}
          onReply={onReply}
          currentUser={currentUser}
          level={level + 1}
        />
      ))}
    </div>
  );
});

// Main Community Component
export default function Community() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  
  // UI State
  const [activeTab, setActiveTab] = useState('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [showNewThreadDialog, setShowNewThreadDialog] = useState(false);
  const [expandedThread, setExpandedThread] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Form state (isolated to prevent re-renders)
  const [threadForm, setThreadForm] = useState({
    title: '',
    content: '',
    topic: '',
    tags: [] as string[],
    attachment: null as File | null
  });

  const { ref: loadMoreRef, inView } = useInView();

  // Fetch current user on mount
  useEffect(() => {
    mockApi.fetchCurrentUser()
      .then(setCurrentUser)
      .catch(console.error)
      .finally(() => setIsLoadingUser(false));
  }, []);

  // Debounced search to prevent excessive API calls
  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      setPage(1);
      setThreads([]);
    }, 500),
    []
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
    return () => debouncedSearch.cancel();
  }, [searchQuery, debouncedSearch]);

  // Fetch threads
  const fetchThreads = useCallback(async (resetPage = false) => {
    if (resetPage) {
      setPage(1);
      setThreads([]);
    }
    
    setIsLoadingThreads(true);
    try {
      const sort = activeTab === 'trending' ? 'trending' : 
                   activeTab === 'recent' ? 'recent' : 'unanswered';
      
      const response = await mockApi.fetchThreads({
        page: resetPage ? 1 : page,
        pageSize: 10,
        q: searchQuery,
        course: selectedCourse,
        topic: selectedTopic,
        sort
      });

      if (resetPage) {
        setThreads(response.items);
      } else {
        setThreads(prev => [...prev, ...response.items]);
      }
      
      setTotalPages(response.meta.totalPages);
    } catch (error) {
      console.error('Failed to fetch threads:', error);
    } finally {
      setIsLoadingThreads(false);
    }
  }, [page, activeTab, searchQuery, selectedCourse, selectedTopic]);

  // Fetch threads when filters change
  useEffect(() => {
    fetchThreads(true);
  }, [activeTab, selectedCourse, selectedTopic, searchQuery]);

  // Load more on scroll
  useEffect(() => {
    if (inView && !isLoadingThreads && page < totalPages) {
      setPage(prev => prev + 1);
    }
  }, [inView, isLoadingThreads, page, totalPages]);

  // Load more when page changes (but not on initial load)
  useEffect(() => {
    if (page > 1) {
      fetchThreads(false);
    }
  }, [page]);

  // Fetch replies when thread is expanded
  const handleExpandThread = useCallback(async (threadId: string) => {
    const isExpanding = expandedThread !== threadId;
    setExpandedThread(isExpanding ? threadId : null);
    
    if (isExpanding && !replies[threadId]) {
      try {
        const threadReplies = await mockApi.fetchReplies(threadId);
        setReplies(prev => ({ ...prev, [threadId]: threadReplies }));
      } catch (error) {
        console.error('Failed to fetch replies:', error);
      }
    }
  }, [expandedThread, replies]);

  // Create thread with optimistic updates
  const handleCreateThread = useCallback(async () => {
    if (!threadForm.title.trim() || !threadForm.content.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    if (!currentUser) {
      alert('Please sign in to create a discussion');
      return;
    }

    setIsCreatingThread(true);

    // Create optimistic thread
    const optimisticThread: Thread = {
      id: 'temp_' + Date.now(),
      title: threadForm.title,
      content: threadForm.content,
      author: currentUser.name,
      authorId: currentUser.id,
      authorAvatar: currentUser.avatar,
      authorReputation: currentUser.reputation,
      course: currentUser.course,
      topic: threadForm.topic || 'Discussion',
      timestamp: 'Just now',
      likes: 0,
      dislikes: 0,
      replies: 0,
      views: 1,
      isLiked: false,
      isDisliked: false,
      isBookmarked: false,
      isPinned: false,
      isLocked: false,
      isSolved: false,
      priority: 'normal',
      tags: threadForm.tags,
      hasAttachment: !!threadForm.attachment,
      attachmentType: threadForm.attachment?.type.includes('image') ? 'image' : 'document'
    };

    // Add optimistically
    setThreads(prev => [optimisticThread, ...prev]);
    setShowNewThreadDialog(false);

    try {
      const formData = new FormData();
      formData.append('title', threadForm.title);
      formData.append('content', threadForm.content);
      formData.append('authorId', currentUser.id);
      formData.append('authorName', currentUser.name);
      formData.append('course', currentUser.course);
      formData.append('topic', threadForm.topic || 'Discussion');
      formData.append('tags', JSON.stringify(threadForm.tags));
      if (threadForm.attachment) {
        formData.append('attachment', threadForm.attachment);
      }

      const createdThread = await mockApi.createThread(formData);
      
      // Replace optimistic thread with real thread
      setThreads(prev => 
        prev.map(t => t.id === optimisticThread.id ? { ...optimisticThread, id: createdThread.id } : t)
      );

      // Reset form
      setThreadForm({
        title: '',
        content: '',
        topic: '',
        tags: [],
        attachment: null
      });

    } catch (error) {
      console.error('Failed to create thread:', error);
      // Remove optimistic thread on error
      setThreads(prev => prev.filter(t => t.id !== optimisticThread.id));
      alert('Failed to create discussion. Please try again.');
    } finally {
      setIsCreatingThread(false);
    }
  }, [threadForm, currentUser]);

  // Handle thread interactions
  const handleThreadLike = useCallback((threadId: string) => {
    setThreads(prev => prev.map(thread => 
      thread.id === threadId 
        ? { 
            ...thread, 
            isLiked: !thread.isLiked,
            likes: thread.isLiked ? thread.likes - 1 : thread.likes + 1
          }
        : thread
    ));
  }, []);

  const handleThreadDislike = useCallback((threadId: string) => {
    setThreads(prev => prev.map(thread => 
      thread.id === threadId 
        ? { 
            ...thread, 
            isDisliked: !thread.isDisliked,
            dislikes: thread.isDisliked ? thread.dislikes - 1 : thread.dislikes + 1
          }
        : thread
    ));
  }, []);

  const handleReplyLike = useCallback((replyId: string) => {
    setReplies(prev => {
      const newReplies = { ...prev };
      Object.keys(newReplies).forEach(threadId => {
        const updateReply = (replies: Reply[]): Reply[] => {
          return replies.map(reply => {
            if (reply.id === replyId) {
              return {
                ...reply,
                isLiked: !reply.isLiked,
                likes: reply.isLiked ? reply.likes - 1 : reply.likes + 1
              };
            }
            return {
              ...reply,
              children: updateReply(reply.children)
            };
          });
        };
        newReplies[threadId] = updateReply(newReplies[threadId]);
      });
      return newReplies;
    });
  }, []);

  const handleReplyDislike = useCallback((replyId: string) => {
    setReplies(prev => {
      const newReplies = { ...prev };
      Object.keys(newReplies).forEach(threadId => {
        const updateReply = (replies: Reply[]): Reply[] => {
          return replies.map(reply => {
            if (reply.id === replyId) {
              return {
                ...reply,
                isDisliked: !reply.isDisliked,
                dislikes: reply.isDisliked ? reply.dislikes - 1 : reply.dislikes + 1
              };
            }
            return {
              ...reply,
              children: updateReply(reply.children)
            };
          });
        };
        newReplies[threadId] = updateReply(newReplies[threadId]);
      });
      return newReplies;
    });
  }, []);

  const handleAddReply = useCallback((parentId: string, content: string) => {
    if (!currentUser) return;

    const newReply: Reply = {
      id: 'temp_reply_' + Date.now(),
      threadId: expandedThread!,
      parentId: parentId === 'root' ? undefined : parentId,
      content,
      author: currentUser.name,
      authorId: currentUser.id,
      authorAvatar: currentUser.avatar,
      authorReputation: currentUser.reputation,
      timestamp: 'Just now',
      likes: 0,
      dislikes: 0,
      isLiked: false,
      isDisliked: false,
      depth: 0,
      children: []
    };

    setReplies(prev => {
      const threadReplies = prev[expandedThread!] || [];
      
      if (parentId === 'root') {
        return {
          ...prev,
          [expandedThread!]: [...threadReplies, newReply]
        };
      } else {
        const addToParent = (replies: Reply[]): Reply[] => {
          return replies.map(reply => {
            if (reply.id === parentId) {
              return {
                ...reply,
                children: [...reply.children, { ...newReply, depth: reply.depth + 1 }]
              };
            }
            return {
              ...reply,
              children: addToParent(reply.children)
            };
          });
        };
        
        return {
          ...prev,
          [expandedThread!]: addToParent(threadReplies)
        };
      }
    });

    // Update thread reply count
    setThreads(prev => prev.map(thread =>
      thread.id === expandedThread
        ? { ...thread, replies: thread.replies + 1 }
        : thread
    ));
  }, [currentUser, expandedThread]);

  const ThreadCard = React.memo(({ thread }: { thread: Thread }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <img 
              src={thread.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${thread.author}`}
              alt={thread.author}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{thread.author}</span>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                  {thread.authorReputation} rep
                </span>
                {thread.isPinned && <Pin className="w-4 h-4 text-yellow-600" />}
                {thread.isLocked && <Lock className="w-4 h-4 text-red-600" />}
                {thread.isSolved && <CheckCircle2 className="w-4 h-4 text-green-600" />}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <BookOpen className="w-3 h-3" />
                <span>{thread.course}</span>
                <span>•</span>
                <Clock className="w-3 h-3" />
                <span>{thread.timestamp}</span>
                <span>•</span>
                <Eye className="w-3 h-3" />
                <span>{thread.views} views</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs rounded-full ${
              thread.topic === 'Study Group' ? 'bg-green-100 text-green-700' :
              thread.topic === 'Resources' ? 'bg-blue-100 text-blue-700' :
              thread.topic === 'Assignments' ? 'bg-orange-100 text-orange-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {thread.topic}
            </span>
            {thread.priority === 'high' && (
              <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                High Priority
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="mb-4">
          <h3 
            className="text-lg font-semibold mb-2 cursor-pointer hover:text-blue-600 transition-colors"
            onClick={() => handleExpandThread(thread.id)}
          >
            {thread.title}
          </h3>
          <p className="text-gray-600 line-clamp-3">{thread.content}</p>
        </div>

        {/* Tags */}
        {thread.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {thread.tags.map((tag, index) => (
              <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                <Hash className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Attachment indicator */}
        {thread.hasAttachment && (
          <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-lg">
            {thread.attachmentType === 'image' ? (
              <ImageIcon className="w-4 h-4 text-gray-500" />
            ) : (
              <Paperclip className="w-4 h-4 text-gray-500" />
            )}
            <span className="text-sm text-gray-600">
              {thread.attachmentType === 'image' ? 'Image attached' : 'File attached'}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleThreadLike(thread.id)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors ${
                thread.isLiked 
                  ? 'bg-green-100 text-green-700' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              {thread.likes}
            </button>

            <button
              onClick={() => handleThreadDislike(thread.id)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors ${
                thread.isDisliked 
                  ? 'bg-red-100 text-red-700' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
              {thread.dislikes}
            </button>

            <button
              onClick={() => handleExpandThread(thread.id)}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-sm text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              {thread.replies}
            </button>

            <button className="flex items-center gap-1 px-3 py-1 rounded-full text-sm text-gray-500 hover:bg-gray-100 transition-colors">
              <Share2 className="w-4 h-4" />
              Share
            </button>

            <button className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors ${
              thread.isBookmarked 
                ? 'bg-yellow-100 text-yellow-700' 
                : 'text-gray-500 hover:bg-gray-100'
            }`}>
              <Bookmark className="w-4 h-4" />
              {thread.isBookmarked ? 'Saved' : 'Save'}
            </button>
          </div>

          <button
            onClick={() => handleExpandThread(thread.id)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronDown className={`w-5 h-5 transition-transform ${
              expandedThread === thread.id ? 'rotate-180' : ''
            }`} />
          </button>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {expandedThread === thread.id && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6 pt-6 border-t border-gray-200 space-y-4"
            >
              {/* Replies */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Replies ({thread.replies})</h4>
                
                {replies[thread.id] ? (
                  replies[thread.id].length > 0 ? (
                    <div className="space-y-3">
                      {replies[thread.id].map((reply) => (
                        <ReplyComponent
                          key={reply.id}
                          reply={reply}
                          onLike={handleReplyLike}
                          onDislike={handleReplyDislike}
                          onReply={handleAddReply}
                          currentUser={currentUser}
                          level={0}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>No replies yet. Be the first to reply!</p>
                    </div>
                  )
                ) : (
                  <div className="flex justify-center py-4">
                    <div className="flex items-center gap-2 text-gray-500">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                    </div>
                  </div>
                )}

                {/* Main Reply Form */}
                {currentUser && (
                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <img 
                      src={currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.name}`}
                      alt="You"
                      className="w-8 h-8 rounded-full mt-1"
                    />
                    <div className="flex-1">
                      <textarea
                        placeholder="Write a reply..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        rows={3}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            const content = (e.target as HTMLTextAreaElement).value.trim();
                            if (content) {
                              handleAddReply('root', content);
                              (e.target as HTMLTextAreaElement).value = '';
                            }
                          }
                        }}
                      />
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          Press Cmd+Enter to reply
                        </span>
                        <button
                          onClick={(e) => {
                            const textarea = e.currentTarget.previousElementSibling as HTMLTextAreaElement;
                            const content = textarea.value.trim();
                            if (content) {
                              handleAddReply('root', content);
                              textarea.value = '';
                            }
                          }}
                          className="px-4 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <Send className="w-3 h-3 inline mr-1" />
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  ));

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );

  if (isLoadingUser) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4 }} 
          className="space-y-6"
        >
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-gray-900">Community Hub</h1>
            <p className="text-lg text-gray-600">
              Connect, collaborate, and learn together with fellow students
            </p>
            
            {/* User info bar */}
            {currentUser && (
              <div className="flex items-center justify-center gap-4 p-4 bg-white rounded-lg border border-gray-200 max-w-2xl mx-auto">
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name}
                  className="w-12 h-12 rounded-full"
                />
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">{currentUser.name}</h3>
                  <p className="text-sm text-gray-600">{currentUser.course} • {currentUser.year}</p>
                </div>
                <div className="flex items-center gap-4 ml-auto">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{currentUser.reputation}</div>
                    <div className="text-xs text-gray-500">Reputation</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{currentUser.totalPosts}</div>
                    <div className="text-xs text-gray-500">Posts</div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {currentUser.badges.slice(0, 2).map((badge) => (
                      <span key={badge} className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search discussions, topics, or users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-2">
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="all">All Courses</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Physics">Physics</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Biology">Biology</option>
                    <option value="Chemistry">Chemistry</option>
                  </select>

                  <select
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">All Topics</option>
                    <option value="Discussion">Discussion</option>
                    <option value="Study Group">Study Group</option>
                    <option value="Resources">Resources</option>
                    <option value="Assignments">Assignments</option>
                    <option value="Projects">Projects</option>
                    <option value="Career">Career</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => setShowNewThreadDialog(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
              >
                <Plus className="w-4 h-4" />
                New Discussion
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex border-b border-gray-200">
              {[
                { id: 'trending', label: 'Trending', icon: TrendingUp },
                { id: 'recent', label: 'Recent', icon: Clock },
                { id: 'unanswered', label: 'Unanswered', icon: MessageSquare }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {isLoadingThreads && threads.length === 0 ? (
                <LoadingSkeleton />
              ) : (
                <AnimatePresence mode="wait">
                  <div className="space-y-4">
                    {threads.map(thread => (
                      <ThreadCard key={thread.id} thread={thread} />
                    ))}

                    {threads.length === 0 && !isLoadingThreads && (
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        className="text-center py-16"
                      >
                        <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-xl font-medium text-gray-900 mb-2">No discussions found</h3>
                        <p className="text-gray-600 mb-6">
                          {searchQuery 
                            ? "Try adjusting your search or filters" 
                            : "Be the first to start a discussion in this section!"
                          }
                        </p>
                        <button
                          onClick={() => setShowNewThreadDialog(true)}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Start Discussion
                        </button>
                      </motion.div>
                    )}
                  </div>
                </AnimatePresence>
              )}

              {/* Load More Indicator */}
              <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
                {isLoadingThreads && threads.length > 0 && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Create Thread Dialog */}
        <AnimatePresence>
          {showNewThreadDialog && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={(e) => e.target === e.currentTarget && setShowNewThreadDialog(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Start a New Discussion</h2>
                    <button
                      onClick={() => setShowNewThreadDialog(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      placeholder="What's your discussion about?"
                      value={threadForm.title}
                      onChange={(e) => setThreadForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Content *
                    </label>
                    <textarea
                      placeholder="Describe your discussion in detail..."
                      value={threadForm.content}
                      onChange={(e) => setThreadForm(prev => ({ ...prev, content: e.target.value }))}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Topic
                      </label>
                      <select
                        value={threadForm.topic}
                        onChange={(e) => setThreadForm(prev => ({ ...prev, topic: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="">Select a topic</option>
                        <option value="Discussion">General Discussion</option>
                        <option value="Study Group">Study Group</option>
                        <option value="Resources">Resources</option>
                        <option value="Assignments">Assignments</option>
                        <option value="Projects">Projects</option>
                        <option value="Career">Career</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Attachment (optional)
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf,.doc,.docx,.txt"
                        onChange={(e) => setThreadForm(prev => ({ 
                          ...prev, 
                          attachment: e.target.files?.[0] || null 
                        }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <TagInput
                      value={threadForm.tags}
                      onChange={(tags) => setThreadForm(prev => ({ ...prev, tags }))}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowNewThreadDialog(false)}
                      disabled={isCreatingThread}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateThread}
                      disabled={isCreatingThread || !threadForm.title.trim() || !threadForm.content.trim()}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isCreatingThread ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Creating...
                        </>
                      ) : (
                        'Create Discussion'
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}