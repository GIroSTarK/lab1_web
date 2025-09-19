import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createRoom,
  deleteRoom,
  listRooms,
  HttpError,
  verifyRoomPassword,
} from '../api';
import type { RoomSummary } from '../types';
import { useAuth } from '../auth';
import { getSocket } from '../socket';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { getRoomPassword, setRoomPassword } from '../roomPasswords';

export default function RoomsPage() {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomSummary | null>(null);
  const [joinPassword, setJoinPassword] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const data = await listRooms();
      if (mounted) setRooms(data);
    }
    load();
    const s = getSocket();
    const handler = (list: RoomSummary[]) => setRooms(list);
    s?.on('rooms_updated', handler);
    return () => {
      s?.off('rooms_updated', handler);
      mounted = false;
    };
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createRoom(name.trim(), password.trim() || undefined);
    } catch (err: unknown) {
      if (err instanceof HttpError && err.status === 401) navigate('/login');
      return;
    }
    setName('');
    setPassword('');
  }

  function onClickRoom(r: RoomSummary, e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    if (r.protected) {
      if (myId === r.ownerId) {
        navigate(`/room/${r.id}`, { state: { roomName: r.name } });
        return;
      }
      const cached = getRoomPassword(r.id) || '';
      if (cached) {
        navigate(`/room/${r.id}`, {
          state: { password: cached, roomName: r.name },
        });
        return;
      }
      setSelectedRoom(r);
      setJoinPassword('');
      setJoinError(null);
      setShowPwdModal(true);
    } else {
      navigate(`/room/${r.id}`, { state: { roomName: r.name } });
    }
  }

  const myId = user?.id;

  return (
    <div className="container">
      <div className="panel">
        <div className="rooms-header">
          <h2 style={{ margin: 0 }}>Rooms</h2>
        </div>
        <form onSubmit={onCreate} className="create-form">
          <input
            placeholder="New room name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Password (optional)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">Create</button>
        </form>
      </div>

      {rooms.length === 0 ? (
        <div className="empty" style={{ marginTop: 12 }}>
          No rooms yet. Create the first room above.
        </div>
      ) : (
        <ul className="rooms-list" style={{ marginTop: 12 }}>
          {rooms.map((r) => (
            <li key={r.id} className="room-item">
              <Link to={`/room/${r.id}`} onClick={(e) => onClickRoom(r, e)}>
                {r.name}
              </Link>
              <span className="room-meta">
                {r.protected ? '🔒 ' : ''}({r.membersCount} online,{' '}
                {r.messagesCount} messages)
              </span>
              {myId === r.ownerId && (
                <button
                  onClick={async () => {
                    try {
                      await deleteRoom(r.id);
                    } catch (err: unknown) {
                      if (err instanceof HttpError && err.status === 401)
                        navigate('/login');
                    }
                  }}
                  style={{ marginLeft: 'auto' }}
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={showPwdModal}
        title={
          selectedRoom
            ? `Enter password for "${selectedRoom.name}"`
            : 'Enter password'
        }
        onClose={() => {
          setShowPwdModal(false);
          setJoinPassword('');
          setJoinError(null);
        }}
        footer={
          <>
            <button
              onClick={() => {
                setShowPwdModal(false);
                setJoinPassword('');
                setJoinError(null);
              }}
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!selectedRoom) return;
                const pwd = joinPassword;
                try {
                  await verifyRoomPassword(selectedRoom.id, pwd);
                  setShowPwdModal(false);
                  setJoinPassword('');
                  setJoinError(null);
                  setRoomPassword(selectedRoom.id, pwd);
                  navigate(`/room/${selectedRoom.id}`, {
                    state: { password: pwd, roomName: selectedRoom.name },
                  });
                } catch (err: unknown) {
                  if (err instanceof HttpError && err.status === 401) {
                    setJoinError('Invalid password');
                  } else if (err instanceof HttpError && err.status === 400) {
                    setJoinError('Password is required');
                  } else if (err instanceof HttpError && err.status === 404) {
                    setJoinError('Room not found');
                  } else {
                    setJoinError('Password verification failed');
                  }
                }
              }}
            >
              Join
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            type="password"
            placeholder="Password"
            value={joinPassword}
            onChange={(e) => {
              setJoinPassword(e.target.value);
              if (joinError) setJoinError(null);
            }}
          />
          {joinError && <span style={{ color: '#ff6b6b' }}>{joinError}</span>}
        </div>
      </Modal>
    </div>
  );
}
