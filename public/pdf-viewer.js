window.onload = () => {

    let canvases = [];
    let contexts = [];

    let currFilename = "";
    let imagesDict = {};

    const scale = 3;

    document.onmousedown = (event) => {
        document.querySelectorAll(".selected").forEach((e) => {
            if (!e.classList.contains("hover")) {
                e.classList.remove("selected");
            }
        });
    }

    document.querySelectorAll("a").forEach(e => {
        console.log(e);
        e.onclick = (event) => {
            setPDF(e.href);
            return false;
        }
    });

    document.querySelectorAll("#figures img").forEach((e) => {
        e.ondragstart = (event) => {
            console.log(event.target);
            event.dataTransfer.setData("text/html", event.target.outerHTML);
            event.dataTransfer.setData("offsetX", event.offsetX);
            event.dataTransfer.setData("offsetY", event.offsetY);
        }
    });

    document.querySelector("#pdf-viewer").ondragover = (event) => {
        event.preventDefault();
    };

    document.querySelector("#pdf-viewer").addEventListener("drop", function (event) {

        console.log(event.target, event.currentTarget, this);

        let div = htmlToElement(`<div class="img-wrapper">${event.dataTransfer.getData("text/html")}</div>`);
        let img = div.lastChild;

        img.setAttribute("draggable", "false");

        div.onmouseenter = (event) => {
            div.classList.add("hover");
        }

        div.onmouseleave = (event) => {
            div.classList.remove("hover");
        }

        img.oncontextmenu = (event) => {
            return false;
        }

        img.onmousedown = (event) => {

            if (!div.classList.contains("selected")) {
                div.classList.add("selected");
            }

            if (event.button == 0) {
                let offsetX = event.offsetX;
                let offsetY = event.offsetY;

                //div.style.transform = `rotate(30deg)`;

                this.onmousemove = (event) => {
                    event.preventDefault();
                    div.style.top = this.scrollTop + event.clientY - this.offsetTop - offsetY + "px";
                    div.style.left = this.scrollLeft + event.clientX - this.offsetLeft - offsetX + "px";
                }

                img.onmouseup = (event) => {
                    this.onmousemove = null;
                }

            } else if (event.button == 2) {
                let angle = 0;

                let m = parseInt(div.style.transform.match(/[0-9]+/g));
                if (m) angle = Number(m);

                console.log(angle);

                div.style.transform = `rotate(${angle + 10}deg)`;
                console.log(div.style.transform);
            }
        }

        img.ondblclick = (event) => {
            div.remove();
        }

        div.style.top = this.scrollTop + event.clientY - this.offsetTop - (event.dataTransfer.getData("offsetY")) + "px";
        div.style.left = this.scrollLeft + event.clientX - this.offsetLeft - Number(event.dataTransfer.getData("offsetX")) + "px";

        this.append(div);

        event.dataTransfer.clearData();
    }, false);

    //const url = "https://arxiv.org/pdf/1706.03762.pdf";

    document.querySelector("#upload").addEventListener("change", function (event) {
        console.log(this.files[0]);
    });

    document.querySelector("#submit").addEventListener("click", (event) => {
        const form = document.querySelector("#pdf-form");
        const data = new FormData(form);
        const action = form.getAttribute("action");
        const options = {
            method: "post",
            body: data,
        }
        fetch(action, options).then(res => {
            console.log(res);
            return res.arrayBuffer();
        }).then(buffer => {
            console.log(buffer);
            const url = URL.createObjectURL(new Blob([buffer], { type: "application/pdf" }));
            let li = document.createElement("li");
            let a = htmlToElement(`<a href="${url}">${document.querySelector("#upload").files[0].name}</a>`);
            a.onclick = (event) => {
                setPDF(a.href);
                return false;
            }
            li.append(a);
            document.querySelector("#pdfs").append(li);
        });
    })

    let pdfs = document.getElementById("pdfs");

    let i = 0;

    fetch("/pdf-list-names").then(res => {
        return res.text();
    }).then(data => {
        (async () => {
            for (filename of data.split(",")) {
                const res = await fetch("/pdf-list");
                const buffer = await res.arrayBuffer();
                const url = await URL.createObjectURL(new Blob([buffer], { type: "application/pdf" }));

                let li = document.createElement("li");
                let a = htmlToElement(`<a href="${url}">${filename}</a>`);
                a.onclick = (event) => {
                    currFilename = filename;
                    setPDF(a.href);
                    return false;
                }
                li.append(a);
                document.querySelector("#pdfs").append(li);
            }
        })();
    });

    function setPDF(url) {
        document.querySelector("#pdf-viewer").innerHTML = "";
        canvases = [];
        contexts = [];
        pdfjsLib.getDocument(url).promise.then((pdf) => {
            // ページの順番を保つために同期
            (async () => {
                for await (i of [...Array(pdf.numPages + 1).keys()].slice(1)) {
                    await pdf.getPage(i).then((page) => {
                        let viewport = page.getViewport({ scale: scale });
                        let canvas = document.createElement("canvas");
                        let context = canvas.getContext("2d", { willReadFrequently: true });
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;
                        canvas.setAttribute("id", i);
                        document.querySelector("#pdf-viewer").appendChild(canvas);
                        page.render({
                            canvasContext: context,
                            viewport: viewport
                        });
                        canvases.push(canvas);
                        contexts.push(context);
                    });
                }
            })();
        });
    }

    function canvases2pdf(path, canvases) {
        let doc = new jspdf.jsPDF();
        for (canvas of canvases) {
            let dataURL = canvas.toDataURL("image/png");
            doc.addImage(dataURL, "PNG", 0, 0, doc.getPageWidth(), doc.getPageHeight());
            doc.addPage();
        }
        doc.deletePage(canvases.length + 1);
        doc.save(path);
    }

    function canvas2pdf(path, canvas) {

        let context = canvas.getContext("2d", { willReadFrequently: true });
        let scrollTop = 0;

        let doc = new jspdf.jsPDF();/*{
                unit: "px",
                format: [width, height]
            });*/

        const width = canvas.clientWidth;
        const height = doc.getPageHeight() / doc.getPageWidth() * width;

        let i = 0;

        while (scrollTop < canvas.clientHeight) {
            let imageData = context.getImageData(0, scrollTop, width, height);
            let page = document.createElement("canvas");
            page.width = width;
            page.height = height;
            page.getContext("2d").putImageData(imageData, 0, 0);
            let dataURL = page.toDataURL("image/png");
            doc.addImage(dataURL, "PNG", 0, 0, width, height);
            doc.addPage();
            scrollTop += height;
        }

        doc.deletePage(doc.internal.getNumberOfPages());
        doc.save(path);
    }

    document.getElementById("download").onclick = () => {
        let images = document.querySelectorAll(".img-wrapper img");

        for (let i = 0; i < canvases.length; i++) {
            let canvasRect = canvases[i].getBoundingClientRect();
            for (let j = 0; j < images.length; j++) {
                let imageRect = images[j].getBoundingClientRect();
                if (canvasRect.left < imageRect.right && imageRect.left < canvasRect.right && canvasRect.top < imageRect.bottom && imageRect.top < canvasRect.bottom) {
                    contexts[i].drawImage(images[j], (imageRect.left - canvasRect.left) * scale, (imageRect.top - canvasRect.top) * scale, imageRect.width * scale, imageRect.height * scale);
                }
            }
        }
        canvases2pdf("hoge.pdf", canvases);
        //canvas2pdf("test.pdf", canvas);
    }

    document.querySelector("#save").onclick = () => {
        const form = document.querySelector("#edit-data");
        const editData = {};
        editData[currFilename] = [];
        console.log(editData);
        document.querySelector("#pdf-viewer").querySelectorAll(".img-wrapper").forEach(e => {
            editData[currFilename].push(e.outerHTML);
        });

        form.querySelector("input[name='edit-data']").value = JSON.stringify(editData);
        console.log(form.querySelector("input[name='edit-data']").value );
        form.submit();
        return false;
    }

    function htmlToElement(html) {
        let parent = document.createElement(null);
        parent.innerHTML = html;
        return parent.firstChild;
    }
}
