import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { MessageSquare, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CarIcon, UserIcon } from "@/components/ui/icons";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface InstantChatButtonProps {
  customerPhone?: string;
  customerName?: string;
  mode?: 'floating' | 'inline';
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export default function InstantChatButton({
  customerPhone,
  customerName = '',
  mode = 'floating',
  className = '',
  variant = 'default'
}: InstantChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: `👋 Hi there! This is an instant support chat for ${customerName || 'your customer'}. How can we help?`,
      sender: 'bot',
      timestamp: new Date(),
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const { toast } = useToast();

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Math.random().toString(36).substring(2, 9),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    
    // Simulate typing indicator
    setIsTyping(true);
    
    // Send message to the backend (this would be implemented for real chat)
    setTimeout(() => {
      // Here you would normally call your API to send the message
      // For demo, we'll simulate a response
      const botMessage: Message = {
        id: Math.random().toString(36).substring(2, 9),
        text: `Thanks for your message! Someone from our team will respond shortly. ${customerPhone ? `We'll send updates to ${customerPhone}` : ''}`,
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setIsTyping(false);
      setMessages(prev => [...prev, botMessage]);
      
      // Notify that the message was sent
      toast({
        title: "Message Sent",
        description: "Your message has been sent to the customer.",
      });
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Animation variants
  const messageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  const typingVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 }
  };

  const dotVariants = {
    initial: { y: 0 },
    animate: (i: number) => ({
      y: [0, -5, 0],
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        repeat: Infinity,
        repeatType: "loop" as const
      }
    })
  };

  // Render typing indicator
  const renderTypingIndicator = () => {
    return (
      <AnimatePresence>
        {isTyping && (
          <motion.div
            className="flex items-center mb-4"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={typingVariants}
          >
            <div className="max-w-[80%] bg-gray-100 text-gray-800 rounded-lg p-3 rounded-tl-none flex items-center space-x-1">
              <CarIcon className="h-4 w-4 mr-2 text-blue-600" />
              <span className="text-xs opacity-70">Clean Machine is typing</span>
              <div className="flex space-x-1 ml-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                    variants={dotVariants}
                    custom={i}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant={variant} 
          size={mode === 'floating' ? 'lg' : 'default'} 
          className={cn(
            mode === 'floating' && "fixed bottom-20 right-4 rounded-full shadow-lg w-14 h-14 p-0 z-50", 
            className
          )}
        >
          <MessageSquare className={mode === 'floating' ? "h-6 w-6" : "h-4 w-4 mr-2"} />
          {mode !== 'floating' && "Instant Chat"}
        </Button>
      </SheetTrigger>
      
      <SheetContent side="right" className="p-0 sm:max-w-md w-[100vw]">
        <Card className="border-0 rounded-none h-full flex flex-col">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CarIcon className="h-6 w-6" />
                <CardTitle className="text-xl font-bold">Instant Support</CardTitle>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsOpen(false)} 
                className="text-white hover:bg-blue-700 hover:text-white"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
            {customerName && (
              <SheetDescription className="text-blue-100 mt-2">
                Chat with {customerName} {customerPhone ? `(${customerPhone})` : ''}
              </SheetDescription>
            )}
          </CardHeader>
          
          <ScrollArea className="flex-grow p-4">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  className={cn(
                    "mb-4 flex",
                    message.sender === "user" ? "justify-end" : "justify-start"
                  )}
                  variants={messageVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg p-3",
                      message.sender === "user"
                        ? "bg-blue-600 text-white rounded-tr-none"
                        : "bg-gray-100 text-gray-800 rounded-tl-none"
                    )}
                  >
                    <div className="flex items-center mb-1">
                      {message.sender === "user" ? (
                        <UserIcon className="h-4 w-4 mr-1 text-blue-200" />
                      ) : (
                        <CarIcon className="h-4 w-4 mr-1 text-blue-600" />
                      )}
                      <span className="text-xs opacity-70">
                        {message.sender === "user" ? "You" : "Clean Machine"} •{" "}
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {renderTypingIndicator()}
          </ScrollArea>
          
          <CardFooter className="p-4 pt-2 border-t">
            <div className="flex w-full gap-2">
              <Input
                placeholder="Type your message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-grow"
              />
              <Button onClick={handleSendMessage} disabled={!inputText.trim()}>
                Send
              </Button>
            </div>
          </CardFooter>
        </Card>
      </SheetContent>
    </Sheet>
  );
}