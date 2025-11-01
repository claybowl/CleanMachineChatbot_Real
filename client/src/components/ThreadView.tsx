import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Bot, 
  User, 
  Phone, 
  Send, 
  Loader2, 
  ArrowLeftRight,
  Clock,
  Sparkles,
  MessageSquare,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import io from 'socket.io-client';
import type { Conversation, Message, QuickReplyCategory, QuickReplyTemplate } from '@shared/schema';
import BookingPanel from './BookingPanel';

interface ReplySuggestion {
  id: string;
  content: string;
  type: 'informational' | 'scheduling' | 'service_related' | 'closing' | 'general';
  confidence: number;
}

interface CategoryWithTemplates extends QuickReplyCategory {
  templates: QuickReplyTemplate[];
}

interface ThreadViewProps {
  conversationId: number;
}

export default function ThreadView({ conversationId }: ThreadViewProps) {
  const [messageInput, setMessageInput] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch conversation details with messages
  const { data: conversationData, isLoading: conversationLoading} = useQuery<{ success: boolean; data: Conversation & { messages: Message[] } }>({
    queryKey: [`/api/conversations/${conversationId}`],
    refetchInterval: 5000,
  });

  const conversation = conversationData?.data;

  // Fetch AI suggestions
  const { data: suggestionsData, refetch: refetchSuggestions } = useQuery<{ success: boolean; suggestions: ReplySuggestion[] }>({
    queryKey: [`/api/conversations/${conversationId}/suggestions`],
    enabled: !!conversation && conversation.controlMode === 'manual',
  });

  const suggestions = suggestionsData?.suggestions || [];

  // Fetch quick reply templates
  const { data: quickRepliesData } = useQuery<{ success: boolean; categories: CategoryWithTemplates[] }>({
    queryKey: ['/api/quick-replies/categories'],
  });

  const quickReplyCategories = quickRepliesData?.categories || [];

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('POST', `/api/conversations/${conversationId}/send-message`, { 
        content,
        channel: conversation?.platform || 'web'
      });
      return response.json();
    },
    onSuccess: () => {
      setMessageInput('');
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}`] });
      refetchSuggestions();
    },
  });

  // Return to AI mutation
  const returnToAIMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/conversations/${conversationId}/return-to-ai`, { 
        agentName: 'Agent',
        notifyCustomer: true
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
  });

  // WebSocket for real-time updates
  useEffect(() => {
    const socket = io();

    socket.on('connect', () => {
      console.log('[THREAD VIEW] Connected to WebSocket');
      socket.emit('join_conversation', conversationId);
    });

    socket.on('new_message', (data: any) => {
      if (data.conversationId === conversationId) {
        console.log('[THREAD VIEW] New message received:', data);
        queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}`] });
        refetchSuggestions();
      }
    });

    socket.on('conversation_updated', (data: any) => {
      if (data.conversationId === conversationId) {
        console.log('[THREAD VIEW] Conversation updated:', data);
        queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}`] });
      }
    });

    socket.on('control_mode_changed', (data: any) => {
      if (data.conversationId === conversationId) {
        console.log('[THREAD VIEW] Control mode changed:', data);
        queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}`] });
      }
    });

    return () => {
      socket.emit('leave_conversation', conversationId);
      socket.disconnect();
    };
  }, [conversationId, queryClient]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      const messageToSend = messageInput;
      setMessageInput(''); // Clear immediately (optimistic)
      sendMessageMutation.mutate(messageToSend);
    }
  };

  const handleSuggestionClick = (suggestionContent: string) => {
    setMessageInput(suggestionContent);
  };

  const handleQuickReplyClick = async (templateId: number, content: string) => {
    // Update last used timestamp
    await apiRequest('POST', `/api/quick-replies/templates/${templateId}/use`);
    
    // Send immediately
    sendMessageMutation.mutate(content);
  };

  const toggleCategory = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getStatusBadge = () => {
    if (!conversation) return null;

    switch (conversation.controlMode) {
      case 'manual':
        return (
          <Badge variant="default" className="gap-1 bg-purple-600" data-testid="badge-status-manual">
            <User className="h-3 w-3" />
            Manual Mode
          </Badge>
        );
      case 'auto':
        return (
          <Badge variant="secondary" className="gap-1" data-testid="badge-status-ai">
            <Bot className="h-3 w-3" />
            AI Mode
          </Badge>
        );
      case 'paused':
        return (
          <Badge variant="outline" className="gap-1" data-testid="badge-status-paused">
            <Clock className="h-3 w-3" />
            Paused
          </Badge>
        );
      default:
        return null;
    }
  };

  const getMessageBackground = (sender: string) => {
    switch (sender) {
      case 'customer':
        return 'bg-gray-100 dark:bg-gray-800';
      case 'ai':
        return 'bg-blue-100 dark:bg-blue-900';
      case 'agent':
        return 'bg-purple-100 dark:bg-purple-900';
      default:
        return 'bg-gray-100 dark:bg-gray-800';
    }
  };

  const getSenderIcon = (sender: string) => {
    switch (sender) {
      case 'customer':
        return <User className="h-4 w-4" />;
      case 'ai':
        return <Bot className="h-4 w-4" />;
      case 'agent':
        return <User className="h-4 w-4 text-purple-600" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getSenderLabel = (sender: string) => {
    switch (sender) {
      case 'customer':
        return conversation?.customerName || conversation?.customerPhone || 'Customer';
      case 'ai':
        return 'AI Assistant';
      case 'agent':
        return conversation?.assignedAgent || 'Agent';
      default:
        return sender;
    }
  };

  if (conversationLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Conversation not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Conversation Controls Toolbar */}
      <div className="border-b bg-card p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold" data-testid="text-customer-name">
                  {conversation.customerName || conversation.customerPhone}
                </h2>
                {conversation.customerName && (
                  <p className="text-sm text-muted-foreground" data-testid="text-customer-phone">
                    {conversation.customerPhone}
                  </p>
                )}
              </div>
            </div>
            {getStatusBadge()}
          </div>

          <div className="flex items-center gap-2">
            {conversation.controlMode === 'manual' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => returnToAIMutation.mutate()}
                disabled={returnToAIMutation.isPending}
                className="gap-2"
                data-testid="button-hand-to-ai"
              >
                {returnToAIMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowLeftRight className="h-4 w-4" />
                )}
                Hand to AI
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Main Message Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 max-w-4xl mx-auto">
              {conversation.messages && conversation.messages.length > 0 ? (
                <>
                  {conversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'customer' ? 'justify-start' : 'justify-end'}`}
                      data-testid={`message-${message.id}`}
                    >
                      <div
                        className={`max-w-[80%] sm:max-w-[70%] rounded-lg p-3 ${getMessageBackground(message.sender)}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {getSenderIcon(message.sender)}
                          <span className="font-semibold text-sm" data-testid={`sender-${message.id}`}>
                            {getSenderLabel(message.sender)}
                          </span>
                          <span className="text-xs text-muted-foreground" data-testid={`timestamp-${message.id}`}>
                            {message.timestamp ? formatDistanceToNow(new Date(message.timestamp), { addSuffix: true }) : 'Just now'}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap" data-testid={`content-${message.id}`}>
                          {message.content}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No messages yet
                </div>
              )}
            </div>
          </ScrollArea>

          {/* AI Suggestions */}
          {conversation.controlMode === 'manual' && suggestions.length > 0 && (
            <div className="border-t bg-card p-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">AI Suggestions</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick(suggestion.content)}
                    className="text-xs h-auto py-2 px-3 whitespace-normal text-left"
                    data-testid={`suggestion-${suggestion.id}`}
                  >
                    {suggestion.content}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Integrated Booking Panel */}
          <BookingPanel conversationId={conversationId} />

          {/* Message Input */}
          {conversation.controlMode === 'manual' && (
            <div className="border-t bg-card p-4">
              <div className="flex gap-2 max-w-4xl mx-auto">
                <Textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type your message..."
                  className="min-h-[80px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={sendMessageMutation.isPending}
                  data-testid="input-message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sendMessageMutation.isPending}
                  className="h-[80px]"
                  data-testid="button-send"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Reply Templates Sidebar */}
        {conversation.controlMode === 'manual' && quickReplyCategories.length > 0 && (
          <div className="lg:w-80 border-t lg:border-t-0 lg:border-l bg-card overflow-y-auto max-h-[400px] lg:max-h-full">
            <div className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Quick Replies
              </h3>
              
              <div className="space-y-2">
                {quickReplyCategories.map((category) => (
                  <Collapsible
                    key={category.id}
                    open={expandedCategories.has(category.id)}
                    onOpenChange={() => toggleCategory(category.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between"
                        data-testid={`category-${category.id}`}
                      >
                        <span className="flex items-center gap-2">
                          {category.icon && <span>{category.icon}</span>}
                          {category.name}
                        </span>
                        {expandedCategories.has(category.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 mt-1">
                      {category.templates.map((template) => (
                        <Button
                          key={template.id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickReplyClick(template.id, template.content)}
                          className="w-full text-left justify-start text-xs h-auto py-2 px-3 whitespace-normal"
                          disabled={sendMessageMutation.isPending}
                          data-testid={`template-${template.id}`}
                        >
                          {template.content}
                        </Button>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
