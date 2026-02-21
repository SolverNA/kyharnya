// ===================================================
//  camera.js — Camera access, photo capture & upload
// ===================================================

/**
 * Requests camera access and shows the overlay.
 */
async function openCamera() {
    const overlay = document.getElementById("cameraOverlay");
    const video   = document.getElementById("webcam");

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false,
        });
        video.srcObject = stream;
        overlay.style.display = "flex";
    } catch (err) {
        alert("Доступ к камере отклонен.");
    }
}

/**
 * Captures the current video frame into `tempImage` and closes the camera.
 */
function capturePhoto() {
    const video  = document.getElementById("webcam");
    const canvas = document.getElementById("photoCanvas");

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    // Compress to JPEG — 0.5 quality is enough for a food photo
    tempImage = canvas.toDataURL("image/jpeg", 0.5);

    closeCamera();
    document.getElementById("uploadForm").style.display = "block";
}

/**
 * Stops all camera tracks and hides the camera overlay.
 */
function closeCamera() {
    const video = document.getElementById("webcam");
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
    document.getElementById("cameraOverlay").style.display = "none";
}

/**
 * Sends the photo + metadata to /api/upload which:
 *  1. Uploads photo to Cloudinary
 *  2. Saves post to Firebase
 *  3. Sends Telegram notifications
 */
async function finalizePost() {
    if (!currentUser) return alert("Войдите в аккаунт!");
    if (!tempImage)   return alert("Сначала сделайте фото!");

    const btn = document.getElementById("saveBtn");
    btn.disabled  = true;
    btn.innerText = "Загрузка...";

    const chef   = document.getElementById("chefSelect").value;
    const now    = new Date();
    const time   = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    try {
        const res = await fetch("/api/upload", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
                imageBase64: tempImage,
                chef,
                author:   currentRole || currentUser.displayName,
                authorId: currentUser.uid,
                dateKey:  selectedKey,
                time,
            }),
        });

        const data = await res.json();

        if (!data.ok) throw new Error(data.error || "Upload failed");

        btn.disabled  = false;
        btn.innerText = "Опубликовать";
        document.getElementById("uploadForm").style.display = "none";
        tempImage = null;

    } catch (err) {
        alert("Ошибка: " + err.message);
        btn.disabled  = false;
        btn.innerText = "Опубликовать";
    }
}
