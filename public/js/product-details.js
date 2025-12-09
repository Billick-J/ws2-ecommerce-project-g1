document.addEventListener("DOMContentLoaded", () => {
  const mainImage = document.getElementById("mainImage");
  const thumbs = document.querySelectorAll(".slider-thumbs img");

  thumbs.forEach(thumb => {
    thumb.addEventListener("click", () => {
      const src = thumb.dataset.src;
      mainImage.src = src;

      thumbs.forEach(t => t.classList.remove("active"));
      thumb.classList.add("active");
    });
  });
});