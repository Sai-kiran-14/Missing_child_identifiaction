const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const { spawn } = require('child_process');
const nodemailer = require('nodemailer'); // For sending emails
require('dotenv').config();

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// Set up multer for file uploads
// Set up multer for file uploads with correct extensions
// Set up multer for file uploads with the original filename
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); // Use the original filename
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true); // Accept images only
        } else {
            cb(new Error('Only images are allowed'), false); // Reject non-images
        }
    },
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});


// Database connection
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD,
    database: 'users',
    connectionLimit: 10
});

db.getConnection((err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
        process.exit(1);
    }
    console.log('Connected to the database.');
});

// Set up Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // You can change this to another service like Outlook or Yahoo
    auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASS  // Your email password or app password
    }
});

// Send email notification to all users
function sendEmailToAllUsers(childDetails, photoPath) {
    db.query('SELECT email FROM users', (err, results) => {
        if (err) {
            console.error('Error fetching user emails:', err.message);
            return;
        }

        const emails = results.map(user => user.email);

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: emails, // Sending the email to all users
            subject: `New Missing Child Registered: ${childDetails.childName}`,
            html: `
                <p>A new missing child case has been registered.</p>
                <p><strong>Child Name:</strong> ${childDetails.childName}</p>
                <p><strong>Age:</strong> ${childDetails.age}</p>
                <p><strong>Unique Features:</strong> ${childDetails.features}</p>
                <p><strong>Last Seen Place:</strong> ${childDetails.missingPlace}</p>
                <p><strong>Contact Number:</strong> ${childDetails.contact}</p>
                <p>If you spot the child, please contact the number above or report it immediately.</p>
                <br>
                <p>Photo of the missing child is attached below:</p>
                <img src="cid:childImage" alt="Missing Child Photo" width="200px" height="200px"/>
            `,
            attachments: [
                {
                    filename: 'child-photo.jpg',
                    path: photoPath, // Attach the photo
                    cid: 'childImage' // Same cid as in the email body
                }
            ]
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error('Error sending emails:', err.message);
            } else {
                console.log('Emails sent: ' + info.response);
            }
        });
    });
}

// Handle register form submission (register missing child case)
app.post('/register', upload.single('photo'), (req, res) => {
    const { childName, age, features, missingPlace, contact } = req.body;
    const photo = req.file ? req.file.originalname : null;

    if (!photo) {
        return res.status(400).send('Photo is required');
    }

    // Insert child details into database
    db.query(`
        INSERT INTO missing_children (childName, age, features, missingPlace, contact, photo)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [childName, age, features, missingPlace, contact, photo], (err) => {
        if (err) {
            console.error('Error during registration of missing child:', err.message);
            res.status(500).send('Error occurred during registration');
        } else {
            const photoPath = path.join(__dirname, 'public/uploads/', photo); // Get the full path of the photo
            // Send email to all users after successful registration
            sendEmailToAllUsers({ childName, age, features, missingPlace, contact }, photoPath);
            res.send('Missing child registered successfully and emails sent.');
        }
    });
});

// Serve static files (CSS, images, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Use body-parser to parse POST request bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Configure session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-default-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 3600000 } // 1-hour expiry
}));

// Serve the home page (index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});




// Serve signup page
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'signup.html'));
});

// Serve register page
app.get('/register', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'views', 'register.html'));
    } else {
        res.redirect('/login');
    }
});

// Serve face recognition page
app.get('/recognize', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'recognize.html'));
});

// Handle login form submission
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) {
            console.error('Error during login:', err.message);
            res.status(500).send('Error occurred during login');
        } else if (results.length > 0 && bcrypt.compareSync(password, results[0].password)) {
            req.session.user = results[0];
            res.redirect('/');
        } else {
            res.status(401).send('Invalid email or password');
        }
    });
});

// Handle signup form submission
app.post('/signup', (req, res) => {
    const { name, email, phone, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.query('INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)',
        [name, email, phone, hashedPassword], (err) => {
            if (err) {
                console.error('Error during signup:', err.message);
                res.status(500).send('Error occurred during signup');
            } else {
                res.send('User registered successfully');
            }
        });
});

// Handle register form submission (register missing child case)

const storages = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/recognition_uploads/'); // Store uploaded images for recognition in a different folder
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); // Save the uploaded file with its original name
    }
});
const recognitionUpload = multer({ storage: storages });



app.post('/recognize-face',  recognitionUpload.single('childPhoto'), (req, res) => {
    const uploadedImagePath = req.file.path; // Get the uploaded image path

    // Get all images from the uploads folder
    fs.readdir(path.join(__dirname, 'public/uploads/'), (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            return res.status(500).send('Error reading images');
        }

        let matchFound = false;
        let processedFiles = 0;

        if (files.length === 0) {
            return res.send('No images available for comparison.');
        }

        files.forEach((file, index) => {
            if (matchFound) return; // Stop processing once a match is found

            const databaseImagePath = path.join(__dirname, 'public/uploads/', file);

            // Skip if it's the uploaded image itself
            if (databaseImagePath === uploadedImagePath) {
                processedFiles++;
                if (processedFiles === files.length && !matchFound) {
                    return res.send('No match found.');
                }
                return;
            }

            // Call the Python script for face recognition
            const pythonProcess = spawn('python', ['scripts/face_recognition_cnn.py', databaseImagePath, uploadedImagePath]);

            pythonProcess.stdout.on('data', (data) => {
                const result = data.toString().trim();
                console.log(`Result for ${file}: ${result}`);

                if (result === "Match found!") {
                    matchFound = true;

                    // Get child details from the database based on the matched photo
                    db.query('SELECT childName, age, features, contact, photo FROM missing_children WHERE photo = ?', [file], (err, results) => {
                        if (err) {
                            console.error('Database query error:', err);
                            return res.status(500).send('Error fetching child details');
                        }

                        if (results.length > 0) {
                            const childDetails = results[0];

                            // Render a new HTML page (child_details.ejs) and pass the child's details
                            res.render('child_details', {
                                childName: childDetails.childName,
                                age: childDetails.age,
                                features: childDetails.features,
                                contact: childDetails.contact,
                                photo: `/uploads/${childDetails.photo}`
                            });

                            // Stop further processing after rendering the response
                            return;
                        }
                    });
                }

                // If no match is found after all images are processed
                if (index === files.length - 1 && !matchFound) {
                    return res.send('No match found.');
                }
            });

            pythonProcess.stderr.on('data', (data) => {
                console.error(`Python Error for ${file}: ${data}`);
            });

            pythonProcess.on('close', (code) => {
                processedFiles++;

                // After all files are processed, delete the uploaded image
                if (processedFiles === files.length) {
                    fs.unlink(uploadedImagePath, (err) => {
                        if (err) {
                            console.error(`Error deleting the uploaded image: ${err.message}`);
                        } else {
                            console.log('Uploaded image deleted after processing');
                        }
                    });
                }
            });
        });
    });
});



// const storages = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, 'public/recognition_uploads/');
//     },
//     filename: (req, file, cb) => {
//         cb(null, file.originalname); // Save the uploaded file with the original name
//     }
// });
// const recognitionUpload = multer({ storage: storages });



// Handle logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error during logout:', err.message);
            return res.status(500).send('Error occurred during logout');
        }
        res.redirect('/login');
    });
});

// Send session information to the client
app.get('/session-info', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, user: { name: req.session.user.name } });
    } else {
        res.json({ loggedIn: false });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
