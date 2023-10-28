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

  var canvases;// = new Array(contours.size());
  var contexts;// = new Array(contours.size());

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

    let img = document.querySelector("#image");
    //let canvas = document.querySelector("#canvas");
    //let context = canvas.getContext("2d");

    let src = cv.imread("image");
    let dst = new cv.Mat();
    let M = cv.Mat.ones(15, 15, cv.CV_8U);
    cv.Canny(src, dst, 100, 200, 3, false);
    cv.morphologyEx(dst, dst, cv.MORPH_CLOSE, M);
    cv.imshow('edited-clip', dst);
    //src.delete();
    //dst.delete();

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();

    cv.findContours(
      dst,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE,
      { x: 0, y: 0 }
    );

    let minXList = new Array(contours.size());
    let minYList = new Array(contours.size());

    let maxXList = new Array(contours.size());
    let maxYList = new Array(contours.size());

    canvases = new Array(contours.size());
    contexts = new Array(contours.size());

    (async () => {
      for await (i of [...Array(contours.size()).keys()]) {

        let cnt = contours.get(i);
        let data = cnt.data32S;
        let xList = new Array(data.length / 2);
        let yList = new Array(data.length / 2);

        for (let j = 0; j < data.length / 2; j++) {
          xList[j] = data[2 * j];
          yList[j] = data[2 * j + 1];
        }

        /*minXList[i] = Math.min(...xList);
        minYList[i] = Math.min(...yList);
        maxXList[i] = Math.max(...xList);
        maxYList[i] = Math.max(...yList);*/

        let x0 = Math.min(...xList);
        let y0 = Math.min(...yList);
        let x1 = Math.max(...xList);
        let y1 = Math.max(...yList);

        let w = x1 - x0;
        let h = y1 - y0;

        console.log(x0, y0, x1, y1);

        canvases[i] = document.createElement("canvas");
        canvases[i].setAttribute("id", i);
        canvases[i].width = w;
        canvases[i].height = h;

        /*let canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        let context = canvas.getContext("2d");*/

        contexts[i] = await canvases[i].getContext("2d");

        await contexts[i].drawImage(img, x0, y0, w, h, 0, 0, w, h);
        //document.querySelector("#canvases").append(canvas);
      }
    })().then(()=>{
      for(canvas of canvases) {
        document.querySelector("#canvases").append(canvas);
      }
    });
    
    //console.log(canvases[20].width, canvases[20].height);
    /*let src = cv.imread("figures/sample.jpg");
    src = cv.cvtColor(src, cv.COLOR_BGR2RGB);
    gray = cv.cvtColor(src, cv.COLOR_BGR2GRAY);
    dx = cv.Sobel(gray, cv.CV_8U, 1, 0);
    dy = cv.Sobel(gray, cv.CV_8U, 0, 1);*/
  });

  //423;

  document.querySelector("#btn-submit").addEventListener("click", () => {
    /*document.querySelector("#edited-clip")*/canvases[0].toBlob(
      (blob) => {
        var formData = new FormData();
        formData.append("clip", blob);
        fetch("/pdf-viewer", {
          method: "POST",
          body: formData
        }).then((res) => {
          if (window.parent != window) { // iframe内にいた場合
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
