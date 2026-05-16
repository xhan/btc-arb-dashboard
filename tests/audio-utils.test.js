const assert = require('assert');

const {
  createAudioUnlockRuntime,
  playAudioOnceFromSource,
  syncLoopingAudio
} = require('../src/ui/audio-utils');

function createAudioStub() {
  return {
    currentTime: 8,
    loop: false,
    muted: false,
    paused: true,
    playCalls: 0,
    pauseCalls: 0,
    play() {
      this.playCalls += 1;
      this.paused = false;
      return Promise.resolve();
    },
    pause() {
      this.pauseCalls += 1;
      this.paused = true;
    }
  };
}

(async () => {
  const loopingAudio = createAudioStub();
  assert.strictEqual(syncLoopingAudio(loopingAudio, true), true);
  assert.strictEqual(loopingAudio.loop, true);
  assert.strictEqual(loopingAudio.playCalls, 1);

  assert.strictEqual(syncLoopingAudio(loopingAudio, true), true);
  assert.strictEqual(loopingAudio.playCalls, 1);

  assert.strictEqual(syncLoopingAudio(loopingAudio, false), true);
  assert.strictEqual(loopingAudio.pauseCalls, 1);
  assert.strictEqual(loopingAudio.currentTime, 0);
  assert.strictEqual(syncLoopingAudio(null, true), false);

  const created = [];
  function AudioCtor(src) {
    this.src = src;
    this.loop = true;
    this.volume = 1;
    this.playCalls = 0;
    this.play = () => {
      this.playCalls += 1;
      return Promise.resolve();
    };
    created.push(this);
  }
  const oneShot = playAudioOnceFromSource({
    currentSrc: 'current.mp3',
    src: 'fallback.mp3',
    volume: 0.25
  }, { AudioCtor });
  assert.strictEqual(oneShot, created[0]);
  assert.strictEqual(oneShot.src, 'current.mp3');
  assert.strictEqual(oneShot.loop, false);
  assert.strictEqual(oneShot.volume, 0.25);
  assert.strictEqual(oneShot.playCalls, 1);

  let onUnlockedCalls = 0;
  const noticeEl = { style: { display: 'block' } };
  const unlockRuntime = createAudioUnlockRuntime({
    audioElements: [{ id: 'ok' }],
    noticeEl,
    primeAudioImpl: async (audioEl) => audioEl.id === 'ok',
    onUnlocked: () => {
      onUnlockedCalls += 1;
    }
  });
  assert.strictEqual(unlockRuntime.isUnlocked(), false);
  assert.strictEqual(await unlockRuntime.unlock(), true);
  assert.strictEqual(unlockRuntime.isUnlocked(), true);
  assert.strictEqual(noticeEl.style.display, 'none');
  assert.strictEqual(onUnlockedCalls, 1);
  assert.strictEqual(await unlockRuntime.unlock(), true);
  assert.strictEqual(onUnlockedCalls, 1);

  const warnings = [];
  const failedRuntime = createAudioUnlockRuntime({
    audioElements: [{ id: 'fail' }],
    primeAudioImpl: async () => false,
    logWarning: (...args) => warnings.push(args)
  });
  assert.strictEqual(await failedRuntime.unlockAndReport(), false);
  assert.strictEqual(failedRuntime.isUnlocked(), false);
  assert.strictEqual(warnings.length, 1);
  assert.strictEqual(warnings[0][0], 'Unlock failed');
})();
