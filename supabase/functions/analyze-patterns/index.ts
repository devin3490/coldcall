import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get caller_id from request
    const { caller_id } = await req.json();
    
    if (!caller_id) {
      throw new Error('Missing caller_id');
    }

    console.log(`Analyzing patterns for caller ${caller_id}`);

    // Fetch all completed leads with transcripts for this caller
    const { data: leads, error: fetchError } = await supabase
      .from('leads')
      .select('id, call_result, transcript, call_duration, notes')
      .eq('assigned_to', caller_id)
      .eq('status', 'completed')
      .not('transcript', 'is', null)
      .not('transcript', 'eq', '');

    if (fetchError) {
      console.error('Error fetching leads:', fetchError);
      throw fetchError;
    }

    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          analysis: null,
          message: 'Aucun transcript disponible pour analyse' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${leads.length} leads with transcripts`);

    // Separate by outcome
    const interestedLeads = leads.filter(l => 
      l.call_result === 'answered_interested' || l.call_result === 'answered_closed'
    );
    const notInterestedLeads = leads.filter(l => 
      l.call_result === 'answered_not_interested'
    );

    // Prepare transcripts for analysis
    const interestedTranscripts = interestedLeads.map(l => l.transcript).join('\n\n---APPEL SUIVANT---\n\n');
    const notInterestedTranscripts = notInterestedLeads.map(l => l.transcript).join('\n\n---APPEL SUIVANT---\n\n');

    const systemPrompt = `Tu es un expert en analyse de ventes et de télémarketing. Tu analyses des transcripts d'appels téléphoniques pour identifier les patterns qui mènent au succès ou à l'échec.

Tu dois fournir une analyse structurée en identifiant:
1. Les patterns récurrents dans les appels réussis (leads intéressés)
2. Les patterns récurrents dans les appels non réussis (leads pas intéressés)
3. Des conseils concrets et actionnables pour améliorer les performances

Sois précis, cite des exemples de phrases ou comportements spécifiques quand c'est possible.
Réponds TOUJOURS en français.`;

    const userPrompt = `Analyse ces transcripts d'appels téléphoniques pour identifier les patterns de succès et d'échec.

=== APPELS RÉUSSIS (${interestedLeads.length} appels - leads intéressés ou ayant conclu) ===
${interestedTranscripts || 'Aucun transcript disponible pour cette catégorie'}

=== APPELS NON RÉUSSIS (${notInterestedLeads.length} appels - leads pas intéressés) ===
${notInterestedTranscripts || 'Aucun transcript disponible pour cette catégorie'}

Fournis ton analyse avec la structure suivante:

## 🎯 Ce qui fonctionne bien (patterns des appels réussis)
- Liste les éléments récurrents qui semblent contribuer au succès

## ⚠️ Ce qui peut être amélioré (patterns des appels non réussis)
- Liste les éléments récurrents dans les appels qui n'ont pas abouti

## 💡 Conseils d'amélioration
- Donne 3-5 conseils concrets et actionnables basés sur cette analyse

## 📊 Statistiques clés
- Résume les chiffres importants (taux de succès, durées moyennes observées, etc.)`;

    console.log('Sending request to Lovable AI...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Trop de requêtes. Réessayez dans quelques minutes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crédits AI épuisés. Contactez l\'administrateur.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const analysis = aiResponse.choices?.[0]?.message?.content || 'Analyse non disponible';

    console.log('Analysis complete');

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis,
        stats: {
          total_analyzed: leads.length,
          interested_count: interestedLeads.length,
          not_interested_count: notInterestedLeads.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Pattern analysis error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
