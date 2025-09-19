import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import type { ChatMessage } from '../types';
import { getSocket } from '../socket';
import Modal from '../components/Modal';
import { getRoomPassword, setRoomPassword } from '../roomPasswords';

export default function RoomChatPage() {
  const { roomId } = useParams();
  const location = useLocation() as {
    state?: { password?: string; roomName?: string };
  };
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [askPassword, setAskPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [members, setMembers] = useState<
    Array<{ id: string; username: string }>
  >([]);

  useEffect(() => {
    const s = getSocket();
    if (!s || !roomId) return;
    const incomingPassword =
      location.state?.password ?? getRoomPassword(roomId!) ?? undefined;
    s.emit('join_room', { roomId, password: incomingPassword });

    const onHistory = (payload: {
      roomId: string;
      messages: ChatMessage[];
    }) => {
      if (payload.roomId === roomId) {
        setMessages(payload.messages);
        setJoined(true);
        setAskPassword(false);
      }
    };
    const onMessage = (payload: { roomId: string; message: ChatMessage }) => {
      if (payload.roomId === roomId)
        setMessages((prev) => [...prev, payload.message]);
    };
    const onMembers = (payload: {
      roomId: string;
      members: Array<{ id: string; username: string }>;
    }) => {
      if (payload.roomId === roomId) setMembers(payload.members);
    };
    const onDeleted = (payload: { roomId: string }) => {
      if (payload.roomId === roomId) alert('Room was deleted by owner');
    };
    const onError = (payload: { message: string }) => {
      if (payload.message === 'Password required') {
        setAskPassword(true);
        setJoinError('Password is required');
      } else if (payload.message === 'Invalid password') {
        setAskPassword(true);
        setJoinError('Invalid password');
      } else {
        alert(payload.message);
      }
    };

    s.on('room_history', onHistory);
    s.on('chat_message', onMessage);
    s.on('members_updated', onMembers);
    s.on('room_deleted', onDeleted);
    s.on('error_message', onError);

    return () => {
      s.emit('leave_room', { roomId });
      s.off('room_history', onHistory);
      s.off('chat_message', onMessage);
      s.off('members_updated', onMembers);
      s.off('room_deleted', onDeleted);
      s.off('error_message', onError);
    };
  }, [roomId, location.state?.password]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function send() {
    const text = input.trim();
    if (!text || !roomId || !joined) return;
    const s = getSocket();
    s?.emit('chat_message', { roomId, text });
    setInput('');
  }

  function confirmJoin() {
    const s = getSocket();
    if (!s || !roomId) return;
    setJoinError(null);
    s.emit('join_room', { roomId, password });
    setRoomPassword(roomId, password);
  }

  return (
    <div className="container">
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2>
          {location.state?.roomName
            ? `Room "${location.state.roomName}"`
            : 'Room'}
        </h2>
        <nav>
          <Link to="/">Rooms</Link>
        </nav>
      </header>
      <div className="chat-wrap">
        <div className="chat-column">
          <div className="chat-box">
            {messages.length === 0 ? (
              <div className="empty">No messages yet</div>
            ) : (
              messages.map((m) => {
                const ts = new Date(m.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                });
                const isMe = user?.id === m.userId;
                return (
                  <div key={m.id} className={`message${isMe ? ' me' : ''}`}>
                    <div className="message-header">
                      <strong>{m.username}</strong>
                      <span className="timestamp">{ts}</span>
                    </div>
                    <div className="msg">{m.text}</div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>
          <div className="send-wrap">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message"
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button onClick={send} disabled={!joined}>
              Send
            </button>
          </div>
        </div>
        <aside className="members">
          <h4 style={{ marginTop: 0, marginBottom: 8 }}>Online</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {members.map((u) => (
              <li key={u.id} style={{ padding: '4px 0' }}>
                {u.username}
                {user?.id === u.id ? ' (me)' : ''}
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <Modal
        open={askPassword}
        title="Enter room password"
        onClose={() => {
          setAskPassword(false);
          if (!joined) {
            window.history.back();
          }
        }}
        footer={
          <>
            <button
              onClick={() => {
                setAskPassword(false);
                if (!joined) window.history.back();
              }}
            >
              Cancel
            </button>
            <button onClick={confirmJoin}>Join</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {joinError && <span style={{ color: '#ff6b6b' }}>{joinError}</span>}
        </div>
      </Modal>
    </div>
  );
}
