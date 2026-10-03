import { initializeAnalytics } from './analytics.js';
import { initializeLayout } from './layout.js';
import { initializePhotos } from './photos.js';
import { initializeBandsCard, loadBands, loadBandDetail } from './bands.js';

initializeAnalytics();
initializeLayout();
initializePhotos();
initializeBandsCard();

if (document.getElementById('bands-list')) {
  loadBands();
}

if (document.getElementById('band-detail')) {
  loadBandDetail();
}
