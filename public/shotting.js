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
  const canvas = document.querySelector("#picture");
  const downloadLink = document.querySelector("#download-link");
  const downloadButton = document.querySelector("#download-button");

  // htmlの書き換え
  video.style.width = String(cameraWidth);
  video.style.height = String(cameraHeight);
  clippingFrame.style.width = String(clipWidth) + "px";
  clippingFrame.style.height = String(clipHeight) + "px";
  clippingFrame.style.top = String(cameraHeight / 2) + "px";
  clippingFrame.style.left = String(cameraWidth / 2) + "px";
  canvas.style.width = String(clipWidth) + "px";
  canvas.style.height = String(clipHeight) + "px";

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
    const ctx = canvas.getContext("2d");

    video.pause(); // 映像を停止
    setTimeout(() => {
      video.play(); // 0.5秒後にカメラ再開
    }, 500);

    // canvasに画像を貼り付ける
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
    // downloadLink.href = canvas.toDataURL("image/png");
  });

  document.querySelector("#btn-submit").addEventListener("click", () => {
    document.querySelector("#picture").toBlob(
      (blob) => {
        var formData = new FormData();
        formData.append("clip", blob);
        fetch("/index", {
          method: "POST",
          body: formData
        }).then((res) => {
          window.location.href = res.url;
        }).catch((err) => {
          alert(err);
        });
      }
    );
  });
};

function sendServer(url, param) {
  fetch(url, param)
    .then((response) => {
      return response.json();
    })
    .then((json) => {
      if (json.status) {
        alert("送信に『成功』しました");
        setImage(json.result); //json.resultにはファイル名が入っている
      } else {
        alert("送信に『失敗』しました");
        console.log(`[error1] ${json.result}`);
      }
    })
    .catch((error) => {
      alert("送信に『失敗』しました");
      console.log(`[error2] ${error}`);
    });
}
