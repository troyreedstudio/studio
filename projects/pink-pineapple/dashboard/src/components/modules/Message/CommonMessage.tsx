/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { CircleUser, Send } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { useAppSelector } from "@/redux/hooks";
import MyFormWrapper from "@/components/form/MyFormWrapper";
import MyFormInput from "@/components/form/MyFormInput";
import type { FieldValues } from "react-hook-form";
import { useEffect, useState, useRef } from "react";
import useWebSocket from "@/hooks/useWebSocket";
import { format } from "date-fns";
import Spinner from "@/components/common/Spinner";
import { selectCurrentToken, selectCurrentUser } from "@/redux/features/auth/authSlice";

export default function CommonMessage() {
  const authToken: any = useAppSelector(selectCurrentToken);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userData = useAppSelector(selectCurrentUser);

  const {
    sendMessage,
    messageList,
    chatMessages,
    loading,
    fetchMessagesByUserId,
  } = useWebSocket("ws://10.0.10.198:5004", authToken);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatMessages]);

  const handleUserSelect = (user: any) => {
    setSelectedUserId(user.roomId || user.id);
    setSelectedUser(user);
    fetchMessagesByUserId(user.roomId, user.id);
  };

  const handleSubmit = (data: FieldValues) => {
    if (!selectedUserId || !data.message.trim()) return;
    sendMessage({
      event: "message",
      receiverId: selectedUser?.userId || selectedUser.id,
      message: data.message,
    });
    return { message: "" };
  };

  const currentUserId = userData?.id;

  return (
    <div className="flex h-[80vh] gap-4">
      {/* Sidebar — chat list */}
      <div className="w-72 flex flex-col rounded-xl border border-[#2A2A2A] bg-[#000000] overflow-hidden">
        <div className="p-4 border-b border-[#2A2A2A]">
          <h1
            className="text-xl font-semibold text-[#FFFFFF]"
            style={{ fontFamily: 'Cormorant Garamond, serif' }}
          >
            Messages
          </h1>
        </div>

        <div className="overflow-auto flex-1">
          {loading && !messageList ? (
            <div className="p-4 flex justify-center">
              <Spinner />
            </div>
          ) : (
            messageList?.data?.map((chat: any) => (
              <button
                key={chat?.user?.id}
                className={`flex items-center gap-3 p-4 cursor-pointer w-full text-left border-b border-[#2A2A2A] transition-colors
                  ${selectedUserId === chat?.roomId
                    ? "bg-[#C4707E]/10"
                    : "hover:bg-[#1A1A1A]"
                  }`}
                onClick={() => handleUserSelect(chat)}
              >
                <Avatar className="w-9 h-9 border border-[#2A2A2A]">
                  {chat?.image ? (
                    <AvatarImage src={chat?.image} alt={chat?.user?.name} />
                  ) : (
                    <CircleUser className="w-9 h-9 text-[#B0B0B0]" />
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-[#FFFFFF]"
                      style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {chat?.name}
                    </span>
                    {chat?.lastMessage?.createdAt && (
                      <span className="text-xs text-[#B0B0B0]"
                        style={{ fontFamily: 'Poppins, sans-serif' }}>
                        {format(new Date(chat?.lastMessage?.createdAt), "HH:mm")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#B0B0B0] truncate mt-0.5"
                    style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {chat?.lastMessage?.message}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col rounded-xl border border-[#2A2A2A] bg-[#000000] overflow-hidden">
        {selectedUser ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 p-4 border-b border-[#2A2A2A]">
              <Avatar className="w-9 h-9 border border-[#2A2A2A]">
                {selectedUser?.profileImage || selectedUser?.image ? (
                  <AvatarImage
                    src={selectedUser?.profileImage || selectedUser?.image}
                    alt={selectedUser?.fullName || selectedUser?.name}
                  />
                ) : (
                  <CircleUser className="w-9 h-9 text-[#B0B0B0]" />
                )}
              </Avatar>
              <div>
                <h2 className="text-sm font-medium text-[#FFFFFF]"
                  style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {selectedUser?.fullName || selectedUser?.name}
                </h2>
                <p className="text-xs text-[#B0B0B0]"
                  style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {selectedUser?.onlineUsers === true ? "Online" : "Offline"}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <Spinner />
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="flex justify-center items-center h-full text-[#B0B0B0]">
                  <p className="text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    No messages yet. Start a conversation!
                  </p>
                </div>
              ) : (
                chatMessages?.map((msg: any) => {
                  const isMine = msg.senderId === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-xl px-4 py-2.5 ${
                          isMine
                            ? "text-[#000000]"
                            : "bg-[#1A1A1A] border border-[#2A2A2A] text-[#FFFFFF]"
                        }`}
                        style={isMine ? {
                          background: 'linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)',
                        } : {}}
                      >
                        <p className="text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          {msg.message}
                        </p>
                        <p
                          className={`text-xs mt-1 ${isMine ? "text-[#000000]/60" : "text-[#B0B0B0]"}`}
                          style={{ fontFamily: 'Poppins, sans-serif' }}
                        >
                          {format(new Date(msg.createdAt), "HH:mm")}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[#2A2A2A]">
              <MyFormWrapper onSubmit={handleSubmit} className="flex gap-2 w-full items-end">
                <MyFormInput
                  name="message"
                  className="flex-1"
                  placeholder="Type a message..."
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all hover:opacity-90"
                  style={{
                    background: 'linear-gradient(135deg, #8B4060 0%, #E8A0B0 100%)',
                  }}
                >
                  <Send className="h-4 w-4 text-[#000000]" />
                </button>
              </MyFormWrapper>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <CircleUser className="mx-auto h-14 w-14 text-[#2A2A2A]" />
              <h3
                className="text-xl font-semibold text-[#FFFFFF]"
                style={{ fontFamily: 'Cormorant Garamond, serif' }}
              >
                Select a conversation
              </h3>
              <p className="text-sm text-[#B0B0B0]"
                style={{ fontFamily: 'Poppins, sans-serif' }}>
                Choose a contact from the left to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
