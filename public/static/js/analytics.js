/* Google Analytics: 本番公開時は計測対象ホストに本番ドメインを追加する。 */
const analyticsConfig = {
  measurementId: 'G-R8JWDS2SH1',
  hosts: ['square-web-staging.square-okayama.workers.dev']
};

export function initializeAnalytics() {
  if (
    window.location.protocol !== 'https:' ||
    !analyticsConfig.hosts.includes(window.location.hostname) ||
    document.getElementById('square-google-tag')
  ) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', analyticsConfig.measurementId);

  const script = document.createElement('script');
  script.id = 'square-google-tag';
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' +
    encodeURIComponent(analyticsConfig.measurementId);
  document.head.appendChild(script);
}
