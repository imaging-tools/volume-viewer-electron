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

var inputs = [
  {type: 'range', label: 'brightness', min: 0, max: 3, initial: 1},
  {type: 'range', label: 'density', min: 0, max: 1, initial: 0.1},
  {type: 'checkbox', label: 'maxProject', initial: false}
]

var el = holder;
document.body.appendChild(el)

css(el, {width: '100%', height: '100%'})
css(document.body, {margin: '0px', padding: '0px', background: 'black'})

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

const defaultColors = [
    [226, 205, 179],
    [111, 186, 17],
    [141, 163, 192],
    [245, 241, 203],
    [224, 227, 209],
    [221, 155, 245],
    [227, 244, 245],
    [255, 98, 0],
    [247, 219, 120],
    [249, 165, 88],
    [218, 214, 235],
    [235, 26, 206],
    [36, 188, 250],
    [111, 186, 17],
    [167, 151, 119],
    [207, 198, 207],
    [249, 165, 88],
    [247, 85, 67],
    [141, 163, 192],
    [152, 176, 214],
    [17, 168, 154],
    [150, 0, 24],
    [253, 219, 2],
    [231, 220, 190],
    [226, 205, 179],
    [235, 213, 210],
    [227, 244, 245],
    [240, 236, 221],
    [219, 232, 209],
    [224, 227, 209],
    [222, 213, 193],
    [136, 136, 136],
    [240, 224, 211],
    [244, 212, 215],
    [247, 250, 252],
    [213, 222, 240],
    [87, 249, 235]
];

const getColorByChannelIndex = (index) => {
    return defaultColors[index] ? defaultColors[index] : [141, 163, 192];
};

const colorFromArray = (val) => {
    return 'rgb(' + val[0] + ',' + val[1] + ',' + val[2] + ')'
}

function loadImageData(jsondata, volumedata) {
    view3D.resize();
    const aimg = new vol.AICSvolumeDrawable(jsondata, "test");

    aimg.channel_names.forEach(function (d, i) {
      var colors = [colorFromArray(getColorByChannelIndex(i)), colorFromArray(getColorByChannelIndex(i))]
      inputs.push({type: 'multibox', label: d, count: 2, names: ['vol', 'iso'], colors: colors, initial: [true, false]})
    })

    var panel = control(inputs, {theme: 'dark', position: 'top-right', width: '250px'})

    view3D.setCameraMode('3D');
    view3D.setImage(aimg, onChannelDataReady);
    aimg.setDensity(0.1);
    aimg.setBrightness(1.0);
    aimg.setUniform('maxProject', 0, true, true)

    aimg.channel_names.forEach(function (d, i) {
        aimg.updateChannelColor(i, getColorByChannelIndex(i))
    })

    panel.on('input', function (data) {
      aimg.setBrightness(data['brightness'])
      aimg.setDensity(data['density'])
      aimg.setUniform('maxProject', data['maxProject'] ? 1 : 0, true, true)

      aimg.channel_names.forEach(function (d, i) {
        aimg.setVolumeChannelEnabled(i, data[d][0])
        if (aimg.hasIsosurface(i)) {
          if (!data[d][1]) {
            aimg.destroyIsosurface(i)
          }
        }
        else {
          if (data[d][1]) {
            aimg.createIsosurface(i, 50, 1);
          }
        }
      })
      aimg.fuse()
    })
}

loadImageData(imgdata, channelVolumes);
