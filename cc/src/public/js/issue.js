document.addEventListener('DOMContentLoaded', () => {
    const commentForm = document.getElementById('comment-form');
    const updateIssueForm = document.getElementById('update-issue-form');

    if (commentForm) {
        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const content = e.target.elements.content.value;
            const issueId = window.location.pathname.split('/').pop();

            try {
                const response = await fetch(`/api/issues/${issueId}/comments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ content }),
                });

                if (response.ok) {
                    window.location.reload();
                } else {
                    const error = await response.json();
                    alert(`Failed to add comment: ${error.error}`);
                }
            } catch (error) {
                console.error('Error adding comment:', error);
                alert('Failed to add comment. Please try again.');
            }
        });
    }

    if (updateIssueForm) {
        updateIssueForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const status = e.target.elements.status.value;
            const priority = e.target.elements.priority.value;
            const issueId = window.location.pathname.split('/').pop();

            try {
                const response = await fetch(`/api/issues/${issueId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status, priority }),
                });

                if (response.ok) {
                    window.location.reload();
                } else {
                    const error = await response.json();
                    alert(`Failed to update issue: ${error.error}`);
                }
            } catch (error) {
                console.error('Error updating issue:', error);
                alert('Failed to update issue. Please try again.');
            }
        });
    }
});