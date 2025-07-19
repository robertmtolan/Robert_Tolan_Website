const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    // Handle CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        const { type, email, newsletterId, link } = JSON.parse(event.body);

        // Initialize Supabase client
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase credentials not configured');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Track different types of events
        switch (type) {
            case 'open':
                await trackEmailOpen(supabase, email, newsletterId);
                break;
            case 'click':
                await trackEmailClick(supabase, email, newsletterId, link);
                break;
            default:
                throw new Error('Invalid event type');
        }

        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ success: true })
        };

    } catch (error) {
        console.error('Error tracking email event:', error);
        return {
            statusCode: 500,
            headers: {
                ...headers,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ error: error.message })
        };
    }
};

// Track email opens
async function trackEmailOpen(supabase, email, newsletterId) {
    const { data, error } = await supabase
        .from('newsletter_analytics')
        .upsert({
            email: email,
            newsletter_id: newsletterId,
            opened_at: new Date().toISOString(),
            opened: true
        }, {
            onConflict: 'email,newsletter_id'
        });

    if (error) {
        console.error('Error tracking email open:', error);
        throw error;
    }

    // Also update the subscriber's overall stats
    await supabase
        .from('newsletter_subscribers')
        .update({
            total_opens: supabase.sql`total_opens + 1`,
            last_opened: new Date().toISOString()
        })
        .eq('email', email);
}

// Track email clicks
async function trackEmailClick(supabase, email, newsletterId, link) {
    const { data, error } = await supabase
        .from('newsletter_clicks')
        .insert({
            email: email,
            newsletter_id: newsletterId,
            link: link,
            clicked_at: new Date().toISOString()
        });

    if (error) {
        console.error('Error tracking email click:', error);
        throw error;
    }

    // Update subscriber's click stats
    await supabase
        .from('newsletter_subscribers')
        .update({
            total_clicks: supabase.sql`total_clicks + 1`,
            last_clicked: new Date().toISOString()
        })
        .eq('email', email);
} 