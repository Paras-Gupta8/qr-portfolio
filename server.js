const express = require("express");
const cors = require("cors");
const path = require("path");
const QRCode = require("qrcode");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ---------- DATABASE ----------
/*mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));
*/
const User = mongoose.model("User", new mongoose.Schema({
  email: { type: String, unique: true },
  password: String
}));

// ---------- SIGNUP ----------
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  const exists = await User.findOne({ email });
  if (exists) {
    return res.status(400).json({ error: "Email already sexists" });
  }

  await User.create({ email, password });
  res.json({ message: "Signup successful!" });
});

// ---------- LOGIN ----------
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


// ---------- QR ----------
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
</html>`;

  const fileName = `portfolio_${Date.now()}.html`;
  const filePath = path.join(__dirname, "public", fileName);
  require("fs").writeFileSync(filePath, html);

  const link = `${process.env.RENDER_EXTERNAL_URL}/${fileName}`;
  const qrCode = await QRCode.toDataURL(link);

  res.json({ qrCode, link });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Running on ${PORT}`);
});
