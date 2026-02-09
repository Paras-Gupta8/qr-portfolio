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
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files from /public
app.use(express.static(path.join(__dirname, "public")));

// ---------- CREATE UPLOAD FOLDER ----------
const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ---------- MULTER CONFIG (PDF + VIDEO) ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

// Allow: resume must be pdf, videoFile must be video
function fileFilter(req, file, cb) {
  if (file.fieldname === "resume") {
    if (file.mimetype === "application/pdf") return cb(null, true);
    return cb(new Error("Resume must be a PDF"));
  }

  if (file.fieldname === "videoFile") {
    if (file.mimetype && file.mimetype.startsWith("video/")) return cb(null, true);
    return cb(new Error("Video must be a valid video file"));
  }

  cb(new Error("Unexpected field"));
}

// 500 MB limit for uploaded video (multer applies per file)
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
});

// ---------- TEMP USER STORE (RESETS ON REDEPLOY) ----------
const users = [];

// ---------- SIGNUP ----------
app.post("/signup", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ error: "Missing fields" });

  const exists = users.find((u) => u.email === email);
  if (exists) return res.status(400).json({ error: "Email already exists" });

  users.push({ email, password });
  res.json({ message: "Signup successful!" });
});

// ---------- LOGIN ----------
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  res.json({ message: "Login successful!" });
});

// ---------- HELPERS ----------
function normalizeYoutubeToEmbed(videoUrl) {
  try {
    if (!videoUrl) return null;

    // youtu.be/<id>
    if (videoUrl.includes("youtu.be/")) {
      const videoId = videoUrl.split("youtu.be/")[1].split("?")[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }

    // youtube.com/watch?v=<id>
    if (videoUrl.includes("youtube.com")) {
      const u = new URL(videoUrl);
      const videoId = u.searchParams.get("v");
      if (!videoId) return null;
      return `https://www.youtube.com/embed/${videoId}`;
    }

    return null;
  } catch {
    return null;
  }
}

function getBaseUrl(req) {
  // Render provides this automatically
  if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL;
  // fallback for local/dev/other hosts
  return `${req.protocol}://${req.get("host")}`;
}

// ---------- QR GENERATE (PDF + VIDEO LINK OR VIDEO FILE) ----------
app.post(
  "/generate",
  upload.fields([
    { name: "resume", maxCount: 1 },
    { name: "videoFile", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const resumeFile = req.files?.resume?.[0];
      const videoFile = req.files?.videoFile?.[0];
      const videoLink = (req.body.videoLink || "").trim();

      if (!resumeFile) {
        return res.status(400).json({ error: "PDF resume is required" });
      }

      // resume path for microsite
      const resumePath = `/uploads/${resumeFile.filename}`;

      // Decide video output
      let videoSectionHtml = "";
      if (videoFile) {
        const videoPath = `/uploads/${videoFile.filename}`;
        videoSectionHtml = `
          <h2>Intro Video</h2>
          <video controls style="width:100%; max-height:500px; border-radius:12px;">
            <source src="${videoPath}">
            Your browser does not support the video tag.
          </video>
        `;
      } else if (videoLink) {
        const embed = normalizeYoutubeToEmbed(videoLink);
        if (!embed) {
          return res.status(400).json({ error: "Invalid YouTube URL" });
        }
        videoSectionHtml = `
          <h2>Intro Video</h2>
          <iframe src="${embed}" width="100%" height="400" style="border:none; border-radius:12px;" allowfullscreen></iframe>
        `;
      } else {
        return res
          .status(400)
          .json({ error: "Provide either a YouTube link OR upload a video file" });
      }

      // Microsite HTML
      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Portfolio</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 900px; margin: auto; }
    h2 { margin-top: 24px; }
    iframe, video { width: 100%; }
  </style>
</head>
<body>
  <h2>Resume</h2>
  <iframe src="${resumePath}" width="100%" height="650" style="border:none; border-radius:12px;"></iframe>

  ${videoSectionHtml}
</body>
</html>
      `.trim();

      // Write microsite file
      const fileName = `portfolio_${Date.now()}.html`;
      const filePath = path.join(__dirname, "public", fileName);
      fs.writeFileSync(filePath, html);

      // Build QR link
      const baseUrl = getBaseUrl(req);
      const link = `${baseUrl}/${fileName}`;
      const qrCode = await QRCode.toDataURL(link);

      res.json({ qrCode, link });
    } catch (err) {
      // Multer errors (size, etc.)
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "File too large. Max video size is 500MB." });
        }
        return res.status(400).json({ error: err.message });
      }

      res.status(500).json({ error: err.message || "Server error" });
    }
  }
);

// ---------- START SERVER ----------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
