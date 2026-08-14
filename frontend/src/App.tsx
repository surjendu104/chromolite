import RightPanel from './components/right-panel';
import Sidebar from './components/sidebar';

function App() {
  return (
    <div className="bg-sidebar text-foreground flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <RightPanel />
    </div>
  );
}

export default App;
