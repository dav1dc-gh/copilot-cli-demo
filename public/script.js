document.getElementById('feedbackForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const messageDiv = document.getElementById('message');
    const submitBtn = e.target.querySelector('.submit-btn');
    
    // Get form data
    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        rating: document.getElementById('rating').value,
        hearAboutUs: document.getElementById('hearAboutUs').value,
        comments: document.getElementById('comments').value
    };
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    
    try {
        const response = await fetch('/submit-feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            messageDiv.className = 'message success';
            messageDiv.textContent = data.message;
            
            // Reset form
            document.getElementById('feedbackForm').reset();
        } else {
            messageDiv.className = 'message error';
            messageDiv.textContent = data.message || 'An error occurred. Please try again.';
        }
    } catch (error) {
        messageDiv.className = 'message error';
        messageDiv.textContent = 'Failed to submit feedback. Please try again later.';
        console.error('Error:', error);
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Feedback';
        
        // Hide message after 5 seconds
        setTimeout(() => {
            messageDiv.className = 'message';
        }, 5000);
    }
});
