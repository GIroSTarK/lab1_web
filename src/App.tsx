import {
  Link,
  Outlet,
  RouterProvider,
  createBrowserRouter,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RoomsPage from './pages/RoomsPage';
import RoomChatPage from './pages/RoomChatPage';
import './App.css';

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="container">Loading...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

function Layout() {
  const { user, logout } = useAuth();
  return (
    <div>
      <header className="app-header">
        <h1 className="title">
          <Link to="/">Chat App</Link>
        </h1>
        <nav className="nav">
          {user ? (
            <>
              <span>Hi, {user.username}</span>
              <button onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </nav>
      </header>
      <Outlet />
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: (
          <RequireAuth>
            <RoomsPage />
          </RequireAuth>
        ),
      },
      {
        path: 'room/:roomId',
        element: (
          <RequireAuth>
            <RoomChatPage />
          </RequireAuth>
        ),
      },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
