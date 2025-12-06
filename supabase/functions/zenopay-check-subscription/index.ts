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

    // Use service role to fetch API settings
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

    console.log('[ZENOPAY-SUB-CHECK] Checking status for order:', order_id);

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
    console.log('[ZENOPAY-SUB-CHECK] Status response:', statusData);

    if (!statusResponse.ok) {
      throw new Error(statusData.message || 'Failed to check order status');
    }

    let payment_status = 'PENDING';
    let amount = 0;
    let subscriptionPackage = '';

    if (statusData.result === 'SUCCESS' && statusData.data && statusData.data.length > 0) {
      const orderData = statusData.data[0];
      payment_status = orderData.payment_status || 'PENDING';
      amount = parseFloat(orderData.amount || 0);
      
      // If payment completed, create subscription
      if (payment_status === 'COMPLETED') {
        console.log('[ZENOPAY-SUB-CHECK] Payment completed, creating subscription');
        
        // Get subscription payment details
        const { data: subPayment } = await supabaseClient
          .from('subscription_payments')
          .select('package')
          .eq('order_id', order_id)
          .single();

        if (subPayment) {
          subscriptionPackage = subPayment.package;
          
          // Create subscription (30 days from now)
          const startDate = new Date();
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 30);

          const { data: subscription } = await supabaseClient
            .from('subscriptions')
            .insert({
              user_id: user.id,
              package: subscriptionPackage,
              start_date: startDate.toISOString(),
              end_date: endDate.toISOString(),
              is_active: true,
              amount_paid: amount,
            })
            .select()
            .single();

          // Update payment status and link to subscription
          await supabaseClient
            .from('subscription_payments')
            .update({ 
              status: 'completed',
              payment_id: subscription?.id 
            })
            .eq('order_id', order_id);

          console.log('[ZENOPAY-SUB-CHECK] Subscription created:', subscription);
        }
      } else if (payment_status === 'FAILED') {
        // Update payment status to failed
        await supabaseClient
          .from('subscription_payments')
          .update({ status: 'failed' })
          .eq('order_id', order_id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_status,
        amount,
        package: subscriptionPackage,
        raw_data: statusData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ZENOPAY-SUB-CHECK] Error:', error);
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
