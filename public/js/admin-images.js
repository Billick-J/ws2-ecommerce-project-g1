document.addEventListener("DOMContentLoaded", () => {
  const addButtons = document.querySelectorAll("[data-add-image]");

  addButtons.forEach(button => {
    button.addEventListener("click", () => {
      const container = document.getElementById("imagesContainer");

      const wrapper = document.createElement("div");
      wrapper.className = "image-input";

      wrapper.innerHTML = `
        <label>Image URL:
          <input type="text" name="images[]" placeholder="Enter image URL">
        </label>
        <br>
      `;

      container.appendChild(wrapper);
    });
  });
});
