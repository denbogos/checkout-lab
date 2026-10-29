// Generates the Russian caller pack (audio/ru/*.mp3) with Yandex SpeechKit.
// Runs in GitHub Actions (workflow "Caller voice"): needs the YANDEX_API_KEY secret
// (API key of a service account with the ai.speechkit-tts.user role) and ffmpeg.
// Usage: node tools/gen-voice-yandex.mjs [voice] [emotion] [speed]
import {mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const [voice='ermil',emotion='good',speed='1.05']=process.argv.slice(2);
const KEY=process.env.YANDEX_API_KEY,FOLDER=process.env.YANDEX_FOLDER_ID||'';
if(!KEY){console.error('YANDEX_API_KEY is not set');process.exit(1);}
const ones='ноль один два три четыре пять шесть семь восемь девять десять одиннадцать двенадцать тринадцать четырнадцать пятнадцать шестнадцать семнадцать восемнадцать девятнадцать'.split(' ');
const tens=['','','двадцать','тридцать','сорок','пятьдесят','шестьдесят','семьдесят','восемьдесят','девяносто'];
const words=n=>n<20?ones[n]:n<100?tens[Math.floor(n/10)]+(n%10?' '+ones[n%10]:''):'сто'+(n===100?'':' '+words(n-100));
const clips={max:'Сто восемьдесят!',noscore:'Перебор!',gameshot:'Лег!',match:'Лег и матч!',require:'Осталось'};
for(let n=0;n<=180;n++)clips[`n${n}`]=words(n)+'.';

const out=new URL('../audio/ru/',import.meta.url).pathname,tmp=new URL('../.voice-tmp/',import.meta.url).pathname;
mkdirSync(out,{recursive:true});mkdirSync(tmp,{recursive:true});
for(const [name,text] of Object.entries(clips)){
 const body=new URLSearchParams({text,lang:'ru-RU',voice,emotion,speed:name==='max'?'0.9':speed,format:'mp3',...(FOLDER?{folderId:FOLDER}:{})});
 let res;for(let attempt=0;attempt<4;attempt++){res=await fetch('https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize',{method:'POST',headers:{Authorization:`Api-Key ${KEY}`},body});if(res.ok)break;await new Promise(r=>setTimeout(r,1500*(attempt+1)));}
 if(!res.ok){console.error(`${name}: HTTP ${res.status} ${await res.text()}`);process.exit(1);}
 const raw=`${tmp}${name}.mp3`;writeFileSync(raw,Buffer.from(await res.arrayBuffer()));
 execFileSync('ffmpeg',['-loglevel','error','-y','-i',raw,'-af','silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=1:stop_threshold=-45dB:stop_duration=0.15,loudnorm=I=-16:TP=-1.5','-ac','1','-ar','24000','-b:a','40k',`${out}${name}.mp3`]);
 process.stdout.write('.');
}
rmSync(tmp,{recursive:true,force:true});
writeFileSync(`${out}pack.json`,JSON.stringify({label:'Studio',voice,emotion,generated:new Date().toISOString()})+'\n');
console.log(`\nGenerated ${Object.keys(clips).length} clips with voice ${voice}/${emotion}`);
