/* =========================================================
   PAGE INITIALIZATION
========================================================= */

function initializeStageHero() {
  const image = document.querySelector('[data-stage-hero]');

  if (!image) {
    return;
  }

  const candidates = [
    '/static/images/stage/stage-01.webp',
    '/static/images/stage/stage-02.webp',
    '/static/images/stage/stage-03.webp',
    '/static/images/stage/stage-04.webp'
  ];

  image.src = candidates[Math.floor(Math.random() * candidates.length)];
}


function initializeSessionHero() {
  const image = document.querySelector('[data-session-hero]');

  if (!image) {
    return;
  }

  const candidates = [
    '/static/images/session/session-01.webp',
    '/static/images/session/session-02.webp'
  ];

  let nextIndex;

  try {
    const previousIndex = Number.parseInt(
      window.localStorage.getItem('square-session-hero-index') || '-1',
      10
    );
    nextIndex = Number.isInteger(previousIndex)
      ? (previousIndex + 1) % candidates.length
      : 0;
    window.localStorage.setItem('square-session-hero-index', String(nextIndex));
  } catch {
    nextIndex = Math.floor(Math.random() * candidates.length);
  }

  image.src = candidates[nextIndex];
}




function initializeJoinCards() {
  const images = document.querySelectorAll('[data-join-card]');

  if (images.length === 0 || Math.random() >= 0.9) {
    return;
  }

  images.forEach(image => {
    image.src = '/static/images/home/card-join-feature.webp';
  });
}


function initializeStageCards() {
  const images = document.querySelectorAll('[data-stage-card]');

  if (images.length === 0) {
    return;
  }

  const candidates = [
    '/static/images/home/card-stage.webp',
    '/static/images/common/card-stage.webp'
  ];
  let nextIndex;

  try {
    const previousIndex = Number.parseInt(
      window.localStorage.getItem('square-stage-card-index') || '-1',
      10
    );
    nextIndex = Number.isInteger(previousIndex)
      ? (previousIndex + 1) % candidates.length
      : 0;
    window.localStorage.setItem('square-stage-card-index', String(nextIndex));
  } catch {
    nextIndex = Math.floor(Math.random() * candidates.length);
  }

  images.forEach(image => {
    image.src = candidates[nextIndex];
  });
}



export function initializePhotos() {
  initializeStageHero();
  initializeSessionHero();
  initializeJoinCards();
  initializeStageCards();
}
