import { useAuthUser } from "@/hooks/use-auth-user";
import { invalidateChatListQueries } from "@/lib/chat/invalidate-chat-queries";
import {
  isMessageNewPayload,
  type MessageNewPayload,
} from "@/lib/chat/message-new-payload";
import { getSocketBaseUrl } from "@/lib/chat/socket-base-url";
import { getAuthToken } from "@/lib/auth/token-storage";
import { useQueryClient } from "@tanstack/react-query";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io, type Socket } from "socket.io-client";

type MessageNewListener = (payload: MessageNewPayload) => void;

type ChatSocketContextValue = Readonly<{
  socket: Socket | null;
  isConnected: boolean;
  joinConversation: (conversationId: string) => Promise<void>;
  leaveConversation: (conversationId: string) => void;
  subscribeMessageNew: (listener: MessageNewListener) => () => void;
}>;

const ChatSocketContext = createContext<ChatSocketContextValue | null>(null);

export function ChatSocketProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { data: user } = useAuthUser();
  const qc = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef(new Set<MessageNewListener>());
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const notifyListeners = useCallback((payload: MessageNewPayload) => {
    for (const listener of listenersRef.current) {
      listener(payload);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      const token = await getAuthToken();
      const base = getSocketBaseUrl();
      if (!token || !base || cancelled) {
        return;
      }

      const socket = io(base, {
        auth: { token },
        transports: ["websocket"],
      });
      socketRef.current = socket;
      setSocket(socket);

      socket.on("connect", () => {
        if (!cancelled) {
          setIsConnected(true);
        }
      });

      socket.on("disconnect", () => {
        setIsConnected(false);
      });

      socket.on("message:new", (raw: unknown) => {
        if (!isMessageNewPayload(raw)) {
          return;
        }
        invalidateChatListQueries(qc);
        notifyListeners(raw);
      });
    })();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [user?.id, qc, notifyListeners]);

  const joinConversation = useCallback(
    (conversationId: string) =>
      new Promise<void>((resolve, reject) => {
        const socket = socketRef.current;
        if (!socket) {
          resolve();
          return;
        }
        const runJoin = () => {
          socket.emit("join", conversationId, (err?: string) => {
            if (err) {
              reject(new Error(err));
              return;
            }
            resolve();
          });
        };
        if (socket.connected) {
          runJoin();
          return;
        }
        socket.once("connect", runJoin);
      }),
    [],
  );

  const leaveConversation = useCallback((conversationId: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      return;
    }
    socket.emit("leave", conversationId);
  }, []);

  const subscribeMessageNew = useCallback((listener: MessageNewListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const value = useMemo(
    () => ({
      socket,
      isConnected,
      joinConversation,
      leaveConversation,
      subscribeMessageNew,
    }),
    [
      socket,
      isConnected,
      joinConversation,
      leaveConversation,
      subscribeMessageNew,
    ],
  );

  return (
    <ChatSocketContext.Provider value={value}>
      {children}
    </ChatSocketContext.Provider>
  );
}

export function useChatSocket(): ChatSocketContextValue {
  const ctx = useContext(ChatSocketContext);
  if (!ctx) {
    throw new Error("useChatSocket must be used within ChatSocketProvider");
  }
  return ctx;
}
