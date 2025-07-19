const fs = require('fs').promises;
const path = require('path');

exports.handler = async function(event, context) {
  // Only allow DELETE requests
  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the request body
    const body = JSON.parse(event.body);
    const { postId } = body;

    // Validate required fields
    if (!postId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ 
          error: 'Missing required field: postId' 
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
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ 
          error: 'No scheduled posts found' 
        })
      };
    }

    // Find and remove the post
    const postIndex = scheduledPosts.findIndex(post => post.id === postId);
    if (postIndex === -1) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ 
          error: 'Scheduled post not found' 
        })
      };
    }

    const deletedPost = scheduledPosts[postIndex];
    scheduledPosts.splice(postIndex, 1);

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
        message: 'Scheduled post deleted successfully',
        deletedPost: deletedPost
      })
    };

  } catch (error) {
    console.error('Error deleting scheduled post:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ 
        error: 'Failed to delete scheduled post',
        details: error.message 
      })
    };
  }
}; 