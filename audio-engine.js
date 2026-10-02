(() => {
'use strict';

let ctx = null;
let master = null;
let compressor = null;
let noiseBuffer = null;

function ensureContext(){
  if(ctx && ctx.state !== 'closed') return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if(!AC) return null;
  ctx = new AC({latencyHint:'interactive'});
  compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -14;
  compressor.knee.value = 8;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.12;
  master = ctx.createGain();
  master.gain.value = 0.72;
  compressor.connect(master).connect(ctx.destination);
  return ctx;
}

function makeNoiseBuffer(){
  const c = ensureContext();
  if(!c) return null;
  if(noiseBuffer && noiseBuffer.sampleRate === c.sampleRate) return noiseBuffer;
  const length = Math.max(1, Math.floor(c.sampleRate * 0.08));
  noiseBuffer = c.createBuffer(1, length, c.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for(let i=0;i<length;i++) data[i] = Math.random()*2-1;
  return noiseBuffer;
}

function envelope(gain, when, peak, attack, release){
  gain.gain.cancelScheduledValues(when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + attack + release);
}

function tone({freq=220,toFreq=null,dur=.06,gain=.08,type='sine',start=0,detune=0}={}){
  const c = ensureContext();
  if(!c || !compressor) return;
  const t = c.currentTime + start;
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq,t);
  if(toFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20,toFreq),t+dur);
  osc.detune.value = detune;
  envelope(amp,t,gain,Math.min(.006,dur*.18),Math.max(.012,dur));
  osc.connect(amp).connect(compressor);
  osc.start(t);
  osc.stop(t+dur+.025);
}

function noise({dur=.025,gain=.025,cutoff=1800,start=0,mode='highpass'}={}){
  const c = ensureContext();
  const buffer = makeNoiseBuffer();
  if(!c || !buffer || !compressor) return;
  const t = c.currentTime + start;
  const src = c.createBufferSource();
  const filter = c.createBiquadFilter();
  const amp = c.createGain();
  src.buffer = buffer;
  filter.type = mode;
  filter.frequency.value = cutoff;
  filter.Q.value = .7;
  envelope(amp,t,gain,.001,Math.max(.01,dur));
  src.connect(filter).connect(amp).connect(compressor);
  src.start(t);
  src.stop(t+dur+.02);
}

function impact(freq=115,gain=.12,start=0,dur=.08){
  tone({freq,toFreq:freq*.58,dur,gain,type:'triangle',start});
  noise({dur:.018,gain:gain*.24,cutoff:1450,start});
}

async function prime(){
  const c = ensureContext();
  if(!c) return false;
  if(c.state === 'suspended'){
    try{ await c.resume(); }catch{}
  }
  return c.state === 'running';
}

async function play(kind='score'){
  const ready = await prime();
  if(!ready) return;
  switch(kind){
    case 'tap':
      noise({dur:.014,gain:.018,cutoff:2300});
      tone({freq:205,dur:.026,gain:.022,type:'triangle'});
      break;
    case 'back':
      noise({dur:.018,gain:.016,cutoff:1700});
      tone({freq:165,toFreq:125,dur:.04,gain:.03,type:'triangle'});
      break;
    case 'confirm':
      impact(128,.075,0,.055);
      tone({freq:620,dur:.028,gain:.018,type:'sine',start:.006});
      break;
    case 'double':
      impact(142,.08,0,.055);
      tone({freq:1180,toFreq:930,dur:.045,gain:.025,type:'triangle',start:.006});
      break;
    case 'treble':
      impact(165,.075,0,.05);
      noise({dur:.022,gain:.024,cutoff:2700,start:.004});
      tone({freq:2480,toFreq:1900,dur:.035,gain:.018,type:'sine',start:.004});
      break;
    case 'bull':
      impact(92,.105,0,.09);
      tone({freq:760,dur:.09,gain:.035,type:'sine',start:.012});
      tone({freq:1140,dur:.065,gain:.018,type:'sine',start:.018});
      break;
    case 'bust':
      impact(118,.11,0,.11);
      tone({freq:188,toFreq:82,dur:.16,gain:.065,type:'sawtooth',start:.012});
      noise({dur:.055,gain:.018,cutoff:950,start:.015,mode:'lowpass'});
      break;
    case '180':
      impact(82,.16,0,.105);
      noise({dur:.035,gain:.035,cutoff:2100,start:.004});
      tone({freq:330,dur:.09,gain:.052,type:'triangle',start:.035});
      tone({freq:495,dur:.10,gain:.05,type:'triangle',start:.115});
      tone({freq:990,dur:.18,gain:.042,type:'sine',start:.195});
      tone({freq:1485,dur:.20,gain:.022,type:'sine',start:.205});
      break;
    case 'leg':
      impact(96,.14,0,.10);
      tone({freq:392,dur:.12,gain:.045,type:'triangle',start:.055});
      tone({freq:523.25,dur:.14,gain:.047,type:'triangle',start:.145});
      tone({freq:659.25,dur:.24,gain:.05,type:'sine',start:.245});
      break;
    case 'match':
      impact(82,.17,0,.12);
      tone({freq:392,dur:.13,gain:.05,type:'triangle',start:.055});
      tone({freq:523.25,dur:.15,gain:.052,type:'triangle',start:.16});
      tone({freq:659.25,dur:.18,gain:.054,type:'triangle',start:.285});
      tone({freq:987.77,dur:.42,gain:.045,type:'sine',start:.42});
      tone({freq:1318.51,dur:.45,gain:.025,type:'sine',start:.43});
      break;
    case 'score':
    default:
      impact(132,.065,0,.05);
      noise({dur:.014,gain:.014,cutoff:2000,start:.002});
  }
}

function setVolume(value){
  if(!master) ensureContext();
  if(master) master.gain.value = Math.max(0,Math.min(1,Number(value)||0));
}

window.CheckoutAudio = {prime,play,setVolume};
})();