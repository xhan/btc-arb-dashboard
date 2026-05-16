(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.AudioUtils = api;
  if (root && root.window && root.window !== root) {
    root.window.AudioUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  async function primeAudio(audioEl) {
    if (!audioEl) return false;
    audioEl.muted = true;
    await audioEl.play();
    audioEl.pause();
    audioEl.currentTime = 0;
    audioEl.muted = false;
    return true;
  }

  function syncLoopingAudio(audioEl, shouldPlay, options = {}) {
    if (!audioEl) return false;
    if (shouldPlay) {
      if (audioEl.paused) {
        audioEl.loop = true;
        const playPromise = audioEl.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch((error) => {
            if (typeof options.logPlayError === 'function') {
              options.logPlayError(error);
            }
          });
        }
      }
      return true;
    }
    if (!audioEl.paused) {
      audioEl.pause();
      audioEl.currentTime = 0;
    }
    return true;
  }

  function playAudioOnceFromSource(sourceAudioEl, options = {}) {
    if (!sourceAudioEl) return null;
    const AudioCtor = options.AudioCtor || (typeof Audio !== 'undefined' ? Audio : null);
    if (typeof AudioCtor !== 'function') return null;
    const audio = new AudioCtor(sourceAudioEl.currentSrc || sourceAudioEl.src);
    audio.loop = false;
    audio.volume = sourceAudioEl.volume;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch((error) => {
        if (typeof options.logPlayError === 'function') {
          options.logPlayError(error);
        }
      });
    }
    return audio;
  }

  function createAudioUnlockRuntime(options = {}) {
    const primeAudioImpl = options.primeAudioImpl || primeAudio;
    const audioElements = Array.isArray(options.audioElements) ? options.audioElements : [];
    const logWarning = typeof options.logWarning === 'function' ? options.logWarning : () => {};
    let unlocked = false;

    function isUnlocked() {
      return unlocked;
    }

    async function unlock() {
      if (unlocked) return true;
      if (options.noticeEl && options.noticeEl.style) {
        options.noticeEl.style.display = 'none';
      }
      const results = await Promise.allSettled(audioElements.map((audioEl) => primeAudioImpl(audioEl)));
      const hasUnlockedAudio = results.some((result) => result.status === 'fulfilled' && result.value === true);
      if (!hasUnlockedAudio) {
        throw new Error('no audio unlocked');
      }
      unlocked = true;
      if (typeof options.onUnlocked === 'function') {
        options.onUnlocked();
      }
      return true;
    }

    async function unlockAndReport() {
      try {
        return await unlock();
      } catch (error) {
        logWarning('Unlock failed', error);
      }
      return false;
    }

    return {
      isUnlocked,
      unlock,
      unlockAndReport
    };
  }

  return {
    createAudioUnlockRuntime,
    playAudioOnceFromSource,
    primeAudio,
    syncLoopingAudio
  };
});
