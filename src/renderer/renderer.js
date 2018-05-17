var css = require('dom-css')
const { ipcRenderer } = require('electron');

let holder = document.getElementById('drag-file');

holder.ondragover = () => {
    return false;
}

holder.ondragleave = () => {
    return false;
}

holder.ondragend = () => {
    return false;
}

holder.ondrop = (e) => {
    e.preventDefault()

    for (let f of e.dataTransfer.files) {
        console.log('File(s) you dragged here: ', f.path)
        ipcRenderer.send('filereceived', f.path)
    }

    return false
}

var vol = require('volume-viewer')
var control = require('control-panel')

var panel = control([
  {type: 'range', label: 'brightness', min: 0, max: 3, initial: 1},
  {type: 'range', label: 'density', min: 0, max: 1, initial: 0.1}
],
  {theme: 'dark', position: 'top-right'}
)

// var el = document.createElement('div')
var el = holder;
document.body.appendChild(el)

css(el, {width: '100%', height: '100%'})
css(document.body, {margin: '0px', padding: '0px'})

let view3D = new vol.AICSview3d(el)

function onChannelDataReady() {
    console.log("Got channel data");
}

// PREPARE SOME TEST DATA TO TRY TO DISPLAY A VOLUME.
let imgdata = {
    "width": 306,
    "height": 494,
    "channels": 9,
    "channel_names": ["DRAQ5", "EGFP", "Hoechst 33258", "TL Brightfield", "SEG_STRUCT", "SEG_Memb", "SEG_DNA", "CON_Memb", "CON_DNA"],
    "rows": 7,
    "cols": 10,
    "tiles": 65,
    "tile_width": 204,
    "tile_height": 292,
    "atlas_width": 2040,
    "atlas_height": 2044,
    "pixel_size_x": 0.065,
    "pixel_size_y": 0.065,
    "pixel_size_z": 0.29,
    "images": [{
        "name": "../example/AICS-10_5_5.ome.tif_atlas_0.png",
        "channels": [0, 1, 2]
    }, {
        "name": "../example/AICS-10_5_5.ome.tif_atlas_1.png",
        "channels": [3, 4, 5]
    }, {
        "name": "../example/AICS-10_5_5.ome.tif_atlas_2.png",
        "channels": [6, 7, 8]
    }],
    "name": "AICS-10_5_5",
    "status": "OK",
    "version": "0.0.0",
    "aicsImageVersion": "0.3.0"
};

var channelVolumes = [];
for (var i = 0; i < imgdata.channels; ++i) {
  if (i % 2 === 0) {
    var sv = vol.AICSmakeVolumes.createSphere(imgdata.tile_width, imgdata.tile_height, imgdata.tiles, 16);
    channelVolumes.push(sv);
  }
  else {
    var sv = vol.AICSmakeVolumes.createTorus(imgdata.tile_width, imgdata.tile_height, imgdata.tiles, 32, 8);
    channelVolumes.push(sv);

  }
}

function loadImageData(jsondata, volumedata) {
    view3D.resize();
    //jsondata.volumedata = volumedata;
    const aimg = new vol.AICSvolumeDrawable(jsondata, "test");
    view3D.setCameraMode('3D');
    view3D.setImage(aimg, onChannelDataReady);
    aimg.setDensity(0.1);
    aimg.setBrightness(1.0);

    panel.on('input', function (data) {
        aimg.setBrightness(data['brightness'])
        aimg.setDensity(data['density'])
    })
}

loadImageData(imgdata, channelVolumes);
