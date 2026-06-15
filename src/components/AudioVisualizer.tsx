/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { audioEngine } from '../utils/audioEngine';

interface AudioVisualizerProps {
  isPlaying: boolean;
  themeColor?: string; // e.g. "rgb(255, 27, 107)"
}

export default function AudioVisualizer({ isPlaying, themeColor = 'rgba(168, 85, 247, 0.8)' }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle resizing beautifully
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        canvas.width = entry.contentRect.width * window.devicePixelRatio;
        canvas.height = entry.contentRect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    // Set canvas dimensions initially
    canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth * window.devicePixelRatio : 300 * window.devicePixelRatio;
    canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight * window.devicePixelRatio : 80 * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const analyser = audioEngine.getAnalyserNode();
    const bufferLength = analyser ? analyser.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;

      // Request next frame
      animationRef.current = requestAnimationFrame(draw);

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        // Create idle/mock wave if it's not playing so the UI still looks alive but elegant
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = Math.max(0, dataArray[i] - 4); // Fade out
          // Insert a tiny wave so there is a soft, resting flow
          const wave = Math.sin(Date.now() * 0.003 + i * 0.15) * 4 + 4;
          dataArray[i] = Math.max(dataArray[i], wave);
        }
      }

      ctx.clearRect(0, 0, w, h);

      // We will draw modern, dual-sided sleek rounded columns with glow
      const barWidth = (w / (bufferLength * 0.7)) * 1.0;
      let barHeight;
      let x = 0;

      // Draw linear/apple style audio frequency bars
      for (let i = 0; i < bufferLength * 0.72; i++) {
        const val = dataArray[i];
        
        // Scale values to fit canvas height comfortably
        const percent = val / 255;
        barHeight = percent * h * 0.85;
        if (barHeight < 3) barHeight = 3; // resting height

        // Dual-ended reflection looks incredibly professional
        const yCenter = h / 2;
        
        ctx.save();
        
        // Modern glow shadow
        ctx.shadowBlur = isPlaying ? 10 : 2;
        ctx.shadowColor = themeColor;
        
        // Gradient fill for bars
        const grad = ctx.createLinearGradient(x, yCenter - barHeight / 2, x, yCenter + barHeight / 2);
        grad.addColorStop(0, 'rgba(255, 27, 107, 0.45)');
        grad.addColorStop(0.5, themeColor);
        grad.addColorStop(1, 'rgba(69, 202, 255, 0.45)');
        
        ctx.fillStyle = grad;
        
        // Rounded bar columns
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, yCenter - barHeight / 2, barWidth * 0.72, barHeight, 3);
        } else {
          ctx.rect(x, yCenter - barHeight / 2, barWidth * 0.72, barHeight);
        }
        ctx.fill();
        ctx.restore();

        x += barWidth;
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [isPlaying, themeColor]);

  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none" id="audio-visualizer-container">
      <canvas ref={canvasRef} className="w-full h-full block opacity-75" />
    </div>
  );
}
