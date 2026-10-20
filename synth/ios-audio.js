// iPhone / iPad audio helper, shared by the game and the Glass FM page. Call window.iosAudio() from inside
// a tap (touchend / click) before starting or resuming an AudioContext.
// iOS plays Web Audio on the ringer channel, so the side silent switch mutes it. Asking for the "playback"
// audio session (Safari 17+) makes it behave like music; older iOS gets the same effect while an <audio>
// element is playing, so a silent looping clip is started for them.
(function () {
  const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let el = null;
  function silentWav() {
    const rate = 8000, n = 800, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    str(36, 'data'); v.setUint32(40, n * 2, true);
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  }
  window.iosAudio = function () {
    if (!IOS) return;
    try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') { navigator.audioSession.type = 'playback'; return; } } catch { /* not settable */ }
    if (navigator.audioSession) return;
    if (!el) { el = new Audio(silentWav()); el.loop = true; el.setAttribute('playsinline', ''); }
    if (el.paused) el.play().catch(() => {});
  };
})();
