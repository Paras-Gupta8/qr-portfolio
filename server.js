const express = require("express");
const cors = require("cors");
const path = require("path");
const QRCode = require("qrcode");
const fs = require("fs");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- MIDDLEWARE ----------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ---------- CREATE UPLOAD FOLDER ----------
const uploadDir = path.join(__dirname, "public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ---------- MULTER CONFIG ----------
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Only PDF files allowed"));
    } else {
      cb(null, true);
    }
  }
});

// ---------- TEMP USER STORE ----------
const users = [];

// ---------- SIGNUP ----------
app.post("/signup", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const exists = users.find(u => u.email === email);
  if (exists) {
    return res.status(400).json({ error: "Email already exists" });
  }

  users.push({ email, password });
  res.json({ message: "Signup successful!" });
});

// ---------- LOGIN ----------
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find(
    u => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  res.json({ message: "Login successful!" });
});

// ---------- QR GENERATE (PDF + VIDEO) ----------
app.post("/generate", upload.single("resume"), async (req, res) => {
  try {
    const videoUrl = req.body.video;
    const pdfFile = req.file;

    if (!pdfFile) {
      return res.status(400).json({ error: "PDF resume required" });
    }

    let videoId;
    try {
      videoId = videoUrl.includes("youtu.be")
        ? videoUrl.split("youtu.be/")[1].split("?")[0]
        : new URL(videoUrl).searchParams.get("v");
    } catch {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    const videoEmbed = `https://www.youtube.com/embed/${videoId}`;
    const resumePath = `/uploads/${pdfFile.filename}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Portfolio</title>
  <style>
    body { font-family: Arial; padding: 20px; }
    iframe { border: none; }
  </style>
</head>
<body>
  <h2>Resume</h2>
  <iframe src="${resumePath}" width="100%" height="600"></iframe>

  <h2>Intro Video</h2>
  <iframe src="${videoEmbed}" width="100%" height="400"></iframe>
</body>
</html>
`;

    const fileName = `portfolio_${Date.now()}.html`;
    const filePath = path.join(__dirname, "public", fileName);
    fs.writeFileSync(filePath, html);

    const link = `${process.env.RENDER_EXTERNAL_URL}/${fileName}`;
    const qrCode = await QRCode.toDataURL(link);

    res.json({ qrCode, link });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ---------- START SERVER ----------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
