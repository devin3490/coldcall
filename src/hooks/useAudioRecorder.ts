import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UseAudioRecorderReturn {
  isRecording: boolean;
  audioLevel: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<{ url: string; blob: Blob } | null>;
  uploadRecording: (blob: Blob, leadId: string) => Promise<string | null>;
  triggerTranscription: (recordingUrl: string, leadId: string) => Promise<void>;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    setAudioLevel(average / 255);
    
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio analysis for visual feedback
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      // Start visual level monitoring
      updateAudioLevel();
      
      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      
      console.log('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }, [updateAudioLevel]);

  const stopRecording = useCallback(async (): Promise<{ url: string; blob: Blob } | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(null);
        return;
      }
      
      // Stop audio level monitoring
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        
        // Stop all tracks
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
        
        setIsRecording(false);
        setAudioLevel(0);
        
        console.log('Recording stopped, blob size:', blob.size);
        resolve({ url, blob });
      };
      
      mediaRecorderRef.current.stop();
    });
  }, []);

  const uploadRecording = useCallback(async (blob: Blob, leadId: string): Promise<string | null> => {
    if (!user?.id) return null;
    
    try {
      const fileName = `${user.id}/${leadId}_${Date.now()}.webm`;
      
      const { data, error } = await supabase.storage
        .from('recordings')
        .upload(fileName, blob, {
          contentType: 'audio/webm',
          upsert: false
        });
      
      if (error) {
        console.error('Error uploading recording:', error);
        throw error;
      }
      
      // Return the file path (not public URL since bucket is private)
      // We'll generate signed URLs when needed for playback
      console.log('Recording uploaded:', data.path);
      return data.path;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  }, [user?.id]);

  const triggerTranscription = useCallback(async (recordingUrl: string, leadId: string) => {
    try {
      console.log('Triggering transcription for lead:', leadId);
      
      const { error } = await supabase.functions.invoke('transcribe-audio', {
        body: { recording_url: recordingUrl, lead_id: leadId }
      });
      
      if (error) {
        console.error('Transcription trigger error:', error);
      }
    } catch (error) {
      console.error('Error triggering transcription:', error);
    }
  }, []);

  return {
    isRecording,
    audioLevel,
    startRecording,
    stopRecording,
    uploadRecording,
    triggerTranscription
  };
}
