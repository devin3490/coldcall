import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the cutoff time (8 hours ago)
    const eightHoursAgo = new Date();
    eightHoursAgo.setHours(eightHoursAgo.getHours() - 8);
    const cutoffTime = eightHoursAgo.toISOString();

    console.log(`Closing orphan sessions started before: ${cutoffTime}`);

    // Find and close all sessions that:
    // 1. Have no end_time (still "open")
    // 2. Started more than 8 hours ago
    const { data: orphanSessions, error: selectError } = await supabase
      .from('sessions')
      .select('id, caller_id, start_time')
      .is('end_time', null)
      .lt('start_time', cutoffTime);

    if (selectError) {
      console.error('Error fetching orphan sessions:', selectError);
      throw selectError;
    }

    console.log(`Found ${orphanSessions?.length || 0} orphan sessions to close`);

    if (orphanSessions && orphanSessions.length > 0) {
      const sessionIds = orphanSessions.map(s => s.id);
      
      // Close all orphan sessions by setting end_time to 8 hours after start_time
      // This gives a more accurate session duration
      for (const session of orphanSessions) {
        const sessionStart = new Date(session.start_time);
        const estimatedEndTime = new Date(sessionStart.getTime() + 8 * 60 * 60 * 1000);
        
        const { error: updateError } = await supabase
          .from('sessions')
          .update({ end_time: estimatedEndTime.toISOString() })
          .eq('id', session.id);

        if (updateError) {
          console.error(`Error closing session ${session.id}:`, updateError);
        } else {
          console.log(`Closed session ${session.id} for caller ${session.caller_id}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        closedCount: orphanSessions?.length || 0,
        message: `Closed ${orphanSessions?.length || 0} orphan sessions`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in close-orphan-sessions:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
