import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Link, useLocation, useSearch } from 'wouter';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  MessageCircle, 
  Search, 
  Filter, 
  Bot, 
  User, 
  Bell,
  Clock,
  CheckCircle,
  XCircle,
  LayoutDashboard,
  Settings as SettingsIcon,
  PlusCircle,
  Moon,
  Sun
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import io from 'socket.io-client';
import ThreadView from '@/components/ThreadView';
import { useToast } from '@/hooks/use-toast';

interface Conversation {
  id: number;
  customerName: string | null;
  customerPhone: string;
  platform: string;
  controlMode: string;
  needsHumanAttention: boolean;
  lastMessageTime: string;
  messageCount: number;
  latestMessage: {
    content: string;
    sender: string;
    timestamp: string;
  } | null;
  status: string;
}

export default function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true';
    }
    return false;
  });
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [composePhone, setComposePhone] = useState('');
  const [composeName, setComposeName] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch conversations
  const { data: conversationsData, isLoading } = useQuery<{ success: boolean; data: Conversation[] }>({
    queryKey: ['/api/conversations', filter],
    queryFn: async () => {
      const response = await fetch(`/api/conversations?status=${filter}`);
      if (!response.ok) throw new Error('Failed to fetch conversations');
      return response.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const conversations = conversationsData?.data || [];

  // Toggle dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  // Filter conversations based on search
  const filteredConversations = conversations.filter((conv) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      conv.customerName?.toLowerCase().includes(searchLower) ||
      conv.customerPhone.includes(searchLower) ||
      conv.latestMessage?.content.toLowerCase().includes(searchLower)
    );
  });

  // Create new conversation
  const createConversationMutation = useMutation({
    mutationFn: async (data: { phone: string; name: string }) => {
      return await apiRequest('POST', '/api/conversations/create', data);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      toast({ title: 'Conversation started', description: `Started conversation with ${composeName || composePhone}` });
      setShowComposeDialog(false);
      setComposePhone('');
      setComposeName('');
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      // Select the new conversation
      if (data.conversation?.id) {
        setSelectedConversation(data.conversation.id);
      }
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to start conversation', variant: 'destructive' });
    },
  });

  // WebSocket for real-time updates
  useEffect(() => {
    const socket = io();

    socket.on('connect', () => {
      console.log('[MESSAGES] Connected to WebSocket');
      socket.emit('join_monitoring');
    });

    socket.on('new_message', (data: any) => {
      console.log('[MESSAGES] New message received:', data);
      // Refetch conversations to update list
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    });

    socket.on('conversation_updated', (data: any) => {
      console.log('[MESSAGES] Conversation updated:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    });

    socket.on('control_mode_changed', (data: any) => {
      console.log('[MESSAGES] Control mode changed:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    });

    return () => {
      socket.emit('leave_monitoring');
      socket.disconnect();
    };
  }, [queryClient]);

  const getStatusBadge = (conversation: Conversation) => {
    if (conversation.needsHumanAttention) {
      return (
        <Badge variant="destructive" className="gap-1">
          <Bell className="h-3 w-3" />
          Needs Attention
        </Badge>
      );
    }

    switch (conversation.controlMode) {
      case 'manual':
        return (
          <Badge variant="default" className="gap-1 bg-purple-600">
            <User className="h-3 w-3" />
            Manual
          </Badge>
        );
      case 'auto':
        return (
          <Badge variant="secondary" className="gap-1">
            <Bot className="h-3 w-3" />
            AI Mode
          </Badge>
        );
      case 'paused':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Paused
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background dark:bg-gray-900">
      {/* Header */}
      <div className="border-b bg-card dark:bg-gray-800 dark:border-gray-700">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Messages</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowComposeDialog(true)}
              data-testid="button-compose"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              New Message
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setDarkMode(!darkMode)}
              data-testid="button-dark-mode"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" asChild data-testid="button-dashboard">
              <Link href="/dashboard">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild data-testid="button-settings">
              <Link href="/settings">
                <SettingsIcon className="h-4 w-4 mr-2" />
                Settings
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Conversation List */}
        <div className="w-96 border-r flex flex-col bg-card dark:bg-gray-800 dark:border-gray-700">
          {/* Search and Filters */}
          <div className="p-4 space-y-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-conversations"
              />
            </div>

            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all" data-testid="filter-all">
                  All
                </TabsTrigger>
                <TabsTrigger value="manual" data-testid="filter-manual">
                  Manual Mode
                </TabsTrigger>
                <TabsTrigger value="closed" data-testid="filter-closed">
                  Closed
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Conversation List */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No conversations found
              </div>
            ) : (
              <div className="divide-y">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation.id)}
                    className={`p-4 cursor-pointer hover:bg-accent transition-colors ${
                      selectedConversation === conversation.id ? 'bg-accent' : ''
                    }`}
                    data-testid={`conversation-item-${conversation.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {conversation.customerName || conversation.customerPhone}
                        </h3>
                        {conversation.customerName && (
                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.customerPhone}
                          </p>
                        )}
                      </div>
                      {getStatusBadge(conversation)}
                    </div>

                    {conversation.latestMessage && (
                      <p className="text-sm text-muted-foreground truncate mb-2">
                        <span className="font-medium">
                          {conversation.latestMessage.sender === 'customer'
                            ? 'Customer'
                            : conversation.latestMessage.sender === 'ai'
                            ? 'AI'
                            : 'Agent'}
                          :{' '}
                        </span>
                        {conversation.latestMessage.content}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {formatDistanceToNow(new Date(conversation.lastMessageTime), {
                          addSuffix: true,
                        })}
                      </span>
                      <span>{conversation.messageCount} messages</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Thread View */}
        <div className="flex-1 flex items-center justify-center bg-muted/20 dark:bg-gray-900">
          {selectedConversation ? (
            <ThreadView conversationId={selectedConversation} />
          ) : (
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2 dark:text-white">
                Select a conversation
              </h2>
              <p className="text-muted-foreground dark:text-gray-400">
                Choose a conversation from the list to view and reply
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Dialog */}
      <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
        <DialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="dark:text-white">New Message</DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              Start a new conversation with a customer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone" className="dark:text-gray-300">Phone Number *</Label>
              <Input
                id="phone"
                placeholder="+1 (918) 555-1234"
                value={composePhone}
                onChange={(e) => setComposePhone(e.target.value)}
                data-testid="input-compose-phone"
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <Label htmlFor="name" className="dark:text-gray-300">Customer Name (Optional)</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={composeName}
                onChange={(e) => setComposeName(e.target.value)}
                data-testid="input-compose-name"
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowComposeDialog(false)}
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!composePhone) {
                  toast({ title: 'Phone required', description: 'Please enter a phone number', variant: 'destructive' });
                  return;
                }
                createConversationMutation.mutate({ phone: composePhone, name: composeName });
              }}
              disabled={createConversationMutation.isPending}
              data-testid="button-start-conversation"
            >
              {createConversationMutation.isPending ? 'Starting...' : 'Start Conversation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
