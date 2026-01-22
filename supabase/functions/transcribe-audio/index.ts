import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GLADIA_API_KEY = Deno.env.get('GLADIA_API_KEY');
    if (!GLADIA_API_KEY) {
      throw new Error('GLADIA_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { recording_url, lead_id } = await req.json();
    
    if (!recording_url || !lead_id) {
      throw new Error('Missing recording_url or lead_id');
    }

    console.log(`Starting transcription for lead ${lead_id}`);
    console.log(`Recording path/URL: ${recording_url}`);

    // Step 1: Download the audio file from Supabase storage
    // Extract the file path from the URL or use it directly
    let filePath = recording_url;
    
    // Handle both old URL format and new path format
    if (recording_url.includes('/storage/v1/object/public/recordings/')) {
      filePath = recording_url.split('/storage/v1/object/public/recordings/')[1];
    } else if (recording_url.includes('/storage/v1/object/recordings/')) {
      filePath = recording_url.split('/storage/v1/object/recordings/')[1];
    }
    
    console.log(`Downloading file from path: ${filePath}`);
    
    // Download using Supabase client (works for private buckets with service role)
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('recordings')
      .download(filePath);
    
    if (downloadError) {
      console.error('Download error:', downloadError);
      throw new Error(`Failed to download audio: ${downloadError.message}`);
    }
    
    if (!fileData) {
      throw new Error('No audio data received');
    }
    
    console.log(`Audio downloaded, size: ${fileData.size} bytes`);

    // Step 2: Upload audio file to Gladia
    const formData = new FormData();
    formData.append('audio', fileData, 'recording.webm');

    console.log('Uploading to Gladia...');
    const uploadResponse = await fetch('https://api.gladia.io/v2/upload', {
      method: 'POST',
      headers: {
        'x-gladia-key': GLADIA_API_KEY,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Gladia upload error:', errorText);
      throw new Error(`Gladia upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    const uploadData = await uploadResponse.json();
    const audioUrl = uploadData.audio_url;
    
    console.log('Audio uploaded to Gladia:', audioUrl);

    // Step 3: Request transcription via pre-recorded endpoint
    console.log('Requesting transcription...');
    const transcriptionResponse = await fetch('https://api.gladia.io/v2/pre-recorded', {
      method: 'POST',
      headers: {
        'x-gladia-key': GLADIA_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        language: 'fr',
      }),
    });

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error('Gladia transcription request error:', errorText);
      throw new Error(`Gladia transcription request failed: ${transcriptionResponse.status} - ${errorText}`);
    }

    const transcriptionData = await transcriptionResponse.json();
    const transcriptionId = transcriptionData.id;
    const resultUrl = transcriptionData.result_url;
    
    console.log('Transcription initiated, ID:', transcriptionId);
    console.log('Result URL:', resultUrl);

    // Step 4: Poll for result
    let transcript = '';
    let attempts = 0;
    const maxAttempts = 60; // Max 5 minutes (5 second intervals)

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      console.log(`Polling attempt ${attempts + 1}...`);
      
      const resultResponse = await fetch(resultUrl, {
        headers: {
          'x-gladia-key': GLADIA_API_KEY,
        },
      });

      if (!resultResponse.ok) {
        const errorText = await resultResponse.text();
        console.error('Error fetching result:', errorText);
        attempts++;
        continue;
      }

      const resultData = await resultResponse.json();
      console.log('Poll result status:', resultData.status);
      
      if (resultData.status === 'done') {
        transcript = resultData.result?.transcription?.full_transcript || '';
        console.log('Transcription complete, length:', transcript.length);
        console.log('Transcript preview:', transcript.substring(0, 200));
        break;
      } else if (resultData.status === 'error') {
        throw new Error(`Transcription failed: ${resultData.error || 'Unknown error'}`);
      }
      
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error('Transcription timed out after 5 minutes');
    }

    // Step 5: Update lead with transcript
    const { error: updateError } = await supabase
      .from('leads')
      .update({ transcript })
      .eq('id', lead_id);

    if (updateError) {
      console.error('Error updating lead with transcript:', updateError);
      throw updateError;
    }

    console.log(`Lead ${lead_id} updated with transcript successfully`);

    return new Response(
      JSON.stringify({ success: true, transcript }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Transcription error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
