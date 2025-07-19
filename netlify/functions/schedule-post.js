const fs = require('fs').promises;
const path = require('path');

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
    const { title, content, options, scheduledFor } = body;

    // Validate required fields
    if (!title || !content || !options.urlSlug || !scheduledFor) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ 
          error: 'Missing required fields: title, content, urlSlug, or scheduledFor' 
        })
      };
    }

    // Validate scheduled time is in the future
    const scheduledTime = new Date(scheduledFor);
    const now = new Date();
    
    if (scheduledTime <= now) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ 
          error: 'Scheduled time must be in the future' 
        })
      };
    }

    // Read existing scheduled posts
    const scheduledPostsPath = path.join(process.cwd(), 'scheduled-posts.json');
    let scheduledPosts = [];
    
    try {
      const existingData = await fs.readFile(scheduledPostsPath, 'utf8');
      scheduledPosts = JSON.parse(existingData);
    } catch (error) {
      // File doesn't exist, start with empty array
    }

    // Check if URL slug already exists
    const existingPost = scheduledPosts.find(post => post.urlSlug === options.urlSlug);
    if (existingPost) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ 
          error: 'A post with this URL slug already exists' 
        })
      };
    }

    // Create scheduled post object
    const scheduledPost = {
      id: Date.now().toString(), // Simple ID generation
      title: title,
      content: content,
      urlSlug: options.urlSlug,
      category: options.category || 'general',
      tags: options.tags || [],
      metaDescription: options.metaDescription || title,
      seoKeywords: options.seoKeywords || [],
      scheduledFor: scheduledFor,
      sendNewsletter: options.sendNewsletter || false,
      createdAt: new Date().toISOString()
    };

    // Add to scheduled posts
    scheduledPosts.push(scheduledPost);

    // Save updated scheduled posts
    await fs.writeFile(scheduledPostsPath, JSON.stringify(scheduledPosts, null, 2), 'utf8');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ 
        success: true, 
        message: 'Post scheduled successfully',
        scheduledFor: scheduledFor,
        postId: scheduledPost.id
      })
    };

  } catch (error) {
    console.error('Error scheduling post:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ 
        error: 'Failed to schedule post',
        details: error.message 
      })
    };
  }
}; 