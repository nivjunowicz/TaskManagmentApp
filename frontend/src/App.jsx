import { useSelector } from 'react-redux';
import './App.css';
import AuthPage from './pages/AuthPage';
import TasksPage from './pages/TasksPage';

function App() {
  const token = useSelector((s) => s.auth.token);
  return token ? <TasksPage /> : <AuthPage />;
}

export default App;