import { firestoreDB, COLLECTIONS } from './firebase';

export interface ChatMessage {
  id?: string;
  ride_id: string;
  sender_id: string;
  sender_name: string;
  sender_type: 'rider' | 'driver';
  message: string;
  timestamp: string;
  read: boolean;
}

export interface ChatSession {
  id?: string;
  ride_id: string;
  rider_id: string;
  driver_id: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
}

export class ChatService {
  private static instance: ChatService;

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  /**
   * Send a message in a ride chat
   */
  async sendMessage(
    rideId: string,
    senderId: string,
    senderName: string,
    senderType: 'rider' | 'driver',
    message: string
  ): Promise<string> {
    try {
      const chatMessage: ChatMessage = {
        ride_id: rideId,
        sender_id: senderId,
        sender_name: senderName,
        sender_type: senderType,
        message: message.trim(),
        timestamp: new Date().toISOString(),
        read: false,
      };

      const result = await firestoreDB.create('ride_messages', chatMessage);
      const docId = typeof result === 'string' ? result : result.id;

      // Update ride's last message
      await firestoreDB.update(COLLECTIONS.RIDES, rideId, {
        last_message: message.trim(),
        last_message_time: new Date().toISOString(),
      });

      return docId;
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  }

  /**
   * Get all messages for a ride
   */
  async getMessages(rideId: string): Promise<ChatMessage[]> {
    try {
      const messages = await firestoreDB.list('ride_messages', {
        ride_id: rideId,
      });
      return messages.sort((a: any, b: any) => {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }) as ChatMessage[];
    } catch (err) {
      console.error('Error fetching messages:', err);
      return [];
    }
  }

  /**
   * Subscribe to real-time messages for a ride
   */
  subscribeToMessages(
    rideId: string,
    onMessagesUpdate: (messages: ChatMessage[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    try {
      const unsubscribe = firestoreDB.subscribe(
        'ride_messages',
        { ride_id: rideId },
        (messages) => {
          const sorted = messages.sort((a: any, b: any) => {
            return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          });
          onMessagesUpdate(sorted as ChatMessage[]);
        }
      );
      return unsubscribe;
    } catch (err) {
      onError?.(err as Error);
      return () => {};
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(rideId: string, userId: string): Promise<void> {
    try {
      const messages = await firestoreDB.list('ride_messages', {
        ride_id: rideId,
        read: false,
      });

      for (const msg of messages) {
        if (msg.sender_id !== userId) {
          await firestoreDB.update('ride_messages', msg.id, { read: true });
        }
      }
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const messages = await firestoreDB.list('ride_messages', {
        read: false,
      });
      return messages.filter((m: any) => m.sender_id !== userId).length;
    } catch (err) {
      console.error('Error getting unread count:', err);
      return 0;
    }
  }

  /**
   * Delete a message (only sender can delete)
   */
  async deleteMessage(messageId: string, senderId: string): Promise<void> {
    try {
      const message = await firestoreDB.get('ride_messages', messageId);
      if (message && message.sender_id === senderId) {
        await firestoreDB.delete('ride_messages', messageId);
      }
    } catch (err) {
      console.error('Error deleting message:', err);
      throw err;
    }
  }
}

export default ChatService.getInstance();
