// Supabase Newsletter Management
class SupabaseNewsletter {
    constructor() {
        this.supabase = null;
        this.initialize();
    }

    async initialize() {
        // Load Supabase client
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
        
        this.supabase = createClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.publishableKey
        );
    }

    // Add a new subscriber
    async addSubscriber(email, name = null) {
        try {
            const { data, error } = await this.supabase
                .from('newsletter_subscribers')
                .insert({
                    email: email,
                    name: name,
                    subscribed_at: new Date().toISOString(),
                    status: 'active'
                });

            if (error) {
                if (error.code === '23505') { // Unique constraint violation
                    throw new Error('This email is already subscribed!');
                }
                throw error;
            }

            // Send welcome email
            await this.sendWelcomeEmail(email, name);

            return {
                success: true,
                message: 'Successfully subscribed! Check your email for a welcome message.'
            };

        } catch (error) {
            console.error('Error adding subscriber:', error);
            throw error;
        }
    }

    // Send welcome email via auto-reply function
    async sendWelcomeEmail(email, name) {
        try {
            const response = await fetch('/.netlify/functions/auto-reply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    name: name
                })
            });

            if (!response.ok) {
                console.warn('Welcome email failed to send, but subscription was successful');
            }

        } catch (error) {
            console.warn('Welcome email error:', error);
            // Don't throw - subscription should still succeed even if welcome email fails
        }
    }

    // Send newsletter to all subscribers
    async sendNewsletter(post, newsletterId) {
        try {
            // Get all active subscribers
            const { data: subscribers, error } = await this.supabase
                .from('newsletter_subscribers')
                .select('email, name')
                .eq('status', 'active');

            if (error) throw error;

            if (!subscribers || subscribers.length === 0) {
                return { sent: 0, failed: 0, total: 0 };
            }

            // Send via serverless function
            const response = await fetch('/.netlify/functions/send-newsletter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    newsletterId: newsletterId,
                    post: post,
                    subscribers: subscribers
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send newsletter');
            }

            const result = await response.json();
            return result;

        } catch (error) {
            console.error('Error sending newsletter:', error);
            throw error;
        }
    }

    // Track email open
    async trackEmailOpen(email, newsletterId) {
        try {
            await fetch('/.netlify/functions/track-email-opens', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'open',
                    email: email,
                    newsletterId: newsletterId
                })
            });
        } catch (error) {
            console.warn('Failed to track email open:', error);
        }
    }

    // Track email click
    async trackEmailClick(email, newsletterId, link) {
        try {
            await fetch('/.netlify/functions/track-email-opens', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'click',
                    email: email,
                    newsletterId: newsletterId,
                    link: link
                })
            });
        } catch (error) {
            console.warn('Failed to track email click:', error);
        }
    }

    // Get newsletter analytics
    async getNewsletterStats(newsletterId = null) {
        try {
            let query = this.supabase
                .from('newsletter_analytics')
                .select('*');

            if (newsletterId) {
                query = query.eq('newsletter_id', newsletterId);
            }

            const { data, error } = await query;
            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error getting newsletter stats:', error);
            throw error;
        }
    }

    // Get subscriber analytics
    async getSubscriberStats() {
        try {
            const { data, error } = await this.supabase
                .from('newsletter_subscribers')
                .select('*')
                .eq('status', 'active');

            if (error) throw error;

            const stats = {
                total: data.length,
                active: data.filter(s => s.status === 'active').length,
                withOpens: data.filter(s => s.total_opens > 0).length,
                withClicks: data.filter(s => s.total_clicks > 0).length,
                avgOpens: data.reduce((sum, s) => sum + (s.total_opens || 0), 0) / data.length,
                avgClicks: data.reduce((sum, s) => sum + (s.total_clicks || 0), 0) / data.length
            };

            return stats;
        } catch (error) {
            console.error('Error getting subscriber stats:', error);
            throw error;
        }
    }

    // Unsubscribe a user
    async unsubscribe(email) {
        try {
            const { error } = await this.supabase
                .from('newsletter_subscribers')
                .update({
                    status: 'unsubscribed',
                    unsubscribed_at: new Date().toISOString()
                })
                .eq('email', email);

            if (error) throw error;

            return { success: true, message: 'Successfully unsubscribed' };
        } catch (error) {
            console.error('Error unsubscribing:', error);
            throw error;
        }
    }

    // Resubscribe a user
    async resubscribe(email) {
        try {
            const { error } = await this.supabase
                .from('newsletter_subscribers')
                .update({
                    status: 'active',
                    resubscribed_at: new Date().toISOString()
                })
                .eq('email', email);

            if (error) throw error;

            return { success: true, message: 'Successfully resubscribed' };
        } catch (error) {
            console.error('Error resubscribing:', error);
            throw error;
        }
    }

    // Get all subscribers (for admin)
    async getAllSubscribers() {
        try {
            const { data, error } = await this.supabase
                .from('newsletter_subscribers')
                .select('*')
                .order('subscribed_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting subscribers:', error);
            throw error;
        }
    }
} 