var app = require("express")();
var multer = require("multer");

var fs = require("fs");
var ffmpeg = require("fluent-ffmpeg");

var storage = multer.diskStorage({
  destination: "uploadedVideos",
  filename: (_, file, cb) => {
    cb(null, file.originalname.replace(" ", "-"));
  },
});

var upload = multer({
  storage: storage,
});

var hbs = require("hbs");
app.set("view engine", "hbs");

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || `http://localhost:${PORT}`;

app.get("/", (req, res) => {
  res.status(200).render("index");
});

app.post("/upload", upload.single("video"), (req, res) => {
  console.log(req.file);
  fs.mkdirSync(`hls-Streams/${req.file.filename.split(".")[0]}`);
  //   Convert the incoming video file to a HLS ts file and generating a m3u8 playlist
  ffmpeg()
    .addOptions([
      "-profile:v baseline", // baseline profile (level 3.0) for H264 video codec
      "-level 3.0",
      "-s 640x360", // 640px width, 360px height output video dimensions
      "-start_number 0", // start the first .ts segment at index 0
      "-hls_time 10", // 10 second segment duration
      "-hls_list_size 0", // Maximum number of playlist entries (0 means all entries/infinite)
      "-f hls", // HLS format
    ])
    .input(req.file.path)
    .output(`hls-Streams/${req.file.filename.split(".")[0]}/out.m3u8`)
    .on("end", () => {
      console.log("done");
      fs.readFile(
        `hls-Streams/${req.file.filename.split(".")[0]}/out.m3u8`,
        "utf-8",
        (err, data) => {
          if (err) {
            console.error(err);
            res.status(500).send("error in refactoring playlist file");
          }
          let newData = data.replace(/out/gim, `${HOST}/out`);
          console.log(newData);
          fs.writeFileSync(
            `hls-Streams/${req.file.filename.split(".")[0]}/out.m3u8`,
            newData
          );
          res.status(200).send("lets see");
        }
      );
    })
    .on("error", function (err, stdout, stderr) {
      console.log("Cannot process video: " + err.message);
      res.status(500).send("umm this is bad");
    })
    .run();
});

app.listen(PORT, () => console.log(`Server running locally at PORT:${PORT}`));
