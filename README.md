# volume-viewer-electron
embedding the volume viewer in electron with ui controls

To build the convert script from aicsimage python lib:
On Windows:
pyinstaller --onefile --hidden-import=encodings --hidden-import=scipy._lib.messagestream --paths C:\path\to\python\Lib\site-packages\scipy\extra-dll convert.py