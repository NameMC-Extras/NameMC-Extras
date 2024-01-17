const waitForModal = function (callback) {
    if (typeof $ != 'undefined' && typeof $().modal != 'undefined') {
        callback();
    } else {
        setTimeout(function () {
            waitForModal(callback);
        });
    }
};

var profileEls = [...document.querySelectorAll('img.skin-2d')].map(a=>a.parentElement);
if (profileEls.length > 1)  profileEls = document.querySelectorAll('[href*="/my-profile/switch"]');

var profiles = [...profileEls].map(profile => ({
    name: profile.innerText.split(" ")[0],
    image: profile.firstChild.src,
    notifs: (profile.innerText.split(" ").length - 1) ? Number(profile.innerText.split(" ")[1]) : null
})).filter(a => typeof a.image !== "undefined")

if (profiles.length > 0) {
    const imageSize = 50;
    const maxPer = 10;
    var height = 115 * profiles.length + 1;
    var loadedProfiles = []

    var profilesCanvas = document.createElement("canvas");
    profilesCanvas.id = "profilesImage";

    if (profiles.length >= 10) {
        height = 1050;
    }

    profilesCanvas.width = 600 * Math.round(Math.ceil(profiles.length / 10));
    profilesCanvas.height = height;
    profilesCanvas.style.width = "95rem";

    var modalRange = document.createRange();
    var modalHTML = modalRange.createContextualFragment(`
    <div class="modal fade" id="profilesImageModal" tabindex="-1" role="dialog" aria-labelledby="profilesImageModalTitle" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered justify-content-center" role="document">
            <div class="modal-content" style="width:fit-content">
                <div class="modal-header">
                    <h5 class="modal-title">Generated Profiles Image</h5>
                    <button type="button" class="btn" id="modalClose" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body"></div>
                <div class="modal-footer">
                    <p>Generated using NameMC Extras</p>
                </div>
            </div>  
        </div>
    </div>
    `);

    document.body.append(modalHTML);

    waitForModal(() => $("#modalClose").click(() => {
        $("#profilesImageModal").modal("hide");
    }))

    var ctx = profilesCanvas.getContext("2d");
    ctx.fillStyle = window.getComputedStyle(profileEls[0].parentElement.parentElement).backgroundColor;
    ctx.fillRect(0, 0, profilesCanvas.width, profilesCanvas.height);

    function roundedImage(x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    profiles.forEach((profile) => {
        var img = new Image();

        img.onload = () => {
            loadedProfiles.push({ img, ...profile })

            if (loadedProfiles.length == profiles.length) {
                for (let i = 0; i < loadedProfiles.length; i += maxPer) {
                    const chunk = loadedProfiles.slice(i, i + maxPer);

                    chunk.forEach((loadedProfile, j) => {
                        ctx.save();
                        roundedImage(60 * i + imageSize, 100 * j + imageSize, imageSize, imageSize, 10);
                        ctx.clip();
                        ctx.drawImage(
                            loadedProfile.img,
                            60 * i + imageSize,
                            100 * j + imageSize,
                            imageSize,
                            imageSize
                        );
                        ctx.restore()

                        ctx.fillStyle = window.getComputedStyle(profileEls[0]).color;
                        ctx.textAlign = "left";
                        var textSize = 47.5;

                        if (loadedProfile.name.length > 8) {
                            textSize = 42.5;
                        }

                        ctx.font = `${textSize}px Helvetica`;
                        ctx.fillText(`${loadedProfile.name} ${loadedProfile.notifs ? `(${loadedProfile.notifs})` : ""}`, 60 * i + 125, 100 * j + 90);

                        document.querySelector("#generate-image").onclick = () => {
                            document.querySelector(".modal-body").append(profilesCanvas);
                            $("#profilesImageModal").modal("show");
                        };
                    })
                }
            }
        }

        img.src = profile.image;
    });
}
