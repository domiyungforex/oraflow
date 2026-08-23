"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardLayout, useDashboardHeader } from "@/components/layout/dashboard-layout";
import { useConversations, useConversation, useSendMessage } from "@/hooks/use-api";
import { Search, MessageSquare, Send } from "lucide-react";

export default function ConversationsPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  const setHeader = useDashboardHeader();
  useEffect(() => {
    setHeader({
      title: "Conversations",
      description: "Manage customer conversations",
    });
    return () => setHeader({ title: undefined, description: undefined });
  }, [setHeader]);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversationsData, isLoading: conversationsLoading } = useConversations({ limit: 50 });
  const { data: conversationData, isLoading: conversationLoading } = useConversation(
    selectedConversation || ""
  );
  const sendMessage = useSendMessage();

  const conversations = conversationsData?.data || [];
  const conversation = conversationData?.data;
  const messages = conversation?.messages || [];

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedConversation) return;

    const content = message.trim();
    setMessage("");

    try {
      await sendMessage.mutateAsync({
        conversationId: selectedConversation,
        content,
        messageType: "TEXT",
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessage(content); // Restore message on error
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <DashboardLayout
      title="Conversations"
      description="Manage customer conversations"
    >
      <div className="flex h-[calc(100vh-180px)] gap-4">
        {/* Conversation List */}
        <div className="w-80 border rounded-lg overflow-hidden flex flex-col">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search conversations..." className="pl-9" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversationsLoading ? (
              <div className="p-3 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 skeleton rounded" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No conversations yet
              </div>
            ) : (
              conversations.map((conv: any) => (
                <div
                  key={conv.id}
                  className={`p-3 border-b cursor-pointer hover:bg-muted/50 ${
                    selectedConversation === conv.id ? "bg-muted" : ""
                  }`}
                  onClick={() => setSelectedConversation(conv.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-sm font-medium text-primary">
                        {conv.customer?.name
                          ? conv.customer.name
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")
                          : "?"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">
                          {conv.customer?.name || "Unknown"}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {new Date(conv.updatedAt).toLocaleTimeString("en-NG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {conv.channel}
                        </Badge>
                        <Badge
                          variant={
                            conv.status === "ACTIVE"
                              ? "success"
                              : conv.status === "WAITING"
                              ? "warning"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {conv.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {conv.messages?.[0]?.content || "No messages"}
                      </p>
                      {conv._count?.messages > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-primary rounded-full mt-1">
                          {conv._count.messages}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col border rounded-lg overflow-hidden">
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {conversation?.customer?.name
                      ? conversation.customer.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                      : "?"}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{conversation?.customer?.name || "Unknown"}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {conversation?.channel}
                    </Badge>
                    <Badge
                      variant={
                        conversation?.status === "ACTIVE"
                          ? "success"
                          : conversation?.status === "WAITING"
                          ? "warning"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {conversation?.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Create Order
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {conversationLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                      <div className="h-10 w-48 skeleton rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No messages yet
                </div>
              ) : (
                messages.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.direction === "OUTBOUND" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        msg.direction === "OUTBOUND"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.direction === "OUTBOUND"
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {new Date(msg.sentAt).toLocaleTimeString("en-NG", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                  disabled={sendMessage.isPending}
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!message.trim() || sendMessage.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center border rounded-lg">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Select a conversation to view</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
