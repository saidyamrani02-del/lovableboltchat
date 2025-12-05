import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { phone } = await req.json();

    if (!phone) {
      throw new Error('Phone number is required');
    }

    // Convert phone from 0712345678 to 255712345678
    let formattedPhone = phone.trim();
    if (formattedPhone.match(/^0\d{9}$/)) {
      formattedPhone = "255" + formattedPhone.substring(1);
    }

    // Find user by phone number
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('id, phone_number, full_name')
      .eq('phone_number', phone)
      .single();

    if (!profile) {
      throw new Error('No user found with this phone number');
    }

    // Generate temporary 6-digit password
    const tempPassword = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Update user's password
    const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
      profile.id,
      { password: tempPassword }
    );

    if (updateError) {
      throw updateError;
    }

    // Fetch NextSMS credentials from API settings
    const { data: apiSettings } = await supabaseClient
      .from('api_settings')
      .select('nextsms_sender_id, nextsms_username, nextsms_password')
      .single();

    if (!apiSettings?.nextsms_username || !apiSettings?.nextsms_password || !apiSettings?.nextsms_sender_id) {
      throw new Error('NextSMS credentials not configured');
    }

    // Send SMS via NextSMS
    const smsPayload = {
      from: apiSettings.nextsms_sender_id,
      to: formattedPhone,
      text: `Your temporary password is ${tempPassword}. Please change it after login.`,
    };

    const auth = btoa(`${apiSettings.nextsms_username}:${apiSettings.nextsms_password}`);

    console.log('[NEXTSMS] Sending SMS to:', formattedPhone);

    const smsResponse = await fetch('https://messaging-service.co.tz/api/sms/v1/text/single', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(smsPayload),
    });

    const smsData = await smsResponse.json();
    console.log('[NEXTSMS] SMS response:', smsData);

    if (!smsResponse.ok) {
      throw new Error(smsData.message || 'Failed to send SMS');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Temporary password sent via SMS',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[PASSWORD_RESET] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
