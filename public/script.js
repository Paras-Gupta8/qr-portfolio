// --- Helper selectors ---
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const form = $("#resumeForm");

// --- Resume filename preview ---
$("#resume")?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  const preview = $("#resumePreview");
  preview.textContent = file ? file.name : "📄 No file selected";
  preview.classList.toggle("file-selected", !!file);
});

// --- Video file preview ---
$("#video")?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  const player = $("#videoPlayer");
  if (file) {
    const url = URL.createObjectURL(file);
    player.src = url;
    player.hidden = false;
  } else {
    player.src = "";
    player.hidden = true;
  }
});

// --- Live Preview ---
const updatePreview = () => {
  $("#livePreview").classList.remove("hidden");

  $("#p_name").textContent = $("#name").value || "Your Name";
  $("#p_headline").textContent = $("#headline").value || "Headline appears here ✨";
  $("#p_about").textContent = $("#about").value || "Write something about yourself...";

  const resumeFile = $("#resume").files?.[0];
  $("#p_resume").textContent = resumeFile ? resumeFile.name : "📄 No resume uploaded";

  const videoFile = $("#video").files?.[0];
  const videoLink = $("#videoLink").value.trim();
  $("#p_video").textContent = videoFile ? videoFile.name : videoLink || "🎥 No video yet";

  $("#p_proj_title").textContent = $("#projectTitle").value || "Project Title";
  $("#p_proj_desc").textContent = $("#projectDesc").value || "Project description...";

  const plink = $("#projectLink").value.trim();
  const linkEl = $("#p_proj_link");
  if (plink) {
    linkEl.href = plink;
    linkEl.hidden = false;
  } else {
    linkEl.hidden = true;
  }

  const socials = [
    { input: "#github", out: "#p_github", label: "GitHub" },
    { input: "#linkedin", out: "#p_linkedin", label: "LinkedIn" },
    { input: "#website", out: "#p_website", label: "Portfolio" },
  ];
  socials.forEach(({ input, out, label }) => {
    const val = $(input).value.trim();
    const node = $(out);
    node.hidden = !val;
    if (val) {
      node.textContent = label;
      node.href = val;
    }
  });
};

$("#previewBtn")?.addEventListener("click", updatePreview);

// --- Form validation ---
form?.addEventListener("submit", (e) => {
  const errors = [];
  const name = $("#name").value.trim();
  const resume = $("#resume").files?.[0];
  const projectTitle = $("#projectTitle").value.trim();
  const projectDesc = $("#projectDesc").value.trim();
  const videoFile = $("#video").files?.[0];
  const videoLink = $("#videoLink").value.trim();

  if (!name) errors.push("⚠ Name is required.");
  if (!resume) errors.push("⚠ Resume PDF is required.");
  if (!projectTitle) errors.push("⚠ Project title is required.");
  if (!projectDesc) errors.push("⚠ Project description is required.");
  if (videoFile && videoLink) errors.push("⚠ Choose either a video OR a link, not both.");

  if (errors.length) {
    e.preventDefault();
    showErrorMessages(errors);
  }
});

// --- Show errors in styled popup ---
function showErrorMessages(messages) {
  const errorBox = $("#errorBox");
  errorBox.innerHTML = messages.map(msg => `<li>${msg}</li>`).join("");
  errorBox.classList.add("show");
  setTimeout(() => errorBox.classList.remove("show"), 4000);
}
