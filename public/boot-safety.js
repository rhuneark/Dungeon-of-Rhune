// Safety net: never leave the player staring at a black screen. If the bundle
// fails to load or boot throws before lifting the cover, fade it after 4s.
setTimeout(function () {
    var c = document.getElementById('boot-cover');
    if (c && !c.classList.contains('hidden')) c.classList.add('hidden');
}, 4000);
