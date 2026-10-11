import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function VideoDialog({ video, onClose }) {
  return (
    <Dialog open={!!video} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-4xl">
        <DialogHeader><DialogTitle className="font-heading text-base">{video?.title}</DialogTitle></DialogHeader>
        {video && <video src={video.url} controls autoPlay className="w-full rounded-xl bg-black aspect-video" />}
      </DialogContent>
    </Dialog>
  );
}