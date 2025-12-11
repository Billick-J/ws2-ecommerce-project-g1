document.addEventListener("DOMContentLoaded", () => {
  const cartRows = document.querySelectorAll(".cart-row");

  cartRows.forEach(row => {
    const deleteBtn = row.querySelector(".delete-btn");
    const increaseBtn = row.querySelector(".increase-btn");
    const decreaseBtn = row.querySelector(".decrease-btn");
    const quantityEl = row.querySelector(".quantity");

    const pid = row.querySelector(".item-checkbox").value;

    deleteBtn.addEventListener("click", async () => {
      const res = await fetch("/cart/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: pid })
      });
      if (res.ok) row.remove();
      updateTotal();
    });

    increaseBtn.addEventListener("click", async () => {
      let qty = parseInt(quantityEl.textContent);
      qty++;
      const res = await fetch("/cart/update-quantity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: pid, quantity: qty })
      });
      if (res.ok) {
        quantityEl.textContent = qty;
        updateSubtotal(row, qty);
        updateTotal();
      }
    });

    decreaseBtn.addEventListener("click", async () => {
      let qty = parseInt(quantityEl.textContent);
      if (qty <= 1) return;
      qty--;
      const res = await fetch("/cart/update-quantity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: pid, quantity: qty })
      });
      if (res.ok) {
        quantityEl.textContent = qty;
        updateSubtotal(row, qty);
        updateTotal();
      }
    });
  });

  function updateSubtotal(row, qty) {
    const price = parseFloat(row.dataset.price);
    row.querySelector(".cart-subtotal").textContent = `₱${(price * qty).toFixed(2)}`;
  }

  function updateTotal() {
    let total = 0;
    document.querySelectorAll(".cart-row").forEach(row => {
      const subtotal = parseFloat(row.querySelector(".cart-subtotal").textContent.replace("₱",""));
      total += subtotal;
    });
    document.getElementById("totalAmount").textContent = total.toFixed(2);
  }
});
