document.getElementById('registration-form').addEventListener('submit', async function (e) {
    e.preventDefault(); // Prevent default form submission behavior

    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return; // Stop form submission if passwords don't match
    }

    const role = document.getElementById('role').value;
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const userId = new URLSearchParams(window.location.search).get('user_id'); // Capture user_id from URL

    if (userId) {
        document.getElementById('user_id').value = userId; // Set the user_id in the hidden input
    }

    try {
        // ✅ Fetch the port number from the backend
        const portResponse = await fetch('/get-port');
        if (!portResponse.ok) {
            throw new Error(`Server response error: ${portResponse.status}`);
        }
        
        const portData = await portResponse.json();
        const port = portData.PORT || 600; // Default to 600 if not found

        // ✅ Prepare query parameters for the GET request
        const queryParams = new URLSearchParams({
            role,
            name,
            email,
            password,
            confirmPassword,
            user_id: userId // Add the user_id to the query parameters
        });

        // ✅ Send GET request with the correct port
        fetch(`http://localhost:${port}/register?${queryParams.toString()}`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                alert(data.message);
            })
            .catch((error) => {
                console.error('An error occurred:', error);
                alert('An error occurred during registration. Please try again later.');
            });

    } catch (error) {
        console.error('Failed to fetch port number:', error);
        alert('Failed to fetch server port. Make sure the backend is running.');
    }
});
