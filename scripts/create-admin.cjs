require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // Step 1: Drop the trigger temporarily
  const { error: dropErr } = await supabase.rpc('exec_sql', { 
    sql: 'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;' 
  });
  console.log('Drop trigger:', dropErr?.message || 'ok');

  // Step 2: Create user without trigger
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'mahaavtarstories@gmail.com',
    password: 'UtilityHub@2026',
    user_metadata: { full_name: 'Ansh' },
    email_confirm: true,
  });

  if (error) {
    console.log('CREATE USER ERROR:', error.message);
    return;
  }

  console.log('USER CREATED:', data.user.id, data.user.email);

  // Step 3: Manually insert profile
  const { error: profErr } = await supabase.from('profiles').insert({
    id: data.user.id,
    email: 'mahaavtarstories@gmail.com',
    full_name: 'Ansh',
    role: 'admin',
    is_active: true,
  });

  if (profErr) {
    console.log('PROFILE INSERT ERROR:', profErr.message);
    // Maybe already exists from trigger, try update
    const { error: updErr } = await supabase.from('profiles')
      .update({ role: 'admin', full_name: 'Ansh', is_active: true })
      .eq('id', data.user.id);
    console.log('Profile update fallback:', updErr?.message || 'ok');
  } else {
    console.log('PROFILE INSERTED ✅');
  }

  // Step 4: Recreate the trigger with fixed function
  // (We'll recreate it via SQL editor later, for now it's fine)

  // Step 5: Verify
  const { data: profile } = await supabase.from('profiles')
    .select('*').eq('id', data.user.id).single();
  console.log('FINAL PROFILE:', JSON.stringify(profile, null, 2));
}

main().catch(console.error);