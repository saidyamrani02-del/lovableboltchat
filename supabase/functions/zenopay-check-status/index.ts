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

    const { order_id } = await req.json();

    if (!order_id) {
      throw new Error('Order ID is required');
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

    console.log('[ZENOPAY] Checking status for order:', order_id);

    const statusResponse = await fetch(
      `${ZP_BASE_URL}/order-status?order_id=${encodeURIComponent(order_id)}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': ZP_API_KEY,
        },
      }
    );

    const statusData = await statusResponse.json();
    console.log('[ZENOPAY] Status response:', statusData);

    if (!statusResponse.ok) {
      throw new Error(statusData.message || 'Failed to check order status');
    }

    // Parse the response
    let payment_status = 'PENDING';
    let amount = 0;

    if (statusData.result === 'SUCCESS' && statusData.data && statusData.data.length > 0) {
      const orderData = statusData.data[0];
      payment_status = orderData.payment_status || 'PENDING';
      amount = parseFloat(orderData.amount || 0);
      
      // If payment completed, update user balance
      if (payment_status === 'COMPLETED') {
        console.log('[ZENOPAY] Payment completed, updating balance');
        
        // Get current wallet
        const { data: wallet } = await supabaseClient
          .from('wallets')
          .select('account_balance')
          .eq('user_id', user.id)
          .single();

        const newBalance = (wallet?.account_balance || 0) + amount;

        // Update wallet
        await supabaseClient
          .from('wallets')
          .update({ account_balance: newBalance })
          .eq('user_id', user.id);

        // Update topup history status by order_id to avoid updating multiple records
        await supabaseClient
          .from('topup_history')
          .update({ status: 'completed' })
          .eq('order_id', order_id)
          .eq('status', 'pending');

        console.log('[ZENOPAY] Balance updated:', { oldBalance: wallet?.account_balance, newBalance });
      } else if (payment_status === 'FAILED') {
        // Update topup history status to failed by order_id
        await supabaseClient
          .from('topup_history')
          .update({ status: 'failed' })
          .eq('order_id', order_id)
          .eq('status', 'pending');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_status,
        amount,
        raw_data: statusData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ZENOPAY] Status check error:', error);
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
