// Load environment variables
require('dotenv').config();

// Required modules
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2');
const nodemailer = require('nodemailer');
const multer = require('multer');
const http = require('http'); // For creating the HTTP server
const axios = require('axios');
const natural = require('natural');
const franc = require('franc-min');
const translate = require('google-translate-api-x');
const { LanguageServiceClient } = require('@google-cloud/language');

// Set up multer for file uploads (5MB limit)
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const app = express();
const PORT = process.env.PORT || 600;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('uploads'));

// Google Cloud NLP Client
const client = new LanguageServiceClient();

// Route to return the server port
app.get('/get-port', (req, res) => {
  res.json({ PORT });
});

// MySQL Connection Setup
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.stack);
    return;
  }
  console.log('Connected to MySQL');

  const createChatTable = `CREATE TABLE IF NOT EXISTS \`${process.env.DB_NAME || 'agrotech'}\`.\`chat_messages\` (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user VARCHAR(255),
    message TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`;

  db.query(createChatTable, (tableErr, result) => {
    if (tableErr) {
      console.error('Error ensuring chat_messages table exists:', tableErr);
    } else {
      console.log('chat_messages table is ready');
    }
  });
});

// Serve static files from your frontend public folder
app.use(express.static(path.join(__dirname, '../frontend1/public')));

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend1/public/HtmlStructure/home.html'));
});

// Register route
app.get('/register', (req, res) => {
  const { role, name, email, password } = req.query;

  if (!role || !name || !email || !password) {
    return res.status(400).send({ message: 'All fields are required' });
  }

  const checkEmailQuery = 'SELECT * FROM users WHERE email = ?';
  db.query(checkEmailQuery, [email], (err, result) => {
    if (err) {
      console.error('Error checking email:', err);
      return res.status(500).send({ message: 'Internal server error' });
    }

    if (result.length > 0) {
      return res.status(400).send({ message: 'Email already exists' });
    }

    const insertUserQuery = 'INSERT INTO users (role, name, email, password) VALUES (?, ?, ?, ?)';
    db.query(insertUserQuery, [role, name, email, password], (err, result) => {
      if (err) {
        console.error('Error inserting user:', err);
        return res.status(500).send({ message: 'Failed to register user' });
      }

      const userId = result.insertId;
      sendConfirmationEmail(email, userId); // Send confirmation email

      return res.status(200).send({
        message: 'Registration successful. Please check your email for verification.',
        user_id: userId
      });
    });
  });
});

// Send confirmation email
function sendConfirmationEmail(userEmail, userId) {
  // Note: Using process.env.PORT here assumes it's set; otherwise, you may use PORT variable.
  const loginUrl = `http://localhost:${process.env.PORT || PORT}/HtmlStructure/login.html?user_id=${userId}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: 'Account Registration Confirmation',
    text: `Thank you for registering on AgroTech. Please click the link below to log in.\n\n${loginUrl}`
  };

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error('Error sending email:', err);
    } else {
      console.log('Confirmation email sent:', info.response);
    }
  });
}
app.get('/login', (req, res) => {
  const { email, password } = req.query;

  if (!email || !password) {
    console.error('Missing email or password in the request.');
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const loginQuery = 'SELECT * FROM users WHERE email = ?';
  db.query(loginQuery, [email], (err, result) => {
    if (err) {
      console.error('Error during login:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (result.length === 0) {
      console.error('No user found for email:', email);
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check the password (plain text check, consider hashing in production)
    if (result[0].password !== password) {
      console.error('Password mismatch for email:', email);
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const user = result[0];
    console.log(`User ${user.id} logged in successfully.`);

    // Return user_id in the response so it can be stored on the client-side
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      message: 'Login successful',
      role: user.role,
      user_id: user.id  // Send the user_id in the response
    });
  });
});




// // Multer storage configuration (for file uploads)
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/');
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + '-' + file.originalname);
//   }
// });

// // Add product route
// app.post('/add-product', upload.single('product-image'), (req, res) => {
//   console.log('Received Data:', req.body); // Log body data
//   console.log('Received File:', req.file); // Log the uploaded file

//   const { user_id, product_name, product_description, quantity, price, category } = req.body;
//   const productImage = req.file;

//   // Validate the fields
//   if (!user_id || !product_name || !product_description || !quantity || !price || !category || !productImage) {
//     return res.status(400).send({ message: 'All fields are required' });
//   }

//   // Insert into the database (example query)
//   const insertProductQuery =
//     'INSERT INTO products (user_id, product_name, product_description, quantity, price, category, product_image) VALUES (?, ?, ?, ?, ?, ?, ?)';
//   db.query(
//     insertProductQuery,
//     [user_id, product_name, product_description, quantity, price, category, productImage.filename],
//     (err, result) => {
//       if (err) {
//         console.error('Error adding product:', err);
//         return res.status(500).send({ message: 'Failed to add product' });
//       }

//       res.status(200).send({
//         success: true,
//         message: 'Product added successfully',
//         product_id: result.insertId
//       });
//     }
//   );
// });

// // Function to notify admin by email
// function sendProductToAdminEmail(user_id, product_name, product_description, quantity, price, category) {
//   const adminEmail = 'satishkumar1791979sg881237@gmail.com';

//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: adminEmail,
//     subject: 'New Product Submission',
//     html: `
//       <h3>New Product Submitted:</h3>
//       <p><strong>Product Name:</strong> ${product_name}</p>
//       <p><strong>Description:</strong> ${product_description}</p>
//       <p><strong>Quantity:</strong> ${quantity}</p>
//       <p><strong>Price:</strong> ${price}</p>
//       <p><strong>Category:</strong> ${category}</p>
//       <p><strong>Submitted by User ID:</strong> ${user_id}</p>
//       <p>Please review and approve the product.</p>
//     `
//   };

//   const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS
//     }
//   });

//   transporter.sendMail(mailOptions, (err, info) => {
//     if (err) {
//       console.error('Error sending email to admin:', err);
//     } else {
//       console.log('Admin notification email sent:', info.response);
//     }
//   });
// }

// // Approve product route
// app.get('/approve-product', (req, res) => {
//   const { product_id } = req.query;

//   if (!product_id) {
//     return res.status(400).send({ message: 'Product ID is required' });
//   }

//   const approveProductQuery = 'UPDATE products SET status = ? WHERE id = ?';
//   db.query(approveProductQuery, ['Approved', product_id], (err, result) => {
//     if (err) {
//       console.error('Error approving product:', err);
//       return res.status(500).send({ message: 'Failed to approve product' });
//     }

//     notifyFarmer(product_id);
//     res.status(200).send({ message: 'Product approved and farmer notified' });
//   });
// });

// // Function to notify farmer via email
// function notifyFarmer(product_id) {
//   const farmerQuery = `
//     SELECT u.email, p.product_name 
//     FROM products p 
//     JOIN users u ON p.user_id = u.id 
//     WHERE p.id = ?`;

//   db.query(farmerQuery, [product_id], (err, result) => {
//     if (err || result.length === 0) {
//       console.error('Error notifying farmer:', err);
//       return;
//     }

//     const { email, product_name } = result[0];
//     const mailOptions = {
//       from: process.env.EMAIL_USER,
//       to: email,
//       subject: 'Product Approved',
//       text: `Your product "${product_name}" has been approved and is now listed on AgroTech.`
//     };

//     const transporter = nodemailer.createTransport({
//       service: 'gmail',
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS
//       }
//     });

//     transporter.sendMail(mailOptions, (err, info) => {
//       if (err) {
//         console.error('Error sending email to farmer:', err);
//       } else {
//         console.log('Farmer notification email sent:', info.response);
//       }
//     });
//   });
// }

// --- Socket.IO Setup ---

// Create an HTTP server using the Express app
const server = http.createServer(app);

// Attach Socket.IO to the HTTP server
const { Server } = require('socket.io');
const io = new Server(server);

// WebSocket handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Listen for chat messages
  socket.on('chat message', (msgData) => {
    console.log('Message received:', msgData);

    // Store the message in MySQL for persistence if the table exists
    const insertQuery = 'INSERT INTO chat_messages (user, message, timestamp) VALUES (?, ?, NOW())';
    db.query(insertQuery, [msgData.user, msgData.message], (err) => {
      if (err && err.code !== 'ER_NO_SUCH_TABLE') {
        console.error('Error storing message:', err);
      } else if (err && err.code === 'ER_NO_SUCH_TABLE') {
        console.warn('chat_messages table does not exist; skipping persistence.');
      }
      io.emit('chat message', msgData);
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// API Keys from .env file
const COHERE_API_KEY = process.env.COHERE_API_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

const tokenizer = new natural.WordTokenizer();

// Function to enhance AI-generated text - simplified
function enhanceText(text) {
    try {
        let tokens = tokenizer.tokenize(text);
        let cleanedText = tokens.join(" ");
        return cleanedText;
    } catch (error) {
        console.error("Error processing text:", error.message);
        return text;
    }
}

// API status endpoint
app.get("/check-api-status", (req, res) => {
  const status = {
    cohere: !!COHERE_API_KEY,
    youtube: !!YOUTUBE_API_KEY,
    allValid: !!(COHERE_API_KEY && YOUTUBE_API_KEY)
  };
  res.json(status);
});

// Route to handle user query
app.post("/ask", async (req, res) => {
  try {
      const { language, query } = req.body;

      if (!language || !query) {
          return res.status(400).json({ error: "⚠️ Language and query are required." });
      }

      if (!COHERE_API_KEY) {
          return res.status(500).json({ error: "❌ Missing Cohere API key." });
      }
      if (!YOUTUBE_API_KEY) {
          return res.status(500).json({ error: "❌ Missing YouTube API key." });
      }

      // ✅ Cohere Chat API Request
      let answer = null;
      const coherePayload = {
          model: "command-r",
          messages: [
            { role: "system", content: "You are a helpful agricultural assistant." },
            { role: "user", content: `Answer in ${language}. Keep the response clear and simple. Question: ${query}` }
          ],
          temperature: 0.7,
          max_tokens: 300
      };
      const cohereEndpoints = [
        "https://api.cohere.ai/v1/chat",
        "https://api.cohere.com/v1/chat"
      ];

      for (const url of cohereEndpoints) {
        if (answer) break;
        try {
          const aiResponse = await axios.post(url, coherePayload, {
            headers: {
              "Authorization": `Bearer ${COHERE_API_KEY}`,
              "Content-Type": "application/json"
            },
            timeout: 10000
          });
          answer = aiResponse.data?.generations?.[0]?.text?.trim() || aiResponse.data?.output?.[0]?.content?.[0]?.text?.trim() || aiResponse.data?.text?.trim() || null;
          console.log(`Cohere Chat response success from ${url}:`, { length: answer ? answer.length : 0 });
        } catch (apiError) {
          console.warn(`Cohere Chat API failed for ${url}:`, apiError.response?.data || apiError.message);
        }
      }

      if (!answer) {
        console.error('Cohere Chat API failed on all endpoints.');
        answer = `I'm unable to provide a detailed answer to "${query}" at this moment. Please try again later.`;
      }

      answer = answer || `I'm unable to provide a detailed answer to "${query}" at this moment. Please try again later.`;

      // 🔹 Fetch YouTube video related to the query (graceful failure)
      let videoUrl = null;
      try {
        const youtubeResponse = await axios.get("https://www.googleapis.com/youtube/v3/search", {
            params: {
                part: "snippet",
                q: `${query} farming tutorial ${language}`,
                type: "video",
                key: YOUTUBE_API_KEY,
                maxResults: 1
            },
            timeout: 8000
        });

        if (youtubeResponse.data?.items?.length > 0) {
          videoUrl = `https://www.youtube.com/watch?v=${youtubeResponse.data.items[0].id.videoId}`;
        }
      } catch (videoError) {
        console.warn('YouTube search failed (video will be skipped):', videoError.response?.data?.error?.message || videoError.message);
      }

      res.json({ answer, videoUrl });

  } catch (error) {
      console.error("Error in /ask route:", error.response?.data || error.message);
      res.status(500).json({ error: "❌ An error occurred while processing your request." });
  }
});


// Start the HTTP server
server.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});