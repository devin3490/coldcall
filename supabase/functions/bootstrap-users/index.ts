import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if any admin exists
    const { data: existingAdmins, error: checkError } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('role', 'admin')
      .limit(1);

    if (checkError) {
      console.error('Check error:', checkError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la vérification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingAdmins && existingAdmins.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Le bootstrap a déjà été effectué' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const users = [
      { email: 'Bafing@tdia.com', password: 'Mbappecr7', name: 'Bafing', role: 'admin', must_change_password: false },
      { email: 'francis@coldcall.com', password: '123456', name: 'Francis', role: 'caller', must_change_password: true },
      { email: 'mathis@coldcall.com', password: '123456', name: 'Mathis', role: 'caller', must_change_password: true },
      { email: 'test@coldcaller.com', password: '123456', name: 'Test Caller', role: 'caller', must_change_password: true },
    ];

    const results = [];

    for (const user of users) {
      console.log(`Creating user: ${user.email} with role: ${user.role}`);

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { name: user.name, role: user.role }
      });

      if (createError) {
        console.error(`Error creating ${user.email}:`, createError);
        results.push({ email: user.email, success: false, error: createError.message });
        continue;
      }

      // Update must_change_password flag
      if (user.must_change_password && newUser.user) {
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ must_change_password: true })
          .eq('id', newUser.user.id);

        if (updateError) {
          console.error(`Error updating must_change_password for ${user.email}:`, updateError);
        }
      }

      console.log(`User created: ${newUser.user?.id}`);
      results.push({ 
        email: user.email, 
        success: true, 
        id: newUser.user?.id,
        role: user.role 
      });
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
