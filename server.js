const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const os = require("os");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ------------------ HELPERS ------------------
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

const LOCAL_IP = getLocalIP();

// ------------------ FILE SETUP ------------------
const USERS_FILE = path.join(__dirname, "users.json");
const PUBLIC_DIR = path.join(__dirname, "public");

// Ensure users.json exists
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}

// Ensure public folder exists
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR);
}

// ------------------ USER HELPERS ------------------
function loadUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ------------------ SIGNUP ------------------
app.post("/signup", (req, res) => {
  const { email, password } = req.body;
  const users = loadUsers();

  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: "Email already exists" });
  }

  users.push({ email, password });
  saveUsers(users);

  res.json({ message: "Signup successful!" });
});

// ------------------ LOGIN ------------------
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const users = loadUsers();

  const user = users.find(
    u => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  res.json({ message: "Login successful!" });
});

// ------------------ QR GENERATION ------------------
app.post("/generate", async (req, res) => {
  let { resume, video } = req.body;

  // Normalize YouTube URL
  try {
    if (video.includes("youtube.com/watch")) {
      const videoId = new URL(video).searchParams.get("v");
      video = `https://www.youtube.com/embed/${videoId}`;
    } else if (video.includes("youtu.be/")) {
      const videoId = video.split("youtu.be/")[1].split("?")[0];
      video = `https://www.youtube.com/embed/${videoId}`;
    }
  } catch (err) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  const micrositeHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>My Portfolio</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  <h1>Resume</h1>
  <a href="${resume}" target="_blank">View Resume</a>

  <h1>Intro Video</h1>
  <iframe 
    src="${video}" 
    width="100%" 
    height="400" 
    frameborder="0"
    allowfullscreen>
  </iframe>
</body>
</html>`;

  const fileName = `portfolio_${Date.now()}.html`;
  const filePath = path.join(PUBLIC_DIR, fileName);

  fs.writeFileSync(filePath, micrositeHTML);

  const micrositeURL = `http://${LOCAL_IP}:${PORT}/${fileName}`;
  const qrCodeData = await QRCode.toDataURL(micrositeURL);

  res.json({
    qrCode: qrCodeData,
    link: micrositeURL
  });
});

// ------------------ STATIC FILES ------------------
app.use(express.static(PUBLIC_DIR));

// ------------------ SERVER ------------------
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running at:");
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`👉 http://${LOCAL_IP}:${PORT}`);
});
