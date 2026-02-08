const express = require("express");
const cors = require("cors");
const path = require("path");
const QRCode = require("qrcode");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- MIDDLEWARE ----------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ---------- TEMP USER STORE (NO DB) ----------
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

// ---------- QR GENERATE ----------
app.post("/generate", async (req, res) => {
  let { resume, video } = req.body;

  try {
    const videoId = video.includes("youtu.be")
      ? video.split("youtu.be/")[1].split("?")[0]
      : new URL(video).searchParams.get("v");

    video = `https://www.youtube.com/embed/${videoId}`;
  } catch {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  const html = `
<!DOCTYPE html>
<html>
<body>
<h2>Resume</h2>
<a href="${resume}" target="_blank">View Resume</a>
<h2>Intro Video</h2>
<iframe src="${video}" width="100%" height="400"></iframe>
</body>
</html>
`;

  const fileName = `portfolio_${Date.now()}.html`;
  const filePath = path.join(__dirname, "public", fileName);
  fs.writeFileSync(filePath, html);

  const link = `${process.env.RENDER_EXTERNAL_URL}/${fileName}`;
  const qrCode = await QRCode.toDataURL(link);

  res.json({ qrCode, link });
});

// ---------- START SERVER ----------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
