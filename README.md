# HLS -> HTTP Live Streaming

A small attempt to create a server that takes normal videos ad converts them into `HLS .ts segments` and also generate `a .m3u8 playlist`. Which is followed by basic web views to upload and play the vid

## TODO:
- [x] upload file web View
- [x] Upload files
- [x] Generate `.ts` segments
- [x] Generate `.m3u8` playlist
- [x] Edit `.m3u8 playlist` to support streaming from server
- [ ] player weview
- [ ] lowdb for caching
- [ ] robust error handling