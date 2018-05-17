import argparse
import datetime
import os
import re
import sys

# from aicsimage.io import omeTifReader
from aicsimage.processing import aicsImage
from aicsimage.processing import textureAtlas

file_types = [
    ('.ome.tif', aicsImage.FileType.OMETIF),
    ('.ome.tiff', aicsImage.FileType.OMETIF),
    ('.tif', aicsImage.FileType.TIF),
    ('.tiff', aicsImage.FileType.TIF),
    ('.czi', aicsImage.FileType.CZI)
]


def normalize_path(path):
    # expects windows paths to start with \\allen\aics !!
    # windows: \\\\allen\\aics
    windowsroot = '\\\\allen\\aics\\'
    # mac:     /Volumes/aics (???)
    macroot = '/Volumes/aics/'
    # linux:   /allen/aics
    linuxroot = '/allen/aics/'

    # 1. strip away the root.
    if path.startswith(windowsroot):
        path = path[len(windowsroot):]
    elif path.startswith(linuxroot):
        path = path[len(linuxroot):]
    elif path.startswith(macroot):
        path = path[len(macroot):]
    else:
        # if the path does not reference a known root, don't try to change it.
        # it's probably a local path.
        return path

    # 2. split the path up into a list of dirs
    path_as_list = re.split(r'\\|/', path)

    # 3. insert the proper system root for this platform (without the trailing slash)
    dest_root = ''
    if sys.platform.startswith('darwin'):
        dest_root = macroot[:-1]
    elif sys.platform.startswith('linux'):
        dest_root = linuxroot[:-1]
    else:
        dest_root = windowsroot[:-1]

    path_as_list.insert(0, dest_root)

    out_path = os.path.join(*path_as_list)
    return out_path


def rchop(the_string):
    for ending, ending_enum in file_types:
        if the_string.lower().endswith(ending):
            return the_string[:-len(ending)], ending_enum
    return the_string, None


def timestamp():
    return '{:%Y-%m-%d %H:%M:%S}'.format(datetime.datetime.now())


def do_main(fname, outdir, name_override, do_thumbnail):
    # imagereader = omeTifReader.OmeTifReader(fname)
    # image = imagereader.load()
    fname = normalize_path(fname)

    name = os.path.basename(name_override if name_override else fname)

    # make sure outdir exists.
    outdir = os.path.normpath(outdir)
    if not os.path.exists(outdir):
        os.makedirs(outdir)

    print(timestamp() + ' :: copying: ' + fname)

    # copy the file to local storage.
    cp = 'cp'
    if sys.platform.startswith('darwin'):
        cp = 'cp'
    elif sys.platform.startswith('linux'):
        cp = 'cp'
    else:
        cp = 'copy'
    localfile = os.path.join(outdir, name)
    # use double quotes in case of spaces in file paths
    os.system(cp + ' "' + fname + '"  "' + localfile + '"')

    print(timestamp() + ' :: loading: ' + fname)
    file_parts = rchop(name)
    image_from_file = aicsImage.AICSImage(localfile, type=file_parts[1])
    # image_from_file = aicsImage.AICSImage(fname, type=file_parts[1])
    print(timestamp() + ' :: generating atlas for: ' + fname + ' as ' + file_parts[0])
    a = textureAtlas.generate_texture_atlas(image_from_file, name=file_parts[0], max_edge=2048, pack_order=None)
    a.save(outdir, name=name)

    # TODO: auto-generate thumbnail if do_thumbnail is true

    print(timestamp() + ' :: atlas done: ' + file_parts[0])

    # blow away local file just to save space in cache.  this file is no longer needed.
    os.remove(localfile)


def main():
    parser = argparse.ArgumentParser(description='Process data set defined in csv files, and prepare for ingest into bisque db.'
                                                 'Example: python processImageWithSegmentation.py /path/to/csv --outpath /path/to/destination/dir')
    parser.add_argument('input', help='input image file')
    parser.add_argument('output', help='output dir', default='imageviewer/cache')
    parser.add_argument('nameOverride', nargs='?', help='user friendly filename', default=None)
    parser.add_argument('--thumbnail', '-t', action='store_true')
    # parser.add_argument('--atlas', '-a', type=bool, action='store_true')
    args = parser.parse_args()

    do_main(args.input, args.output, args.nameOverride, args.thumbnail)
    # do_main('\\\\allen\\aics\\software\\danielt\\images\\AICS\\bisque\\20160705_I01\\20160705_I01_001_2.ome.tif', 'imageviewer/cache')


if __name__ == "__main__":
    print(sys.argv)
    main()
    sys.exit(0)
