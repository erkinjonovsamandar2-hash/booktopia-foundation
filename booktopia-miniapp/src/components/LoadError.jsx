import { WifiSlash, CloudWarning } from '@phosphor-icons/react';

const T = {
  offlineTitle: { uz: 'Internet yo\'q', ru: 'Нет соединения', en: 'No connection' },
  offlineDesc: {
    uz: 'Internetga ulanishni tekshiring va qayta urinib ko\'ring.',
    ru: 'Проверьте подключение к интернету и попробуйте снова.',
    en: 'Check your internet connection and try again.',
  },
  errorTitle: { uz: 'Yuklab bo\'lmadi', ru: 'Не удалось загрузить', en: 'Could not load' },
  errorDesc: {
    uz: 'Ma\'lumotlarni yuklashda xatolik yuz berdi.',
    ru: 'Произошла ошибка при загрузке данных.',
    en: 'Something went wrong while loading the data.',
  },
  retry: { uz: 'Qayta urinish', ru: 'Повторить', en: 'Retry' },
};

/**
 * Shown when a fetch fails, so a network error is never mistaken for
 * "no results". Distinguishes offline from a server-side failure.
 */
export default function LoadError({ lang = 'uz', onRetry, offline = !navigator.onLine }) {
  const t = (k) => T[k]?.[lang] ?? T[k]?.uz;

  return (
    <div className="empty-state" role="alert" style={{ marginTop: 40 }}>
      <div className="empty-state__icon">
        {offline
          ? <WifiSlash size={56} weight="thin" color="var(--text-3)" />
          : <CloudWarning size={56} weight="thin" color="var(--text-3)" />}
      </div>
      <h3 className="empty-state__title">{offline ? t('offlineTitle') : t('errorTitle')}</h3>
      <p className="empty-state__desc">{offline ? t('offlineDesc') : t('errorDesc')}</p>
      {onRetry && (
        <button className="btn-primary" style={{ marginTop: 16, width: 'auto', padding: '10px 22px' }} onClick={onRetry}>
          {t('retry')}
        </button>
      )}
    </div>
  );
}
