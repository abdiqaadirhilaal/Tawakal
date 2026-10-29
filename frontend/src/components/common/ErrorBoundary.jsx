import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('UI error', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center bg-mist px-6 text-center">
        <div>
          <p className="eyebrow">Khalad</p>
          <h1 className="mt-2 text-3xl font-extrabold text-navy">Wax baa khaldamay</h1>
          <p className="mx-auto mt-3 max-w-md text-slate-600">Boggan lama muujin karo hadda. Fadlan dib u cusboonaysii bogga ama ku noqo bogga hore.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-royal px-4 py-2.5 text-sm font-semibold text-white">
              Dib u cusboonaysii
            </button>
            <a href="/" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-navy">
              Bogga Hore
            </a>
          </div>
        </div>
      </div>
    );
  }
}
