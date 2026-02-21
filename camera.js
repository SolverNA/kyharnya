// ===================================================
//  camera.js — Camera access, photo capture & post upload
// ===================================================

/**
 * Requests camera access and shows the overlay.
 * Prefers the rear-facing camera on mobile devices.
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

    tempImage = canvas.toDataURL("image/jpeg", 0.4);

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
 * Reads the form values, builds a post object, and pushes it to Firebase.
 * Status starts as "pending" until the other chefs vote.
 */
function finalizePost() {
    if (!currentUser) return alert("Войдите в аккаунт!");

    const btn = document.getElementById("saveBtn");
    btn.disabled = true;
    btn.innerText = "Загрузка...";

    const postData = {
        img:      tempImage,
        chef:     document.getElementById("chefSelect").value,
        author:   currentUser.displayName || currentRole,
        authorId: currentUser.uid,
        time:     new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status:   "pending",
        votes:    {},
    };

    db.ref("cook_posts/" + selectedKey)
        .push(postData)
        .then(() => {
            btn.disabled = false;
            btn.innerText = "Опубликовать";
            document.getElementById("uploadForm").style.display = "none";
        })
        .catch(err => {
            alert("Ошибка: " + err.message);
            btn.disabled = false;
            btn.innerText = "Опубликовать";
        });
}
