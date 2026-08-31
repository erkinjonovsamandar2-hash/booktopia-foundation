import { Component } from 'react';

const T = {
  title: { uz: 'Nimadir xato ketdi', ru: 'Что-то пошло не так', en: 'Something went wrong' },
  desc: {
    uz: 'Ilovada kutilmagan xatolik yuz berdi. Qayta urinib ko\'ring.',
    ru: 'Произошла непредвиденная ошибка. Попробуйте ещё раз.',
    en: 'An unexpected error occurred. Please try again.',
  },
  retry: { uz: 'Qayta urinish', ru: 'Повторить', en: 'Try again' },
  home: { uz: 'Bosh sahifaga', ru: 'На главную', en: 'Go home' },
};

/**
 * Catches render errors anywhere in the routed subtree.
 * Without this a single throw unmounts the whole page and leaves a blank screen
 * under a live bottom nav, with nothing reported anywhere.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Replace with a real reporter (Sentry) when one is wired up — see W1H-6.
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    const lang = this.props.lang ?? 'uz';
    const t = (k) => T[k]?.[lang] ?? T[k]?.uz;

    if (!error) return this.props.children;

    return (
      <div
        className="page"
        role="alert"
        style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          minHeight: '70dvh', padding: '32px 24px', textAlign: 'center', gap: 12,
        }}
      >
        <div style={{ fontSize: 48, lineHeight: 1 }}>😕</div>
        <h2 style={{ fontSize: 20 }}>{t('title')}</h2>
        <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.5, maxWidth: 320 }}>
          {t('desc')}
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }}
            onClick={() => this.setState({ error: null })}>
            {t('retry')}
          </button>
          <button className="btn-secondary" style={{ width: 'auto', padding: '10px 20px' }}
            onClick={() => { window.location.href = '/'; }}>
            {t('home')}
          </button>
        </div>
      </div>
    );
  }
}
