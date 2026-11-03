import { Callback } from './pages/Callback';
import { Login } from './pages/Login';
import { PlayerTest } from './pages/PlayerTest';
import { isLoggedIn } from './spotify/auth';

export default function App() {
  if (window.location.pathname === '/callback') return <Callback />;
  return isLoggedIn() ? <PlayerTest /> : <Login />;
}
