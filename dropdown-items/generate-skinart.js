import { downloadZip } from "../js/client-zip.min.js";

const waitForModal = function (callback) {
    if (typeof $ != 'undefined' && typeof $().modal != 'undefined') {
        setTimeout(() => {
            callback();
        });
    } else {
        setTimeout(() => {
            waitForModal(callback);
        });
    }
};

var modalRange = document.createRange();
var modalHTML = modalRange.createContextualFragment(`
    <div class="modal fade" id="skinArtModal" tabindex="-1" role="dialog" aria-labelledby="skinArtModalTitle" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered justify-content-center" role="document">
            <div class="modal-content" style="width:fit-content">
                <div class="modal-header">
                    <h5 class="modal-title">Generate Skin Art</h5>
                    <button type="button" class="btn" id="modalClose2" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="row g-1 mb-3">
                        <div class="form-group">
                            <label class="form-label" for="art"><strong>Skin Art (72x24px):</strong></label>
                            <input class="form-control" id="art" type="file" accept="image/*" />
                        </div>
                        <div class="col-12"></div>
                        <div class="form-group">
                            <label class="form-label" for="baseskin"><strong>Base Skin (Optional):</strong></label>
                            <input class="form-control" id="baseskin" type="file" accept="image/*" />
                        </div>
                    </div>
                    <hr class="mt-0">
                    <div class="text-center">
                        <button class="btn btn-primary px-4" id="gen">Generate!</button>
                    </div>
                </div>
                <div class="modal-footer">
                    <p>Generated with <a href="https://skinart.zip" target="_blank">skinart.zip</a></p>
                </div>
            </div>  
        </div>
    </div>
    `);

document.documentElement.append(modalHTML);

waitForModal(() => $("#modalClose2").click(() => {
    $("#skinArtModal").modal("hide");
}));

document.querySelector("#generate-skinart").onclick = () => {
    $("#skinArtModal").modal("show");
};

const baseskin = document.querySelector("#baseskin");
const art = document.querySelector("#art");
const gen = document.querySelector("#gen");

var base = new Image();
base.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAGUExURQAAAAAAAKVnuc8AAAACdFJOU/8A5bcwSgAAAAlwSFlzAAAOwwAADsMBx2+oZAAAABh0RVh0U29mdHdhcmUAUGFpbnQuTkVUIDUuMS4xYrVSDAAAALZlWElmSUkqAAgAAAAFABoBBQABAAAASgAAABsBBQABAAAAUgAAACgBAwABAAAAAgAAADEBAgAQAAAAWgAAAGmHBAABAAAAagAAAAAAAABgAAAAAQAAAGAAAAABAAAAUGFpbnQuTkVUIDUuMS4xAAMAAJAHAAQAAAAwMjMwAaADAAEAAAABAAAABaAEAAEAAACUAAAAAAAAAAIAAQACAAQAAABSOTgAAgAHAAQAAAAwMTAwAAAAABt005TUCIYLAAAAb0lEQVRYR+3SMQrAMAxDUef+l65iPiE0Sx06Gb2hIFFrSgzEC/VCvVAPD/QYMJv2x5AvY0N9PBpi6jBwi3sPCLGOew8IsY77Hwbyg2yEuFAf/00dBm5x7wEh1nHvASHWcf/DQH6QjRA/5Q4DZiYRD89vA2HA6LX7AAAAAElFTkSuQmCC";

baseskin.addEventListener("change", () => {
    if (baseskin.files.length == 1) {
        const skinFile = baseskin.files[0]
        const skinReader = new FileReader();
        skinReader.addEventListener(
            "load",
            async () => {
                base.src = skinReader.result;
            })

        if (skinFile) {
            skinReader.readAsDataURL(skinFile);
        }
    }
});

gen.addEventListener("click", () => {
    if (art.files.length == 1) {
        const file = art.files[0]
        const reader = new FileReader();

        reader.addEventListener(
            "load",
            () => {
                var image = new Image();
                image.onload = async () => {
                    if (image.width == 72 && image.height == 24) {
                        if (base.width == 64 && (base.height == 32 || base.height == 64)) {
                            var imagePieces = [];
                            var i = 0;
                            for (var x = 0; x < 9; ++x) {
                                for (var y = 0; y < 3; ++y) {
                                    i++
                                    var canvas = document.createElement('canvas');
                                    canvas.width = 64;
                                    canvas.height = base.height;
                                    var context = canvas.getContext('2d');
                                    context.drawImage(base, 0, 0, 64, base.height, 0, 0, 64, base.height)
                                    context.drawImage(image, x * 8, y * 8, 8, 8, 40, 8, 8, 8);
                                    imagePieces.push({
                                        name: "Skin-" + (28 - i) + ".png",
                                        input: await new Promise(resolve => canvas.toBlob(resolve))
                                    });
                                }
                            }

                            const blob = await downloadZip(imagePieces).blob();

                            const link = document.createElement("a");
                            link.href = URL.createObjectURL(blob);
                            link.download = "skinart.zip";
                            link.click();
                            link.remove();
                        } else {
                            alert("Base Skin not 64x64px or 64x32px!");
                        }
                    } else {
                        alert("Skin Art not 72x24px!");
                    }
                };
                image.src = reader.result;
            },
            false,
        );

        if (file) reader.readAsDataURL(file);
    }
});
