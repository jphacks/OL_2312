// 画像から抽出されたそれぞれの図
class Figure {
  constructor(xMin, yMin, width, height) {
    this.xMin = xMin;
    this.xMax = xMin + width;
    this.yMin = yMin;
    this.yMax = yMin + height;

    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.width = width;
    this.canvas.height = height;
    this.height = height;
    this.lineWidth = 4;
  }

  async setContext(srcClip) {
    this.context = await this.canvas.getContext("2d");
    await this.context.drawImage(
      srcClip,
      this.xMin,
      this.yMin,
      this.width,
      this.height,
      0,
      0,
      this.width,
      this.height
    );
  }

  drawFrame(context, color="rgb(0, 0, 255)") {
    this.frameColor = color;
    context.beginPath();
    context.rect(this.xMin, this.yMin, this.width, this.height, color);
    context.strokeStyle = color;
    context.lineWidth = this.lineWidth;
    context.stroke();
  }

  removeFrame(context) {
    this.drawFrame(context, "rgb(0,0,0,255)");
  }

  hasInside(x, y) {
    return (this.xMin < x) && (x < this.xMax) && (this.yMin < y) && (y < this.yMax);
  }

  calcArea() {
    return this.width * this.height;
  }
}

class ClipEditor {
  constructor(srcClip, dstClip) {
    this.figures = new Array();
    this.srcClip = srcClip;
    this.dstClip = dstClip;
    this.dstClipContext = dstClip.getContext("2d");
    this.selectedFigureIndices = new Set();
  }

  async addFigure(xMin, yMin, width, height){
    // 小さすぎる図形は無視
    if (width * height < 50) return;

    let figure = new Figure(xMin, yMin, width, height);
    await figure.setContext(this.srcClip);
    this.figures.push(figure);    
    // document.querySelector("#edited-clip").parentElement.append(figure.canvas);
  }

  async addFigureFromContour(cnt) {
    let data = cnt.data32S;
    let xList = new Array(data.length / 2);
    let yList = new Array(data.length / 2);

    for (let i = 0; i < data.length / 2; i++) {
      xList[i] = data[2 * i];
      yList[i] = data[2 * i + 1];
    }

    let xMin = Math.min(...xList);
    let yMin = Math.min(...yList);
    let width = Math.max(...xList) - xMin;
    let height = Math.max(...yList) - yMin;

    await this.addFigure(xMin, yMin, width, height);
  }

  drawFrame(i, color="rgb(0, 0, 255)"){
    this.figures[i].drawFrame(this.dstClipContext, color);
  }

  removeFigure(i) {
    if (i < 0 || i >= this.figures.length) return;
    this.figures[i].removeFrame(this.dstClipContext);
    this.figures.splice(i, 1);
  }

  clearFigures(){
    this.figures.length = 0;
  }

  removeIncludedFigures() {
    let removeFiguresIndices = new Set();
    for (let i = 0; i < this.figures.length; i++) {
      for (let j = 0; j < this.figures.length; j++) {
        if (i == j) continue;

        let fig1 = this.figures[i];
        let fig2 = this.figures[j];

        if (
          fig2.xMin < fig1.xMin &&
          fig1.xMax < fig2.xMax &&
          fig2.yMin < fig1.yMin &&
          fig1.yMax < fig2.yMax
        ) {
          removeFiguresIndices.add(i);
          break;
        }
      }
    }

    for (let i of Array.from(removeFiguresIndices).sort((a, b) => b - a)) {
      this.removeFigure(i);
    }
  }

  updateSelectedFigures(x, y) {
    for (let i = 0; i < this.figures.length; i++) {
      if (this.figures[i].hasInside(x, y)) {
        this.selectedFigureIndices.add(i);
      }
    }
  }

  removeSelectedFigure(x, y) {
    let targetIndex = -1;
    let minArea = this.dstClip.width * this.dstClip.height;
    for (let i = 0; i < this.figures.length; i++) {
      if (this.figures[i].hasInside(x, y)) {
        let area = this.figures[i].calcArea();
        if (area < minArea) {
          targetIndex = i;
          minArea = area;
        }
      }
    }
    if (targetIndex != -1) this.removeFigure(targetIndex);
  }

  async mergeSelectedFigures() {
    let xMin = this.dstClip.width;
    let yMin = this.dstClip.height;
    let xMax = 0;
    let yMax = 0;

    if (this.selectedFigureIndices.size < 2){
      this.clearSelectedFigures();
      return;
    } 
    
    let sortedIndices = Array.from(this.selectedFigureIndices).sort((a, b) => b - a);
    // console.log("sortedIndices:", sortedIndices);
    for (let i of sortedIndices) {
      xMin = Math.min(xMin, this.figures[i].xMin);
      xMax = Math.max(xMax, this.figures[i].xMax);
      yMin = Math.min(yMin, this.figures[i].yMin);
      yMax = Math.max(yMax, this.figures[i].yMax);
      // console.log("clip:", minXList[i], minYList[i], maxXList[i], maxYList[i]);
      // console.log(x0, y0, x1, y1);
    }
    for (let i of sortedIndices) {
      // console.log("remove target: ", sortedIndices[i]);
      this.removeFigure(i);
    }

    await this.addFigure(xMin, yMin, xMax-xMin, yMax-yMin);
    //this.figures.slice(-1)[0].drawFrame(this.dstClipContext);
    this.drawFrame(this.figures.length-1);
    this.clearSelectedFigures();
  }

  clearSelectedFigures() {
    this.selectedFigureIndices.clear();
  }
}

window.onload = () => {
  var clipEditor;

  const cameraWidth =
    parent.document.querySelector("#shotting-div").clientWidth * 0.9;
  const cameraHeight = 480;

  const video = document.querySelector("#camera");
  const orgClip = document.querySelector("#org-clip");
  const orgClipContext = orgClip.getContext("2d");
  const editedClip = document.querySelector("#edited-clip");
  clipEditor = new ClipEditor(orgClip, editedClip);

  // htmlの書き換え
  video.style.width = String(cameraWidth) + "px";
  video.style.height = String(cameraHeight) + "px";
  orgClip.width = cameraWidth;
  orgClip.height = cameraHeight;
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

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then((stream) => {
      video.srcObject = stream;
      video.onloadedmetadata = (e) => {
        video.play();
      };
    })
    .catch((err) => {
      console.log(err.name + ": " + err.message);
    });

  // shutter button
  document.querySelector("#shutter").addEventListener("click", () => {
    video.pause(); // 映像を停止
    setTimeout(() => {
      video.play(); // 0.5秒後にカメラ再開
    }, 500);

    // orgClipに画像を貼り付ける
    orgClipContext.drawImage(video, 0, 0, cameraWidth, cameraHeight, 0, 0, cameraWidth, cameraHeight);

    // 線画抽出
    let src = cv.imread(orgClip);
    let dst = new cv.Mat();
    let M = cv.Mat.ones(15, 15, cv.CV_8U);
    cv.Canny(src, dst, 100, 200, 3, false);
    cv.morphologyEx(dst, dst, cv.MORPH_CLOSE, M);
    cv.imshow("edited-clip", dst);

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
    
    clipEditor.clearFigures();
    (async () => {
      for await (i of [...Array(contours.size()).keys()]) {
        console.log("num contours:", contours.size());
        let cnt = contours.get(i);
        await clipEditor.addFigureFromContour(cnt);
      }
    })().then(() => {
      clipEditor.removeIncludedFigures();
      console.log("num figures:", clipEditor.figures.length);
      for (let i=0; i<clipEditor.figures.length; i++) {
        clipEditor.drawFrame(i);
      }
    });
  });

  editedClip.addEventListener("click", (event) => {
    // ctrlキーが押されたら
    if (
      (event.ctrlKey && !event.metaKey) ||
      (!event.ctrlKey && event.metaKey)
    ) {
      console.log(`offsetX:${event.offsetX}, offsetY:${event.offsetY}`);
      clipEditor.updateSelectedFigures(event.offsetX, event.offsetY);
    }
  });

  editedClip.addEventListener("dblclick", (event) => {
    clipEditor.removeSelectedFigure(event.offsetX, event.offsetY);
  });

  document.addEventListener("keyup", (event) => {
    if (event.key != "Control") return;
    clipEditor.mergeSelectedFigures();
    console.log(clipEditor.figures);
  });

  document.querySelector("#btn-submit").addEventListener("click", () => {
    // console.log("minXList:", minXList);
    // console.log("maxXList:", maxXList);
    // console.log("minYList:", minYList);
    // console.log("maxYList:", maxYList);
    var formData = new FormData();

    let promises = clipEditor.figures.map((figure) => {
      return new Promise((resolve, reject) => {
        figure.canvas.toBlob((blob) => {
          resolve(blob);
        });
      });
    });

    Promise.all(promises).then((blobs) => {
      // formData.append("clips", blobs);
      // for (const key of formData.keys()) {
      //   console.log(key);
      // }
      blobs.forEach((blob) => {
        formData.append("clips", blob);
      });
      fetch("/post-clips", {
        method: "POST",
        body: formData,
      }).then(() => {
        if (window.parent != window) {
          // iframe内にいた場合
          let parentDoc = parent.document;
          console.log(parentDoc);
          parentDoc.querySelector("#pdf-frame").contentWindow.loadImages();
        }
      });
    });
  });
};
