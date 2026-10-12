import React, { useRef, useState } from 'react';
import { Loader2, Mic, Square } from 'lucide-react';
import { uploadAudioAsset } from '@/lib/audioUpload';

// Records dialogue from the microphone while the timeline plays, then drops it on the Dialogue track
// at the time recording started (stored privately in the Audio Library).
export default function MicRecord({ engine, disabled }) {
  const [state, setState] = useState('idle'), [err, setErr] = useState(''), ref = useRef(null);
  const D = engine.studio.dir;
  const start = async () => {
    setErr('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const rec = new MediaRecorder(stream), parts = [], at = D.t;
      rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop()); setState('saving');
        try {
          const type = rec.mimeType || 'audio/webm', ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
          const file = new File(parts, `dialogue-${Date.now()}.${ext}`, { type });
          const asset = await uploadAudioAsset(file, { name: `Dialogue ${new Date().toLocaleTimeString()}`, subcategory: 'dialogue' });
          await D.addAudio(asset, 'dialogue', at);
        } catch (e) { setErr(e.message); }
        setState('idle');
      };
      ref.current = rec; rec.start(); setState('rec');
      await D.play(); // hear the scene and music while speaking
    } catch (e) { setErr(e.message || 'Microphone unavailable'); setState('idle'); }
  };
  const stop = () => { D.pause(); ref.current?.stop(); };
  return (
    <span className="relative" title={err || (state === 'rec' ? 'Stop recording' : 'Record dialogue from microphone')}>
      {state === 'saving' ? <Loader2 className="w-3 h-3 animate-spin text-primary" /> : state === 'rec'
        ? <button onClick={stop}><Square className="w-3 h-3 text-destructive animate-pulse" /></button>
        : <button disabled={disabled} onClick={start} className="disabled:opacity-30"><Mic className={`w-3 h-3 ${err ? 'text-destructive' : 'text-primary'}`} /></button>}
    </span>
  );
}