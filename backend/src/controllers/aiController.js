export async function chat(req, res) {
  const message = String(req.body?.message || "").trim();

  if (!message) {
    return res.status(400).json({ message: "Message is required." });
  }

  // Replace this placeholder with your preferred AI provider.
  res.json({
    answer: `UPNEX AI received: "${message}". Connect your AI provider in aiController.js to return real tutoring responses.`
  });
}