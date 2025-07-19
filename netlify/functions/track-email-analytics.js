const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the request body
    const body = JSON.parse(event.body);
    const { emailId, eventType, subscriberId, postId } = body;

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create analytics record
    const { data, error } = await supabase
      .from('email_analytics')
      .insert({
        email_id: emailId,
        event_type: eventType, // 'open', 'click', 'unsubscribe'
        subscriber_id: subscriberId,
        post_id: postId,
        timestamp: new Date().toISOString(),
        user_agent: event.headers['user-agent'] || null,
        ip_address: event.headers['client-ip'] || event.headers['x-forwarded-for'] || null
      });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ 
        success: true, 
        message: 'Analytics event tracked successfully',
        data: data 
      })
    };

  } catch (error) {
    console.error('Error tracking analytics:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ 
        error: 'Failed to track analytics event',
        details: error.message 
      })
    };
  }
}; 