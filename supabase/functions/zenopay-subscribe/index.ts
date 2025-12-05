import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PACKAGE_PRICES = {
  'SILVER': 9000,
  'GOLD': 25000,
  'DIAMOND': 50000,
  'PLATINUM': 100000,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { phone, package: subscriptionPackage } = await req.json();

    if (!phone || !subscriptionPackage) {
      throw new Error('Phone and package are required');
    }

    if (!PACKAGE_PRICES[subscriptionPackage as keyof typeof PACKAGE_PRICES]) {
      throw new Error('Invalid subscription package');
    }

    const amount = PACKAGE_PRICES[subscriptionPackage as keyof typeof PACKAGE_PRICES];

    // Convert phone from 0712345678 to 255712345678
    let formattedPhone = phone.trim();
    if (formattedPhone.match(/^0\d{9}$/)) {
      formattedPhone = "255" + formattedPhone.substring(1);
    }

    // Use service role to fetch API settings (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: apiSettings } = await supabaseAdmin
      .from('api_settings')
      .select('zenopay_api_key')
      .single();

    if (!apiSettings?.zenopay_api_key) {
      throw new Error('ZenoPay API key not configured');
    }

    const ZP_API_KEY = apiSettings.zenopay_api_key;
    const ZP_BASE_URL = 'https://zenoapi.com/api/payments';

    // Generate unique order ID
    const orderId = `sub_${user.id}_${subscriptionPackage}_${Date.now()}`;

    // Create payment order
    const orderData = {
      order_id: orderId,
      buyer_email: user.email || 'customer@example.com',
      buyer_name: user.email?.split('@')[0] || 'User',
      buyer_phone: formattedPhone,
      amount: amount,
    };

    console.log('[ZENOPAY-SUB] Creating order:', orderData);

    const createResponse = await fetch(`${ZP_BASE_URL}/mobile_money_tanzania`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ZP_API_KEY,
      },
      body: JSON.stringify(orderData),
    });

    const createData = await createResponse.json();
    console.log('[ZENOPAY-SUB] Create response:', createData);

    if (!createResponse.ok || createData.status !== 'success') {
      throw new Error(createData.message || 'Failed to create payment order');
    }

    // Save to subscription_payments
    await supabaseClient.from('subscription_payments').insert({
      user_id: user.id,
      package: subscriptionPackage,
      amount: amount,
      phone_number: formattedPhone,
      order_id: orderId,
      status: 'pending',
    });

    return new Response(
      JSON.stringify({
        success: true,
        order_id: createData.order_id,
        message: 'Payment request sent. Please check your phone to complete payment.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ZENOPAY-SUB] Error:', error);
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
