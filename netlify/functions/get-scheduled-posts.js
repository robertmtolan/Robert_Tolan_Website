const fs = require('fs').promises;
const path = require('path');

exports.handler = async function(event, context) {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Read scheduled posts
    const scheduledPostsPath = path.join(process.cwd(), 'scheduled-posts.json');
    let scheduledPosts = [];
    
    try {
      const data = await fs.readFile(scheduledPostsPath, 'utf8');
      scheduledPosts = JSON.parse(data);
    } catch (error) {
      // File doesn't exist, return empty array
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ 
          scheduledPosts: [],
          count: 0
        })
      };
    }

    // Sort by scheduled time (earliest first)
    scheduledPosts.sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ 
        scheduledPosts: scheduledPosts,
        count: scheduledPosts.length
      })
    };

  } catch (error) {
    console.error('Error getting scheduled posts:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ 
        error: 'Failed to get scheduled posts',
        details: error.message 
      })
    };
  }
}; 