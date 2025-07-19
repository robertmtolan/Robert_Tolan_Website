const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { newsletterId, post, subscribers } = JSON.parse(event.body);

        // Initialize Supabase client
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase credentials not configured');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // For now, we'll use a simple email service like Resend or SendGrid
        // You can choose which email service to use based on your preference
        
        // Option 1: Using Resend (recommended - free tier available)
        const emailResults = await sendWithResend(post, subscribers);
        
        // Option 2: Using SendGrid (alternative)
        // const emailResults = await sendWithSendGrid(post, subscribers);

        // Update the newsletter record with results
        await supabase
            .from('newsletter_sends')
            .update({
                sent_count: emailResults.sent,
                failed_count: emailResults.failed,
                completed_at: new Date().toISOString()
            })
            .eq('id', newsletterId);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                success: true,
                sent: emailResults.sent,
                failed: emailResults.failed,
                total: subscribers.length
            })
        };

    } catch (error) {
        console.error('Error sending newsletter:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                error: error.message
            })
        };
    }
};

// Send emails using Resend (recommended)
async function sendWithResend(post, subscribers) {
    const RESEND_API_KEY = process.env.RESEND_API_KEY || 'YOUR_RESEND_API_KEY_HERE';
    
    if (!RESEND_API_KEY || RESEND_API_KEY === 'YOUR_RESEND_API_KEY_HERE') {
        throw new Error('Please configure your Resend API key in Netlify environment variables');
    }

    const emailTemplate = createEmailTemplate(post);
    let sent = 0;
    let failed = 0;

    for (const subscriber of subscribers) {
        try {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: 'Robert Tolan <newsletter@roberttolan.com>',
                    to: subscriber.email,
                    subject: emailTemplate.subject,
                    html: emailTemplate.htmlBody.replace(/{{EMAIL}}/g, subscriber.email),
                    text: emailTemplate.textBody.replace(/{{EMAIL}}/g, subscriber.email)
                })
            });

            if (response.ok) {
                sent++;
            } else {
                failed++;
                console.error(`Failed to send to ${subscriber.email}:`, await response.text());
            }
        } catch (error) {
            failed++;
            console.error(`Error sending to ${subscriber.email}:`, error);
        }
    }

    return { sent, failed };
}

// Send emails using SendGrid (alternative)
async function sendWithSendGrid(post, subscribers) {
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    
    if (!SENDGRID_API_KEY) {
        throw new Error('SendGrid API key not configured');
    }

    const emailTemplate = createEmailTemplate(post);
    let sent = 0;
    let failed = 0;

    for (const subscriber of subscribers) {
        try {
            const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SENDGRID_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    personalizations: [{
                        to: [{ email: subscriber.email }]
                    }],
                    from: { email: 'newsletter@roberttolan.com', name: 'Robert Tolan' },
                    subject: emailTemplate.subject,
                    content: [
                        {
                            type: 'text/html',
                            value: emailTemplate.htmlBody.replace(/{{EMAIL}}/g, subscriber.email)
                        },
                        {
                            type: 'text/plain',
                            value: emailTemplate.textBody.replace(/{{EMAIL}}/g, subscriber.email)
                        }
                    ]
                })
            });

            if (response.ok) {
                sent++;
            } else {
                failed++;
                console.error(`Failed to send to ${subscriber.email}:`, await response.text());
            }
        } catch (error) {
            failed++;
            console.error(`Error sending to ${subscriber.email}:`, error);
        }
    }

    return { sent, failed };
}

// Create email template
function createEmailTemplate(post) {
    const subject = post.title;
    
    // Create tracking pixel for email opens
    const trackingPixel = `<img src="https://roberttolan.com/.netlify/functions/track-email-opens" width="1" height="1" style="display:none;" alt="" />`;
    
    // Create click tracking for links
    const trackClick = (url, email, newsletterId) => {
        return `https://roberttolan.com/.netlify/functions/track-email-opens?type=click&email=${encodeURIComponent(email)}&newsletterId=${newsletterId}&link=${encodeURIComponent(url)}`;
    };
    
    const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${post.title}</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa; }
                .container { background: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { text-align: center; margin-bottom: 30px; }
                .content { margin-bottom: 30px; }
                .footer { text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
                .post-title { font-size: 24px; color: #8B008B; margin-bottom: 15px; }
                .post-meta { font-size: 14px; color: #666; margin-bottom: 20px; }
                .read-more { display: inline-block; background: #8B008B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
                .unsubscribe { font-size: 11px; color: #999; }
                .highlight { background: linear-gradient(120deg, #8B008B, #9370DB); color: white; padding: 15px 20px; border-radius: 6px; margin: 20px 0; }
            </style>
        </head>
        <body>
            ${trackingPixel}
            <div class="container">
                <div class="header">
                    <h1 style="color: #8B008B; margin: 0;">Robert Tolan</h1>
                    <p style="margin: 5px 0; color: #666;">Latest thoughts and insights</p>
                </div>
                
                <div class="content">
                    <h2 class="post-title">${post.title}</h2>
                    <div class="post-meta">
                        <span>${new Date(post.date).toLocaleDateString()}</span>
                        ${post.tags && post.tags.length > 0 ? `<span> • Tags: ${post.tags.join(', ')}</span>` : ''}
                </div>
                
                <div class="post-excerpt">
                    ${createExcerpt(post.content)}
                </div>
                
                <p style="text-align: center; margin-top: 30px;">
                    <a href="https://roberttolan.com/posts.html#${post.id}" class="read-more">Read Full Post</a>
                </p>
            </div>
            
            <div class="footer">
                <p>You're receiving this because you subscribed to Robert Tolan's newsletter.</p>
                <p class="unsubscribe">
                    <a href="https://roberttolan.com/unsubscribe?email={{EMAIL}}">Unsubscribe</a> | 
                    <a href="https://roberttolan.com">View in browser</a>
                </p>
            </div>
        </body>
        </html>
    `;

    const textBody = `
Robert Tolan - ${post.title}

${createTextExcerpt(post.content)}

Read the full post: https://roberttolan.com/posts.html#${post.id}

---
You're receiving this because you subscribed to Robert Tolan's newsletter.
Unsubscribe: https://roberttolan.com/unsubscribe?email={{EMAIL}}
    `;

    return { subject, htmlBody, textBody };
}

// Create excerpt from content
function createExcerpt(content, maxLength = 300) {
    const textContent = content.replace(/<[^>]*>/g, '');
    if (textContent.length <= maxLength) {
        return content;
    }
    
    const excerpt = textContent.substring(0, maxLength);
    const lastSpace = excerpt.lastIndexOf(' ');
    return excerpt.substring(0, lastSpace) + '...';
}

// Create text excerpt
function createTextExcerpt(content, maxLength = 200) {
    const textContent = content.replace(/<[^>]*>/g, '');
    if (textContent.length <= maxLength) {
        return textContent;
    }
    
    const excerpt = textContent.substring(0, maxLength);
    const lastSpace = excerpt.lastIndexOf(' ');
    return excerpt.substring(0, lastSpace) + '...';
} 