// Touch screens: keep the page at its normal size, like an app. Shared by the game and the Glass FM page.
// The stylesheets already turn zooming off (viewport meta + touch-action), but Safari on iPhone/iPad doesn't always
// honour that, so these back it up:
//  - pinch: iOS ignores user-scalable=no for pinches, so the pinch gesture itself is cancelled
//  - double-tap: a second tap within Safari's ~0.5 s double-tap window has its default (the zoom) cancelled, and the
//    button or link it landed on is clicked here instead, so quick repeated taps still work. Game controls, keys,
//    knobs and the vector pad run on pointer events, which this doesn't touch.
//  - if a zoom still slips through (you couldn't pinch back out), the page snaps back to normal size
(function () {
  if (!matchMedia('(pointer: coarse)').matches) return;
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!IOS) return;
  let lastTap = 0;
  document.addEventListener('touchend', (e) => {
    const now = e.timeStamp;
    if (now - lastTap < 500 && e.cancelable && !e.target.closest('input, select')) {
      e.preventDefault();
      e.target.closest('button, a, tr.song')?.click();
    }
    lastTap = now;
  }, { passive: false });

  // re-applying the viewport settings makes Safari reset its zoom
  const vp = document.querySelector('meta[name=viewport]'), VP = vp && vp.content;
  let snapping = false;
  if (window.visualViewport) visualViewport.addEventListener('resize', () => {
    if (!vp || snapping || visualViewport.scale <= 1.01) return;
    snapping = true;
    vp.content = VP.replace('maximum-scale=1', 'maximum-scale=1.01');
    setTimeout(() => { vp.content = VP; scrollTo(0, 0); snapping = false; }, 80);
  });
})();
