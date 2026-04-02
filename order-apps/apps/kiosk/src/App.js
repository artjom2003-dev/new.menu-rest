import './styles/index.scss';
import Main from './pages/Main';
import ErrorBoundary from './ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <div className="App">
        <Main/>
      </div>
    </ErrorBoundary>
  );
}

export default App;
