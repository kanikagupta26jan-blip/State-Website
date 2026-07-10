// Function to get the server port without caching
async function getServerPort() {
    try {
      // Append a cache buster to ensure a fresh request every time.
      const response = await fetch('/get-port?cb=' + new Date().getTime());
      if (!response.ok) {
        throw new Error(`Server response error: ${response.status}`);
      }
      const portData = await response.json();
      return portData.PORT || 600; // Use default 600 if not provided
    } catch (error) {
      console.error('Failed to fetch server port:', error);
      throw error;
    }
  }
  
  document.getElementById('login-form').addEventListener('submit', async function (e) {
    e.preventDefault();
  
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
  
    try {
      const port = await getServerPort();
      console.log('Using port:', port);
  
      const url = `http://localhost:${port}/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
      console.log('Login URL:', url);
  
      const response = await fetch(url, { method: 'GET' });
  
      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${await response.text()}`);
      }
  
      const data = await response.json();
      console.log('Parsed Response:', data);
  
      if (data.user_id) {
        localStorage.setItem('user_id', data.user_id);
        redirectToDashboard(data.role, port);
      } else {
        console.error('Login failed:', data);
        alert(data.message || 'An error occurred. Please try again later.');
      }
    } catch (error) {
      console.error('Login Error:', error);
      alert('An error occurred. Please try again later.');
    }
  });
  
  
  // Function to redirect user based on their role
  function redirectToDashboard(role, port) {
    const roleToUrlMap = {
      'farmer-sell': `/HtmlStructure/AddProduct.html`,
      'farmer-rent': `/HtmlStructure/featuredEquipment.html`,
      'farmer-rent-sell': `/HtmlStructure/AddEquipment.html`,
      'expert': `/HtmlStructure/expert.html`,
      'customer': `/HtmlStructure/FeaturedProducts.html`,
    };
  
    // Redirect to the respective page or default if role not found
    window.location.href = `http://localhost:${port}${roleToUrlMap[role] || 'http://localhost:${port}/HtmlStructure/AddProduct.html'}`;
  }
  