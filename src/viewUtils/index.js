function loader() {
  console.log("hi");
  document.querySelector("#content").style.opacity = 0.5;
  document.querySelector("#toast").style.display = "block";
  document.getElementById("loader").style.display = "flex";
  setTimeout(() => {
    document.getElementById("form").submit();
  }, 500);
}


function play(url) {
  var context = new Dash.di.DashContext();
  var player = new MediaPlayer(context);
                  player.startup();
                  player.attachView(document.querySelector("#videoplayer"));
                  player.attachSource(url);
}