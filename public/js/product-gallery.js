document.addEventListener("DOMContentLoaded", () => {
  const mainImage = document.getElementById("main-image");
  const gallery = document.querySelectorAll("#gallery img");
  const modal = document.getElementById("fullscreen-modal");
  const modalImg = document.getElementById("fullscreen-img");

  // Thumbnail click: update main image
  gallery.forEach(img => {
    img.addEventListener("click", () => {
      mainImage.src = img.src;

      // Update active state
      gallery.forEach(i => i.classList.remove("active"));
      img.classList.add("active");

      // If modal is open, update fullscreen image
      if (modal.style.display === "flex") {
        modalImg.src = img.src;
      }
    });
  });

  // Main image click: open fullscreen modal
  mainImage.addEventListener("click", () => {
    modal.style.display = "flex";
    modalImg.src = mainImage.src;
  });

  // Click anywhere on modal to close
  modal.addEventListener("click", () => {
    modal.style.display = "none";
  });
});
