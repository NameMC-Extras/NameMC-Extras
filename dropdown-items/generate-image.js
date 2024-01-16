console.log("test")
var profileEls = document.querySelectorAll('[href*="/my-profile/switch"]');

var profiles = [...profileEls].map(profile => ({
    name: profile.innerText.split(" ")[0],
    image: profile.firstChild.src,
    notifs: (profile.innerText.split(" ").length - 1) ? Number(profile.innerText.split(" ")[1]) : null
})).filter(a=>typeof a.image !== "undefined")

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
                            textSize = 40;
                        }

                        ctx.font = `${textSize}px Helvetica`;
                        ctx.fillText(`${loadedProfile.name} ${loadedProfile.notifs ? `(${loadedProfile.notifs})` : ""}`, 60 * i + 125, 100 * j + 90);

                        document.querySelector("#generate-image").onclick = () => {
                            var imageWindow = window.open()
                            imageWindow.document.body.append(profilesCanvas)
                            imageWindow.profilesImage.style.width = profilesCanvas.width/5;
                        };
                    })
                }
            }
        }

        img.src = profile.image;
    });
}