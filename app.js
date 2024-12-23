// app.js
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const { Client } = require('pg');
const fs = require('fs');

const app = express();
const client = new Client({
  connectionString: process.env.DB_CONNECTION_STRING,
});
client.connect();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Set up multer for video and image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, 'public/videos');  // Save video to /videos folder
    } else if (file.mimetype.startsWith('image/')) {
      cb(null, 'public/images');  // Save image to /images folder
    } else {
      cb(new Error('Invalid file type'), false);  // Handle invalid file types
    }
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));  // Rename files uniquely
  },
});
const upload = multer({ storage: storage });

// Homepage route
app.get('/', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM videos');
    res.render('homepage', { videos: result.rows });
  } catch (err) {
    console.error('Error fetching videos:', err);
    res.status(500).send('Server Error');
  }
});

// Upload video and image route
app.get('/upload', (req, res) => {
  res.render('upload');
});

// app.js
app.post('/upload', upload.fields([{ name: 'video' }, { name: 'image' }]), async (req, res) => {
    const { name } = req.body; // Extract the name field from the form
    const videoFile = req.files['video'] ? req.files['video'][0] : null;
    const imageFile = req.files['image'] ? req.files['image'][0] : null;
  
    if (!name || !videoFile || !imageFile) {
      return res.status(400).send('All fields are required.');
    }
  
    try {
      // Insert video details into the database
      await client.query(
        'INSERT INTO videos (name, video_filename, image_filename) VALUES ($1, $2, $3)',
        [name, videoFile.filename, imageFile.filename]
      );
  
      res.redirect('/');
    } catch (err) {
      console.error('Error uploading video or image:', err);
      res.status(500).send('Server Error');
    }
  });


  app.get('/manage', async (req, res) => {
    try {
      const result = await client.query('SELECT * FROM videos');
      const videos = result.rows;
      res.render('manage', { videos });
    } catch (err) {
      console.error('Error fetching videos:', err);
      res.status(500).send('Server Error');
    }
  });
  
  // Route to handle video deletion
  app.post('/delete/:id', async (req, res) => {
    const videoId = req.params.id;
  
    try {
      // Get the video details to find filenames
      const result = await client.query('SELECT * FROM videos WHERE id = $1', [videoId]);
      const video = result.rows[0];
  
      if (!video) {
        return res.status(404).send('Video not found');
      }
  
      // Construct the full file paths
      const videoPath = `uploads/videos/${video.video_filename}`;
      const imagePath = `uploads/images/${video.image_filename}`;
  
      // Log the paths for debugging
      console.log('Video file path:', videoPath);
      console.log('Image file path:', imagePath);
  
      // Delete the video file
      fs.unlink(videoPath, (err) => {
        if (err) {
          console.error('Error deleting video file:', err);
          return res.status(500).send('Error deleting video file');
        }
  
        // Delete the image file
        fs.unlink(imagePath, (err) => {
          if (err) {
            console.error('Error deleting image file:', err);
            return res.status(500).send('Error deleting image file');
          }
  
          // Delete the video entry from the database
          client.query('DELETE FROM videos WHERE id = $1', [videoId])
            .then(() => {
              res.redirect('/');
            })
            .catch((err) => {
              console.error('Error deleting video from database:', err);
              res.status(500).send('Error deleting video from database');
            });
        });
      });
    } catch (err) {
      console.error('Error deleting video:', err);
      res.status(500).send('Server Error');
    }
  });
  
  app.get('/watch/:id', async (req, res) => {
    const videoId = req.params.id;
  
    try {
      // Fetch video details from the database
      const result = await client.query('SELECT * FROM videos WHERE id = $1', [videoId]);
      const video = result.rows[0];
  
      if (!video) {
        return res.status(404).send('Video not found');
      }
  
      // Render the video player page with the video details
      res.render('videoplayer', { video });
    } catch (err) {
      console.error('Error fetching video:', err);
      res.status(500).send('Server Error');
    }
  });
// Start the server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
