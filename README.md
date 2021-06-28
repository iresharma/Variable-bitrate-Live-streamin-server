# Variable bitrate live streaming

This a small attempt to use a create a multiple protocol live streaming server which takes in a a video file and convert into both a HLS video format(time segment files & .m3u8 playlist) and MPEG-DASH format(.mpd manifest & .m4s chunks).

## What are these protocols
Checkout my [blog about it](https://watchireshstruggle.hashnode.dev)
## How it works
The whole logic in wrapped around by a express.js based webserver.
It uses the `multer` library to handle file uploads and store them locally. This is followed by a library `fluent-ffmpeg` which is a wrapper around `ffmpeg` the C based audio video manipulation library. We use a few ffmpeg functions to create a the required streams from the uploaded mp4, which are stored in the `hls-Streams/<filename>/` and `MPEG-DASH-Streams/<filename>/` folders which are added as static files for the server using `express.static`.
#### IMPORTANT
After the Streams are created the `out.m3u8` playlist and `.mpd` Manifest files are edited to update the path of segments from relative path to the `(HOST)/hls-Streams/<name>/<req>` and `(HOST)/MPEG-DASH-Streams/<name>/<req>` , i.e, the static paths.

After this encoding, conversion and storing is done the files are served conditionally based on the useragent ( basically device and browser )

## TODO:

- [x] upload file web View
- [x] Upload files
- [x] Generate `.ts` segments
- [x] Generate `.m3u8` playlist
- [x] Edit `.m3u8 playlist` to support streaming from server
- [x] player webview
- [x] lowdb for caching
- [ ] robust error handling
- It's either the below code not working or i am not able to glue the `.mpd` file to the player
- [x] Generate MPEG-DASH `.m4s` segments and `.mpd manifest` file
- [x] Adding resolution support of MPEG-DASH
