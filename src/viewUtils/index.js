function loader() {
  console.log("hi");
  document.querySelector("#content").style.opacity = 0.5;
  document.querySelector("#toast").style.display = "block";
  document.getElementById("loader").style.display = "flex";
  setTimeout(() => {
    document.getElementById("form").submit();
  }, 500);
}
