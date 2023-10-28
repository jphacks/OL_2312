window.onload = () => {
  const cameraWidth = 640;
  const cameraHeight = 480;
  const clipWidth = cameraWidth / 2;
  const clipHeight = cameraHeight / 2;
  // (x, y) coordinate of left-top of clipping frame
  const clipX = cameraWidth / 2 - clipWidth / 2;
  const clipY = cameraHeight / 2 - clipHeight / 2;

  const video = document.querySelector("#camera");
  const clippingFrame = document.querySelector("#clipping-frame");
  const orgClip = document.querySelector("#org-clip");
  const editedClip = document.querySelector("#edited-clip");

  const downloadLink = document.querySelector("#download-link");
  const downloadButton = document.querySelector("#download-button");

  // htmlの書き換え
  video.style.width = String(cameraWidth);
  video.style.height = String(cameraHeight);
  clippingFrame.style.width = String(clipWidth) + "px";
  clippingFrame.style.height = String(clipHeight) + "px";
  clippingFrame.style.top = String(cameraHeight / 2) + "px";
  clippingFrame.style.left = String(cameraWidth / 2) + "px";
  orgClip.style.width = String(clipWidth) + "px";
  orgClip.style.height = String(clipHeight) + "px";
  editedClip.style.width = orgClip.style.width;
  editedClip.style.height = orgClip.style.height;

  /** カメラ設定 */
  const constraints = {
    audio: false,
    video: {
      width: cameraWidth,
      height: cameraHeight,
      facingMode: "user",
    },
  };

  /**
   * カメラを<video>と同期
   */
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then((stream) => {
      // カメラからの映像取得成功
      video.srcObject = stream;
      video.onloadedmetadata = (e) => {
        video.play();
      };
    })
    .catch((err) => {
      // 失敗
      console.log(err.name + ": " + err.message);
    });
  
  // shutter button
  document.querySelector("#shutter").addEventListener("click", () => {
    const ctx = orgClip.getContext("2d");
    video.pause(); // 映像を停止
    setTimeout(() => {
      video.play(); // 0.5秒後にカメラ再開
    }, 500);

    // orgClipに画像を貼り付ける
    //ctx.drawImage(video, 0, 0, 640, 480);
    // ctx.drawImage(video, 0, 0, cameraWidth, cameraHeight);
    ctx.drawImage(
      video,
      clipX,
      clipY,
      clipWidth,
      clipHeight,
      0,
      0,
      clipWidth,
      clipHeight
    );
    // ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    // ダウンロードリンクのhref属性にデータURLを設定
    // downloadButton.disabled = null;
    // downloadLink.href = orgClip.toDataURL("image/png");

    let src = cv.imread('org-clip');
    let dst = new cv.Mat();
    let M = cv.Mat.ones(3, 3, cv.CV_8U);
    cv.Canny(src, dst, 50, 100, 3, false);
    cv.morphologyEx(dst, dst, cv.MORPH_CLOSE, M);
    cv.imshow('edited-clip', dst);
    src.delete();
    dst.delete();
  });

  document.querySelector("#btn-submit").addEventListener("click", () => {
    document.querySelector("#edited-clip").toBlob(
      (blob) => {
        var formData = new FormData();
        formData.append("clip", blob);
        fetch("/pdf-viewer", {
          method: "POST",
          body: formData
        }).then((res) => {
          if(window.parent != window){ // iframe内にいた場合
            let parentDoc = parent.document;
            console.log(parentDoc);
            parentDoc.querySelector("#pdf-frame").contentWindow.location.reload();
          }
          // window.location.href = res.url;
        }).catch((err) => {
          alert(err);
        });
      }
    );
  });
};
