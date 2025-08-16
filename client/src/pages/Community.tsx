import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios, { AxiosError, CancelTokenSource } from 'axios';
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
  ThumbsUp,
  Share2,
  Bookmark,
  Paperclip
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore, Thread as ThreadType, Reply as ReplyType } from '@/stores/appStore';
import { useToast } from '@/hooks/use-toast';

// -----------------------------
// Config and helper types
// -----------------------------
const api = axios.create({ baseURL: 'http://localhost:8000/api/discussions', timeout: 15000 });

interface ThreadCreatePayload {
  title: string;
  content: string;
  tags?: string[];
  course?: string;
  topic?: string;
  authorId?: string;
  anonymous?: boolean;
}

interface ThreadsResponse {
  items: ThreadType[];
  page: number;
  limit: number;
  total: number;
}

// -----------------------------
// Main component
// -----------------------------
export default function CommunityEnhanced() {
  // UI state
  const [activeTab, setActiveTab] = useState<'trending' | 'recent' | 'unanswered'>('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [showNewThreadDialog, setShowNewThreadDialog] = useState(false);
  const [expandedThread, setExpandedThread] = useState<string | null>(null);

  // form
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadContent, setNewThreadContent] = useState('');
  const [newThreadTags, setNewThreadTags] = useState<string[]>([]);
  const [newThreadAttachment, setNewThreadAttachment] = useState<File | null>(null);
  const [anonymousPost, setAnonymousPost] = useState(false);

  // data + pagination
  const [threads, setThreadsLocal] = useState<ThreadType[]>([]);
  const [replies, setRepliesLocal] = useState<Record<string, ReplyType[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // hooks + store
  const { toast } = useToast();
  const { ref: loadMoreRef, inView } = useInView();
  const { currentUser, setThreads, addThread, addReply, toggleThreadLike, toggleReplyLike } = useAppStore();

  // Cancel token to avoid race conditions
  const cancelTokenRef = useRef<CancelTokenSource | null>(null);

  // -----------------------------
  // Debounced search
  // -----------------------------
  const fetchThreadsDebounced = useMemo(() => debounce((q: string, p = 1) => {
    fetchThreads({ search: q, page: p });
  }, 450), []);

  useEffect(() => {
    // initial load
    setThreadsLocal([]);
    setPage(1);
    setHasMore(true);
    setIsLoading(true);
    fetchThreads({ page: 1, replace: true }).catch(() => {
      /* handled inside fetchThreads */
    });

    return () => { fetchThreadsDebounced.cancel(); cancelTokenRef.current?.cancel(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedCourse, selectedTopic]);

  useEffect(() => {
    // search triggers
    setPage(1);
    setHasMore(true);
    setIsLoading(true);
    fetchThreadsDebounced(searchQuery, 1);
  }, [searchQuery]);

  useEffect(() => {
    // infinite scroll when in view
    if (inView && !isLoading && hasMore) {
      loadNextPage();
    }
  }, [inView, isLoading, hasMore]);

  // -----------------------------
  // Fetching threads
  // -----------------------------
  const fetchThreads = async ({
    page = 1,
    replace = false,
    search = ''
  }: { page?: number; replace?: boolean; search?: string }) => {
    try {
      cancelTokenRef.current?.cancel();
      cancelTokenRef.current = axios.CancelToken.source();

      const params: any = {
        page,
        limit,
        sort: activeTab === 'trending' ? '-likes' : activeTab === 'recent' ? '-createdAt' : '-replies',
        course: selectedCourse !== 'all' ? selectedCourse : undefined,
        topic: selectedTopic || undefined,
        search: search || undefined
      };

      const { data } = await api.get<ThreadsResponse>('/threads', {
        params,
        cancelToken: cancelTokenRef.current.token
      });

      setIsLoading(false);
      setPage(data.page);
      setHasMore(data.items.length === limit && (data.page * data.limit) < data.total);

      setThreadsLocal(prev => replace ? data.items : [...prev, ...data.items]);
      // sync global store optionally
      setThreads?.(data.items);

    } catch (err) {
      setIsLoading(false);
      if (axios.isCancel(err)) return;
      const e = err as AxiosError;
      toast({
        title: 'Failed to fetch discussions',
        description: e.message || 'Network error',
        variant: 'destructive'
      });
    }
  };

  const loadNextPage = () => {
    if (!hasMore) return;
    const next = page + 1;
    setIsLoading(true);
    fetchThreads({ page: next }).catch(() => {});
  };

  // -----------------------------
  // Create thread with validation, optimistic UI & file upload
  // -----------------------------
  const handleCreateThread = async () => {
    if (!newThreadTitle.trim() || !newThreadContent.trim()) {
      toast({ title: 'Missing fields', description: 'Please provide a title and content', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    const payload: ThreadCreatePayload = {
      title: newThreadTitle.trim(),
      content: newThreadContent.trim(),
      tags: newThreadTags.map(t => t.trim()).filter(Boolean),
      course: selectedCourse === 'all' ? undefined : selectedCourse,
      topic: selectedTopic || 'General',
      authorId: anonymousPost ? undefined : currentUser?.id
    };

    try {
      let res;
      if (newThreadAttachment) {
        const fd = new FormData();
        fd.append('payload', JSON.stringify(payload));
        fd.append('file', newThreadAttachment);
        res = await api.post('/threads', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (ev) => {
            // we could display progress if desired
            // console.log('upload', Math.round((ev.loaded/ev.total)*100));
          }
        });
      } else {
        res = await api.post('/threads', payload);
      }

      // prepend new thread
      const created: ThreadType = res.data;
      setThreadsLocal(prev => [created, ...prev]);
      addThread?.(created);

      setNewThreadTitle('');
      setNewThreadContent('');
      setNewThreadTags([]);
      setNewThreadAttachment(null);
      setShowNewThreadDialog(false);

      toast({ title: 'Discussion created', description: 'Your thread is live!' });
    } catch (err) {
      const e = err as AxiosError;
      toast({ title: 'Failed to create', description: e?.response?.data?.message || e.message || 'Try again', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // -----------------------------
  // Reply to thread (optimistic)
  // -----------------------------
  const handleReply = async (threadId: string, text?: string) => {
    const content = text ?? '';
    if (!content.trim()) return;

    const optimistic: ReplyType = {
      id: `temp-${Date.now()}`,
      threadId,
      content,
      author: currentUser?.name || 'You',
      authorId: currentUser?.id || 'anonymous',
      authorAvatar: currentUser?.avatar,
      timestamp: 'Just now',
      likes: 0,
      isLiked: false
    };

    setRepliesLocal(prev => ({ ...(prev), [threadId]: [ ...(prev[threadId] || []), optimistic ] }));
    addReply?.(optimistic);

    try {
      const { data } = await api.post(`/threads/${threadId}/replies`, { content });
      // replace optimistic with real
      setRepliesLocal(prev => ({ ...(prev), [threadId]: (prev[threadId] || []).map(r => r.id === optimistic.id ? data : r) }));
      toast({ title: 'Reply posted' });
    } catch (err) {
      setRepliesLocal(prev => ({ ...(prev), [threadId]: (prev[threadId] || []).filter(r => r.id !== optimistic.id) }));
      toast({ title: 'Failed to post reply', description: (err as AxiosError).message || 'Try again', variant: 'destructive' });
    }
  };

  // -----------------------------
  // Likes (optimistic toggle)
  // -----------------------------
  const handleToggleThreadLike = async (id: string) => {
    // optimistic
    setThreadsLocal(prev => prev.map(t => t.id === id ? { ...t, isLiked: !t.isLiked, likes: t.isLiked ? t.likes - 1 : t.likes + 1 } : t ));
    toggleThreadLike?.(id);

    try {
      await api.post(`/threads/${id}/like`);
    } catch (err) {
      // revert on error
      setThreadsLocal(prev => prev.map(t => t.id === id ? { ...t, isLiked: !t.isLiked, likes: t.isLiked ? t.likes - 1 : t.likes + 1 } : t ));
      toast({ title: 'Failed', description: 'Could not update like', variant: 'destructive' });
    }
  };

  const handleToggleReplyLike = async (replyId: string, threadId: string) => {
    const list = replies[threadId] || [];
    setRepliesLocal(prev => ({ ...prev, [threadId]: list.map(r => r.id === replyId ? { ...r, isLiked: !r.isLiked, likes: r.isLiked ? r.likes - 1 : r.likes + 1 } : r) }));
    toggleReplyLike?.(replyId, threadId);

    try {
      await api.post(`/threads/${threadId}/replies/${replyId}/like`);
    } catch (err) {
      // revert
      setRepliesLocal(prev => ({ ...prev, [threadId]: list.map(r => r.id === replyId ? { ...r, isLiked: !r.isLiked, likes: r.isLiked ? r.likes - 1 : r.likes + 1 } : r) }));
      toast({ title: 'Failed to update like', variant: 'destructive' });
    }
  };

  // -----------------------------
  // Simple attachment handler
  // -----------------------------
  const onAttachmentChange = (f?: File) => setNewThreadAttachment(f || null);

  // -----------------------------
  // Thread card component
  // -----------------------------
  const ThreadCard = ({ thread }: { thread: ThreadType }) => (
    <motion.div key={thread.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={thread.authorAvatar} />
                <AvatarFallback>{thread.author?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{thread.author}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BookOpen className="w-3 h-3" />
                  <span>{thread.course}</span>
                  <span>•</span>
                  <Clock className="w-3 h-3" />
                  <span>{thread.timestamp}</span>
                </div>
              </div>
            </div>
            <Badge variant="outline">{thread.topic}</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2 cursor-pointer hover:text-primary" onClick={() => setExpandedThread(expandedThread === thread.id ? null : thread.id)}>{thread.title}</h3>
            <p className="text-muted-foreground line-clamp-3">{thread.content}</p>
          </div>

          {thread.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {thread.tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs"><Hash className="w-3 h-3 mr-1"/>{tag}</Badge>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => handleToggleThreadLike(thread.id)} className={thread.isLiked ? 'text-red-500' : ''}>
                <Heart className="w-4 h-4 mr-1" />{thread.likes}
              </Button>

              <Button variant="ghost" size="sm" onClick={() => setExpandedThread(expandedThread === thread.id ? null : thread.id)}>
                <MessageSquare className="w-4 h-4 mr-1" />{thread.replies}
              </Button>

              <Button variant="ghost" size="sm"><Share2 className="w-4 h-4 mr-1"/>Share</Button>
            </div>

            <Button variant="ghost" size="sm" onClick={() => setExpandedThread(expandedThread === thread.id ? null : thread.id)}>
              <ChevronDown className={`w-4 h-4 transition-transform ${expandedThread === thread.id ? 'rotate-180' : ''}`} />
            </Button>
          </div>

          <AnimatePresence>
            {expandedThread === thread.id && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="border-t pt-4 space-y-4">

                {/* replies */}
                <div className="space-y-3 max-h-56 overflow-auto pr-2">
                  {(replies[thread.id] || thread._replies || []).map((reply) => (
                    <div key={reply.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={reply.authorAvatar} />
                        <AvatarFallback className="text-xs">{reply.author?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{reply.author}</span>
                          <span className="text-muted-foreground">{reply.timestamp}</span>
                        </div>
                        <p className="text-sm">{reply.content}</p>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleReplyLike(reply.id, thread.id)} className={`h-auto p-1 ${reply.isLiked ? 'text-red-500' : ''}`}>
                          <ThumbsUp className="w-3 h-3 mr-1" />{reply.likes}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* reply input */}
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={currentUser?.avatar} />
                    <AvatarFallback className="text-xs">{currentUser?.name?.split(' ').map(n => n[0]).join('') || 'U'}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 flex gap-2">
                    <Input placeholder="Write a reply..." onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        const val = (e.target as HTMLInputElement).value;
                        handleReply(thread.id, val);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }} />
                    <Button size="sm" onClick={() => {
                      const input = document.querySelector(`#reply-input-${thread.id}`) as HTMLInputElement | null;
                      if (input) {
                        handleReply(thread.id, input.value);
                        input.value = '';
                      }
                    }}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

        </CardContent>
      </Card>
    </motion.div>
  );

  // -----------------------------
  // Loading skeleton
  // -----------------------------
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-4" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // -----------------------------
  // Tag suggestions (simple local fallback)
  // -----------------------------
  const tagSuggestions = ['DSA', 'Physics', 'Homework', 'Exam', 'Collaboration', 'Cheatsheet', 'Project'];
  const addTag = (t: string) => setNewThreadTags(prev => Array.from(new Set([...(prev || []), t])));
  const removeTag = (t: string) => setNewThreadTags(prev => prev.filter(x => x !== t));

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">

        {/* header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Community Discussions</h1>
          <p className="text-muted-foreground">Connect, collaborate and learn with your peers — search, filter, and start discussions.</p>
        </div>

        {/* controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex-1 flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search discussions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>

            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Course"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                <SelectItem value="Computer Science">Computer Science</SelectItem>
                <SelectItem value="Physics">Physics</SelectItem>
                <SelectItem value="Engineering">Engineering</SelectItem>
                <SelectItem value="Mathematics">Mathematics</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Dialog open={showNewThreadDialog} onOpenChange={setShowNewThreadDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> New Discussion
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Start a New Discussion</DialogTitle></DialogHeader>

              <div className="space-y-4">
                <Input placeholder="Discussion title" value={newThreadTitle} onChange={(e) => setNewThreadTitle(e.target.value)} />

                <Textarea placeholder="What would you like to discuss? (Markdown supported)" value={newThreadContent} onChange={(e) => setNewThreadContent(e.target.value)} rows={6} />

                <div className="flex gap-2 items-center">
                  <Input placeholder="Add tag and press Enter" onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); const val = (e.target as HTMLInputElement).value.trim(); if (val) { addTag(val); (e.target as HTMLInputElement).value = ''; } }
                  }} />
                  <input id="file" type="file" accept="image/*,application/pdf" onChange={(e) => onAttachmentChange(e.target.files?.[0])} className="hidden" />
                  <label htmlFor="file"><Button variant="outline" size="sm"><Paperclip className="w-4 h-4 mr-2"/>Attach</Button></label>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {newThreadTags.map(t => (
                    <Badge key={t} className="flex items-center gap-2">{t} <button onClick={() => removeTag(t)} className="ml-1">×</button></Badge>
                  ))}
                  <div className="flex gap-1 items-center text-sm text-muted-foreground">Suggestions: {tagSuggestions.map(s => (<button key={s} onClick={() => addTag(s)} className="underline ml-1">{s}</button>))}</div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={anonymousPost} onChange={(e) => setAnonymousPost(e.target.checked)} /> Post anonymously</label>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowNewThreadDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateThread} disabled={isSubmitting}>{isSubmitting ? 'Posting...' : 'Create Discussion'}</Button>
                  </div>
                </div>

              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* tabs + thread list */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trending"><TrendingUp className="w-4 h-4 mr-2"/>Trending</TabsTrigger>
            <TabsTrigger value="recent"><Clock className="w-4 h-4 mr-2"/>Recent</TabsTrigger>
            <TabsTrigger value="unanswered"><MessageSquare className="w-4 h-4 mr-2"/>Unanswered</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <LoadingSkeleton />
            ) : (
              <AnimatePresence mode="wait">
                <div className="space-y-4">
                  {threads.map(t => <ThreadCard key={t.id} thread={t} />)}

                  {threads.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">No discussions found</h3>
                      <p className="text-muted-foreground mb-4">Be the first to start a discussion!</p>
                      <Button onClick={() => setShowNewThreadDialog(true)}>Start Discussion</Button>
                    </motion.div>
                  )}
                </div>
              </AnimatePresence>
            )}
          </TabsContent>
        </Tabs>

        {/* infinite loader */}
        <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
          {isLoading ? null : (hasMore ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No more discussions</p>
          ))}
        </div>

      </motion.div>
    </div>
  );
}
