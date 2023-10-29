window.onload = () => {
  const cameraWidth = parent.document.querySelector("#shotting-div").clientWidth * 0.9;
  const cameraHeight = 480;
  const clipWidth = cameraWidth;//cameraWidth / 2;
  const clipHeight = cameraHeight;//cameraHeight / 2;
  // (x, y) coordinate of left-top of clipping frame
  const clipX = cameraWidth / 2 - clipWidth / 2;
  const clipY = cameraHeight / 2 - clipHeight / 2;

  const video = document.querySelector("#camera");
  const clippingFrame = document.querySelector("#clipping-frame");
  const orgClip = document.querySelector("#org-clip");
  const editedClip = document.querySelector("#edited-clip");
  let img = document.querySelector("#image");
  const ctxEdited = document.querySelector("#edited-clip").getContext("2d");
  var canvases;
  var selectedCanvasIndices = new Set();

  const downloadLink = document.querySelector("#download-link");
  const downloadButton = document.querySelector("#download-button");

  var canvases;// = new Array(contours.size());
  var contexts;// = new Array(contours.size());
  var minXList, minYList, maxXList, maxYList;

  // htmlの書き換え
  video.style.width = String(cameraWidth)+"px";
  video.style.height = String(cameraHeight)+"px";
  clippingFrame.style.width = String(clipWidth) + "px";
  clippingFrame.style.height = String(clipHeight) + "px";
  clippingFrame.style.top = String(cameraHeight/2) + "px";
  clippingFrame.style.left = String(cameraWidth/2) + "px";
  orgClip.width = clipWidth; //String(clipWidth) + "px";
  orgClip.height = clipHeight; //String(clipHeight) + "px";
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
  
  function drawClipFrame(x, y, w, h, color){
    ctxEdited.beginPath();
    ctxEdited.rect(x, y, w, h);
    ctxEdited.strokeStyle = color;
    ctxEdited.lineWidth = 4;
    ctxEdited.stroke();
  }

  function removeClipFrame(i){
    drawClipFrame(minXList[i], minYList[i], maxXList[i]-minXList[i], maxYList[i]-minYList[i], `rgba(0, 0, 0)`);
  }

  function removeClip(i){
    removeClipFrame(i);
    //ctxEdited.clearRect(minXList[i], minYList[i], maxXList[i]-minXList[i], maxYList[i]-minYList[i]);
    canvases.splice(i, 1);
    contexts.splice(i, 1);
    minXList.splice(i, 1);
    minYList.splice(i, 1);
    maxXList.splice(i, 1);
    maxYList.splice(i, 1);
  }
  
  function calcClipArea(i){
    return (maxXList[i]-minXList[i])*(maxYList[i]-minYList[i]);
  }

  // shutter button
  document.querySelector("#shutter").addEventListener("click", () => {
    const ctx = orgClip.getContext("2d");
    video.pause(); // 映像を停止
    setTimeout(() => {
      video.play(); // 0.5秒後にカメラ再開
    }, 500);

    console.log("clipX", clipX);
    console.log("clipY", clipY);
    console.log("clipWidth", clipWidth);
    console.log("clipHeight", clipHeight);
    
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

    //let canvas = document.querySelector("#canvas");
    //let context = canvas.getContext("2d");

    let src = cv.imread(orgClip);
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

    minXList = new Array(contours.size());
    minYList = new Array(contours.size());

    maxXList = new Array(contours.size());
    maxYList = new Array(contours.size());

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

        minXList[i] = Math.min(...xList);
        minYList[i] = Math.min(...yList);
        maxXList[i] = Math.max(...xList);
        maxYList[i] = Math.max(...yList);

        let x0 = Math.min(...xList);
        let y0 = Math.min(...yList);
        let x1 = Math.max(...xList);
        let y1 = Math.max(...yList);

        let w = x1 - x0;
        let h = y1 - y0;

        canvases[i] = document.createElement("canvas");
        canvases[i].setAttribute("id", i);
        canvases[i].width = w;
        canvases[i].height = h;

        contexts[i] = await canvases[i].getContext("2d");
        
        await contexts[i].drawImage(orgClip, x0, y0, w, h, 0, 0, w, h);
        
        // document.querySelector("#edited-clip").parentElement.append(canvases[i]);
      }
    })().then(()=>{
      let includedCanvasIndices = new Set();
      for(let i=0; i<canvases.length; i++){
        for(let j=0; j<canvases.length; j++){
          if(i==j) continue;
          if(minXList[j] < minXList[i] && maxXList[i] < maxXList[j] 
            && minYList[j] < minYList[i] && maxYList[i] < maxYList[j]){
            includedCanvasIndices.add(i);
            break;
          }
        }
        if( calcClipArea(i) < 50){ // 面積が25px^2より小さい
          includedCanvasIndices.add(i);
        }
      }

      console.log(canvases.length);
      for(let i of Array.from(includedCanvasIndices).sort((a, b) => { return b-a; })){
        removeClip(i);
      }
      console.log(includedCanvasIndices.size);
      console.log(canvases.length);
      
      for(let i=0; i<canvases.length; i++){
        let color = `rgb(0, 0, 255)`;
        drawClipFrame(minXList[i], minYList[i], maxXList[i]-minXList[i], maxYList[i]-minYList[i], color);
      }
    });
  });

  editedClip.addEventListener("click", (event) => {
    if ((event.ctrlKey && !event.metaKey) || (!event.ctrlKey && event.metaKey)) {
      console.log(`offsetX:${event.offsetX}, offsetY:${event.offsetY}`);
      for(let i=0; i<canvases.length; i++){
        if(minXList[i] < event.offsetX && event.offsetX < maxXList[i] 
          && minYList[i] < event.offsetY && event.offsetY < maxYList[i]){
          selectedCanvasIndices.add(i);
        }
      }
    }
  });

  document.addEventListener("keyup", () => {
    let x0 = editedClip.width;
    let y0 = editedClip.height;
    let x1 = 0;
    let y1 = 0;
    console.log(selectedCanvasIndices);
    if(selectedCanvasIndices.size > 1){    
      let sortedIndices = Array.from(selectedCanvasIndices).sort((a, b) => {return b-a;});
      console.log("sortedIndices:", sortedIndices);
      for(let i of sortedIndices){
        x0 = Math.min(x0, minXList[i]);
        x1 = Math.max(x1, maxXList[i]);
        y0 = Math.min(y0, minYList[i]);
        y1 = Math.max(y1, maxYList[i]);
        console.log("clip:", minXList[i], minYList[i], maxXList[i], maxYList[i]);
        console.log(x0, y0, x1, y1);
      }
      for(let i=0; i<sortedIndices.length-1; i++){
        // console.log("remove target: ", sortedIndices[i]);
        removeClip(sortedIndices[i]);
      }

      let targetIndex = sortedIndices[sortedIndices.length-1];
      // console.log("remove target: ", targetIndex);
      removeClipFrame(targetIndex);
      canvases[targetIndex].width = x1-x0;
      canvases[targetIndex].height = y1-y0;
      minXList[targetIndex] = x0;
      minYList[targetIndex] = y0;
      maxXList[targetIndex] = x1;
      maxYList[targetIndex] = y1;
      contexts[targetIndex].drawImage(orgClip, x0, y0, x1-x0, y1-y0, 0, 0, x1-x0, y1-y0);
      drawClipFrame(x0, y0, x1-x0, y1-y0, "rgb(0, 0, 255)");
    }
    selectedCanvasIndices.clear();
  });

  editedClip.addEventListener("dblclick", (event) => {
    // console.log(`(offsetX, offsetY) = (${event.offsetX}, ${event.offsetY})`);
    // console.log("minXList:", minXList);
    // console.log("maxXList:", maxXList);
    // console.log("minYList:", minYList);    
    // console.log("maxYList:", maxYList);

    let targetIndex = -1; 
    let minArea = editedClip.width * editedClip.height;
    for(let i=0; i<canvases.length; i++){
      if(minXList[i] < event.offsetX && event.offsetX < maxXList[i] 
        && minYList[i] < event.offsetY && event.offsetY < maxYList[i]){
        if(calcClipArea(i) < minArea){
          targetIndex = i;
          minArea = calcClipArea(i);
        }
      }
    }
    if(targetIndex != -1) removeClip(targetIndex);
  });

  document.querySelector("#btn-submit").addEventListener("click", () => {
    console.log("minXList:", minXList);
    console.log("maxXList:", maxXList);
    console.log("minYList:", minYList);    
    console.log("maxYList:", maxYList);
    var formData = new FormData();
    
    let promises = canvases.map((canvas) => {
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        });
      });
    });

    Promise.all(promises).then((blobs) => {
      // formData.append("clips", blobs);
      // for (const key of formData.keys()) {
      //   console.log(key);
      // }
      blobs.forEach((blob) => { formData.append("clips", blob); });
      fetch("/post-clips", {
        method: "POST",
        body: formData
      }).then(() => {
        if(window.parent != window){ // iframe内にいた場合
          let parentDoc = parent.document;
          console.log(parentDoc);
          parentDoc.querySelector("#pdf-frame").contentWindow.loadImages();
        }
      });
    })
    
    /*
    document.querySelector("#edited-clip").toBlob(
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
            parentDoc.querySelector("#pdf-frame").contentWindow.getLatestClip();
          }
          // window.location.href = res.url;
        }).catch((err) => {
          alert(err);
        });
      }
    );
    */
  });
};
