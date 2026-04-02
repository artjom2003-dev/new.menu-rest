import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('React Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          fontFamily: 'monospace',
          background: '#1a1a2e',
          color: '#e94560',
          minHeight: '100vh',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflow: 'auto'
        }}>
          <h1 style={{ color: '#fff', marginBottom: '1rem' }}>⚠ Ошибка React</h1>
          <h2 style={{ color: '#e94560' }}>{this.state.error?.toString()}</h2>
          <details open style={{ marginTop: '1rem', color: '#ccc' }}>
            <summary style={{ cursor: 'pointer', color: '#fff' }}>Стек вызовов</summary>
            <pre style={{ marginTop: '0.5rem', fontSize: '12px' }}>
              {this.state.error?.stack}
            </pre>
            <pre style={{ marginTop: '0.5rem', fontSize: '12px' }}>
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
