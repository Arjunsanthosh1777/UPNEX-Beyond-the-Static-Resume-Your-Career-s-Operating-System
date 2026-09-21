import { useEffect, useLayoutEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Check, Download, Link2, Share2, X } from "lucide-react";

const LEVEL_VALUE = { Expert: 5, Advanced: 4, Intermediate: 3, Beginner: 2 };

function roundRect(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCardInto(ctx, W, H, data) {
  const { name, username, headline, skills, stats } = data;

  ctx.clearRect(0, 0, W, H);
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#191033");
  bg.addColorStop(0.55, "#100a24");
  bg.addColorStop(1, "#0c0819");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(185, 166, 255, 0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  roundRect(ctx, 14, 14, W - 28, H - 28, 26);
  ctx.stroke();

  const cx = W / 2;
  const cy = H / 2;

  ctx.textBaseline = "alphabetic";

  // Avatar or monogram.
  const radius = 62;
  const circle = { x: cx - 360, y: cy - 30 };
  ctx.save();
  ctx.beginPath();
  ctx.arc(circle.x, circle.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#241a4d";
  ctx.fill();
  ctx.clip();
  if (data.avatarLoaded) {
    ctx.drawImage(data.avatarImage, circle.x - radius, circle.y - radius, radius * 2, radius * 2);
  } else {
    ctx.fillStyle = "#b9a6ff";
    ctx.font = "700 52px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(name || "?").charAt(0).toUpperCase(), circle.x, circle.y + radius / 2 - 8);
  }
  ctx.restore();

  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 44px Inter, sans-serif";
  ctx.fillText(String(name || "Student").slice(0, 28), circle.x + radius + 24, cy - 42);

  ctx.fillStyle = "#b9a6ff";
  ctx.font = "600 24px Inter, sans-serif";
  ctx.fillText(`@${username}`.slice(0, 40), circle.x + radius + 26, cy + 2);

  if (headline) {
    ctx.fillStyle = "#c9cede";
    ctx.font = "500 21px Inter, sans-serif";
    const label = String(headline).slice(0, 46);
    ctx.fillText(label, circle.x + radius + 26, cy + 38);
  }

  // Stat chips.
  const chips = [
    [String(stats?.skills || 0), "skills"],
    [String(stats?.projects || 0), "projects"],
    [String(stats?.credentials || 0), "verified credentials"]
  ];
  let chipX = circle.x - radius;
  const chipY = cy + 88;
  ctx.font = "600 20px Inter, sans-serif";
  for (const [value, label] of chips) {
    ctx.fillStyle = "rgba(185, 166, 255, 0.12)";
    ctx.strokeStyle = "rgba(185, 166, 255, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const text = `${value} ${label}`;
    const tw = ctx.measureText(text).width;
    roundRect(ctx, chipX, chipY, tw + 30, 36, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.fillText(text, chipX + 15, chipY + 24);
    chipX += tw + 44;
  }

  // Skill radar.
  const radar = skills && skills.length ? skills.slice(0, 5) : [];
  if (radar.length) {
    const rcx = cx + 268;
    const rcy = cy + 66;
    const max = 96;
    const levels = radar.map((skill) => LEVEL_VALUE[skill?.level] || 1);

    ctx.strokeStyle = "rgba(185, 166, 255, 0.28)";
    ctx.fillStyle = "rgba(185, 166, 255, 0.08)";
    ctx.lineWidth = 2;
    const ringCount = 4;
    for (let ring = 1; ring <= ringCount; ring += 1) {
      const rr = (ring / ringCount) * max;
      ctx.beginPath();
      for (let i = 0; i <= levels.length; i += 1) {
        const angle = -Math.PI / 2 + (i % levels.length) * ((Math.PI * 2) / levels.length);
        const px = rcx + Math.cos(angle) * rr;
        const py = rcy + Math.sin(angle) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }

    ctx.beginPath();
    for (let i = 0; i < levels.length; i += 1) {
      const angle = -Math.PI / 2 + i * ((Math.PI * 2) / levels.length);
      const px = rcx + Math.cos(angle) * ((levels[i] / 5) * max);
      const py = rcy + Math.sin(angle) * ((levels[i] / 5) * max);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(143, 107, 255, 0.28)";
    ctx.strokeStyle = "#b9a6ff";
    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#c9cede";
    ctx.font = "600 15px Inter, sans-serif";
    radar.forEach((skill, i) => {
      const angle = -Math.PI / 2 + i * ((Math.PI * 2) / levels.length);
      const px = rcx + Math.cos(angle) * (max + 24);
      const py = rcy + Math.sin(angle) * (max + 24);
      ctx.fillText(String(skill.name).slice(0, 10), px, py + 4);
    });
  }

  // Footer.
  ctx.textAlign = "center";
  ctx.fillStyle = "#6b7280";
  ctx.font = "600 16px Inter, sans-serif";
  ctx.fillText("A verified professional identity, built on UPNEX", cx, H - 40);
  ctx.fillStyle = "#b9a6ff";
  ctx.font = "700 18px Inter, sans-serif";
  ctx.fillText(`upnex.ai/${username}`.slice(0, 44), cx, H - 16);
}

export default function ShareModal({ data, onClose }) {
  const { name, username, headline, avatar, skills, stats } = data;
  const [copied, setCopied] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const pageRef = useRef(null);
  const qrRef = useRef(null);
  const previewRef = useRef(null);
  const offRef = useRef(null);

  const profileUrl = `${window.location.origin}/${username || ""}`;

  // QR code for the public link.
  useEffect(() => {
    if (!qrRef.current || !username) return undefined;
    QRCode.toCanvas(qrRef.current, profileUrl, {
      width: 168,
      margin: 1,
      color: { dark: "#14121c", light: "#ffffff" },
      errorCorrectionLevel: "M"
    }).catch(() => {});
  }, [profileUrl, username]);

  // The card is drawn on an offscreen canvas, then mirrored into a visible
  // preview. Safe with same-origin avatars; external avatars fall back to a
  // monogram and the export still works even if the canvas is tainted.
  useLayoutEffect(() => {
    let image = null;
    let cancelled = false;

    function draw() {
      const W = 960;
      const H = 540;
      const canvas = offRef.current;
      if (!canvas) return;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      drawCardInto(ctx, W, H, { ...data, avatarLoaded: Boolean(image), avatarImage: image, skills: skills || [] });
      const preview = previewRef.current;
      if (preview) {
        preview.width = W / 2;
        preview.height = H / 2;
        const pctx = preview.getContext("2d");
        pctx.drawImage(canvas, 0, 0, preview.width, preview.height);
      }
      if (!cancelled) setCardReady(true);
    }

    if (avatar) {
      image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = draw;
      image.onerror = () => {
        image = null;
        draw();
      };
      image.src = avatar;
    } else {
      draw();
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatar, name, username, headline, stats && stats.skills && stats.skills.length]);

  async function copyLink() {
    const done = () => setCopied(true);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(profileUrl);
        done();
      } else {
        const area = document.createElement("textarea");
        area.value = profileUrl;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        document.body.removeChild(area);
        done();
      }
    } catch {
      done();
    }
    window.setTimeout(() => setCopied(false), 2200);
  }

  function downloadCard() {
    const canvas = offRef.current;
    if (!canvas) return;
    let url = null;
    try {
      url = canvas.toDataURL("image/png");
    } catch {
      return;
    }
    const link = document.createElement("a");
    link.download = `${username || "upnex"}-skill-card.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: String(name || "UPNEX profile"),
          text: `Check out ${name || "this profile"} on UPNEX`,
          url: profileUrl
        });
        return;
      } catch {
        // user closed the sheet — fall through to copy
      }
    }
    await copyLink();
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Share your profile"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal-card share-modal" ref={pageRef}>
        <div className="modal-head">
          <h2>Share your profile</h2>
          <button type="button" className="viewer-icon" onClick={onClose} aria-label="Close"><X size={15} /></button>
        </div>

        <div className="share-preview-wrap">
          <canvas ref={previewRef} className="share-preview" aria-label="Profile share card preview" />
          {!cardReady && <div className="share-preview-loading">Rendering card…</div>}
        </div>
        <canvas ref={offRef} className="share-offscreen" aria-hidden="true" />

        <div className="share-url-row">
          <span className="share-url">{profileUrl}</span>
          <button type="button" className={copied ? "share-copy ok" : "share-copy"} onClick={copyLink}>
            {copied ? <Check size={14} /> : <Link2 size={14} />}
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>

        <div className="share-actions">
          <div className="share-qr" aria-label="QR code that opens the public profile">
            <canvas ref={qrRef} width={168} height={168} />
          </div>
          <div className="share-action-buttons">
            <button type="button" className="app-primary" onClick={downloadCard} disabled={!cardReady}>
              <Download size={15} /> Download card
            </button>
            <button type="button" className="app-secondary" onClick={shareLink}>
              <Share2 size={15} /> Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}