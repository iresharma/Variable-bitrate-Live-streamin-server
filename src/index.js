// Express js imports for web server
import express from "express";
let app = express();

const logger = {
  Reset: "\x1b[0m",
  Bright: "\x1b[1m",
  Dim: "\x1b[2m",
  Underscore: "\x1b[4m",
  Blink: "\x1b[5m",
  Reverse: "\x1b[7m",
  Hidden: "\x1b[8m",

  FgRed: "\x1b[31m",
  FgGreen: "\x1b[32m",
  FgYellow: "\x1b[33m",
  FgBlue: "\x1b[34m",
  FgMagenta: "\x1b[35m",
  FgCyan: "\x1b[36m",
  FgWhite: "\x1b[37m",

  BgBlack: "\x1b[40m",
  BgRed: "\x1b[41m",
  BgGreen: "\x1b[42m",
  BgYellow: "\x1b[43m",
  BgBlue: "\x1b[44m",
  BgMagenta: "\x1b[45m",
  BgCyan: "\x1b[46m",
  BgWhite: "\x1b[47m",
};

// Path module import for directory paths and system paths
import path from "path";

// IMport file-saver for os file system operations
import fs from "fs";

// Import ffmpeg wrapper to handle the actual file conversion from mp4 -> hls segments and playlist
import ffmpeg from "fluent-ffmpeg";

//! This statement is important as converting the project into ES module removes access to __dirname variable
//! This statement is an analog to __dirname
const dir = path.join(path.resolve(path.dirname("")), "src");

// Multer import to handle formData
import multer from "multer";

import user from "express-useragent";
app.use(user.express());

// ===============================================================================================================
// Setting default upload folder for multer to src/uploadedVideos
let storage = multer.diskStorage({
  destination: `${dir}/uploadedVideos`,
  // overwriting the filename with an inline function to replace spaces to '-', making it better for URLs
  filename: (_, file, cb) => {
    cb(null, file.originalname.replace(" ", "-"));
  },
});

let upload = multer({
  storage: storage,
});
// ===============================================================================================================

// ===============================================================================================================
// Setting up handlebars support
import hbs from "hbs";
app.set("view engine", "hbs");
// ===============================================================================================================

// ===============================================================================================================
// Setting up lowdb
// Keeping the file in src/db/db.json
import { Low, JSONFile } from "lowdb";
const file = path.join(dir, "db/db.json");
const adapter = new JSONFile(file);
const db = new Low(adapter);

await db.read();

// the conditional is to put default value if db is empty
if (!db.data) {
  db.data = { videos: [] };
}

await db.write();
// ===============================================================================================================

//? debug statement
// console.log(db.data);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || `http://localhost:${PORT}`;
// const HOST = "https://eb07ece8731d.ngrok.io"

//? debug statement
// console.log(path.join(dir, "hls-Streams"));

// ===============================================================================================================
// Setting up static folders for content delivery
app.use("/hls-streams", express.static(path.join(dir, "hls-Streams")));
app.use("/mpeg-streams", express.static(path.join(dir, "MPEG-DASH-Streams")));
app.use("/js", express.static(path.join(dir, "viewUtils")));
// ===============================================================================================================

//? ===============================================================================================================
//? Routes
//? ===============================================================================================================
app.get("/", (req, res) => {
  db.read().then(() =>
    res.status(200).render("index", {
      files: db.data.videos,
      filesLen: db.data.videos.length != 0,
      user: JSON.stringify(req.useragent),
    })
  );
});

app.post("/upload", upload.single("video"), (req, res) => {
  console.log(req.file);
  // This creates the folder for the uploaded file to store the time segment files and the .m3u8 playlist
  fs.mkdirSync(`${dir}/hls-Streams/${req.file.filename.split(".")[0]}`);
  fs.mkdirSync(`${dir}/MPEG-DASH-Streams/${req.file.filename.split(".")[0]}`);

  // ===============================================================================================================
  //* FFmpeg conversion from mp4 -> HLS



  // Convert the incoming video file to a HLS ts file and generating a m3u8 playlist
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
    .output(`${dir}/hls-Streams/${req.file.filename.split(".")[0]}/out.m3u8`)



  // ===============================================================================================================
    .on("end", () => {
      console.log(logger.FgGreen + "done with HLS-Stream" + logger.Reset);
      // ===============================================================================================================
      //* FFmpeg conversion from HLS -> MPEG-DASH



      ffmpeg()
        .addInput(
          `${dir}/hls-Streams/${req.file.filename.split(".")[0]}/out.m3u8`
        )
        .addOption([
          "-strict",
          "-2",
          "-min_seg_duration 2000",
          "-window_size 5",
          "-extra_window_size 5",
          "-use_template 1",
          "-use_timeline 1",
          "-f dash",
        ])
        .output(
          `${dir}/MPEG-DASH-Streams/${req.file.filename.split(".")[0]}/out.mpd`
        )




        // ===============================================================================================================
        .on("end", () => {
          // Open the .m3u8 playlist file to modify the source for time segments
          console.log("done with MPAEG-DASH-Stream");

          // ? This readFile function manipulates the .m3u8 file to convert all paths to hosted static paths
          fs.readFile(
            `${dir}/hls-Streams/${req.file.filename.split(".")[0]}/out.m3u8`,
            "utf-8",
            (err, data) => {
              if (err) {
                console.error(err);
                res.status(500).send("error in refactoring playlist file");
              }


              // Replace out{n}.ts with {HOST}/streams/out{n}.ts
              let newData = data.replace(
                /out/gim,
                `${HOST}/hls-streams/${req.file.filename.split(".")[0]}/out`
              );


              // Writing new data to .m3u8 file
              fs.writeFileSync(
                `${dir}/hls-Streams/${
                  req.file.filename.split(".")[0]
                }/out.m3u8`,
                newData
              );
              // ? This readFile function manipulates the .mpd file to convert all paths to hosted static paths
              fs.readFile(
                `${dir}/MPEG-DASH-Streams/${
                  req.file.filename.split(".")[0]
                }/out.mpd`,
                "utf-8",
                (err, data) => {
                  if (err) {
                    console.error(err);
                    res.status(500).send("error in refactoring playlist file");
                  }



                  // Replace segment routes in .mpd MANIFEST file
                  let newData = data.replace(
                    "init-stream$RepresentationID$.m4s",
                    `${HOST}/mpeg-Streams/${req.file.filename.split(".")[0]}/init-stream$RepresentationID$.m4s`
                  );
                  newData = newData.replace(
                    "chunk-stream$RepresentationID$-$Number%05d$.m4s",
                    `${HOST}/mpeg-Streams/${req.file.filename.split(".")[0]}/chunk-stream$RepresentationID$-$Number%05d$.m4s`
                  );


                  // Writing newData to .mpd file
                  fs.writeFileSync(
                    `${dir}/MPEG-DASH-Streams/${
                      req.file.filename.split(".")[0]
                    }/out.mpd`,
                    newData
                  );


                  // Writing to db
                  db.data.videos.push({
                    name: req.file.originalname,
                    play: `/view/${req.file.filename.split(".")[0]}`,
                  });
                  db.write().then(() => console.log("db updated"));
                  res.status(200).redirect("/");
                }
              );
            }
          );
        })
        .on("error", (err, stdout, stderr) => {
          console.log(
            logger.BgRed + "Cannot process video: " + err.message + logger.Reset
          );
          res.status(500).send("umm this is bad");
        })
        .run();
    })
    .on("error", (err, stdout, stderr) => {
      console.log(
        logger.BgRed + "Cannot process video: " + err.message + logger.Reset
      );
      res.status(500).send("umm this is bad");
    })
    .run();
});

app.get("/view/:name", (req, res) => {
  db.read().then(() =>
    res.status(200).render("view", {
      files: db.data.videos,
      filesLen: db.data.videos.length != 0,
      filename: req.params.name,

      // deciding if we need a MPEG-DASH Stream or a HLS Stream
      link: `${HOST}/stream/${req.params.name}?mpd=${
        req.useragent.isChrome ||
        req.useragent.isFirefox ||
        req.useragent.isEdge
      }`,
    })
  );
});

app.get("/stream/:name", (req, res) => {
  let name = req.params.name;
  if (req.query.mpd == String(true))
    res.sendFile(`${dir}/MPEG-DASH-Streams/${name}/out.mpd`);
  else res.sendFile(`${dir}/hls-Streams/${name}/out.m3u8`);
});

app.listen(PORT, () => console.log(`Server running locally at PORT:${PORT}`));
