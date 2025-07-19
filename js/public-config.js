// Public Configuration for Live Site
// This file contains only the necessary public keys for client-side use

const SUPABASE_CONFIG = {
    // Project URL
    url: 'https://ybdpufjrreynhnxvyqlr.supabase.co',
    
    // Public API Key (safe for client-side)
    publishableKey: 'sb_publishable_EYsBgZNPeJ24cjheSRKh0g_APLZOXEb'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SUPABASE_CONFIG };
} 