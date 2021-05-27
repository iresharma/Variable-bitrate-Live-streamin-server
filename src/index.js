import express from "express";
let app = express();
import path from "path";
import multer from "multer";

import fs from "fs";
import ffmpeg from "fluent-ffmpeg";

const dir = path.join(path.resolve(path.dirname("")), "src");

let storage = multer.diskStorage({
  destination: `${dir}/uploadedVideos`,
  filename: (_, file, cb) => {
    cb(null, file.originalname.replace(" ", "-"));
  },
});

let upload = multer({
  storage: storage,
});

import hbs from "hbs";
app.set("view engine", "hbs");

import { Low, JSONFile } from "lowdb";
const file = path.join(dir, "db/db.json");
const adapter = new JSONFile(file);
const db = new Low(adapter);

await db.read();

if (!db.data) {
  db.data = { videos: [] };
}

await db.write();

console.log(db.data);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || `http://localhost:${PORT}`;

console.log(path.join(dir, "hls-Streams"));

app.use("/streams", express.static(path.join(dir, "hls-Streams")));
app.use("/js", express.static(path.join(dir, "viewUtils")));

app.get("/", (_, res) => {
  db.read().then(() =>
    res.status(200).render("index", {
      files: db.data.videos,
      filesLen: db.data.videos.length != 0,
    })
  );
});

app.post("/upload", upload.single("video"), (req, res) => {
  console.log(req.file);
  fs.mkdirSync(`${dir}/hls-Streams/${req.file.filename.split(".")[0]}`);
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
    .output(`${dir}/hls-Streams/${req.file.filename.split(".")[0]}/out.m3u8`)
    .on("end", () => {
      console.log("done");
      fs.readFile(
        `${dir}/hls-Streams/${req.file.filename.split(".")[0]}/out.m3u8`,
        "utf-8",
        (err, data) => {
          if (err) {
            console.error(err);
            res.status(500).send("error in refactoring playlist file");
          }
          let newData = data.replace(
            /out/gim,
            `${HOST}/streams/${req.file.filename.split(".")[0]}/out`
          );
          console.log(newData);
          fs.writeFileSync(
            `${dir}/hls-Streams/${req.file.filename.split(".")[0]}/out.m3u8`,
            newData
          );
          console.log(db.data);
          db.data.videos.push({
            name: req.file.originalname,
            play: `/view/${req.file.filename.split(".")[0]}`,
          });
          db.write().then(() => console.log("db updated"));
          res.status(200).redirect("/");
        }
      );
    })
    .on("error", (err, stdout, stderr) => {
      console.log("Cannot process video: " + err.message);
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
      link: `${HOST}/stream/${req.params.name}`,
    })
  );
});

app.get("/stream/:name", (req, res) => {
  let name = req.params.name;
  res.status(200).sendFile(`${dir}/hls-Streams/${name}/out.m3u8`);
});

app.listen(PORT, () => console.log(`Server running locally at PORT:${PORT}`));
